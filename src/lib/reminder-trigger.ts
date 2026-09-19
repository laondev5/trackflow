import "server-only";
import { after } from "next/server";
import { connectDB } from "./db";
import { JobLock } from "./models/JobLock";
import { runReminderJob } from "./reminders";

/**
 * Serverless-friendly scheduler: instead of an external cron, the reminder job
 * piggybacks on normal app traffic. Open clients poll /api/notifications every
 * 60s, so while anyone is using the app, reminders, overdue alerts and daily
 * plans go out within about a minute.
 *
 * The job runs in `after()` so it never slows down the response, and a
 * MongoDB lock ensures it runs at most once per interval across all instances.
 */
const INTERVAL_MS = 60_000;
const LOCAL_THROTTLE_MS = 20_000; // avoid hitting the DB lock on every request in a warm instance

const g = globalThis as unknown as { __tfLastSweepCheck?: number };

async function claimRun() {
  const now = new Date();
  try {
    const doc = await JobLock.findOneAndUpdate(
      { _id: "reminders", $or: [{ lastRunAt: null }, { lastRunAt: { $lt: new Date(now.getTime() - INTERVAL_MS) } }] },
      { $set: { lastRunAt: now } },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return !!doc;
  } catch (err) {
    // Lock exists and was run recently → the upsert collides on _id. Not our turn.
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

export async function sweepRemindersIfDue() {
  await connectDB();
  if (!(await claimRun())) return null;
  const started = Date.now();
  const result = await runReminderJob();
  await JobLock.updateOne(
    { _id: "reminders" },
    { $set: { lastResult: { ...result, ms: Date.now() - started, at: new Date() } } }
  ).catch(() => {});
  if (result.reminders || result.overdue || result.digests || result.errors) {
    console.log("[reminders] sweep", result);
  }
  return result;
}

/** Call from any route handler; the work happens after the response is sent. */
export function triggerReminderSweep() {
  const now = Date.now();
  if (g.__tfLastSweepCheck && now - g.__tfLastSweepCheck < LOCAL_THROTTLE_MS) return;
  g.__tfLastSweepCheck = now;
  after(async () => {
    try {
      await sweepRemindersIfDue();
    } catch (err) {
      console.error("[reminders] sweep failed:", (err as Error).message);
    }
  });
}
