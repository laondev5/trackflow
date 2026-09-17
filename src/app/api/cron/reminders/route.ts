import { fail, handler, ok } from "@/lib/api-helpers";
import { runReminderJob } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return fail(401, "Unauthorized");
  const result = await runReminderJob();
  return ok({ ok: true, ...result, at: new Date().toISOString() });
}

// Vercel Cron sends GET with "Authorization: Bearer $CRON_SECRET"
export const GET = handler(run);
export const POST = handler(run);
