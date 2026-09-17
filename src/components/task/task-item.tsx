"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlarmClock, CalendarDays, Check, CheckCircle2, ListChecks, Repeat, StickyNote, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDue, isOverdue, isDueToday } from "@/lib/dates";
import { PRIORITY_META, type Task } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";

const SWIPE_TRIGGER = 88;

export function useTaskActions() {
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const updateTask = useTaskStore((s) => s.updateTask);

  const complete = async (task: Task) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
    try {
      const nowDone = await toggleComplete(task._id);
      if (nowDone) {
        toast.success(`Completed “${task.title}”`, {
          description: task.recurrence !== "none" ? "Next occurrence scheduled" : undefined,
          action: { label: "Undo", onClick: () => updateTask(task._id, { completed: false }).catch(() => {}) },
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (task: Task) => {
    try {
      const deleted = await deleteTask(task._id);
      toast(`Deleted “${task.title}”`, {
        action: deleted ? { label: "Undo", onClick: () => restoreTask(deleted).catch((e) => toast.error(e.message)) } : undefined,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return { complete, remove };
}

export function TaskItem({ task, showProject = true, className }: { task: Task; showProject?: boolean; className?: string }) {
  const project = useTaskStore((s) => (task.projectId ? s.projects.find((p) => p._id === task.projectId) : undefined));
  const openEditor = useUI((s) => s.openEditor);
  const { complete, remove } = useTaskActions();

  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const swiped = useRef(false);

  const overdue = isOverdue(task);
  const doneSubtasks = task.subtasks.filter((s) => s.completed).length;
  const meta = PRIORITY_META[task.priority];

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return; // swipe is for touch; desktop uses buttons
    start.current = { x: e.clientX, y: e.clientY, locked: null };
    swiped.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my);
    if (s.locked) {
      swiped.current = true;
      setDx(Math.max(-140, Math.min(140, mx)));
    }
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    if (dx > SWIPE_TRIGGER) complete(task);
    else if (dx < -SWIPE_TRIGGER) remove(task);
    setDx(0);
  };

  return (
    <li className={cn("relative list-none overflow-hidden rounded-xl", className)}>
      {/* swipe backgrounds */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-between px-5 text-white transition-colors",
          dx > 0 ? "bg-emerald-500" : dx < 0 ? "bg-destructive" : "bg-transparent"
        )}
      >
        <CheckCircle2 className={cn("size-5 transition-transform", dx > SWIPE_TRIGGER && "scale-125")} />
        <Trash2 className={cn("size-5 transition-transform", dx < -SWIPE_TRIGGER && "scale-125")} />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !swiped.current && openEditor(task._id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") openEditor(task._id);
          if (e.key === " ") {
            e.preventDefault();
            complete(task);
          }
          if (e.key === "Delete") remove(task);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? "none" : "transform 200ms ease" }}
        className={cn(
          "group relative flex touch-pan-y items-start gap-3 bg-card px-3 py-3 outline-none select-none",
          "border border-border/60 rounded-xl hover:border-border focus-visible:ring-2 focus-visible:ring-ring",
          overdue && "border-l-4 border-l-destructive"
        )}
      >
        <button
          type="button"
          aria-label={task.completed ? "Mark as not done" : "Mark as done"}
          onClick={(e) => {
            e.stopPropagation();
            complete(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90",
            task.completed ? "border-emerald-500 bg-emerald-500 text-white" : cn(meta.ring, "hover:bg-muted"),
            task.priority === 1 && !task.completed && "bg-red-500/10",
            task.priority === 2 && !task.completed && "bg-orange-500/10"
          )}
        >
          <Check className={cn("size-3.5 transition-opacity", task.completed ? "opacity-100" : "opacity-0 group-hover:opacity-40")} strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn("text-[15px] leading-snug break-words", task.completed && "text-muted-foreground line-through")}>
            {task.title}
          </p>

          {(task.dueDate || task.subtasks.length > 0 || task.tags.length > 0 || task.notes || (showProject && project)) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {task.dueDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    overdue ? "font-medium text-destructive" : isDueToday(task) && !task.completed && "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  {overdue && "Overdue · "}
                  {formatDue(task)}
                </span>
              )}
              {task.remindAt && !task.completed && <AlarmClock className="size-3.5" aria-label="Has reminder" />}
              {task.recurrence !== "none" && <Repeat className="size-3.5" aria-label="Repeats" />}
              {task.subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="size-3.5" />
                  {doneSubtasks}/{task.subtasks.length}
                </span>
              )}
              {task.notes && <StickyNote className="size-3.5" aria-label="Has notes" />}
              {task.tags.map((tag) => (
                <span key={tag} className="text-primary">
                  #{tag}
                </span>
              ))}
              {showProject && project && (
                <span className="ml-auto inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: project.color }} />
                  {project.name}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Delete task"
          onClick={(e) => {
            e.stopPropagation();
            remove(task);
          }}
          className="hidden rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover:opacity-100 md:block"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
