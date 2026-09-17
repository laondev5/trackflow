// Runs once when the Next.js server starts.
// With ENABLE_INTERNAL_CRON=true the reminder job runs every minute inside the server process —
// ideal for `next dev`, `next start`, Docker, Railway, Render, a VPS, etc.
// On serverless (Vercel) leave it off and use vercel.json cron or an external cron hitting /api/cron/reminders.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_INTERNAL_CRON !== "true") return;

  const g = globalThis as unknown as { __tfCron?: NodeJS.Timeout };
  if (g.__tfCron) return;

  const { runReminderJob } = await import("./lib/reminders");
  const tick = async () => {
    try {
      const r = await runReminderJob();
      if (r.reminders || r.overdue || r.digests || r.errors) console.log("[cron] reminders", r);
    } catch (err) {
      console.error("[cron] reminder job failed:", (err as Error).message);
    }
  };
  g.__tfCron = setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
  console.log("[cron] internal reminder scheduler started (every 60s)");
}
