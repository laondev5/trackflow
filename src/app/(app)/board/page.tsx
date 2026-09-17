"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDue, isOverdue } from "@/lib/dates";
import { sortTasks } from "@/hooks/use-task-views";
import { PRIORITY_META, type Task, type TaskStatus } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLUMNS: { status: TaskStatus; title: string; dot: string }[] = [
  { status: "todo", title: "To do", dot: "bg-zinc-400" },
  { status: "in_progress", title: "In progress", dot: "bg-amber-500" },
  { status: "done", title: "Done", dot: "bg-emerald-500" },
];

export default function BoardPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useTaskStore((s) => s.projects);
  const updateTask = useTaskStore((s) => s.updateTask);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const [projectFilter, setProjectFilter] = useState("all");
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const columns = useMemo(() => {
    const visible = tasks.filter(
      (t) =>
        (projectFilter === "all" || (projectFilter === "inbox" ? !t.projectId : t.projectId === projectFilter)) &&
        // keep the Done column focused on the last 7 days
        (!t.completed || (t.completedAt && Date.now() - new Date(t.completedAt).getTime() < 7 * 86_400_000))
    );
    return COLUMNS.map((c) => ({ ...c, tasks: sortTasks(visible.filter((t) => t.status === c.status)) }));
  }, [tasks, projectFilter]);

  const move = (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    updateTask(task._id, { status }).catch((e) => toast.error(e.message));
  };

  return (
    <>
      <PageHeader
        title="Board"
        actions={
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All tasks</SelectItem>
              <SelectItem value="inbox">Inbox</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p._id} value={p._id}>{p.icon} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {columns.map((col, ci) => (
          <section
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const task = tasks.find((t) => t._id === e.dataTransfer.getData("text/task-id"));
              if (task) move(task, col.status);
            }}
            className={cn(
              "flex w-[85%] shrink-0 snap-center flex-col rounded-2xl bg-muted/50 p-2 transition-colors md:w-auto",
              dragOver === col.status && "bg-primary/10 ring-2 ring-primary/40"
            )}
          >
            <div className="flex items-center gap-2 px-2 py-2">
              <span className={cn("size-2.5 rounded-full", col.dot)} />
              <h2 className="text-sm font-semibold">{col.title}</h2>
              <span className="text-xs text-muted-foreground">{col.tasks.length}</span>
              <button
                type="button"
                aria-label={`Add to ${col.title}`}
                className="ml-auto rounded p-1 text-muted-foreground hover:bg-background"
                onClick={() => openQuickAdd({ status: col.status, projectId: ["all", "inbox"].includes(projectFilter) ? null : projectFilter })}
              >
                <Plus className="size-4" />
              </button>
            </div>

            <ul className="flex min-h-24 flex-col gap-2">
              {col.tasks.map((t) => (
                <BoardCard
                  key={t._id}
                  task={t}
                  onPrev={ci > 0 ? () => move(t, COLUMNS[ci - 1].status) : undefined}
                  onNext={ci < COLUMNS.length - 1 ? () => move(t, COLUMNS[ci + 1].status) : undefined}
                />
              ))}
              {col.tasks.length === 0 && (
                <li className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Drop tasks here</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function BoardCard({ task, onPrev, onNext }: { task: Task; onPrev?: () => void; onNext?: () => void }) {
  const openEditor = useUI((s) => s.openEditor);
  const project = useTaskStore((s) => s.projects.find((p) => p._id === task.projectId));
  const done = task.subtasks.filter((s) => s.completed).length;

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", task._id)}
      onClick={() => openEditor(task._id)}
      className="group cursor-pointer list-none rounded-xl border bg-card p-3 shadow-xs transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_META[task.priority].color)} />
        <p className={cn("flex-1 text-sm leading-snug", task.completed && "text-muted-foreground line-through")}>{task.title}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {task.dueDate && (
          <span className={cn("inline-flex items-center gap-1", isOverdue(task) && "text-destructive")}>
            <CalendarDays className="size-3" /> {formatDue(task)}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className="inline-flex items-center gap-1"><ListChecks className="size-3" /> {done}/{task.subtasks.length}</span>
        )}
        {project && (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: project.color }} /> {project.name}
          </span>
        )}
        <span className="ml-auto flex gap-1">
          {onPrev && (
            <button type="button" aria-label="Move left" onClick={(e) => { e.stopPropagation(); onPrev(); }} className="rounded-md border p-1 hover:bg-muted">
              <ChevronLeft className="size-3.5" />
            </button>
          )}
          {onNext && (
            <button type="button" aria-label="Move right" onClick={(e) => { e.stopPropagation(); onNext(); }} className="rounded-md border p-1 hover:bg-muted">
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </span>
      </div>
    </li>
  );
}
