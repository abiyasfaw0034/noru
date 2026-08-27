import { cookies } from "next/headers";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const activeHotelCookieName = "noru.activeHotelId";

export async function getHotelContext(
  currentUser?: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;

  if (!user) {
    return {
      activeHotel: null,
      hotels: [],
      user: null,
    };
  }

  const cookieStore = await cookies();
  const hotels =
    user.systemRole === "SUPER_ADMIN"
      ? await prisma.hotel.findMany({
          orderBy: {
            name: "asc",
          },
        })
      : user.memberships.map((membership) => membership.hotel);
  const selectedHotelId = cookieStore.get(activeHotelCookieName)?.value;
  const activeHotel = hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0] ?? null;

  return {
    activeHotel,
    hotels,
    user,
  };
}

export async function setActiveHotelCookie(hotelId: string) {
  const cookieStore = await cookies();

  cookieStore.set(activeHotelCookieName, hotelId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
}

export async function requireActiveHotelId() {
  const user = await requireUser();
  const { activeHotel } = await getHotelContext(user);

  if (!activeHotel) {
    throw new Error("Create a hotel before managing employees, shifts, or attendance.");
  }

  return activeHotel.id;
}

export async function requireSuperAdmin() {
  const user = await requireUser();

  if (user.systemRole !== "SUPER_ADMIN") {
    throw new Error("Only super admins can perform this action.");
  }

  return user;
}
