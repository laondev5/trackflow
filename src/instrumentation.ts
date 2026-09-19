// Runs once when the Next.js server starts.
// With ENABLE_INTERNAL_CRON=true the reminder sweep also runs every minute on a timer —
// useful for long-running servers (`next start`, Docker, a VPS) so reminders go out even when nobody has the app open.
// On Vercel/serverless this is always skipped: reminders run after normal API requests instead (src/lib/reminder-trigger.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_INTERNAL_CRON !== "true") return;
  if (process.env.VERCEL) return; // no long-lived process on serverless

  const g = globalThis as unknown as { __tfCron?: NodeJS.Timeout };
  if (g.__tfCron) return;

  const { sweepRemindersIfDue } = await import("./lib/reminder-trigger");
  const tick = async () => {
    try {
      await sweepRemindersIfDue();
    } catch (err) {
      console.error("[reminders] timer sweep failed:", (err as Error).message);
    }
  };
  g.__tfCron = setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
  console.log("[reminders] internal timer started (every 60s)");
}
