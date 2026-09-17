import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const isoDate = z.string().datetime({ offset: true }).or(z.string().datetime());

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  timezone: z.string().max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });

export const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});

const subtask = z.object({
  _id: z.string().optional(),
  title: z.string().trim().min(1).max(300),
  completed: z.boolean().default(false),
});

const taskFields = {
  title: z.string().trim().min(1, "Title is required").max(500),
  notes: z.string().max(10000),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  status: z.enum(["todo", "in_progress", "done"]),
  dueDate: isoDate.nullable(),
  hasTime: z.boolean(),
  remindAt: isoDate.nullable(),
  reminderOffset: z.number().int().min(0).max(60 * 24 * 30).nullable(),
  recurrence: z.enum(["none", "daily", "weekdays", "weekly", "monthly", "yearly"]),
  projectId: objectId.nullable(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20),
  subtasks: z.array(subtask).max(100),
  order: z.number(),
};

export const taskCreateSchema = z.object({
  ...taskFields,
  notes: taskFields.notes.default(""),
  priority: taskFields.priority.default(4),
  status: taskFields.status.default("todo"),
  dueDate: taskFields.dueDate.default(null),
  hasTime: taskFields.hasTime.default(false),
  remindAt: taskFields.remindAt.default(null),
  reminderOffset: taskFields.reminderOffset.default(null),
  recurrence: taskFields.recurrence.default("none"),
  projectId: taskFields.projectId.default(null),
  tags: taskFields.tags.default([]),
  subtasks: taskFields.subtasks.default([]),
  order: taskFields.order.default(0),
});

// No defaults here: absent fields must stay untouched on update.
export const taskUpdateSchema = z.object({ ...taskFields, completed: z.boolean() }).partial();

const projectFields = {
  name: z.string().trim().min(1, "Name is required").max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: z.string().max(16),
  order: z.number(),
  archived: z.boolean(),
};

export const projectSchema = z.object({
  ...projectFields,
  color: projectFields.color.default("#6366f1"),
  icon: projectFields.icon.default("📁"),
  order: projectFields.order.default(0),
  archived: projectFields.archived.default(false),
});

export const projectUpdateSchema = z.object(projectFields).partial();

export const prefsSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    theme: z.enum(["system", "light", "dark"]),
    emailReminders: z.boolean(),
    overdueAlerts: z.boolean(),
    dailyDigest: z.boolean(),
    digestHour: z.number().int().min(0).max(23),
    timezone: z.string().max(64),
    defaultReminder: z.number().int().min(0).max(60 * 24 * 7).nullable(),
    pushEnabled: z.boolean(),
    focusMinutes: z.number().int().min(5).max(120),
    breakMinutes: z.number().int().min(1).max(60),
  })
  .partial();

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});
