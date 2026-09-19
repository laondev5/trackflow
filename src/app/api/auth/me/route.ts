import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { serializeUser } from "@/lib/serialize";
import { isMailConfigured } from "@/lib/mailer";
import { isPushConfigured } from "@/lib/push";
import { triggerReminderSweep } from "@/lib/reminder-trigger";

export const maxDuration = 60;

export const GET = handler(async () => {
  const user = await requireUser();
  triggerReminderSweep();
  return ok({
    user: serializeUser(user),
    features: { email: isMailConfigured(), push: isPushConfigured() },
  });
});
