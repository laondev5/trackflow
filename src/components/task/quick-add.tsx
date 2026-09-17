"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, CalendarDays, Flag, Folder, Hash, Repeat, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseQuickAdd } from "@/lib/nlp";
import { computeRemindAt, formatDue } from "@/lib/dates";
import { RECURRENCE_LABELS } from "@/lib/recurrence";
import { PRIORITY_META, type Priority } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { useUI } from "@/store/ui";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DuePicker, type DueValue } from "./due-picker";

export function QuickAdd() {
  const open = useUI((s) => s.quickAddOpen);
  const defaults = useUI((s) => s.quickAddDefaults);
  const close = useUI((s) => s.closeQuickAdd);
  const projects = useTaskStore((s) => s.projects);
  const createTask = useTaskStore((s) => s.createTask);
  const defaultReminder = useSession((s) => s.user?.prefs.defaultReminder ?? null);

  const [text, setText] = useState("");
  const [manualDue, setManualDue] = useState<DueValue | null>(null);
  const [manualPriority, setManualPriority] = useState<Priority | null>(null);
  const [manualProject, setManualProject] = useState<string | null | undefined>(undefined);
  const [showDate, setShowDate] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setManualDue(null);
      setManualPriority(null);
      setManualProject(undefined);
      setShowDate(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const parsed = useMemo(() => parseQuickAdd(text, projects), [text, projects]);

  const due: DueValue = manualDue ??
    (parsed.dueDate
      ? { dueDate: parsed.dueDate.toISOString(), hasTime: parsed.hasTime }
      : { dueDate: defaults.dueDate ?? null, hasTime: defaults.hasTime ?? false });
  const priority = manualPriority ?? parsed.priority ?? defaults.priority ?? 4;
  const projectId = manualProject !== undefined ? manualProject : parsed.projectId ?? defaults.projectId ?? null;
  const project = projects.find((p) => p._id === projectId);
  const tags = [...new Set([...(defaults.tags ?? []), ...parsed.tags])];

  const submit = async (keepOpen = false) => {
    const title = parsed.title.trim();
    if (!title) return;
    const reminderOffset = due.dueDate ? defaultReminder : null;
    const promise = createTask({
      title,
      dueDate: due.dueDate,
      hasTime: due.hasTime,
      priority,
      projectId,
      tags,
      recurrence: parsed.recurrence,
      status: defaults.status ?? "todo",
      reminderOffset,
      remindAt: computeRemindAt(due.dueDate, due.hasTime, reminderOffset),
    });
    setText("");
    setManualDue(null);
    setManualPriority(null);
    if (!keepOpen) close();
    else inputRef.current?.focus();
    try {
      await promise;
      toast.success("Task added", { description: due.dueDate ? `Due ${formatDue(due)}` : undefined });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()} repositionInputs={false}>
      <DrawerContent className="mx-auto max-w-xl">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Add task</DrawerTitle>
          <DrawerDescription>Type naturally, e.g. “Gym tomorrow 7am #health p2”</DrawerDescription>
        </DrawerHeader>
        <form
          className="flex flex-col gap-3 p-4 pb-safe"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={inputRef}
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e.metaKey || e.ctrlKey);
              }
            }}
            placeholder="e.g. Submit report Friday 3pm #work p1"
            className="w-full resize-none bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground/60"
          />

          {/* Live parse preview */}
          {(parsed.dueDate || parsed.priority || parsed.tags.length > 0 || parsed.projectName || parsed.recurrence !== "none") && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Sparkles className="size-3.5 text-primary" />
              {parsed.dueDate && <Badge variant="secondary">📅 {formatDue({ dueDate: parsed.dueDate.toISOString(), hasTime: parsed.hasTime })}</Badge>}
              {parsed.recurrence !== "none" && <Badge variant="secondary">🔁 {RECURRENCE_LABELS[parsed.recurrence]}</Badge>}
              {parsed.priority && <Badge variant="secondary">🚩 {PRIORITY_META[parsed.priority].label}</Badge>}
              {parsed.projectName && <Badge variant="secondary">📁 {parsed.projectName}</Badge>}
              {parsed.tags.map((t) => (
                <Badge key={t} variant="secondary">#{t}</Badge>
              ))}
            </div>
          )}

          {showDate && <DuePicker value={due} onChange={setManualDue} />}

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={due.dueDate ? "secondary" : "ghost"}
              size="sm"
              className={cn("rounded-full", due.dueDate && "text-primary")}
              onClick={() => setShowDate((s) => !s)}
            >
              <CalendarDays />
              {due.dueDate ? formatDue(due) : "Date"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="rounded-full">
                  <Flag className={PRIORITY_META[priority].text} />
                  <span className="hidden sm:inline">{PRIORITY_META[priority].label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                {([1, 2, 3, 4] as Priority[]).map((p) => (
                  <DropdownMenuItem key={p} onSelect={() => setManualPriority(p)}>
                    <Flag className={PRIORITY_META[p].text} /> {PRIORITY_META[p].label}
                    <span className="ml-auto text-xs text-muted-foreground">p{p}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="max-w-36 rounded-full">
                  {project ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: project.color }} /> : <Folder />}
                  <span className="truncate">{project?.name ?? "Inbox"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Project</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setManualProject(null)}>
                  <Folder /> Inbox
                </DropdownMenuItem>
                {projects.length > 0 && <DropdownMenuSeparator />}
                {projects.filter((p) => !p.archived).map((p) => (
                  <DropdownMenuItem key={p._id} onSelect={() => setManualProject(p._id)}>
                    <span className="size-2.5 rounded-full" style={{ background: p.color }} /> {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto rounded-full text-primary"
              onClick={() => useUI.getState().openAi(text)}
              title="Turn longer instructions into several tasks"
            >
              <Sparkles /> <span className="hidden sm:inline">AI</span>
            </Button>

            <Button type="submit" size="icon" className="rounded-full" disabled={!parsed.title.trim()} aria-label="Add task">
              <ArrowUp />
            </Button>
          </div>

          <p className="hidden text-xs text-muted-foreground sm:flex sm:items-center sm:gap-3">
            <span><Hash className="inline size-3" />tag</span>
            <span>@project</span>
            <span>p1–p4</span>
            <span><Repeat className="inline size-3" /> “every week”</span>
            <span className="ml-auto">Ctrl+Enter to add another</span>
          </p>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
