import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, handler, ok, rateLimit } from "@/lib/api-helpers";
import { AiError, aiProviders, planTasks } from "@/lib/ai";
import { ProjectModel } from "@/lib/models/Project";
import { TaskModel } from "@/lib/models/Task";

export const maxDuration = 60;

const schema = z.object({
  text: z.string().trim().min(3, "Tell the AI what needs to get done").max(8000, "That's a lot — keep it under 8,000 characters"),
  timezone: z.string().max(64).optional(),
});

function validTz(tz: string | undefined) {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

export const GET = handler(async () => {
  await requireUser();
  const p = aiProviders();
  return ok({ enabled: p.gemini || p.groq, ...p });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`ai:${user._id}`, 30, 10 * 60_000);
  const { text, timezone } = schema.parse(await req.json());

  const [projects, tags] = await Promise.all([
    ProjectModel.find({ userId: user._id, archived: false }).select("name").lean(),
    TaskModel.distinct("tags", { userId: user._id }),
  ]);

  try {
    const result = await planTasks(text, {
      timezone: validTz(timezone) ?? user.prefs?.timezone ?? "UTC",
      projects: projects.map((p) => p.name),
      tags: (tags as string[]).slice(0, 50),
      defaultReminder: user.prefs?.defaultReminder ?? null,
    });
    return ok(result);
  } catch (err) {
    if (err instanceof AiError) return fail(err.status >= 500 || err.status === 501 ? err.status : 502, err.message);
    throw err;
  }
});
