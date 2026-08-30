import { NextResponse } from "next/server";

import { requireApiHotel, toErrorResponse } from "@/lib/api";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  buildEmployeeWhere,
  parseEmployeeFilters,
  parseEmployeePagination,
  resolvePage,
} from "@/lib/employee-filters";
import { assertDepartmentBelongsToHotel, assertRoleBelongsToHotel } from "@/lib/guards";
import { employeeFormSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const { hotelId } = auth;

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = parseEmployeeFilters(params);
  const where = buildEmployeeWhere(hotelId, filters);

  const matchingCount = await prisma.employee.count({ where });
  const page = resolvePage(parseEmployeePagination(params), matchingCount);

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: true,
      role: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: page.skip,
    take: page.take,
  });

  return NextResponse.json({
    count: employees.length,
    total: matchingCount,
    page: page.page,
    perPage: page.perPage,
    totalPages: page.totalPages,
    filters,
    employees,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const { hotelId } = auth;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = employeeFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const departmentId = data.departmentId ?? null;
  const roleId = data.roleId ?? null;

  try {
    // The client supplies these ids, so they are verified against the active
    // hotel before use — the same guard the server actions run.
    await Promise.all([
      assertDepartmentBelongsToHotel(hotelId, departmentId),
      assertRoleBelongsToHotel(hotelId, roleId),
    ]);

    const employee = await prisma.employee.create({
      data: {
        hotelId,
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? null,
        status: data.status,
        hireDate: parseDateInput(data.hireDate),
        departmentId,
        roleId,
      },
      include: {
        department: true,
        role: true,
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
