import { Briefcase, Plus, Trash2 } from "lucide-react";

import { createRole, deleteRole } from "@/app/actions";
import { NoHotelState } from "@/components/NoHotelState";
import { SubmitButton } from "@/components/SubmitButton";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const roles = await prisma.role.findMany({
    where: {
      hotelId: activeHotel.id,
    },
    include: {
      _count: {
        select: {
          employees: true,
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
          <h1 className="page-title">Roles</h1>
          <p className="page-kicker">
            Manage the job roles assigned to employees at {activeHotel.name}.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Add role</h2>
            <p className="panel-subtitle">Examples include receptionist, housekeeper, chef, supervisor, and technician.</p>
          </div>
          <Briefcase aria-hidden size={20} />
        </div>
        <form action={createRole} className="form-grid">
          <label>
            Name
            <input name="name" placeholder="Night Auditor" required />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            Description
            <input name="description" placeholder="Overnight reception and daily close" />
          </label>
          <div className="form-actions">
            <SubmitButton>
              <Plus aria-hidden size={16} />
              Add role
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Employees</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <div className="cell-title">
                      <strong>{role.name}</strong>
                      <span>{role.description ?? "No description"}</span>
                    </div>
                  </td>
                  <td>{role._count.employees}</td>
                  <td>
                    <form action={deleteRole.bind(null, role.id)} className="row-actions">
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
