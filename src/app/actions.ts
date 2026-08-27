"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { composeDateTimeInput, parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import {
  getHotelContext,
  requireActiveHotelId,
  requireSuperAdmin,
  setActiveHotelCookie,
} from "@/lib/tenant";
import {
  attendanceFormSchema,
  departmentFormSchema,
  employeeFormSchema,
  formEntries,
  hotelFormSchema,
  loginFormSchema,
  roleFormSchema,
  shiftAssignmentFormSchema,
  shiftFormSchema,
} from "@/lib/validation";

function normalizeNullable(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : null;
}

function loginRedirect(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return "/";
  }

  return next;
}

function invalidLoginRedirect(next: string | null | undefined) {
  const params = new URLSearchParams({ error: "invalid" });

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    params.set("next", next);
  }

  return `/login?${params.toString()}`;
}

async function assertDepartmentBelongsToHotel(hotelId: string, departmentId: string | null) {
  if (!departmentId) {
    return;
  }

  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      hotelId,
    },
    select: {
      id: true,
    },
  });

  if (!department) {
    throw new Error("Selected department does not belong to the active hotel.");
  }
}

async function assertRoleBelongsToHotel(hotelId: string, roleId: string | null) {
  if (!roleId) {
    return;
  }

  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      hotelId,
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    throw new Error("Selected role does not belong to the active hotel.");
  }
}

async function assertEmployeeBelongsToHotel(hotelId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      hotelId,
    },
    select: {
      id: true,
    },
  });

  if (!employee) {
    throw new Error("Selected employee does not belong to the active hotel.");
  }
}

async function assertShiftBelongsToHotel(hotelId: string, shiftId: string) {
  const shift = await prisma.shift.findFirst({
    where: {
      id: shiftId,
      hotelId,
    },
    select: {
      id: true,
    },
  });

  if (!shift) {
    throw new Error("Selected shift does not belong to the active hotel.");
  }
}

export async function login(formData: FormData) {
  const parsed = loginFormSchema.safeParse(formEntries(formData));

  if (!parsed.success) {
    redirect("/login?error=invalid");
  }

  const { email, password, next } = parsed.data;
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
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

  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    redirect(invalidLoginRedirect(next));
  }

  await createSession(user.id);
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const activeHotel =
    user.systemRole === "SUPER_ADMIN"
      ? await prisma.hotel.findFirst({ orderBy: { name: "asc" }, select: { id: true } })
      : (user.memberships[0]?.hotel ?? null);

  if (activeHotel) {
    await setActiveHotelCookie(activeHotel.id);
  }

  revalidatePath("/");
  redirect(loginRedirect(next));
}

export async function logout() {
  await destroySession();
  revalidatePath("/");
  redirect("/login");
}

