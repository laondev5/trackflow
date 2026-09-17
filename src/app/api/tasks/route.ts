import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { TaskModel, type TaskDoc } from "@/lib/models/Task";
import { taskCreateSchema } from "@/lib/validators";
import { serializeTask } from "@/lib/serialize";
import { assertProjectOwner } from "@/lib/task-service";

export const GET = handler(async () => {
  const user = await requireUser();
  // Open tasks + tasks completed in the last 90 days (for stats & history).
  const since = new Date(Date.now() - 90 * 86_400_000);
  const tasks = await TaskModel.find({
    userId: user._id,
    $or: [{ completed: false }, { completedAt: { $gte: since } }],
  })
    .sort({ order: 1, createdAt: 1 })
    .lean<TaskDoc[]>();
  return ok({ tasks: tasks.map(serializeTask) });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = taskCreateSchema.parse(await req.json());
  await assertProjectOwner(user._id, input.projectId);
  const task = await TaskModel.create({
    ...input,
    userId: user._id,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    remindAt: input.remindAt ? new Date(input.remindAt) : null,
    completed: input.status === "done",
    completedAt: input.status === "done" ? new Date() : null,
  });
  return ok({ task: serializeTask(task.toObject()) }, { status: 201 });
});
