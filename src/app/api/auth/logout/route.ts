import { clearSessionCookie } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";

export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ ok: true });
});
