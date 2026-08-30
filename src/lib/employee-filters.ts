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

export const employeePerPageOptions = [10, 25, 50, 100] as const;

const defaultPerPage = 25;

export type EmployeePagination = {
  page: number;
  perPage: number;
  skip: number;
  take: number;
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * `perPage` is restricted to a known set rather than clamped to a range, so a
 * caller cannot ask for an arbitrarily large page. `page` is resolved against
 * the real row count by `resolvePage` once that count is known.
 */
export function parseEmployeePagination(params: RawParams): EmployeePagination {
  const requestedPerPage = parsePositiveInt(firstValue(params.perPage), defaultPerPage);
  const perPage = (employeePerPageOptions as readonly number[]).includes(requestedPerPage)
    ? requestedPerPage
    : defaultPerPage;
  const page = parsePositiveInt(firstValue(params.page), 1);

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

/**
 * Clamps the requested page into the range the result set actually has, so a
 * stale link or a hand-typed `?page=99` lands on the last page instead of an
 * empty one.
 */
export function resolvePage(pagination: EmployeePagination, total: number) {
  const totalPages = Math.max(Math.ceil(total / pagination.perPage), 1);
  const page = Math.min(pagination.page, totalPages);

  return {
    page,
    perPage: pagination.perPage,
    totalPages,
    total,
    skip: (page - 1) * pagination.perPage,
    take: pagination.perPage,
    from: total === 0 ? 0 : (page - 1) * pagination.perPage + 1,
    to: Math.min(page * pagination.perPage, total),
  };
}

/** Rebuilds the current query string so paging links keep the active filters. */
export function buildEmployeeQuery(
  filters: EmployeeFilters,
  overrides: { page?: number; perPage?: number } = {},
) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.roleId) params.set("roleId", filters.roleId);
  if (filters.status) params.set("status", filters.status);
  if (overrides.perPage && overrides.perPage !== defaultPerPage) {
    params.set("perPage", String(overrides.perPage));
  }
  if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));

  const query = params.toString();

  return query ? `/employees?${query}` : "/employees";
}
