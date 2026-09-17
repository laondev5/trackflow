import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { User, type UserDoc } from "@/lib/models/User";
import { prefsSchema } from "@/lib/validators";
import { serializeUser } from "@/lib/serialize";

export const PATCH = handler(async (req: Request) => {
  const me = await requireUser();
  const { name, ...prefs } = prefsSchema.parse(await req.json());
  const $set: Record<string, unknown> = {};
  if (name) $set.name = name;
  for (const [k, v] of Object.entries(prefs)) if (v !== undefined) $set[`prefs.${k}`] = v;
  // Changing digest time/zone lets today's digest go out at the new time.
  if (prefs.digestHour !== undefined || prefs.timezone !== undefined) $set.lastDigestDate = null;
  const user = await User.findByIdAndUpdate(me._id, { $set }, { returnDocument: "after" }).lean<UserDoc>();
  return ok({ user: serializeUser(user!) });
});
