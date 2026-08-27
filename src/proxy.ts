import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const sessionCookieName = "noru.session";
const publicPaths = ["/login"];
const publicFilePattern = /\.(.*)$/;

function getJwtSecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "noru-dev-secret-change-me");

  if (!secret) {
    return null;
  }

  return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  const secret = getJwtSecret();

  if (!token || !secret) {
    return false;
  }

  try {
    await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    publicFilePattern.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.includes(pathname);
  const authenticated = await hasValidSession(request);

  if (isPublic && authenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublic && !authenticated) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
