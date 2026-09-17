"use client";

import { useMemo } from "react";
import { useTaskStore } from "@/store/tasks";
import { dayKey, isDueToday, isOverdue } from "@/lib/dates";
import type { Task } from "@/lib/types";

export type SortMode = "smart" | "priority" | "due" | "created" | "alpha";

/** Smart order: overdue first, then priority, then due date/time, then manual order. */
export function sortTasks(tasks: Task[], mode: SortMode = "smart") {
  const due = (t: Task) => (t.dueDate ? new Date(t.dueDate).getTime() : Number.MAX_SAFE_INTEGER);
  const arr = [...tasks];
  switch (mode) {
    case "priority":
      return arr.sort((a, b) => a.priority - b.priority || due(a) - due(b));
    case "due":
      return arr.sort((a, b) => due(a) - due(b) || a.priority - b.priority);
    case "created":
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "alpha":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return arr.sort(
        (a, b) =>
          Number(isOverdue(b)) - Number(isOverdue(a)) ||
          a.priority - b.priority ||
          due(a) - due(b) ||
          a.order - b.order
      );
  }
}

export function useOpenTasks() {
  const tasks = useTaskStore((s) => s.tasks);
  return useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
}

export function useTodayView() {
  const tasks = useTaskStore((s) => s.tasks);
  return useMemo(() => {
    const overdue = sortTasks(tasks.filter((t) => isOverdue(t) && !isDueToday(t)));
    const today = sortTasks(tasks.filter((t) => !t.completed && isDueToday(t)));
    const doneToday = tasks.filter((t) => t.completed && t.completedAt && dayKey(t.completedAt) === dayKey(new Date()));
    return { overdue, today, doneToday };
  }, [tasks]);
}

export function useStats() {
  const tasks = useTaskStore((s) => s.tasks);
  return useMemo(() => {
    const completed = tasks.filter((t) => t.completed && t.completedAt);
    const byDay = new Map<string, number>();
    for (const t of completed) {
      const k = dayKey(t.completedAt!);
      byDay.set(k, (byDay.get(k) ?? 0) + 1);
    }

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d, count: byDay.get(dayKey(d)) ?? 0 };
    });

    // Streak: consecutive days (ending today or yesterday) with at least one completion.
    let streak = 0;
    const cursor = new Date();
    if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (byDay.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const weekAgo = Date.now() - 7 * 86_400_000;
    const completedWeek = completed.filter((t) => new Date(t.completedAt!).getTime() >= weekAgo).length;
    const open = tasks.filter((t) => !t.completed);
    const overdue = open.filter((t) => isOverdue(t)).length;
    const dueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now());
    const onTime = dueTasks.filter(
      (t) => t.completed && t.completedAt && new Date(t.completedAt).getTime() <= new Date(t.dueDate!).getTime()
    ).length;

    return {
      totalCompleted: completed.length,
      completedToday: byDay.get(dayKey(new Date())) ?? 0,
      completedWeek,
      open: open.length,
      overdue,
      streak,
      last7,
      onTimeRate: dueTasks.length ? Math.round((onTime / dueTasks.length) * 100) : 100,
      byPriority: ([1, 2, 3, 4] as const).map((p) => ({ priority: p, count: open.filter((t) => t.priority === p).length })),
    };
  }, [tasks]);
}
