import { ChevronLeft, ChevronRight, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";

import { createEmployee, deleteEmployee } from "@/app/actions";
import { EmployeeForm } from "@/components/EmployeeForm";
import { NoHotelState } from "@/components/NoHotelState";
import { StatusPill } from "@/components/StatusPill";
import { SubmitButton } from "@/components/SubmitButton";
import { employeeStatuses, statusLabels } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  buildEmployeeQuery,
  buildEmployeeWhere,
  employeePerPageOptions,
  parseEmployeeFilters,
  parseEmployeePagination,
  resolvePage,
} from "@/lib/employee-filters";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type EmployeesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const params = await searchParams;
  const filters = parseEmployeeFilters(params);
  const requestedPage = parseEmployeePagination(params);
  const hasFilters = Boolean(
    filters.q || filters.departmentId || filters.roleId || filters.status,
  );
  const where = buildEmployeeWhere(activeHotel.id, filters);

  // The matching count is needed before the page can be clamped, so it is
  // resolved first and the row query is paged against the settled offset.
  const matchingCount = await prisma.employee.count({ where });
  const page = resolvePage(requestedPage, matchingCount);

  const [employees, totalCount, departments, roles] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        department: true,
        role: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: page.skip,
      take: page.take,
    }),
    prisma.employee.count({
      where: {
        hotelId: activeHotel.id,
      },
    }),
    prisma.department.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.role.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-kicker">
            Create, edit, assign, and remove employees for {activeHotel.name}.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Find employees</h2>
            <p className="panel-subtitle">
              Search by name, code, or email, and narrow by department, role, or status.
            </p>
          </div>
          <Search aria-hidden size={20} />
        </div>
        <form className="form-grid" method="get">
          <label>
            Search
            <input
              defaultValue={filters.q ?? ""}
              name="q"
              placeholder="Name, code, or email"
              type="search"
            />
          </label>
          <label>
            Department
            <select defaultValue={filters.departmentId ?? ""} name="departmentId">
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select defaultValue={filters.roleId ?? ""} name="roleId">
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select defaultValue={filters.status ?? ""} name="status">
              <option value="">Any status</option>
              {employeeStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Per page
            <select defaultValue={String(page.perPage)} name="perPage">
              {employeePerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <SubmitButton>
              <Search aria-hidden size={16} />
              Apply filters
            </SubmitButton>
            {hasFilters ? (
              <Link className="button" href="/employees">
                <X aria-hidden size={16} />
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Add employee</h2>
            <p className="panel-subtitle">Department and role assignments are part of the profile.</p>
          </div>
          <UserPlus aria-hidden size={20} />
        </div>
        <EmployeeForm action={createEmployee} departments={departments} roles={roles} />
      </section>

      <h2 className="table-heading">
        {matchingCount === 0
          ? hasFilters
            ? "No employees match"
            : "No employees yet"
          : `Showing ${page.from}-${page.to} of ${matchingCount}${
              hasFilters ? ` matching (${totalCount} total)` : " employees"
            }`}
      </h2>
      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Hired</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    {hasFilters
                      ? "No employees match these filters."
                      : "No employees yet. Add one above."}
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="cell-title">
                        <strong>
                          {employee.firstName} {employee.lastName}
                        </strong>
                        <span>
                          {employee.employeeCode} · {employee.email}
                        </span>
                      </div>
                    </td>
                    <td>{employee.department?.name ?? "Unassigned"}</td>
                    <td>{employee.role?.name ?? "Unassigned"}</td>
                    <td>
                      <StatusPill status={employee.status} />
                    </td>
                    <td>{formatDate(employee.hireDate)}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="button" href={`/employees/${employee.id}/edit`}>
                          <Pencil aria-hidden size={16} />
                          Edit
                        </Link>
                        <form action={deleteEmployee.bind(null, employee.id)}>
                          <button className="button danger" type="submit">
                            <Trash2 aria-hidden size={16} />
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {page.totalPages > 1 ? (
        <nav className="pager" aria-label="Employee list pages">
          {page.page > 1 ? (
            <Link
              className="button"
              href={buildEmployeeQuery(filters, { page: page.page - 1, perPage: page.perPage })}
            >
              <ChevronLeft aria-hidden size={16} />
              Previous
            </Link>
          ) : (
            <span className="button" aria-disabled="true">
              <ChevronLeft aria-hidden size={16} />
              Previous
            </span>
          )}
          <span className="pager-status">
            Page {page.page} of {page.totalPages}
          </span>
          {page.page < page.totalPages ? (
            <Link
              className="button"
              href={buildEmployeeQuery(filters, { page: page.page + 1, perPage: page.perPage })}
            >
              Next
              <ChevronRight aria-hidden size={16} />
            </Link>
          ) : (
            <span className="button" aria-disabled="true">
              Next
              <ChevronRight aria-hidden size={16} />
            </span>
          )}
        </nav>
      ) : null}
    </>
  );
}
