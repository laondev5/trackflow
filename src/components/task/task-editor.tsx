"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlarmClock, Check, Flag, Folder, KanbanSquare, Plus, Repeat, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALLDAY_REMINDERS, TIMED_REMINDERS, computeRemindAt, timeAgo } from "@/lib/dates";
import { RECURRENCE_LABELS } from "@/lib/recurrence";
import { PRIORITY_META, type Priority, type Recurrence, type Subtask, type Task, type TaskStatus } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTaskActions } from "./task-item";
import { DuePicker } from "./due-picker";

const STATUS_LABELS: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

export function TaskEditor() {
  const id = useUI((s) => s.editingTaskId);
  const close = useUI((s) => s.closeEditor);
  const task = useTaskStore((s) => s.tasks.find((t) => t._id === id));
  const open = !!id && !!task;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()} repositionInputs={false}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-xl">
        {task && <EditorBody key={task._id} task={task} onDone={close} />}
      </DrawerContent>
    </Drawer>
  );
}

function EditorBody({ task, onDone }: { task: Task; onDone: () => void }) {
  const projects = useTaskStore((s) => s.projects);
  const updateTask = useTaskStore((s) => s.updateTask);
  const { complete, remove } = useTaskActions();
  const [draft, setDraft] = useState<Task>(task);
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Keep in sync if the server replaces the task (e.g. temp id -> real id, completion).
  useEffect(() => {
    setDraft((d) => ({ ...d, _id: task._id, completed: task.completed, status: task.status, completedAt: task.completedAt }));
  }, [task._id, task.completed, task.status, task.completedAt]);

  const set = <K extends keyof Task>(key: K, value: Task[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // Save changed fields when the sheet closes.
  useEffect(() => {
    return () => {
      const d = draftRef.current;
      const patch: Partial<Task> = {};
      (["title", "notes", "priority", "dueDate", "hasTime", "remindAt", "reminderOffset", "recurrence", "projectId", "tags", "subtasks", "status"] as const).forEach(
        (k) => {
          if (JSON.stringify(d[k]) !== JSON.stringify(task[k])) (patch as Record<string, unknown>)[k] = d[k];
        }
      );
      if (!d.title.trim()) delete patch.title;
      if (patch.subtasks) patch.subtasks = patch.subtasks.map((s) => (s._id.startsWith("new-") ? { title: s.title, completed: s.completed } : s)) as Subtask[];
      if (Object.keys(patch).length) {
        updateTask(task._id, patch).catch((e) => toast.error(`Couldn't save: ${e.message}`));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDue = (dueDate: string | null, hasTime: boolean) => {
    setDraft((d) => {
      const kindChanged = hasTime !== d.hasTime;
      const offset = !dueDate ? null : kindChanged ? null : d.reminderOffset;
      return { ...d, dueDate, hasTime, reminderOffset: offset, remindAt: computeRemindAt(dueDate, hasTime, offset) };
    });
  };

  const setReminder = (value: string) => {
    const offset = value === "none" ? null : Number(value);
    setDraft((d) => ({ ...d, reminderOffset: offset, remindAt: computeRemindAt(d.dueDate, d.hasTime, offset) }));
  };

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    set("subtasks", [...draft.subtasks, { _id: `new-${Date.now()}`, title, completed: false }]);
    setNewSubtask("");
  };

  const addTag = () => {
    const tag = newTag.trim().replace(/^#/, "").toLowerCase();
    if (tag && !draft.tags.includes(tag)) set("tags", [...draft.tags, tag]);
    setNewTag("");
  };

  const reminderOptions = draft.hasTime ? TIMED_REMINDERS : ALLDAY_REMINDERS;
  const subDone = draft.subtasks.filter((s) => s.completed).length;

  return (
    <>
      <DrawerHeader className="pb-0 text-left">
        <DrawerTitle className="sr-only">Edit task</DrawerTitle>
        <DrawerDescription className="sr-only">Edit task details</DrawerDescription>
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="Toggle complete"
            onClick={() => complete(task)}
            className={cn(
              "mt-1.5 grid size-6 shrink-0 place-items-center rounded-full border-2",
              task.completed ? "border-emerald-500 bg-emerald-500 text-white" : PRIORITY_META[draft.priority].ring
            )}
          >
            {task.completed && <Check className="size-3.5" strokeWidth={3} />}
          </button>
          <Textarea
            value={draft.title}
            onChange={(e) => set("title", e.target.value.replace(/\n/g, ""))}
            rows={1}
            aria-label="Title"
            className="min-h-0 resize-none border-none bg-transparent p-0 text-lg font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </DrawerHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <Textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Add notes…"
          rows={3}
          className="resize-none"
        />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Due</Label>
          <DuePicker value={{ dueDate: draft.dueDate, hasTime: draft.hasTime }} onChange={(v) => setDue(v.dueDate, v.hasTime)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field icon={<AlarmClock />} label="Reminder">
            <Select value={draft.reminderOffset === null ? "none" : String(draft.reminderOffset)} onValueChange={setReminder} disabled={!draft.dueDate}>
              <SelectTrigger className="w-full"><SelectValue placeholder={draft.dueDate ? "None" : "Set a date first"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No reminder</SelectItem>
                {reminderOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<Repeat />} label="Repeat">
            <Select value={draft.recurrence} onValueChange={(v) => set("recurrence", v as Recurrence)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((r) => (
                  <SelectItem key={r} value={r}>{RECURRENCE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<Folder />} label="Project">
            <Select value={draft.projectId ?? "inbox"} onValueChange={(v) => set("projectId", v === "inbox" ? null : v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inbox">Inbox</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    <span className="size-2.5 rounded-full" style={{ background: p.color }} /> {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<KanbanSquare />} label="Status">
            <Select value={draft.status} onValueChange={(v) => set("status", v as TaskStatus)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field icon={<Flag />} label="Priority">
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as Priority[]).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={draft.priority === p ? "secondary" : "outline"}
                className={cn(draft.priority === p && "ring-2 ring-ring/40")}
                onClick={() => set("priority", p)}
              >
                <Flag className={PRIORITY_META[p].text} />
                {PRIORITY_META[p].label}
              </Button>
            ))}
          </div>
        </Field>

        <Field icon={<Tag />} label="Tags">
          <div className="flex flex-wrap items-center gap-1.5">
            {draft.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-2.5 text-xs text-primary">
                #{t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", draft.tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-primary/20">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="Add tag"
              className="h-8 w-28 rounded-full"
            />
          </div>
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Subtasks</Label>
            {draft.subtasks.length > 0 && <span className="text-xs text-muted-foreground">{subDone}/{draft.subtasks.length}</span>}
          </div>
          {draft.subtasks.length > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(subDone / draft.subtasks.length) * 100}%` }} />
            </div>
          )}
          <ul className="space-y-1">
            {draft.subtasks.map((s) => (
              <li key={s._id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/60">
                <Checkbox
                  checked={s.completed}
                  onCheckedChange={(c) => set("subtasks", draft.subtasks.map((x) => (x._id === s._id ? { ...x, completed: c === true } : x)))}
                />
                <input
                  value={s.title}
                  onChange={(e) => set("subtasks", draft.subtasks.map((x) => (x._id === s._id ? { ...x, title: e.target.value } : x)))}
                  className={cn("flex-1 bg-transparent text-sm outline-none", s.completed && "text-muted-foreground line-through")}
                />
                <button type="button" aria-label="Remove subtask" onClick={() => set("subtasks", draft.subtasks.filter((x) => x._id !== s._id))} className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubtask();
                }
              }}
              placeholder="Add a subtask"
            />
            <Button type="button" variant="outline" size="icon" onClick={addSubtask} aria-label="Add subtask">
              <Plus />
            </Button>
          </div>
        </div>
      </div>

      <Separator />
      <DrawerFooter className="flex-row items-center pb-safe">
        <span className="text-xs text-muted-foreground">Created {timeAgo(task.createdAt)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-destructive hover:text-destructive"
          onClick={() => {
            onDone();
            remove(task);
          }}
        >
          <Trash2 /> Delete
        </Button>
        <Button size="sm" onClick={onDone}>Done</Button>
      </DrawerFooter>
    </>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
