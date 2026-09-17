import { requireUser } from "@/lib/auth";
import { fail, handler, ok } from "@/lib/api-helpers";
import { User } from "@/lib/models/User";
import { pushSubscriptionSchema } from "@/lib/validators";
import { isPushConfigured, sendPushToUser } from "@/lib/push";

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  if (!isPushConfigured()) return fail(501, "Push notifications are not configured on the server");
  const sub = pushSubscriptionSchema.parse(await req.json());
  await User.updateOne({ _id: me._id }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
  await User.updateOne(
    { _id: me._id },
    { $push: { pushSubscriptions: { $each: [sub], $slice: -10 } }, $set: { "prefs.pushEnabled": true } }
  );
  await sendPushToUser(
    { _id: me._id, pushSubscriptions: [sub] },
    { title: "🔔 Notifications on", body: "You'll get alerts for reminders and overdue tasks.", url: "/today" }
  );
  return ok({ ok: true });
});

export const DELETE = handler(async (req: Request) => {
  const me = await requireUser();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  const update = endpoint
    ? { $pull: { pushSubscriptions: { endpoint } }, $set: { "prefs.pushEnabled": false } }
    : { $set: { pushSubscriptions: [], "prefs.pushEnabled": false } };
  await User.updateOne({ _id: me._id }, update);
  return ok({ ok: true });
});