export async function createHotel(formData: FormData) {
  const user = await requireSuperAdmin();
  const data = hotelFormSchema.parse(formEntries(formData));

  const hotel = await prisma.hotel.create({
    data: {
      slug: data.slug,
      name: data.name,
      address: normalizeNullable(data.address),
      phone: normalizeNullable(data.phone),
      email: normalizeNullable(data.email),
      timezone: data.timezone,
      status: data.status,
      memberships: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  await setActiveHotelCookie(hotel.id);
  revalidatePath("/");
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function selectHotel(formData: FormData) {
  const { user, hotels } = await getHotelContext();

  if (!user) {
    redirect("/login");
  }

  const hotelId = String(formData.get("hotelId") ?? "");
  const hotel = hotels.find((hotelItem) => hotelItem.id === hotelId);

  if (!hotel) {
    throw new Error("Selected hotel was not found or is not available to this account.");
  }

  await setActiveHotelCookie(hotel.id);
  revalidatePath("/");
  redirect("/");
}

export async function createDepartment(formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = departmentFormSchema.parse(formEntries(formData));

  await prisma.department.create({
    data: {
      hotelId,
      name: data.name,
      description: normalizeNullable(data.description),
    },
  });

  revalidatePath("/hotels");
  revalidatePath("/departments");
  revalidatePath("/employees");
  revalidatePath("/schedule");
}

export async function deleteDepartment(id: string) {
  const hotelId = await requireActiveHotelId();

  await prisma.department.deleteMany({
    where: {
      id,
      hotelId,
    },
  });

  revalidatePath("/");
  revalidatePath("/hotels");
  revalidatePath("/departments");
  revalidatePath("/employees");
  revalidatePath("/schedule");
  revalidatePath("/reports");
}

export async function createRole(formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = roleFormSchema.parse(formEntries(formData));

  await prisma.role.create({
    data: {
      hotelId,
      name: data.name,
      description: normalizeNullable(data.description),
    },
  });

  revalidatePath("/hotels");
  revalidatePath("/roles");
  revalidatePath("/employees");
}

export async function deleteRole(id: string) {
  const hotelId = await requireActiveHotelId();

  await prisma.role.deleteMany({
    where: {
      id,
      hotelId,
    },
  });

  revalidatePath("/");
  revalidatePath("/hotels");
  revalidatePath("/roles");
  revalidatePath("/employees");
  revalidatePath("/reports");
}

export async function createEmployee(formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = employeeFormSchema.parse(formEntries(formData));
  const departmentId = normalizeNullable(data.departmentId);
  const roleId = normalizeNullable(data.roleId);

  await Promise.all([
    assertDepartmentBelongsToHotel(hotelId, departmentId),
    assertRoleBelongsToHotel(hotelId, roleId),
  ]);

  await prisma.employee.create({
    data: {
      hotelId,
      employeeCode: data.employeeCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: normalizeNullable(data.phone),
      status: data.status,
      hireDate: parseDateInput(data.hireDate),
      departmentId,
      roleId,
    },
  });

  revalidatePath("/");
  revalidatePath("/employees");
}

export async function updateEmployee(id: string, formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = employeeFormSchema.parse(formEntries(formData));
  const departmentId = normalizeNullable(data.departmentId);
  const roleId = normalizeNullable(data.roleId);

  await Promise.all([
    assertDepartmentBelongsToHotel(hotelId, departmentId),
    assertRoleBelongsToHotel(hotelId, roleId),
  ]);

  await prisma.employee.update({
    where: {
      id,
      hotelId,
    },
    data: {
      employeeCode: data.employeeCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: normalizeNullable(data.phone),
      status: data.status,
      hireDate: parseDateInput(data.hireDate),
      departmentId,
      roleId,
    },
  });

  revalidatePath("/");
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}/edit`);
  redirect("/employees");
}

export async function deleteEmployee(id: string) {
  const hotelId = await requireActiveHotelId();

  await prisma.employee.delete({
    where: {
      id,
      hotelId,
    },
  });

  revalidatePath("/");
  revalidatePath("/employees");
  revalidatePath("/attendance");
  revalidatePath("/schedule");
  revalidatePath("/reports");
}

export async function createShift(formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = shiftFormSchema.parse(formEntries(formData));
  const departmentId = normalizeNullable(data.departmentId);

  await assertDepartmentBelongsToHotel(hotelId, departmentId);

  await prisma.shift.create({
    data: {
      hotelId,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      requiredStaff: data.requiredStaff,
      departmentId,
    },
  });

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/reports");
}

export async function assignShift(formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = shiftAssignmentFormSchema.parse(formEntries(formData));
  const date = parseDateInput(data.date);

  await Promise.all([
    assertEmployeeBelongsToHotel(hotelId, data.employeeId),
    assertShiftBelongsToHotel(hotelId, data.shiftId),
  ]);

  await prisma.shiftAssignment.upsert({
    where: {
      hotelId_employeeId_shiftId_date: {
        hotelId,
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        date,
      },
    },
    create: {
      hotelId,
      employeeId: data.employeeId,
      shiftId: data.shiftId,
      date,
      status: data.status,
    },
    update: {
      status: data.status,
    },
  });

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/reports");
}

export async function recordAttendance(formData: FormData) {
  const hotelId = await requireActiveHotelId();
  const data = attendanceFormSchema.parse(formEntries(formData));
  const date = parseDateInput(data.date);

  await assertEmployeeBelongsToHotel(hotelId, data.employeeId);

  await prisma.attendance.upsert({
    where: {
      hotelId_employeeId_date: {
        hotelId,
        employeeId: data.employeeId,
        date,
      },
    },
    create: {
      hotelId,
      employeeId: data.employeeId,
      date,
      clockIn: composeDateTimeInput(data.date, data.clockIn),
      clockOut: composeDateTimeInput(data.date, data.clockOut),
      status: data.status,
      notes: normalizeNullable(data.notes),
    },
    update: {
      clockIn: composeDateTimeInput(data.date, data.clockIn),
      clockOut: composeDateTimeInput(data.date, data.clockOut),
      status: data.status,
      notes: normalizeNullable(data.notes),
    },
  });

  revalidatePath("/");
  revalidatePath("/attendance");
  revalidatePath("/reports");
}
