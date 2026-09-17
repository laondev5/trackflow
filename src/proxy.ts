import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
const PUBLIC_PAGES = ["/offline"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (isAuthPage) {
    // Logged-in users don't need the login screen (reset links still work).
    if (userId && !pathname.startsWith("/reset-password")) {
      return NextResponse.redirect(new URL("/today", req.url));
    }
    return NextResponse.next();
  }

  if (!userId) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (pathname === "/") return NextResponse.redirect(new URL("/today", req.url));
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static/PWA assets.
  matcher: ["/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|icons|icon|apple-icon|favicon\\.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt|xml)$).*)"],
};
