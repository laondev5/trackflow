"use client";

import { toast } from "sonner";
import { AlertTriangle, CalendarClock, PartyPopper, Plus, Sun } from "lucide-react";
import { endOfDay, greeting } from "@/lib/dates";
import { useTodayView } from "@/hooks/use-task-views";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { useUI } from "@/store/ui";
import { PageHeader } from "@/components/layout/page-header";
import { TaskSection } from "@/components/task/task-list";
import { TaskSkeleton } from "@/components/task/task-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ProgressRing } from "@/components/progress-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TodayPage() {
  const { overdue, today, doneToday } = useTodayView();
  const loaded = useTaskStore((s) => s.loaded);
  const hasCache = useTaskStore((s) => s.tasks.length > 0);
  const rescheduleMany = useTaskStore((s) => s.rescheduleMany);
  const name = useSession((s) => s.user?.name?.split(" ")[0]);
  const openQuickAdd = useUI((s) => s.openQuickAdd);

  const total = today.length + doneToday.length;
  const pct = total ? (doneToday.length / total) * 100 : 0;
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  const rescheduleOverdue = async () => {
    const ids = overdue.map((t) => t._id);
    try {
      await rescheduleMany(ids, endOfDay(new Date()));
      toast.success(`Moved ${ids.length} task${ids.length > 1 ? "s" : ""} to today`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="Today" subtitle={dateLabel} />

      <Card className="mb-6 flex-row items-center gap-4 border-none bg-gradient-to-br from-primary to-indigo-700 p-4 text-primary-foreground shadow-lg shadow-primary/20 dark:text-white">
        <div className="flex-1">
          <p className="text-sm opacity-80">{greeting()}{name ? `, ${name}` : ""} 👋</p>
          <p className="mt-1 text-lg font-semibold">
            {total === 0
              ? "Nothing scheduled today"
              : doneToday.length === total
                ? "All done for today!"
                : `${today.length} task${today.length === 1 ? "" : "s"} left today`}
          </p>
          {overdue.length > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm opacity-90">
              <AlertTriangle className="size-4" /> {overdue.length} overdue
            </p>
          )}
        </div>
        <div className="rounded-full bg-white/15 p-1 [&_.stroke-muted]:stroke-white/25 [&_.stroke-primary]:stroke-white">
          <ProgressRing value={pct} size={64} label={`${doneToday.length}/${total}`} />
        </div>
      </Card>

      {!loaded && !hasCache ? (
        <TaskSkeleton />
      ) : (
        <>
          <TaskSection
            title="Overdue"
            tone="danger"
            tasks={overdue}
            collapsible
            action={
              <Button variant="ghost" size="sm" className="text-primary" onClick={rescheduleOverdue}>
                <CalendarClock /> Move to today
              </Button>
            }
          />

          <TaskSection title="Today" tasks={today} />

          {today.length === 0 && overdue.length === 0 && (
            <EmptyState
              icon={doneToday.length ? <PartyPopper /> : <Sun />}
              title={doneToday.length ? "You crushed it today!" : "Your day is clear"}
              description={doneToday.length ? "Every task for today is complete. Enjoy the rest of your day." : "Add something you want to get done today."}
              action={
                <Button onClick={() => openQuickAdd({ dueDate: endOfDay().toISOString() })}>
                  <Plus /> Add task
                </Button>
              }
            />
          )}

          <TaskSection title="Completed today" tone="muted" tasks={doneToday} collapsible defaultOpen={false} />
        </>
      )}
    </>
  );
}
