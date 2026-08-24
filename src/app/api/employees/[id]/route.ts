import { NextResponse } from "next/server";

import { requireApiHotel, toErrorResponse } from "@/lib/api";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { assertDepartmentBelongsToHotel, assertRoleBelongsToHotel } from "@/lib/guards";
import { employeeUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      hotelId: auth.hotelId,
    },
    include: {
      department: true,
      role: true,
      shiftAssignments: {
        include: {
          shift: true,
        },
        orderBy: {
          date: "desc",
        },
        take: 10,
      },
      attendance: {
        orderBy: {
          date: "desc",
        },
        take: 10,
      },
    },
  });

  // Scoping the lookup by hotel means a valid id from another tenant is
  // indistinguishable from one that does not exist.
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = employeeUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  try {
    await Promise.all([
      data.departmentId === undefined
        ? Promise.resolve()
        : assertDepartmentBelongsToHotel(auth.hotelId, data.departmentId),
      data.roleId === undefined
        ? Promise.resolve()
        : assertRoleBelongsToHotel(auth.hotelId, data.roleId),
    ]);

    // updateMany keeps the hotel filter in the WHERE clause, so a mismatched
    // tenant updates zero rows instead of someone else's employee.
    const result = await prisma.employee.updateMany({
      where: {
        id,
        hotelId: auth.hotelId,
      },
      data: {
        ...(data.employeeCode === undefined ? {} : { employeeCode: data.employeeCode }),
        ...(data.firstName === undefined ? {} : { firstName: data.firstName }),
        ...(data.lastName === undefined ? {} : { lastName: data.lastName }),
        ...(data.email === undefined ? {} : { email: data.email }),
        ...(data.phone === undefined ? {} : { phone: data.phone ?? null }),
        ...(data.status === undefined ? {} : { status: data.status }),
        ...(data.hireDate === undefined ? {} : { hireDate: parseDateInput(data.hireDate) }),
        ...(data.departmentId === undefined ? {} : { departmentId: data.departmentId ?? null }),
        ...(data.roleId === undefined ? {} : { roleId: data.roleId ?? null }),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        hotelId: auth.hotelId,
      },
      include: {
        department: true,
        role: true,
      },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiHotel();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const result = await prisma.employee.deleteMany({
    where: {
      id,
      hotelId: auth.hotelId,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: id });
}
