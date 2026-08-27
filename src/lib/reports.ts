import { prisma } from "@/lib/db";
import { addDaysUtc, todayUtc } from "@/lib/dates";

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

export async function getShiftCoverageReport(hotelId: string, days = 7) {
  const start = todayUtc();
  const end = addDaysUtc(start, days);

  const [shifts, groupedAssignments, assignments] = await Promise.all([
    prisma.shift.findMany({
      where: {
        hotelId,
      },
      include: {
        department: true,
      },
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
    }),
    prisma.shiftAssignment.groupBy({
      by: ["shiftId", "date"],
      where: {
        hotelId,
        date: {
          gte: start,
          lt: end,
        },
        status: {
          not: "CANCELLED",
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        hotelId,
        date: {
          gte: start,
          lt: end,
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: "asc",
      },
    }),
  ]);

  const windows = Array.from({ length: days }, (_, index) => addDaysUtc(start, index));

  return windows.flatMap((date) =>
    shifts.map((shift) => {
      const grouped = groupedAssignments.find(
        (assignment) =>
          assignment.shiftId === shift.id && assignment.date.toISOString() === date.toISOString(),
      );
      const people = assignments
        .filter(
          (assignment) =>
            assignment.shiftId === shift.id && assignment.date.toISOString() === date.toISOString(),
        )
        .map((assignment) => `${assignment.employee.firstName} ${assignment.employee.lastName}`);
      const assigned = grouped?._count._all ?? 0;

      return {
        date,
        shift,
        assigned,
        required: shift.requiredStaff,
        gap: Math.max(shift.requiredStaff - assigned, 0),
        people,
      };
    }),
  );
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
