import { NextResponse } from "next/server";

import { getHotelContext } from "@/lib/tenant";

/**
 * Every API route resolves the caller's active hotel before touching data.
 * `proxy.ts` already rejects unauthenticated requests, so this is the second
 * layer: it also covers an authenticated user who has no hotel access at all.
 */
type ApiHotelResult =
  | { ok: true; hotelId: string }
  | { ok: false; response: NextResponse };

export async function requireApiHotel(): Promise<ApiHotelResult> {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required or no hotel access." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, hotelId: activeHotel.id };
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Turns the two failures callers actually hit into meaningful status codes:
 * a duplicate employee code or email (409) and a rejected tenant guard (422).
 * Anything else is genuinely unexpected and surfaces as a 500.
 */
export function toErrorResponse(error: unknown) {
  if (isUniqueConstraintError(error)) {
    return NextResponse.json(
      { error: "An employee with that code or email already exists in this hotel." },
      { status: 409 },
    );
  }

  if (error instanceof Error && error.message.includes("does not belong to the active hotel")) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  console.error(error);

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}

/**
 * Clamps a caller-supplied `days` window so a report cannot be asked to scan an
 * unbounded range.
 */
export function parseDaysParam(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}
