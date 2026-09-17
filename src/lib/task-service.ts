import "server-only";
import type { z } from "zod";
import { Types } from "mongoose";
import { TaskModel, type TaskDoc } from "./models/Task";
import { ProjectModel } from "./models/Project";
import { HttpError } from "./auth";
import { nextOccurrence } from "./recurrence";
import type { taskUpdateSchema } from "./validators";
import type { Recurrence } from "./types";

type TaskUpdate = z.infer<typeof taskUpdateSchema>;

export async function assertProjectOwner(userId: Types.ObjectId, projectId: string | null | undefined) {
  if (!projectId) return;
  const exists = await ProjectModel.exists({ _id: projectId, userId });
  if (!exists) throw new HttpError(400, "Project not found");
}

/** Applies an update with all the side effects (completion, recurrence, reminder resets). */
export async function updateTask(userId: Types.ObjectId, taskId: string, input: TaskUpdate, timezone: string) {
  if (!Types.ObjectId.isValid(taskId)) throw new HttpError(404, "Task not found");
  const task = await TaskModel.findOne({ _id: taskId, userId });
  if (!task) throw new HttpError(404, "Task not found");
  await assertProjectOwner(userId, input.projectId);

  // Status <-> completed are kept in sync (board view uses status, lists use completed).
  if (input.status === "done" && input.completed === undefined) input.completed = true;
  if (input.status && input.status !== "done" && task.completed && input.completed === undefined) input.completed = false;

  const wasCompleted = task.completed;
  const prevDue = task.dueDate?.getTime() ?? null;
  const prevRemind = task.remindAt?.getTime() ?? null;

  const { dueDate, remindAt, subtasks, ...rest } = input;
  task.set(rest);
  if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
  if (remindAt !== undefined) task.remindAt = remindAt ? new Date(remindAt) : null;
  if (subtasks !== undefined) task.set("subtasks", subtasks);

  if ((task.dueDate?.getTime() ?? null) !== prevDue) task.overdueNotified = false;
  if ((task.remindAt?.getTime() ?? null) !== prevRemind) task.reminderSent = false;

  let spawned: TaskDoc | null = null;

  if (input.completed === true && !wasCompleted) {
    task.completedAt = new Date();
    task.status = "done";
    task.subtasks.forEach((s) => (s.completed = true));

    const rule = (task.recurrence ?? "none") as Recurrence;
    if (rule !== "none" && task.dueDate) {
      const next = nextOccurrence(task.dueDate, rule, timezone);
      if (next) {
        const delta = next.getTime() - task.dueDate.getTime();
        spawned = (
          await TaskModel.create({
            userId,
            title: task.title,
            notes: task.notes,
            priority: task.priority,
            projectId: task.projectId,
            tags: task.tags,
            hasTime: task.hasTime,
            dueDate: next,
            remindAt: task.remindAt ? new Date(task.remindAt.getTime() + delta) : null,
            reminderOffset: task.reminderOffset,
            recurrence: rule,
            subtasks: task.subtasks.map((s) => ({ title: s.title, completed: false })),
            order: task.order,
          })
        ).toObject() as TaskDoc;
        // The completed instance is history; only the new one repeats.
        task.recurrence = "none";
      }
    }
  } else if (input.completed === false && wasCompleted) {
    task.completedAt = null;
    if (task.status === "done") task.status = "todo";
  }

  await task.save();
  return { task: task.toObject() as TaskDoc, spawned };
}
