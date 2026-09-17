"use client";

import { useMemo, useRef } from "react";
import { CalendarRange, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, dayKey, endOfDay, formatFullDay, relativeDay, startOfDay } from "@/lib/dates";
import { sortTasks } from "@/hooks/use-task-views";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList } from "@/components/task/task-list";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const DAYS = 14;

export default function UpcomingPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const { days, later } = useMemo(() => {
    const open = tasks.filter((t) => !t.completed && t.dueDate);
    const start = startOfDay();
    const days = Array.from({ length: DAYS }, (_, i) => {
      const date = addDays(start, i);
      const key = dayKey(date);
      return { date, key, tasks: sortTasks(open.filter((t) => dayKey(t.dueDate!) === key)) };
    });
    const horizon = addDays(start, DAYS).getTime();
    const later = sortTasks(open.filter((t) => new Date(t.dueDate!).getTime() >= horizon), "due");
    return { days, later };
  }, [tasks]);

  const total = days.reduce((n, d) => n + d.tasks.length, 0) + later.length;

  return (
    <>
      <PageHeader title="Upcoming" subtitle={`${total} scheduled task${total === 1 ? "" : "s"}`} />

      {/* Date strip */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => refs.current[d.key]?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={cn(
              "flex w-12 shrink-0 flex-col items-center rounded-xl border py-2 text-xs transition-colors hover:bg-muted",
              d.key === dayKey(new Date()) && "border-primary bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            <span className="opacity-70">{new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(d.date)}</span>
            <span className="text-base font-semibold">{d.date.getDate()}</span>
            <span className={cn("mt-0.5 size-1.5 rounded-full", d.tasks.length ? "bg-current" : "bg-transparent")} />
          </button>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<CalendarRange />}
          title="Nothing coming up"
          description="Tasks with due dates in the future will show up here."
          action={<Button onClick={() => openQuickAdd({ dueDate: endOfDay(addDays(new Date(), 1)).toISOString() })}><Plus /> Plan tomorrow</Button>}
        />
      ) : (
        <div className="space-y-6">
          {days.map((d) => (
            <section key={d.key} ref={(el) => { refs.current[d.key] = el; }} className="scroll-mt-20">
              <div className="mb-2 flex items-baseline justify-between border-b pb-1.5">
                <h2 className="text-sm font-semibold">
                  {relativeDay(d.date)}
                  <span className="ml-2 font-normal text-muted-foreground">{formatFullDay(d.date)}</span>
                </h2>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary"
                  aria-label={`Add task on ${formatFullDay(d.date)}`}
                  onClick={() => openQuickAdd({ dueDate: endOfDay(d.date).toISOString() })}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {d.tasks.length ? <TaskList tasks={d.tasks} /> : <p className="py-1 text-xs text-muted-foreground/70">No tasks</p>}
            </section>
          ))}
          {later.length > 0 && (
            <section>
              <h2 className="mb-2 border-b pb-1.5 text-sm font-semibold">Later</h2>
              <TaskList tasks={later} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
