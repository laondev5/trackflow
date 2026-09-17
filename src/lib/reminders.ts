import "server-only";
import { connectDB } from "./db";
import { TaskModel } from "./models/Task";
import { User, type UserDoc } from "./models/User";
import { NotificationModel } from "./models/Notification";
import { digestEmail, overdueEmail, reminderEmail, sendMail, type MailTask } from "./mailer";
import { sendPushToUser } from "./push";

const HOUR = 3_600_000;

export interface ReminderRunResult {
  reminders: number;
  overdue: number;
  digests: number;
  emailsSent: number;
  errors: number;
}

function localParts(tz: string, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return { dateKey: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
  } catch {
    return { dateKey: date.toISOString().slice(0, 10), hour: date.getUTCHours() };
  }
}

const toMailTask = (t: { title: string; dueDate?: Date | null; hasTime?: boolean | null; priority?: number | null }): MailTask => ({
  title: t.title,
  dueDate: t.dueDate ?? null,
  hasTime: !!t.hasTime,
  priority: t.priority ?? 4,
});

let running = false;

/** Idempotent job: safe to call every minute from cron, Vercel, or the in-process scheduler. */
export async function runReminderJob(now = new Date()): Promise<ReminderRunResult> {
  const result: ReminderRunResult = { reminders: 0, overdue: 0, digests: 0, emailsSent: 0, errors: 0 };
  if (running) return result;
  running = true;
  try {
    await connectDB();
    const userCache = new Map<string, UserDoc | null>();
    const getUser = async (id: string) => {
      if (!userCache.has(id)) {
        userCache.set(id, await User.findById(id).lean<UserDoc>());
      }
      return userCache.get(id)!;
    };

    // ---------- 1. Due reminders ----------
    const dueReminders = await TaskModel.find({
      completed: false,
      reminderSent: false,
      remindAt: { $ne: null, $lte: now },
    })
      .limit(500)
      .lean();

    for (const task of dueReminders) {
      // Atomically claim so parallel runs never double-send.
      const claim = await TaskModel.updateOne({ _id: task._id, reminderSent: false }, { $set: { reminderSent: true } });
      if (claim.modifiedCount !== 1) continue;
      const user = await getUser(String(task.userId));
      if (!user) continue;
      result.reminders++;
      const stale = now.getTime() - new Date(task.remindAt!).getTime() > 12 * HOUR;
      try {
        await NotificationModel.create({
          userId: user._id,
          type: "reminder",
          title: `Reminder: ${task.title}`,
          body: task.dueDate ? "This task is coming up soon." : "You asked to be reminded about this.",
          taskId: task._id,
        });
        if (stale) continue; // don't blast emails for reminders missed long ago (e.g. server was down)
        await sendPushToUser(user, { title: "⏰ " + task.title, body: "This task is coming up", url: "/today", tag: String(task._id) });
        if (user.prefs?.emailReminders) {
          const mail = reminderEmail(user.name, toMailTask(task), user.prefs?.timezone || "UTC");
          if (await sendMail({ to: user.email, ...mail })) result.emailsSent++;
        }
      } catch (err) {
        result.errors++;
        console.error("[reminders] reminder failed", err);
      }
    }

    // ---------- 2. Overdue alerts (batched per user) ----------
    const overdueTasks = await TaskModel.find({
      completed: false,
      overdueNotified: false,
      dueDate: { $ne: null, $lt: now },
    })
      .limit(1000)
      .lean();

    const byUser = new Map<string, typeof overdueTasks>();
    for (const t of overdueTasks) {
      const claim = await TaskModel.updateOne({ _id: t._id, overdueNotified: false }, { $set: { overdueNotified: true } });
      if (claim.modifiedCount !== 1) continue;
      const k = String(t.userId);
      byUser.set(k, [...(byUser.get(k) ?? []), t]);
    }

    for (const [userId, tasks] of byUser) {
      const user = await getUser(userId);
      if (!user || !user.prefs?.overdueAlerts) continue;
      result.overdue += tasks.length;
      try {
        await NotificationModel.insertMany(
          tasks.map((t) => ({
            userId: user._id,
            type: "overdue",
            title: `Overdue: ${t.title}`,
            body: "This task wasn't completed on time.",
            taskId: t._id,
          }))
        );
        // Only email about tasks that became overdue recently (avoid spamming on first run with old data).
        const fresh = tasks.filter((t) => now.getTime() - new Date(t.dueDate!).getTime() < 24 * HOUR);
        if (!fresh.length) continue;
        await sendPushToUser(user, {
          title: `⚠️ ${fresh.length} overdue task${fresh.length > 1 ? "s" : ""}`,
          body: fresh.map((t) => t.title).slice(0, 3).join(", "),
          url: "/today",
          tag: "overdue",
        });
        if (user.prefs?.emailReminders) {
          const mail = overdueEmail(user.name, fresh.map(toMailTask), user.prefs?.timezone || "UTC");
          if (await sendMail({ to: user.email, ...mail })) result.emailsSent++;
        }
      } catch (err) {
        result.errors++;
        console.error("[reminders] overdue failed", err);
      }
    }

    // ---------- 3. Daily digest ----------
    const digestUsers = await User.find({ "prefs.dailyDigest": true }).lean<UserDoc[]>();
    for (const user of digestUsers) {
      const tz = user.prefs?.timezone || "UTC";
      const { dateKey, hour } = localParts(tz, now);
      if (hour < (user.prefs?.digestHour ?? 8) || user.lastDigestDate === dateKey) continue;

      const claim = await User.updateOne(
        { _id: user._id, lastDigestDate: { $ne: dateKey } },
        { $set: { lastDigestDate: dateKey } }
      );
      if (claim.modifiedCount !== 1) continue;

      try {
        const endOfLocalDay = new Date(now.getTime() + (24 - hour) * HOUR);
        const open = await TaskModel.find({
          userId: user._id,
          completed: false,
          dueDate: { $ne: null, $lte: endOfLocalDay },
        })
          .sort({ priority: 1, dueDate: 1 })
          .limit(50)
          .lean();
        const overdue = open.filter((t) => localParts(tz, new Date(t.dueDate!)).dateKey < dateKey);
        const today = open.filter((t) => localParts(tz, new Date(t.dueDate!)).dateKey === dateKey);
        if (!overdue.length && !today.length) continue;

        result.digests++;
        await NotificationModel.create({
          userId: user._id,
          type: "digest",
          title: "Your daily plan",
          body: `${today.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`,
        });
        await sendPushToUser(user, {
          title: "☀️ Your daily plan",
          body: `${today.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`,
          url: "/today",
          tag: "digest",
        });
        if (user.prefs?.emailReminders) {
          const mail = digestEmail(user.name, today.map(toMailTask), overdue.map(toMailTask), tz);
          if (await sendMail({ to: user.email, ...mail })) result.emailsSent++;
        }
      } catch (err) {
        result.errors++;
        console.error("[reminders] digest failed", err);
      }
    }

    return result;
  } finally {
    running = false;
  }
}
