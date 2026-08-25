import { CalendarPlus, Link2, Trash2, UsersRound } from "lucide-react";

import {
  assignShift,
  createShift,
  deleteShift,
  deleteShiftAssignment,
} from "@/app/actions";
import { NoHotelState } from "@/components/NoHotelState";
import { StatusPill } from "@/components/StatusPill";
import { SubmitButton } from "@/components/SubmitButton";
import { shiftAssignmentStatuses, statusLabels } from "@/lib/constants";
import { formatShortDate, todayInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const [employees, departments, shifts, assignments] = await Promise.all([
    prisma.employee.findMany({
      where: {
        hotelId: activeHotel.id,
        status: {
          not: "INACTIVE",
        },
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
    prisma.shift.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      include: {
        department: true,
        _count: {
          select: {
            shiftAssignments: true,
          },
        },
      },
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
    }),
    prisma.shiftAssignment.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      include: {
        employee: true,
        shift: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-kicker">Create shift templates and assign employees to dated shifts.</p>
        </div>
      </header>

      <section className="two-column">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Create shift</h2>
              <p className="panel-subtitle">Reusable shift template with staffing requirements.</p>
            </div>
            <CalendarPlus aria-hidden size={20} />
          </div>
          <form action={createShift} className="form-grid">
            <label>
              Shift name
              <input name="name" placeholder="Evening Front Desk" required />
            </label>
            <label>
              Start
              <input name="startTime" required type="time" />
            </label>
            <label>
              End
              <input name="endTime" required type="time" />
            </label>
            <label>
              Required staff
              <input defaultValue={1} min={1} name="requiredStaff" required type="number" />
            </label>
            <label>
              Department
              <select name="departmentId">
                <option value="">No department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <SubmitButton>
                <CalendarPlus aria-hidden size={16} />
                Add shift
              </SubmitButton>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Assign employee</h2>
              <p className="panel-subtitle">Schedule an active employee for a shift date.</p>
            </div>
            <Link2 aria-hidden size={20} />
          </div>
          <form action={assignShift} className="single-form">
            <label>
              Employee
              <select name="employeeId" required>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shift
              <select name="shiftId" required>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime}-{shift.endTime})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input defaultValue={todayInputValue()} name="date" required type="date" />
            </label>
            <label>
              Status
              <select defaultValue="SCHEDULED" name="status">
                {shiftAssignmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <SubmitButton>
                <UsersRound aria-hidden size={16} />
                Assign
              </SubmitButton>
            </div>
          </form>
        </article>
      </section>

      <h2 className="table-heading">Shift templates</h2>
      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Shift</th>
                <th>Department</th>
                <th>Required staff</th>
                <th>Assignments</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={5}>No shift templates yet. Create one above.</td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>
                      <div className="cell-title">
                        <strong>{shift.name}</strong>
                        <span>
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </div>
                    </td>
                    <td>{shift.department?.name ?? "No department"}</td>
                    <td>{shift.requiredStaff}</td>
                    <td>{shift._count.shiftAssignments}</td>
                    <td>
                      <form action={deleteShift.bind(null, shift.id)} className="row-actions">
                        <button className="button danger" type="submit">
                          <Trash2 aria-hidden size={16} />
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <h2 className="table-heading">Recent assignments</h2>
      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{formatShortDate(assignment.date)}</td>
                  <td>
                    <div className="cell-title">
                      <strong>{assignment.shift.name}</strong>
                      <span>
                        {assignment.shift.startTime} - {assignment.shift.endTime}
                      </span>
                    </div>
                  </td>
                  <td>
                    {assignment.employee.firstName} {assignment.employee.lastName}
                  </td>
                  <td>{assignment.shift.department?.name ?? "No department"}</td>
                  <td>
                    <StatusPill status={assignment.status} />
                  </td>
                  <td>
                    <form
                      action={deleteShiftAssignment.bind(null, assignment.id)}
                      className="row-actions"
                    >
                      <button className="button danger" type="submit">
                        <Trash2 aria-hidden size={16} />
                        Remove
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
