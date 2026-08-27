import { Activity, Building2, CalendarDays, ClipboardCheck, UsersRound } from "lucide-react";

import { NoHotelState } from "@/components/NoHotelState";
import { getDashboardStats } from "@/lib/reports";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const stats = await getDashboardStats(activeHotel.id);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Hotel staff operations</h1>
          <p className="page-kicker">
            {activeHotel.name} is the active hotel. Manage employees, assignments, shift coverage,
            and attendance from one working dashboard.
          </p>
        </div>
      </header>

      <section className="metrics-grid" aria-label="Hotel workforce metrics">
        <article className="metric-card">
          <span>
            <UsersRound aria-hidden size={18} />
            Total employees
          </span>
          <strong>{stats.employeeCount}</strong>
        </article>
        <article className="metric-card">
          <span>
            <Activity aria-hidden size={18} />
            Active employees
          </span>
          <strong>{stats.activeCount}</strong>
        </article>
        <article className="metric-card">
          <span>
            <Building2 aria-hidden size={18} />
            Departments
          </span>
          <strong>{stats.departmentCount}</strong>
        </article>
        <article className="metric-card">
          <span>
            <ClipboardCheck aria-hidden size={18} />
            Attendance today
          </span>
          <strong>{stats.attendanceToday}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Today&apos;s shift assignments</h2>
              <p className="panel-subtitle">Scheduled employees and operational coverage.</p>
            </div>
            <CalendarDays aria-hidden size={20} />
          </div>
          <div className="list-stack">
            {stats.todaysAssignments.length === 0 ? (
              <div className="empty-state">No shifts have been assigned for today.</div>
            ) : (
              stats.todaysAssignments.map((assignment) => (
                <div className="assignment-row" key={assignment.id}>
                  <div>
                    <strong>{assignment.shift.name}</strong>
                    <span>
                      {assignment.shift.startTime} - {assignment.shift.endTime} ·{" "}
                      {assignment.shift.department?.name ?? "No department"}
                    </span>
                  </div>
                  <div className="cell-title">
                    <strong>
                      {assignment.employee.firstName} {assignment.employee.lastName}
                    </strong>
                    <span>{assignment.employee.role?.name ?? "No role"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Review focus</h2>
              <p className="panel-subtitle">
                Reports highlight under-covered shifts and attendance rates.
              </p>
            </div>
          </div>
          <div className="list-stack">
            <div className="report-row">
              <div>
                <strong>Shift coverage</strong>
                <span>Compare assigned staff against each shift&apos;s required staffing.</span>
              </div>
            </div>
            <div className="report-row">
              <div>
                <strong>Attendance trend</strong>
                <span>See present, late, absent, leave, and worked-hour totals by employee.</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
