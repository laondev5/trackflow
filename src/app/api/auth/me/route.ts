import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { serializeUser } from "@/lib/serialize";
import { isMailConfigured } from "@/lib/mailer";
import { isPushConfigured } from "@/lib/push";

export const GET = handler(async () => {
  const user = await requireUser();
  return ok({
    user: serializeUser(user),
    features: { email: isMailConfigured(), push: isPushConfigured() },
  });
});
