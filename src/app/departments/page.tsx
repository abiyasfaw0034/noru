import { Network, Plus, Trash2 } from "lucide-react";

import { createDepartment, deleteDepartment } from "@/app/actions";
import { NoHotelState } from "@/components/NoHotelState";
import { SubmitButton } from "@/components/SubmitButton";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const departments = await prisma.department.findMany({
    where: {
      hotelId: activeHotel.id,
    },
    include: {
      _count: {
        select: {
          employees: true,
          shifts: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-kicker">
            Manage the operating departments used to group employees and shift coverage for{" "}
            {activeHotel.name}.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Add department</h2>
            <p className="panel-subtitle">Examples include front desk, housekeeping, maintenance, and food service.</p>
          </div>
          <Network aria-hidden size={20} />
        </div>
        <form action={createDepartment} className="form-grid">
          <label>
            Name
            <input name="name" placeholder="Security" required />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            Description
            <input name="description" placeholder="Access control and guest safety" />
          </label>
          <div className="form-actions">
            <SubmitButton>
              <Plus aria-hidden size={16} />
              Add department
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Employees</th>
                <th>Shifts</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td>
                    <div className="cell-title">
                      <strong>{department.name}</strong>
                      <span>{department.description ?? "No description"}</span>
                    </div>
                  </td>
                  <td>{department._count.employees}</td>
                  <td>{department._count.shifts}</td>
                  <td>
                    <form action={deleteDepartment.bind(null, department.id)} className="row-actions">
                      <button className="button danger" type="submit">
                        <Trash2 aria-hidden size={16} />
                        Delete
                      </button>
                    </form>
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
