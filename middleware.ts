import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { ADMIN_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/constants";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Assign an anonymous, long-lived visitor session token used to correlate
  // website activity, AI conversations and WhatsApp handoffs.
  if (!request.cookies.get(SESSION_COOKIE_NAME)) {
    response.cookies.set(SESSION_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const session = token ? await verifyAdminToken(token) : null;

    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|uploads).*)",
  ],
};
