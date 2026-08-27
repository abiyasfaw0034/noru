import { Building2, Plus, ShieldCheck } from "lucide-react";

import { createDepartment, createHotel, createRole, selectHotel } from "@/app/actions";
import { StatusPill } from "@/components/StatusPill";
import { SubmitButton } from "@/components/SubmitButton";
import { hotelStatuses, statusLabels } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  const { activeHotel, hotels, user } = await getHotelContext();
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";
  const [departments, roles] = activeHotel
    ? await Promise.all([
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
      ])
    : [[], []];

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Hotels</h1>
          <p className="page-kicker">
            Super-admin workspace for hotel tenants and each hotel&apos;s operating setup.
          </p>
        </div>
      </header>

      <section className="two-column">
        {isSuperAdmin ? (
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Create hotel</h2>
                <p className="panel-subtitle">
                  Each hotel owns its employees, departments, shifts, and attendance.
                </p>
              </div>
              <Building2 aria-hidden size={20} />
            </div>
            <form action={createHotel} className="form-grid">
              <label>
                Slug
                <input name="slug" placeholder="noru-westlands" required />
              </label>
              <label>
                Name
                <input name="name" placeholder="Noru Westlands" required />
              </label>
              <label>
                Timezone
                <input defaultValue="Africa/Nairobi" name="timezone" required />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" />
              </label>
              <label>
                Status
                <select defaultValue="ACTIVE" name="status">
                  {hotelStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address
                <input name="address" />
              </label>
              <div className="form-actions">
                <SubmitButton>
                  <Plus aria-hidden size={16} />
                  Add hotel
                </SubmitButton>
              </div>
            </form>
          </article>
        ) : null}

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Tenant model</h2>
              <p className="panel-subtitle">Shared Postgres schema with explicit hotel ownership.</p>
            </div>
            <ShieldCheck aria-hidden size={20} />
          </div>
          <div className="list-stack">
            <div className="report-row">
              <div>
                <strong>Super admin</strong>
                <span>Can manage hotel tenants across the system.</span>
              </div>
            </div>
            <div className="report-row">
              <div>
                <strong>Hotel scope</strong>
                <span>Operational records are filtered by the active hotel tenant.</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Hotel</th>
                <th>Slug</th>
                <th>Timezone</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {hotels.map((hotel) => (
                <tr key={hotel.id}>
                  <td>
                    <div className="cell-title">
                      <strong>{hotel.name}</strong>
                      <span>{hotel.email ?? hotel.address ?? "No contact details"}</span>
                    </div>
                  </td>
                  <td>{hotel.slug}</td>
                  <td>{hotel.timezone}</td>
                  <td>
                    <StatusPill status={hotel.status} />
                  </td>
                  <td>
                    <form action={selectHotel} className="row-actions">
                      <input name="hotelId" type="hidden" value={hotel.id} />
                      <button className="button" disabled={hotel.id === activeHotel?.id} type="submit">
                        {hotel.id === activeHotel?.id ? "Active" : "Use hotel"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeHotel ? (
        <section className="two-column" style={{ marginTop: 20 }}>
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Departments</h2>
                <p className="panel-subtitle">Used to group employees and shift coverage.</p>
              </div>
            </div>
            <form action={createDepartment} className="single-form">
              <label>
                Name
                <input name="name" placeholder="Security" required />
              </label>
              <label>
                Description
                <input name="description" />
              </label>
              <div className="form-actions">
                <SubmitButton>
                  <Plus aria-hidden size={16} />
                  Add department
                </SubmitButton>
              </div>
            </form>
            <div className="list-stack" style={{ marginTop: 16 }}>
              {departments.map((department) => (
                <div className="report-row" key={department.id}>
                  <div>
                    <strong>{department.name}</strong>
                    <span>{department.description ?? "No description"}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Roles</h2>
                <p className="panel-subtitle">Assigned directly to employee profiles.</p>
              </div>
            </div>
            <form action={createRole} className="single-form">
              <label>
                Name
                <input name="name" placeholder="Night Auditor" required />
              </label>
              <label>
                Description
                <input name="description" />
              </label>
              <div className="form-actions">
                <SubmitButton>
                  <Plus aria-hidden size={16} />
                  Add role
                </SubmitButton>
              </div>
            </form>
            <div className="list-stack" style={{ marginTop: 16 }}>
              {roles.map((role) => (
                <div className="report-row" key={role.id}>
                  <div>
                    <strong>{role.name}</strong>
                    <span>{role.description ?? "No description"}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}
