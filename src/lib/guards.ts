import { prisma } from "@/lib/db";

/**
 * Tenant guards.
 *
 * Form fields and JSON payloads carry raw ids, so a caller can submit the id of
 * a record that belongs to a different hotel. Filtering reads by `hotelId` does
 * not help on writes, where the id arrives from the client. Every write path
 * re-checks that each referenced record lives in the active hotel before it is
 * persisted.
 */

export async function assertDepartmentBelongsToHotel(
  hotelId: string,
  departmentId: string | null,
) {
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

export async function assertRoleBelongsToHotel(hotelId: string, roleId: string | null) {
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

export async function assertEmployeeBelongsToHotel(hotelId: string, employeeId: string) {
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

export async function assertShiftBelongsToHotel(hotelId: string, shiftId: string) {
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
