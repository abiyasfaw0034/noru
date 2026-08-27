import { NextResponse } from "next/server";

import { getAttendanceReport } from "@/lib/reports";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return NextResponse.json({ error: "Authentication required or no hotel access." }, { status: 401 });
  }

  const report = await getAttendanceReport(activeHotel.id, 30);

  return NextResponse.json({ report });
}
