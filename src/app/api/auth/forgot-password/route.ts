import crypto from "node:crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { clientIp, handler, ok, rateLimit } from "@/lib/api-helpers";
import { forgotSchema } from "@/lib/validators";
import { appUrl, resetPasswordEmail, sendMail } from "@/lib/mailer";

export const POST = handler(async (req: Request) => {
  rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
  const { email } = forgotSchema.parse(await req.json());
  await connectDB();

  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    user.set({
      resetTokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      resetTokenExpires: new Date(Date.now() + 60 * 60_000),
    });
    await user.save();
    const link = `${appUrl()}/reset-password?token=${token}`;
    await sendMail({ to: user.email, ...resetPasswordEmail(user.name, link) });
  }
  // Same response either way so accounts can't be enumerated.
  return ok({ ok: true, message: "If an account exists for that email, a reset link is on its way." });
});
