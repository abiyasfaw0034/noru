import { BarChart3, CalendarClock } from "lucide-react";

import { NoHotelState } from "@/components/NoHotelState";
import { StatusPill } from "@/components/StatusPill";
import { formatShortDate } from "@/lib/dates";
import { getAttendanceReport, getShiftCoverageReport } from "@/lib/reports";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const [attendanceReport, coverageReport] = await Promise.all([
    getAttendanceReport(activeHotel.id, 30),
    getShiftCoverageReport(activeHotel.id, 7),
  ]);

  const underCovered = coverageReport.filter((row) => row.gap > 0);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-kicker">
            Operational reports for attendance quality and shift coverage at {activeHotel.name}.
          </p>
        </div>
      </header>

      <section className="two-column">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Attendance summary</h2>
              <p className="panel-subtitle">Last 30 days by employee, using grouped Prisma attendance data.</p>
            </div>
            <BarChart3 aria-hidden size={20} />
          </div>
          <div className="list-stack">
            {attendanceReport.map((row) => (
              <div className="report-row" key={row.employee.id}>
                <div>
                  <strong>
                    {row.employee.firstName} {row.employee.lastName}
                  </strong>
                  <span>
                    {row.employee.department?.name ?? "No department"} ·{" "}
                    {row.employee.role?.name ?? "No role"}
                  </span>
                  <div className="report-metrics">
                    <span className="mini-stat">
                      <strong>{row.attendanceRate}%</strong> attendance
                    </span>
                    <span className="mini-stat">
                      <strong>{row.hours}</strong> hours
                    </span>
                    <span className="mini-stat">
                      <strong>{row.counts.LATE}</strong> late
                    </span>
                    <span className="mini-stat">
                      <strong>{row.counts.ABSENT}</strong> absent
                    </span>
                  </div>
                </div>
                <StatusPill status={row.employee.status} />
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Coverage exceptions</h2>
              <p className="panel-subtitle">Next 7 days where assigned staff is below required staffing.</p>
            </div>
            <CalendarClock aria-hidden size={20} />
          </div>
          <div className="list-stack">
            {underCovered.length === 0 ? (
              <div className="empty-state">All scheduled shifts are currently covered.</div>
            ) : (
              underCovered.slice(0, 12).map((row) => (
                <div className="report-row" key={`${row.shift.id}-${row.date.toISOString()}`}>
                  <div>
                    <strong>
                      {formatShortDate(row.date)} · {row.shift.name}
                    </strong>
                    <span>
                      {row.shift.department?.name ?? "No department"} · {row.assigned}/{row.required} assigned
                    </span>
                  </div>
                  <span className="coverage-gap">{row.gap} short</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="table-shell">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Department</th>
                <th>Coverage</th>
                <th>Assigned employees</th>
              </tr>
            </thead>
            <tbody>
              {coverageReport.map((row) => (
                <tr key={`${row.shift.id}-${row.date.toISOString()}-table`}>
                  <td>{formatShortDate(row.date)}</td>
                  <td>
                    <div className="cell-title">
                      <strong>{row.shift.name}</strong>
                      <span>
                        {row.shift.startTime} - {row.shift.endTime}
                      </span>
                    </div>
                  </td>
                  <td>{row.shift.department?.name ?? "No department"}</td>
                  <td>
                    <span className={row.gap > 0 ? "coverage-gap" : "coverage-ok"}>
                      {row.assigned}/{row.required}
                    </span>
                  </td>
                  <td>{row.people.length > 0 ? row.people.join(", ") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
