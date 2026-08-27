import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

export const sessionCookieName = "noru.session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

type SessionClaims = {
  sub: string;
};

function getJwtSecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "noru-dev-secret-change-me");

  if (!secret) {
    throw new Error("AUTH_SECRET or JWT_SECRET is required for cookie session signing.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAgeSeconds}s`)
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.delete(sessionCookieName);
  cookieStore.delete("noru.activeHotelId");
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (!payload.sub) {
      return null;
    }

    return {
      sub: payload.sub,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const claims = await getSessionClaims();

  if (!claims) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: claims.sub,
      isActive: true,
    },
    include: {
      memberships: {
        include: {
          hotel: true,
        },
        orderBy: {
          hotel: {
            name: "asc",
          },
        },
      },
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
