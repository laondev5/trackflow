import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { createSessionCookie } from "@/lib/auth";
import { fail, handler, ok } from "@/lib/api-helpers";
import { resetSchema } from "@/lib/validators";

export const POST = handler(async (req: Request) => {
  const { token, password } = resetSchema.parse(await req.json());
  await connectDB();

  const user = await User.findOne({
    resetTokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    resetTokenExpires: { $gt: new Date() },
  });
  if (!user) return fail(400, "This reset link is invalid or has expired");

  user.set({ passwordHash: await bcrypt.hash(password, 12), resetTokenHash: null, resetTokenExpires: null });
  await user.save();
  await createSessionCookie(String(user._id));
  return ok({ ok: true });
});
