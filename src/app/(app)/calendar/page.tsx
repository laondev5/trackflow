"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, dayKey, endOfDay, formatFullDay, isOverdue, startOfDay } from "@/lib/dates";
import { sortTasks } from "@/hooks/use-task-views";
import { PRIORITY_META } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList } from "@/components/task/task-list";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(new Date(2024, 0, 7 + i))
);

export default function CalendarPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const [month, setMonth] = useState(() => {
    const d = startOfDay();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const k = dayKey(t.dueDate);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const shift = (n: number) =>
    setMonth((m) => {
      const d = new Date(m);
      d.setMonth(d.getMonth() + n);
      return d;
    });

  const selectedDate = new Date(`${selected}T12:00:00`);
  const dayTasks = sortTasks(byDay.get(selected) ?? []);
  const open = dayTasks.filter((t) => !t.completed);
  const done = dayTasks.filter((t) => t.completed);
  const todayKey = dayKey(new Date());

  return (
    <>
      <PageHeader
        title={new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}
        actions={
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = startOfDay();
                d.setDate(1);
                setMonth(d);
                setSelected(todayKey);
              }}
            >
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></Button>
          </div>
        }
      />

      <div className="mb-6 rounded-2xl border bg-card p-2 sm:p-3">
        <div className="grid grid-cols-7 pb-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date) => {
            const key = dayKey(date);
            const items = (byDay.get(key) ?? []).filter((t) => !t.completed);
            const inMonth = date.getMonth() === month.getMonth();
            const hasOverdue = items.some((t) => isOverdue(t));
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start gap-1 rounded-xl pt-1.5 text-sm transition-colors hover:bg-muted sm:aspect-[4/3]",
                  !inMonth && "text-muted-foreground/40",
                  key === selected && "bg-primary/10 ring-2 ring-primary",
                )}
              >
                <span className={cn("grid size-7 place-items-center rounded-full", key === todayKey && "bg-primary font-semibold text-primary-foreground")}>
                  {date.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {items.slice(0, 3).map((t) => (
                      <span key={t._id} className={cn("size-1.5 rounded-full", hasOverdue ? "bg-destructive" : PRIORITY_META[t.priority].color)} />
                    ))}
                    {items.length > 3 && <span className="text-[9px] leading-none text-muted-foreground">+{items.length - 3}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{formatFullDay(selectedDate)}</h2>
        <Button size="sm" variant="outline" onClick={() => openQuickAdd({ dueDate: endOfDay(selectedDate).toISOString() })}>
          <Plus /> Add
        </Button>
      </div>
      {open.length === 0 && done.length === 0 ? (
        <EmptyState icon={<CalendarCheck />} title="No tasks this day" className="py-8" />
      ) : (
        <>
          <TaskList tasks={open} />
          {done.length > 0 && <TaskList tasks={done} className="mt-2 opacity-70" />}
        </>
      )}
    </>
  );
}
