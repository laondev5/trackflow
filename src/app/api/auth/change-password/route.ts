import bcrypt from "bcryptjs";
import { User } from "@/lib/models/User";
import { requireUser } from "@/lib/auth";
import { fail, handler, ok } from "@/lib/api-helpers";
import { changePasswordSchema } from "@/lib/validators";

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { currentPassword, newPassword } = changePasswordSchema.parse(await req.json());
  const user = await User.findById(me._id).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return fail(400, "Current password is incorrect");
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  return ok({ ok: true });
});
