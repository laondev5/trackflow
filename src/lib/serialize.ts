import "server-only";
import type { AppNotification, Project, PublicUser, Task } from "./types";
import type { TaskDoc } from "./models/Task";
import type { ProjectDoc } from "./models/Project";
import type { UserDoc } from "./models/User";
import type { NotificationDoc } from "./models/Notification";

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export function serializeTask(t: TaskDoc): Task {
  return {
    _id: String(t._id),
    title: t.title,
    notes: t.notes ?? "",
    priority: (t.priority ?? 4) as Task["priority"],
    status: (t.status ?? "todo") as Task["status"],
    completed: !!t.completed,
    completedAt: iso(t.completedAt),
    dueDate: iso(t.dueDate),
    hasTime: !!t.hasTime,
    remindAt: iso(t.remindAt),
    reminderOffset: t.reminderOffset ?? null,
    recurrence: (t.recurrence ?? "none") as Task["recurrence"],
    projectId: t.projectId ? String(t.projectId) : null,
    tags: t.tags ?? [],
    subtasks: (t.subtasks ?? []).map((s) => ({
      _id: String((s as { _id?: unknown })._id),
      title: s.title,
      completed: !!s.completed,
    })),
    order: t.order ?? 0,
    createdAt: iso((t as { createdAt?: Date }).createdAt)!,
    updatedAt: iso((t as { updatedAt?: Date }).updatedAt)!,
  };
}

export function serializeProject(p: ProjectDoc): Project {
  return {
    _id: String(p._id),
    name: p.name,
    color: p.color ?? "#6366f1",
    icon: p.icon ?? "📁",
    order: p.order ?? 0,
    archived: !!p.archived,
  };
}

export function serializeUser(u: UserDoc): PublicUser {
  const p: Partial<NonNullable<UserDoc["prefs"]>> = u.prefs ?? {};
  return {
    _id: String(u._id),
    name: u.name,
    email: u.email,
    createdAt: iso((u as { createdAt?: Date }).createdAt)!,
    prefs: {
      theme: (p.theme ?? "system") as PublicUser["prefs"]["theme"],
      emailReminders: p.emailReminders ?? true,
      overdueAlerts: p.overdueAlerts ?? true,
      dailyDigest: p.dailyDigest ?? true,
      digestHour: p.digestHour ?? 8,
      timezone: p.timezone ?? "UTC",
      defaultReminder: p.defaultReminder ?? null,
      pushEnabled: p.pushEnabled ?? false,
      focusMinutes: p.focusMinutes ?? 25,
      breakMinutes: p.breakMinutes ?? 5,
    },
  };
}

export function serializeNotification(n: NotificationDoc): AppNotification {
  return {
    _id: String(n._id),
    type: n.type as AppNotification["type"],
    title: n.title,
    body: n.body ?? "",
    taskId: n.taskId ? String(n.taskId) : null,
    read: !!n.read,
    createdAt: iso((n as { createdAt?: Date }).createdAt)!,
  };
}
