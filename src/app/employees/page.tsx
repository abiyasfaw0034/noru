import { Pencil, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";

import { createEmployee, deleteEmployee } from "@/app/actions";
import { EmployeeForm } from "@/components/EmployeeForm";
import { NoHotelState } from "@/components/NoHotelState";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const [employees, departments, roles] = await Promise.all([
    prisma.employee.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      include: {
        department: true,
        role: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
            <h2 className="panel-title">Add employee</h2>
            <p className="panel-subtitle">Department and role assignments are part of the profile.</p>
          </div>
          <UserPlus aria-hidden size={20} />
        </div>
        <EmployeeForm action={createEmployee} departments={departments} roles={roles} />
      </section>

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
              {employees.map((employee) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
