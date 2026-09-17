import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { createSessionCookie } from "@/lib/auth";
import { clientIp, fail, handler, ok, rateLimit } from "@/lib/api-helpers";
import { registerSchema } from "@/lib/validators";
import { sendMail, welcomeEmail } from "@/lib/mailer";
import { serializeUser } from "@/lib/serialize";

export const POST = handler(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 15 * 60_000);
  const body = registerSchema.parse(await req.json());
  await connectDB();

  if (await User.exists({ email: body.email })) return fail(409, "An account with this email already exists");

  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash: await bcrypt.hash(body.password, 12),
    prefs: { timezone: body.timezone || "UTC" },
  });

  await createSessionCookie(String(user._id));
  sendMail({ to: user.email, ...welcomeEmail(user.name) }).catch((e) => console.warn("[mail] welcome failed", e));
  return ok({ user: serializeUser(user.toObject()) }, { status: 201 });
});
