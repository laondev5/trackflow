import "server-only";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

const RECURRENCES = ["none", "daily", "weekdays", "weekly", "monthly", "yearly"] as const;

/** What the model must return (dates are LOCAL wall-clock values in the user's time zone). */
const aiTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  notes: z.string().max(4000).nullish().transform((v) => v ?? ""),
  priority: z.coerce.number().int().min(1).max(4).catch(4),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().catch(null),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullish().catch(null),
  reminderMinutesBefore: z.coerce.number().int().min(0).max(60 * 24 * 30).nullish().catch(null),
  recurrence: z.enum(RECURRENCES).nullish().catch("none"),
  project: z.string().trim().max(80).nullish().catch(null),
  tags: z.array(z.string()).nullish().catch([]),
  subtasks: z.array(z.string()).nullish().catch([]),
});

const aiResponseSchema = z.object({ tasks: z.array(z.unknown()).max(50) });

export interface TaskDraft {
  title: string;
  notes: string;
  priority: 1 | 2 | 3 | 4;
  dueDate: string | null; // ISO instant
  hasTime: boolean;
  remindAt: string | null;
  reminderOffset: number | null;
  recurrence: (typeof RECURRENCES)[number];
  projectName: string | null;
  tags: string[];
  subtasks: string[];
}

export interface PlanContext {
  timezone: string;
  projects: string[];
  tags: string[];
  defaultReminder: number | null;
  now?: Date;
}

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function aiProviders() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
  };
}

/* ------------------------------------------------------------------ */
/* Time-zone helpers                                                  */
/* ------------------------------------------------------------------ */

function tzOffsetMs(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in `tz` to a UTC Date (DST-safe). */
function zonedToUtc(y: number, m: number, d: number, h: number, min: number, s: number, ms: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, h, min, s, ms);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let t = guess - off1;
  const off2 = tzOffsetMs(new Date(t), tz);
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

function describeNow(now: Date, tz: string) {
  const full = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  const iso = isoFmt.format(now);
  // A lookup table so models never miscount weekdays ("next Friday", "every Monday").
  const calendar = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    return `${dayFmt.format(d)} ${isoFmt.format(d)}`;
  }).join(", ");
  return { full, iso, calendar };
}

/* ------------------------------------------------------------------ */
/* Prompt                                                             */
/* ------------------------------------------------------------------ */

function systemPrompt(ctx: PlanContext, now: Date) {
  const { full, iso, calendar } = describeNow(now, ctx.timezone);
  return `You are the planning assistant inside a task manager. Turn the user's instructions (brain dumps, meeting notes, emails, voice transcripts, to-do lists) into clear, actionable tasks.

Current date/time for the user: ${full} (today is ${iso}), time zone ${ctx.timezone}.
Calendar for the next 3 weeks (use it to resolve weekdays): ${calendar}.
Existing projects: ${ctx.projects.length ? ctx.projects.map((p) => `"${p}"`).join(", ") : "(none)"}.
Existing tags: ${ctx.tags.length ? ctx.tags.join(", ") : "(none)"}.

Rules:
- Create one task per distinct action. Split compound instructions ("buy milk and call the bank" = 2 tasks). Merge duplicates.
- Titles: short, start with a verb, no dates/priority words in the title (max ~80 chars). Keep the user's language.
- Put extra context, links, phone numbers, addresses or details in "notes".
- Steps that belong to one bigger task go in "subtasks" (short strings), not separate tasks.
- dueDate: "YYYY-MM-DD" resolved relative to today in the user's time zone ("tomorrow", "next Friday", "end of month", "in 2 weeks"). Use null if no date is implied. Never invent dates.
- dueTime: "HH:mm" 24h only when a specific time is stated ("at 3pm", "morning" = 09:00, "noon" = 12:00, "evening" = 18:00, "tonight" = 20:00). Otherwise null.
- priority: default 4 (no priority). Use 1 only for urgent/ASAP/critical/emergency, 2 for important/high priority/must, 3 only when the user explicitly says medium/normal priority.
- "next <weekday>" and "on <weekday>" mean the first matching date AFTER today in the calendar; "every <weekday>" starts on that same first matching date.
- reminderMinutesBefore: only if the user asks to be reminded ("remind me 30 min before" = 30, "a day before" = 1440). For tasks without a time, 0 means 9 AM on the due day. Otherwise null.
- recurrence: one of none, daily, weekdays, weekly, monthly, yearly ("every Monday" = weekly with the next Monday as dueDate).
- project: reuse an existing project name when it clearly fits (exact spelling). Only suggest a new project name if the user explicitly names one. Otherwise null.
- tags: 0-3 lowercase single-word tags, prefer existing tags. No "#".
- Ignore greetings, filler and anything that is not an action. If nothing is actionable return an empty list.

Respond ONLY with JSON: {"tasks":[{"title":string,"notes":string,"priority":1|2|3|4,"dueDate":string|null,"dueTime":string|null,"reminderMinutesBefore":number|null,"recurrence":string,"project":string|null,"tags":string[],"subtasks":string[]}]}`;
}

