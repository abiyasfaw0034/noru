import { prisma } from "@/lib/db";
import { addDaysUtc, toDateOnly, todayUtc } from "@/lib/dates";

export async function getAttendanceReport(hotelId: string, days = 30) {
  const from = addDaysUtc(todayUtc(), -days + 1);

  const [employees, groupedAttendance, attendanceRows] = await Promise.all([
    prisma.employee.findMany({
      where: {
        hotelId,
      },
      include: {
        department: true,
        role: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendance.groupBy({
      by: ["employeeId", "status"],
      where: {
        hotelId,
        date: {
          gte: from,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        hotelId,
        date: {
          gte: from,
        },
      },
      select: {
        employeeId: true,
        clockIn: true,
        clockOut: true,
      },
    }),
  ]);

  return employees.map((employee) => {
    const counts = {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      ON_LEAVE: 0,
    };

    for (const group of groupedAttendance) {
      if (group.employeeId === employee.id && group.status in counts) {
        counts[group.status as keyof typeof counts] = group._count._all;
      }
    }

    const hours = attendanceRows
      .filter((row) => row.employeeId === employee.id && row.clockIn && row.clockOut)
      .reduce((total, row) => {
        const duration = row.clockOut!.getTime() - row.clockIn!.getTime();
        return total + Math.max(duration / 1000 / 60 / 60, 0);
      }, 0);

    return {
      employee,
      counts,
      recordedDays: Object.values(counts).reduce((total, count) => total + count, 0),
      attendanceRate:
        counts.PRESENT + counts.LATE + counts.ABSENT > 0
          ? Math.round(
              ((counts.PRESENT + counts.LATE) / (counts.PRESENT + counts.LATE + counts.ABSENT)) *
                100,
            )
          : 0,
      hours: Math.round(hours * 10) / 10,
    };
  });
}

type CoverageRow = {
  day: Date;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  departmentName: string | null;
  assigned: number;
  gap: number;
  people: string[];
};

/**
 * Shift coverage for a rolling window, answered in one query.
 *
 * The hard part is that a gap is the absence of rows: a shift with nobody on it
 * has no assignment records to read, so it cannot be found by querying
 * assignments. The date spine from generate_series is CROSS JOINed against the
 * hotel's shifts to build every day/shift slot that *should* exist, and the
 * LATERAL subquery counts whoever was actually assigned to each one. Slots with
 * no match survive as assigned = 0, which is exactly the row an operations lead
 * needs to see.
 *
 * Previously this ran three Prisma queries and joined them in JavaScript, which
 * meant materialising every assignment in the window and scanning that list once
 * per day/shift pair.
 */
export async function getShiftCoverageReport(hotelId: string, days = 7) {
  const start = todayUtc();
  const end = addDaysUtc(start, days - 1);
  const startDate = toDateOnly(start);
  const endDate = toDateOnly(end);

  const rows = await prisma.$queryRaw<CoverageRow[]>`
    WITH spine AS (
      SELECT generate_series(${startDate}::date, ${endDate}::date, '1 day')::date AS day
    )
    SELECT
      spine.day                                                    AS "day",
      s.id                                                         AS "shiftId",
      s.name                                                       AS "shiftName",
      s."startTime"                                                AS "startTime",
      s."endTime"                                                  AS "endTime",
      s."requiredStaff"                                            AS "requiredStaff",
      d.name                                                       AS "departmentName",
      COALESCE(cover.assigned, 0)::int                             AS "assigned",
      GREATEST(s."requiredStaff" - COALESCE(cover.assigned, 0), 0)::int AS "gap",
      COALESCE(cover.people, ARRAY[]::text[])                      AS "people"
    FROM spine
    CROSS JOIN "Shift" s
    LEFT JOIN "Department" d ON d.id = s."departmentId"
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS assigned,
        ARRAY_AGG(e."firstName" || ' ' || e."lastName" ORDER BY e."lastName", e."firstName") AS people
      FROM "ShiftAssignment" sa
      JOIN "Employee" e ON e.id = sa."employeeId"
      WHERE sa."shiftId" = s.id
        AND sa."hotelId" = s."hotelId"
        AND sa."date" = spine.day
        AND sa.status <> 'CANCELLED'
    ) cover ON TRUE
    WHERE s."hotelId" = ${hotelId}
    ORDER BY spine.day ASC, s."startTime" ASC, s.name ASC
  `;

  // Kept in the shape the page and API already consume.
  return rows.map((row) => ({
    date: new Date(row.day),
    shift: {
      id: row.shiftId,
      name: row.shiftName,
      startTime: row.startTime,
      endTime: row.endTime,
      requiredStaff: row.requiredStaff,
      department: row.departmentName ? { name: row.departmentName } : null,
    },
    assigned: row.assigned,
    required: row.requiredStaff,
    gap: row.gap,
    people: row.people,
  }));
}

export async function getDashboardStats(hotelId: string) {
  const today = todayUtc();
  const tomorrow = addDaysUtc(today, 1);

  const [employeeCount, activeCount, departmentCount, todaysAssignments, attendanceToday] =
    await Promise.all([
      prisma.employee.count({
        where: {
          hotelId,
        },
      }),
      prisma.employee.count({
        where: {
          hotelId,
          status: "ACTIVE",
        },
      }),
      prisma.department.count({
        where: {
          hotelId,
        },
      }),
      prisma.shiftAssignment.findMany({
        where: {
          hotelId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          employee: {
            include: {
              role: true,
            },
          },
          shift: {
            include: {
              department: true,
            },
          },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      prisma.attendance.count({
        where: {
          hotelId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
    ]);

  return {
    employeeCount,
    activeCount,
    departmentCount,
    todaysAssignments,
    attendanceToday,
  };
}
