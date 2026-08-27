import { NextResponse } from "next/server";

import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";
import { employeeFormSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return NextResponse.json({ error: "Authentication required or no hotel access." }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    where: {
      hotelId: activeHotel.id,
    },
    include: {
      department: true,
      role: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return NextResponse.json({ error: "Authentication required or no hotel access." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = employeeFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const employee = await prisma.employee.create({
    data: {
      hotelId: activeHotel.id,
      employeeCode: data.employeeCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      status: data.status,
      hireDate: parseDateInput(data.hireDate),
      departmentId: data.departmentId,
      roleId: data.roleId,
    },
  });

  return NextResponse.json({ employee }, { status: 201 });
}