/* ------------------------------------------------------------------ */
/* Providers                                                          */
/* ------------------------------------------------------------------ */

const TIMEOUT_MS = 45_000;

async function fetchJson(url: string, init: RequestInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) {
      let msg = text.slice(0, 300);
      try {
        const j = JSON.parse(text);
        msg = j.error?.message || j.message || msg;
      } catch {}
      throw new AiError(res.status, msg);
    }
    return JSON.parse(text);
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new AiError(504, "AI request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const geminiSchema = {
  type: "OBJECT",
  properties: {
    tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          notes: { type: "STRING" },
          priority: { type: "INTEGER" },
          dueDate: { type: "STRING", nullable: true },
          dueTime: { type: "STRING", nullable: true },
          reminderMinutesBefore: { type: "INTEGER", nullable: true },
          recurrence: { type: "STRING", enum: [...RECURRENCES] },
          project: { type: "STRING", nullable: true },
          tags: { type: "ARRAY", items: { type: "STRING" } },
          subtasks: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "priority", "recurrence", "tags", "subtasks"],
      },
    },
  },
  required: ["tasks"],
};

async function callGemini(system: string, input: string) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: geminiSchema,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || "empty response";
    throw new AiError(502, `Gemini returned no content (${reason})`);
  }
  return text;
}

async function callGroq(system: string, input: string) {
  const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const data = await fetchJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.2,
      // gpt-oss reasoning models resolve relative dates noticeably better with some reasoning.
      ...(groqModel.startsWith("openai/gpt-oss") ? { reasoning_effort: "medium", include_reasoning: false } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    }),
  });
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new AiError(502, "Groq returned no content");
  return text;
}

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new AiError(502, "AI returned invalid JSON");
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

function toDraft(raw: z.infer<typeof aiTaskSchema>, ctx: PlanContext): TaskDraft {
  const tz = ctx.timezone;
  let dueDate: string | null = null;
  let hasTime = false;
  let remindAt: string | null = null;
  let reminderOffset = raw.reminderMinutesBefore ?? null;

  if (raw.dueDate) {
    const [y, m, d] = raw.dueDate.split("-").map(Number);
    if (raw.dueTime) {
      const [hh, mm] = raw.dueTime.split(":").map(Number);
      if (hh < 24 && mm < 60) {
        dueDate = zonedToUtc(y, m, d, hh, mm, 0, 0, tz).toISOString();
        hasTime = true;
      }
    }
    if (!dueDate) dueDate = zonedToUtc(y, m, d, 23, 59, 59, 999, tz).toISOString();
    if (Number.isNaN(new Date(dueDate).getTime())) dueDate = null;

    if (dueDate) {
      if (reminderOffset === null) reminderOffset = ctx.defaultReminder;
      if (reminderOffset !== null) {
        const base = hasTime ? new Date(dueDate) : zonedToUtc(y, m, d, 9, 0, 0, 0, tz);
        remindAt = new Date(base.getTime() - reminderOffset * 60_000).toISOString();
      }
    }
  } else {
    reminderOffset = null;
  }

  // Snap the project name to an existing project when it matches case-insensitively.
  const projectName = raw.project
    ? ctx.projects.find((p) => p.toLowerCase() === raw.project!.toLowerCase()) ?? raw.project
    : null;

  return {
    title: raw.title,
    notes: raw.notes,
    priority: raw.priority as TaskDraft["priority"],
    dueDate,
    hasTime,
    remindAt,
    reminderOffset: dueDate ? reminderOffset : null,
    recurrence: dueDate ? (raw.recurrence ?? "none") : "none",
    projectName,
    tags: [...new Set((raw.tags ?? []).map((t) => t.toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 40)).filter(Boolean))].slice(0, 5),
    subtasks: (raw.subtasks ?? []).map((s) => s.trim().slice(0, 300)).filter(Boolean).slice(0, 30),
  };
}

/** Turns free-form instructions into task drafts. Gemini first, Groq as fallback. */
export async function planTasks(input: string, ctx: PlanContext): Promise<{ tasks: TaskDraft[]; provider: string }> {
  const { gemini, groq } = aiProviders();
  if (!gemini && !groq) throw new AiError(501, "AI isn't configured. Add GEMINI_API_KEY or GROQ_API_KEY to .env.local.");

  const now = ctx.now ?? new Date();
  const system = systemPrompt(ctx, now);
  const attempts: [string, () => Promise<string>][] = [];
  if (gemini) attempts.push(["gemini", () => callGemini(system, input)]);
  if (groq) attempts.push(["groq", () => callGroq(system, input)]);

  const errors: string[] = [];
  for (const [provider, call] of attempts) {
    try {
      const parsed = aiResponseSchema.parse(extractJson(await call()));
      const tasks = parsed.tasks
        .map((t) => aiTaskSchema.safeParse(t))
        .filter((r) => r.success)
        .map((r) => toDraft(r.data!, ctx));
      return { tasks, provider };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai] ${provider} failed:`, msg);
      errors.push(`${provider}: ${msg}`);
    }
  }
  throw new AiError(502, `The AI couldn't process that right now. ${errors.join(" | ")}`);
}
