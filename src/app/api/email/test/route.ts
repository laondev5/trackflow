import { requireUser } from "@/lib/auth";
import { clientIp, fail, handler, ok, rateLimit } from "@/lib/api-helpers";
import { isMailConfigured, reminderEmail, sendMail } from "@/lib/mailer";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`testmail:${clientIp(req)}`, 3, 10 * 60_000);
  if (!isMailConfigured()) return fail(501, "Email (SMTP) is not configured on the server");
  const mail = reminderEmail(
    user.name,
    { title: "This is a test reminder ✅", dueDate: new Date(), hasTime: true, priority: 2 },
    user.prefs?.timezone || "UTC"
  );
  await sendMail({ to: user.email, ...mail });
  return ok({ ok: true, message: `Test email sent to ${user.email}` });
});
