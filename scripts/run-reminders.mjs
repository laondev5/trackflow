// Trigger the reminder job manually or from any external scheduler (cron, GitHub Actions, cron-job.org):
//   APP_URL=https://your-app.com CRON_SECRET=xxx node scripts/run-reminders.mjs
const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}
const res = await fetch(`${base}/api/cron/reminders`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
console.log(res.status, await res.text());
process.exit(res.ok ? 0 : 1);
