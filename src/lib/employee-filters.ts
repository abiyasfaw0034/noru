import type { Prisma } from "@prisma/client";

import { employeeStatuses } from "@/lib/constants";

type EmployeeStatus = (typeof employeeStatuses)[number];

export type EmployeeFilters = {
  q: string | null;
  departmentId: string | null;
  roleId: string | null;
  status: EmployeeStatus | null;
};

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();

  return trimmed ? trimmed : null;
}

function isEmployeeStatus(value: string | null): value is EmployeeStatus {
  return value !== null && (employeeStatuses as readonly string[]).includes(value);
}

/**
 * Reads filters off a query string. Anything unrecognised is dropped rather
 * than passed through, so a hand-edited URL cannot widen the query.
 */
export function parseEmployeeFilters(params: RawParams): EmployeeFilters {
  const status = firstValue(params.status);

  return {
    q: firstValue(params.q),
    departmentId: firstValue(params.departmentId),
    roleId: firstValue(params.roleId),
    status: isEmployeeStatus(status) ? status : null,
  };
}

/**
 * `hotelId` is applied first and is never derived from user input, so every
 * filter below can only ever narrow the result set within the active hotel.
 */
export function buildEmployeeWhere(
  hotelId: string,
  filters: EmployeeFilters,
): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {
    hotelId,
  };

  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }

  if (filters.roleId) {
    where.roleId = filters.roleId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.q) {
    where.OR = [
      { firstName: { contains: filters.q, mode: "insensitive" } },
      { lastName: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { employeeCode: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return where;
}
