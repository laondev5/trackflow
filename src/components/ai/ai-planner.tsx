"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlarmClock,
  ArrowLeft,
  CalendarDays,
  Check,
  Flag,
  Folder,
  ListChecks,
  Loader2,
  Mic,
  MicOff,
  Repeat,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { formatDue } from "@/lib/dates";
import { RECURRENCE_LABELS } from "@/lib/recurrence";
import { PRIORITY_META, PROJECT_COLORS, type Priority, type Recurrence, type Subtask } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Draft {
  key: string;
  selected: boolean;
  title: string;
  notes: string;
  priority: Priority;
  dueDate: string | null;
  hasTime: boolean;
  remindAt: string | null;
  reminderOffset: number | null;
  recurrence: Recurrence;
  projectName: string | null;
  tags: string[];
  subtasks: string[];
}

const EXAMPLES = [
  "Tomorrow 10am call the landlord about the kitchen leak — urgent. Buy groceries tonight: eggs, bread, milk. Every Monday send the weekly report to Sarah.",
  "Dentist Friday at 3pm, remind me an hour before. Renew car insurance by the end of the month. Plan mom's birthday dinner next Saturday.",
  "Meeting notes: Tunde to share the Q3 deck by Wednesday. I need to review the budget draft before Thursday noon and book the venue for the offsite in 2 weeks.",
];

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function AiPlanner() {
  const open = useUI((s) => s.aiOpen);
  const initialText = useUI((s) => s.aiInitialText);
  const close = useUI((s) => s.closeAi);

  const projects = useTaskStore((s) => s.projects);
  const createTask = useTaskStore((s) => s.createTask);
  const createProject = useTaskStore((s) => s.createProject);

  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setDrafts(null);
      setProvider(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      recRef.current?.stop();
    }
  }, [open, initialText]);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    const base = text ? text.trimEnd() + " " : "";
    let spoken = "";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) spoken += e.results[i][0].transcript + " ";
      }
      setText(base + spoken);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") toast.error(`Microphone: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const generate = async () => {
    recRef.current?.stop();
    if (text.trim().length < 3) return;
    setLoading(true);
    try {
      const res = await api<{ tasks: Omit<Draft, "key" | "selected">[]; provider: string }>("/api/ai/plan", {
        method: "POST",
        body: { text, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      setProvider(res.provider);
      if (!res.tasks.length) {
        toast("No tasks found", { description: "Try describing what needs to be done, e.g. “call the bank tomorrow at 9”." });
        return;
      }
      setDrafts(res.tasks.map((t, i) => ({ ...t, key: `${Date.now()}-${i}`, selected: true })));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds?.map((d) => (d.key === key ? { ...d, ...patch } : d)) ?? null);

  const selected = drafts?.filter((d) => d.selected && d.title.trim()) ?? [];
  const existingProject = (name: string | null) =>
    name ? projects.find((p) => p.name.toLowerCase() === name.toLowerCase()) : undefined;

  const addAll = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      // Create any new projects the AI suggested (once per name).
      const projectIds = new Map<string, string>();
      const newNames = [...new Set(selected.map((d) => d.projectName).filter((n): n is string => !!n && !existingProject(n)))];
      for (const [i, name] of newNames.entries()) {
        const p = await createProject({ name, color: PROJECT_COLORS[(projects.length + i) % PROJECT_COLORS.length], icon: "📁" });
        projectIds.set(name.toLowerCase(), p._id);
      }
      const resolveProject = (name: string | null) =>
        name ? existingProject(name)?._id ?? projectIds.get(name.toLowerCase()) ?? null : null;

      const results = await Promise.allSettled(
        selected.map((d) =>
          createTask({
            title: d.title.trim(),
            notes: d.notes,
            priority: d.priority,
            dueDate: d.dueDate,
            hasTime: d.hasTime,
            remindAt: d.dueDate ? d.remindAt : null,
            reminderOffset: d.dueDate ? d.reminderOffset : null,
            recurrence: d.dueDate ? d.recurrence : "none",
            projectId: resolveProject(d.projectName),
            tags: d.tags,
            // No _id: MongoDB assigns real ObjectIds to new subtasks.
            subtasks: d.subtasks.map((title) => ({ title, completed: false }) as Subtask),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const added = results.length - failed;
      if (added) toast.success(`Added ${added} task${added === 1 ? "" : "s"} ✨`, { description: newNames.length ? `New project${newNames.length > 1 ? "s" : ""}: ${newNames.join(", ")}` : undefined });
      if (failed) toast.error(`${failed} task${failed === 1 ? "" : "s"} couldn't be saved`);
      if (!failed) close();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()} repositionInputs={false}>
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-xl">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            {drafts && (
              <button type="button" onClick={() => setDrafts(null)} aria-label="Back to instructions" className="-ml-1 rounded-md p-1 hover:bg-muted">
                <ArrowLeft className="size-4" />
              </button>
            )}
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-primary text-white">
              <Sparkles className="size-4" />
            </span>
            {drafts ? `Review ${drafts.length} task${drafts.length === 1 ? "" : "s"}` : "Plan with AI"}
          </DrawerTitle>
          <DrawerDescription>
            {drafts
              ? "Uncheck anything you don't want, tweak titles, then add them."
              : "Drop in instructions, notes or a brain dump. The AI turns them into tasks with dates, priorities and reminders."}
          </DrawerDescription>
        </DrawerHeader>

        {!drafts ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4">
              <div className="relative">
                <Textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      generate();
                    }
                  }}
                  rows={7}
                  maxLength={8000}
                  disabled={loading}
                  placeholder="e.g. Tomorrow at 10 call the landlord about the leak (urgent). Pick up groceries tonight: eggs, bread, milk. Every Monday send the weekly report…"
                  className="min-h-40 resize-none pr-12 text-base"
                />
                {speechSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant={listening ? "destructive" : "secondary"}
                    className={cn("absolute right-2 bottom-2 rounded-full", listening && "animate-pulse")}
                    onClick={toggleMic}
                    aria-label={listening ? "Stop dictation" : "Dictate"}
                    disabled={loading}
                  >
                    {listening ? <MicOff /> : <Mic />}
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{listening ? "Listening… speak your tasks" : "Tip: Ctrl+Enter to generate"}</span>
                <span className="tabular-nums">{text.length}/8000</span>
              </div>

              {!text && (
                <div className="space-y-2 pb-2">
                  <p className="text-xs font-medium text-muted-foreground">Try an example</p>
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setText(ex)}
                      className="block w-full rounded-xl border bg-muted/40 p-3 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DrawerFooter className="pb-safe">
              <Button size="lg" onClick={generate} disabled={loading || text.trim().length < 3} className="bg-gradient-to-r from-violet-600 to-primary text-white">
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {loading ? "Creating tasks…" : "Generate tasks"}
              </Button>
            </DrawerFooter>
          </>
        ) : (
          <>
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
              {drafts.map((d) => {
                const proj = existingProject(d.projectName);
                return (
                  <li
                    key={d.key}
                    className={cn("rounded-xl border bg-card p-3 transition", !d.selected && "opacity-50")}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => update(d.key, { selected: !d.selected })}
                        aria-label={d.selected ? "Exclude task" : "Include task"}
                        className={cn(
                          "mt-1 grid size-5 shrink-0 place-items-center rounded-md border-2 transition",
                          d.selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                        )}
                      >
                        {d.selected && <Check className="size-3.5" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          value={d.title}
                          onChange={(e) => update(d.key, { title: e.target.value })}
                          className="w-full bg-transparent text-[15px] font-medium outline-none"
                          aria-label="Task title"
                        />
                        {d.notes && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.notes}</p>}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {d.dueDate && (
                            <Chip onRemove={() => update(d.key, { dueDate: null, hasTime: false, remindAt: null, reminderOffset: null, recurrence: "none" })}>
                              <CalendarDays /> {formatDue(d)}
                            </Chip>
                          )}
                          <button
                            type="button"
                            title="Change priority"
                            onClick={() => update(d.key, { priority: ((d.priority % 4) + 1) as Priority })}
                          >
                            <Badge variant="secondary" className="gap-1">
                              <Flag className={PRIORITY_META[d.priority].text} /> {PRIORITY_META[d.priority].label}
                            </Badge>
                          </button>
                          {d.remindAt && d.dueDate && (
                            <Chip onRemove={() => update(d.key, { remindAt: null, reminderOffset: null })}>
                              <AlarmClock /> Reminder
                            </Chip>
                          )}
                          {d.recurrence !== "none" && d.dueDate && (
                            <Chip onRemove={() => update(d.key, { recurrence: "none" })}>
                              <Repeat /> {RECURRENCE_LABELS[d.recurrence]}
                            </Chip>
                          )}
                          {d.projectName && (
                            <Chip onRemove={() => update(d.key, { projectName: null })}>
                              {proj ? <span className="size-2 rounded-full" style={{ background: proj.color }} /> : <Folder />}
                              {d.projectName}
                              {!proj && <span className="text-primary">(new)</span>}
                            </Chip>
                          )}
                          {d.subtasks.length > 0 && (
                            <Badge variant="secondary" className="gap-1" title={d.subtasks.join("\n")}>
                              <ListChecks /> {d.subtasks.length} subtask{d.subtasks.length === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {d.tags.map((t) => (
                            <Chip key={t} onRemove={() => update(d.key, { tags: d.tags.filter((x) => x !== t) })}>
                              #{t}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <DrawerFooter className="flex-row items-center gap-2 border-t pb-safe">
              <span className="text-xs text-muted-foreground">
                {provider && `via ${provider === "gemini" ? "Gemini" : "Groq"}`}
              </span>
              <Button variant="outline" className="ml-auto" onClick={generate} disabled={loading || saving}>
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 />} Regenerate
              </Button>
              <Button onClick={addAll} disabled={!selected.length || saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                Add {selected.length} task{selected.length === 1 ? "" : "s"}
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove" className="rounded-full p-0.5 hover:bg-foreground/10">
        <X className="size-3" />
      </button>
    </Badge>
  );
}
