"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { TaskItem } from "./task-item";

export function TaskList({
  tasks,
  showProject = true,
  className,
}: {
  tasks: Task[];
  showProject?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {tasks.map((t) => (
        <TaskItem key={t._id} task={t} showProject={showProject} />
      ))}
    </ul>
  );
}

export function TaskSection({
  title,
  tasks,
  action,
  tone,
  collapsible = false,
  defaultOpen = true,
  showProject,
}: {
  title: string;
  tasks: Task[];
  action?: React.ReactNode;
  tone?: "danger" | "muted";
  collapsible?: boolean;
  defaultOpen?: boolean;
  showProject?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!tasks.length) return null;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!collapsible}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            tone === "danger" && "text-destructive",
            tone === "muted" && "text-muted-foreground"
          )}
        >
          {collapsible && <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />}
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{tasks.length}</span>
        </button>
        {action}
      </div>
      {open && <TaskList tasks={tasks} showProject={showProject} />}
    </section>
  );
}
