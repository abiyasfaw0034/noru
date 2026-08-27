import { ClipboardCheck } from "lucide-react";

import { recordAttendance } from "@/app/actions";
import { NoHotelState } from "@/components/NoHotelState";
import { StatusPill } from "@/components/StatusPill";
import { SubmitButton } from "@/components/SubmitButton";
import { attendanceStatuses, statusLabels } from "@/lib/constants";
import { formatDate, formatTime, todayInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const [employees, attendance] = await Promise.all([
    prisma.employee.findMany({
      where: {
        hotelId: activeHotel.id,
        status: {
          not: "INACTIVE",
        },
      },
      include: {
        department: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendance.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: 30,
    }),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-kicker">Record daily attendance, clock times, and operational notes.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Record attendance</h2>
            <p className="panel-subtitle">Submitting again for the same employee and date updates the record.</p>
          </div>
          <ClipboardCheck aria-hidden size={20} />
        </div>
        <form action={recordAttendance} className="form-grid">
          <label>
            Employee
            <select name="employeeId" required>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} · {employee.department?.name ?? "No department"}
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
            <select defaultValue="PRESENT" name="status">
              {attendanceStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Clock in
            <input name="clockIn" type="time" />
          </label>
          <label>
            Clock out
            <input name="clockOut" type="time" />
          </label>
          <label>
            Notes
            <input name="notes" placeholder="Optional note" />
          </label>
          <div className="form-actions">
            <SubmitButton>
              <ClipboardCheck aria-hidden size={16} />
              Save attendance
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Clock in</th>
                <th>Clock out</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.date)}</td>
                  <td>
                    {record.employee.firstName} {record.employee.lastName}
                  </td>
                  <td>{record.employee.department?.name ?? "No department"}</td>
                  <td>{formatTime(record.clockIn)}</td>
                  <td>{formatTime(record.clockOut)}</td>
                  <td>
                    <StatusPill status={record.status} />
                  </td>
                  <td>{record.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
