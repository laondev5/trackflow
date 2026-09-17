export type Priority = 1 | 2 | 3 | 4; // 1 = urgent, 4 = none
export type TaskStatus = "todo" | "in_progress" | "done";
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

export interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  _id: string;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  completed: boolean;
  completedAt: string | null;
  dueDate: string | null; // ISO instant
  hasTime: boolean; // false = all-day (dueDate stored as 23:59 local)
  remindAt: string | null; // ISO instant
  reminderOffset: number | null; // minutes before due (for UI)
  recurrence: Recurrence;
  projectId: string | null;
  tags: string[];
  subtasks: Subtask[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  archived: boolean;
}

export interface UserPrefs {
  theme: "system" | "light" | "dark";
  emailReminders: boolean;
  overdueAlerts: boolean;
  dailyDigest: boolean;
  digestHour: number; // 0-23 local
  timezone: string;
  defaultReminder: number | null; // minutes before, null = none
  pushEnabled: boolean;
  focusMinutes: number;
  breakMinutes: number;
}

export interface PublicUser {
  _id: string;
  name: string;
  email: string;
  prefs: UserPrefs;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  type: "reminder" | "overdue" | "digest" | "system";
  title: string;
  body: string;
  taskId: string | null;
  read: boolean;
  createdAt: string;
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; ring: string; text: string }> = {
  1: { label: "Urgent", color: "bg-red-500", ring: "border-red-500", text: "text-red-500" },
  2: { label: "High", color: "bg-orange-500", ring: "border-orange-500", text: "text-orange-500" },
  3: { label: "Medium", color: "bg-blue-500", ring: "border-blue-500", text: "text-blue-500" },
  4: { label: "None", color: "bg-zinc-400", ring: "border-zinc-400", text: "text-zinc-400" },
};

export const PROJECT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b",
];
