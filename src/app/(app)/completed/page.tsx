"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, Trash2 } from "lucide-react";
import { dayKey, formatFullDay, relativeDay } from "@/lib/dates";
import { useTaskStore } from "@/store/tasks";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList } from "@/components/task/task-list";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CompletedPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const clearCompleted = useTaskStore((s) => s.clearCompleted);

  const groups = useMemo(() => {
    const done = tasks
      .filter((t) => t.completed && t.completedAt)
      .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
    const map = new Map<string, typeof done>();
    done.forEach((t) => {
      const k = dayKey(t.completedAt!);
      map.set(k, [...(map.get(k) ?? []), t]);
    });
    return [...map.entries()];
  }, [tasks]);

  const count = groups.reduce((n, [, g]) => n + g.length, 0);

  return (
    <>
      <PageHeader
        title="Completed"
        subtitle={`${count} task${count === 1 ? "" : "s"} in the last 90 days`}
        actions={
          count > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Clear completed"><Trash2 /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear completed tasks?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently deletes {count} completed tasks and resets your stats history.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => clearCompleted().then(() => toast.success("Cleared"), (e) => toast.error(e.message))}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }
      />
      {count === 0 ? (
        <EmptyState icon={<CheckCircle2 />} title="No completed tasks yet" description="Finished tasks will be collected here." />
      ) : (
        <div className="space-y-6">
          {groups.map(([key, items]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold">
                {relativeDay(items[0].completedAt!)}
                <span className="ml-2 font-normal text-muted-foreground">{formatFullDay(items[0].completedAt!)}</span>
              </h2>
              <TaskList tasks={items} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
