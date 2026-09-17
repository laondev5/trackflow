import { AlarmClock, CalendarX2, Flag, Repeat, TriangleAlert, type LucideIcon } from "lucide-react";
import { isOverdue } from "./dates";
import type { Task } from "./types";

export interface SmartFilter {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  match: (t: Task) => boolean;
}

export const FILTERS: SmartFilter[] = [
  { slug: "overdue", label: "Overdue", description: "Past their due date and not done", icon: TriangleAlert, color: "text-destructive", match: (t) => isOverdue(t) },
  { slug: "urgent", label: "Urgent & high priority", description: "Priority 1 and 2", icon: Flag, color: "text-red-500", match: (t) => t.priority <= 2 },
  { slug: "no-date", label: "No due date", description: "Someday tasks waiting for a plan", icon: CalendarX2, color: "text-muted-foreground", match: (t) => !t.dueDate },
  { slug: "reminders", label: "With reminders", description: "Tasks that will notify you", icon: AlarmClock, color: "text-amber-500", match: (t) => !!t.remindAt },
  { slug: "recurring", label: "Repeating", description: "Habits and recurring chores", icon: Repeat, color: "text-blue-500", match: (t) => t.recurrence !== "none" },
];
