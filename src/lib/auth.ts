import "server-only";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User, type UserDoc } from "./models/User";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export async function createSessionCookie(userId: string) {
  const token = await signSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<UserDoc | null> {
  const jar = await cookies();
  const userId = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  await connectDB();
  return User.findById(userId).lean<UserDoc>();
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not authenticated");
  return user;
}
