import { z } from "zod";
import { Types } from "mongoose";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { NotificationModel, type NotificationDoc } from "@/lib/models/Notification";
import { serializeNotification } from "@/lib/serialize";

export const GET = handler(async () => {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    NotificationModel.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100).lean<NotificationDoc[]>(),
    NotificationModel.countDocuments({ userId: user._id, read: false }),
  ]);
  return ok({ notifications: items.map(serializeNotification), unread });
});

const patchSchema = z.object({
  ids: z.array(z.string().refine((id) => Types.ObjectId.isValid(id))).optional(),
  all: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request) => {
  const user = await requireUser();
  const { ids, all } = patchSchema.parse(await req.json());
  const filter = all ? { userId: user._id } : { userId: user._id, _id: { $in: ids ?? [] } };
  await NotificationModel.updateMany(filter, { $set: { read: true } });
  return ok({ ok: true });
});

export const DELETE = handler(async () => {
  const user = await requireUser();
  await NotificationModel.deleteMany({ userId: user._id });
  return ok({ ok: true });
});
