import { NextResponse } from "next/server";

import { parseDaysParam, requireApiHotel } from "@/lib/api";
import { getAttendanceReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const days = parseDaysParam(new URL(request.url).searchParams.get("days"), 30, 365);
  const report = await getAttendanceReport(auth.hotelId, days);

  return NextResponse.json({ days, count: report.length, report });
}
