import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Wraps a route handler with uniform error handling. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message);
      if (err instanceof ZodError) {
        return fail(400, err.issues[0]?.message ?? "Invalid input", { issues: err.issues });
      }
      const name = (err as Error)?.name ?? "";
      if (/MongoServerSelectionError|MongoNetwork/.test(name)) {
        console.error("[api] database unreachable:", (err as Error).message);
        return fail(503, "Can't reach the database right now. Please try again in a moment.");
      }
      console.error("[api]", err);
      return fail(500, "Something went wrong");
    }
  };
}

// Tiny in-memory rate limiter (per server instance) for auth endpoints.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) throw new HttpError(429, "Too many attempts. Please try again in a few minutes.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
