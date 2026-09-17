import { z } from "zod";
import { Types } from "mongoose";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { TaskModel } from "@/lib/models/Task";

const ids = z.array(z.string().refine((id) => Types.ObjectId.isValid(id), "Invalid id"));

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reschedule"),
    ids: ids.min(1).max(500),
    dueDate: z.string().datetime({ offset: true }).or(z.string().datetime()),
    hasTime: z.boolean().default(false),
  }),
  z.object({ action: z.literal("delete"), ids: ids.min(1).max(500) }),
  z.object({ action: z.literal("reorder"), ids: ids.min(1).max(1000) }),
  z.object({ action: z.literal("clearCompleted") }),
]);

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await req.json());

  switch (body.action) {
    case "reschedule":
      await TaskModel.updateMany(
        { _id: { $in: body.ids }, userId: user._id },
        {
          $set: {
            dueDate: new Date(body.dueDate),
            hasTime: body.hasTime,
            remindAt: null,
            reminderOffset: null,
            reminderSent: false,
            overdueNotified: false,
          },
        }
      );
      break;
    case "delete":
      await TaskModel.deleteMany({ _id: { $in: body.ids }, userId: user._id });
      break;
    case "reorder":
      await TaskModel.bulkWrite(
        body.ids.map((id, i) => ({
          updateOne: { filter: { _id: new Types.ObjectId(id), userId: user._id }, update: { $set: { order: i } } },
        }))
      );
      break;
    case "clearCompleted":
      await TaskModel.deleteMany({ userId: user._id, completed: true });
      break;
  }
  return ok({ ok: true });
});
