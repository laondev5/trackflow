import { Types } from "mongoose";
import { requireUser } from "@/lib/auth";
import { fail, handler, ok } from "@/lib/api-helpers";
import { TaskModel } from "@/lib/models/Task";
import { taskUpdateSchema } from "@/lib/validators";
import { serializeTask } from "@/lib/serialize";
import { updateTask } from "@/lib/task-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = taskUpdateSchema.parse(await req.json());
  const { task, spawned } = await updateTask(user._id, id, input, user.prefs?.timezone || "UTC");
  return ok({ task: serializeTask(task), spawned: spawned ? serializeTask(spawned) : null });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return fail(404, "Task not found");
  const res = await TaskModel.deleteOne({ _id: id, userId: user._id });
  if (!res.deletedCount) return fail(404, "Task not found");
  return ok({ ok: true });
});
