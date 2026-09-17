import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { createSessionCookie } from "@/lib/auth";
import { clientIp, fail, handler, ok, rateLimit } from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validators";
import { serializeUser } from "@/lib/serialize";

export const POST = handler(async (req: Request) => {
  const body = loginSchema.parse(await req.json());
  rateLimit(`login:${clientIp(req)}:${body.email}`, 8, 15 * 60_000);
  await connectDB();

  const user = await User.findOne({ email: body.email }).select("+passwordHash");
  const valid = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
  if (!user || !valid) return fail(401, "Incorrect email or password");

  await createSessionCookie(String(user._id));
  return ok({ user: serializeUser(user.toObject()) });
});
