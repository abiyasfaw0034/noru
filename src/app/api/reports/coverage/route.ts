import { NextResponse } from "next/server";

import { parseDaysParam, requireApiHotel } from "@/lib/api";
import { getShiftCoverageReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const days = parseDaysParam(new URL(request.url).searchParams.get("days"), 7, 30);
  const rows = await getShiftCoverageReport(auth.hotelId, days);
  const gaps = rows.filter((row) => row.gap > 0);

  return NextResponse.json({
    days,
    totalShiftSlots: rows.length,
    understaffedSlots: gaps.length,
    staffShortfall: gaps.reduce((total, row) => total + row.gap, 0),
    rows,
  });
}
