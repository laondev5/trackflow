import "server-only";
import webpush from "web-push";
import type { Types } from "mongoose";
import { User } from "./models/User";

let configured: boolean | null = null;

export function isPushConfigured() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  return (configured = true);
}

type Sub = { endpoint: string; keys?: { p256dh?: string | null; auth?: string | null } | null };

export async function sendPushToUser(
  user: { _id: Types.ObjectId; pushSubscriptions?: Sub[] | null },
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!isPushConfigured() || !user.pushSubscriptions?.length) return;
  const dead: string[] = [];
  await Promise.all(
    user.pushSubscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys?.p256dh ?? "", auth: s.keys?.auth ?? "" } },
          JSON.stringify(payload),
          { TTL: 60 * 60 }
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
        else console.warn("[push] send failed", code);
      }
    })
  );
  if (dead.length) {
    await User.updateOne({ _id: user._id }, { $pull: { pushSubscriptions: { endpoint: { $in: dead } } } });
  }
}
