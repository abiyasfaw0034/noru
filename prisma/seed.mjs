import "dotenv/config";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const scrypt = promisify(scryptCallback);

const startOfDayUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const atUtcTime = (date, time) => {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setUTCHours(hours, minutes, 0, 0);
  return next;
};

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  return `scrypt$16384$8$1$${salt}$${derivedKey.toString("base64url")}`;
};

async function main() {
  const [adminPasswordHash, managerPasswordHash] = await Promise.all([
    hashPassword("NoruAdmin123!"),
    hashPassword("NoruManager123!"),
  ]);

  const hotel = await prisma.hotel.upsert({
    where: {
      slug: "noru-grand",
    },
    create: {
      slug: "noru-grand",
      name: "Noru Grand Hotel",
      address: "MAF Building, 5th Floor",
      email: "norubooking@gmail.com",
      phone: "09 77 20 21 22",
      timezone: "Africa/Nairobi",
    },
    update: {
      name: "Noru Grand Hotel",
      address: "MAF Building, 5th Floor",
      email: "norubooking@gmail.com",
      phone: "09 77 20 21 22",
      timezone: "Africa/Nairobi",
      status: "ACTIVE",
    },
  });

  const secondHotel = await prisma.hotel.upsert({
    where: {
      slug: "noru-airport",
    },
    create: {
      slug: "noru-airport",
      name: "Noru Airport Suites",
      timezone: "Africa/Nairobi",
    },
    update: {
      name: "Noru Airport Suites",
      timezone: "Africa/Nairobi",
      status: "ACTIVE",
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: {
      email: "admin@noru.example",
    },
    create: {
      name: "Noru Super Admin",
      email: "admin@noru.example",
      passwordHash: adminPasswordHash,
      systemRole: "SUPER_ADMIN",
    },
    update: {
      name: "Noru Super Admin",
      passwordHash: adminPasswordHash,
      systemRole: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: {
      email: "manager@noru.example",
    },
    create: {
      name: "Hotel Manager",
      email: "manager@noru.example",
      passwordHash: managerPasswordHash,
      systemRole: "HOTEL_USER",
    },
    update: {
      name: "Hotel Manager",
      passwordHash: managerPasswordHash,
      systemRole: "HOTEL_USER",
      isActive: true,
    },
  });

  await Promise.all([
    prisma.hotelMembership.upsert({
      where: {
        userId_hotelId: {
          userId: superAdmin.id,
          hotelId: hotel.id,
        },
      },
      create: {
        userId: superAdmin.id,
        hotelId: hotel.id,
        role: "OWNER",
      },
      update: {
        role: "OWNER",
      },
    }),
    prisma.hotelMembership.upsert({
      where: {
        userId_hotelId: {
          userId: superAdmin.id,
          hotelId: secondHotel.id,
        },
      },
      create: {
        userId: superAdmin.id,
        hotelId: secondHotel.id,
        role: "OWNER",
      },
      update: {
        role: "OWNER",
      },
    }),
    prisma.hotelMembership.upsert({
      where: {
        userId_hotelId: {
          userId: manager.id,
          hotelId: hotel.id,
        },
      },
      create: {
        userId: manager.id,
        hotelId: hotel.id,
        role: "MANAGER",
      },
      update: {
        role: "MANAGER",
      },
    }),
  ]);

  const departmentSeeds = [
    {
      name: "Front Desk",
      description: "Guest check-in, concierge, and lobby operations.",
    },
    {
      name: "Housekeeping",
      description: "Rooms, laundry, and floor readiness.",
    },
    {
      name: "Food & Beverage",
      description: "Restaurant, breakfast service, and banquets.",
    },
    {
      name: "Maintenance",
      description: "Repairs, facilities, and safety checks.",
    },
  ];

  const roleSeeds = ["Receptionist", "Housekeeper", "Chef", "Supervisor", "Technician"];

  const departments = await Promise.all(
    departmentSeeds.map((department) =>
      prisma.department.upsert({
        where: {
          hotelId_name: {
            hotelId: hotel.id,
            name: department.name,
          },
        },
        create: {
          hotelId: hotel.id,
          ...department,
        },
        update: {
          description: department.description,
        },
      }),
    ),
  );

  const roles = await Promise.all(
    roleSeeds.map((roleName) =>
      prisma.role.upsert({
        where: {
          hotelId_name: {
            hotelId: hotel.id,
            name: roleName,
          },
        },
        create: {
          hotelId: hotel.id,
          name: roleName,
        },
        update: {},
      }),
    ),
  );

  const byDepartment = Object.fromEntries(departments.map((department) => [department.name, department]));
  const byRole = Object.fromEntries(roles.map((role) => [role.name, role]));

  const employeeSeeds = [
    {
      employeeCode: "NR-1001",
      firstName: "Amina",
      lastName: "Khalid",
      email: "amina.khalid@noru.example",
      phone: "+254700100001",
      status: "ACTIVE",
      hireDate: new Date("2023-03-14T00:00:00.000Z"),
      departmentId: byDepartment["Front Desk"].id,
      roleId: byRole.Receptionist.id,
    },
    {
      employeeCode: "NR-1002",
      firstName: "Brian",
      lastName: "Otieno",
      email: "brian.otieno@noru.example",
      phone: "+254700100002",
      status: "ACTIVE",
      hireDate: new Date("2022-11-02T00:00:00.000Z"),
      departmentId: byDepartment.Housekeeping.id,
      roleId: byRole.Supervisor.id,
    },
    {
      employeeCode: "NR-1003",
      firstName: "Grace",
      lastName: "Wanjiku",
      email: "grace.wanjiku@noru.example",
      phone: "+254700100003",
      status: "ACTIVE",
      hireDate: new Date("2024-01-08T00:00:00.000Z"),
      departmentId: byDepartment.Housekeeping.id,
      roleId: byRole.Housekeeper.id,
    },
    {
      employeeCode: "NR-1004",
      firstName: "David",
      lastName: "Mensah",
      email: "david.mensah@noru.example",
      phone: "+254700100004",
      status: "ON_LEAVE",
      hireDate: new Date("2021-07-21T00:00:00.000Z"),
      departmentId: byDepartment["Food & Beverage"].id,
      roleId: byRole.Chef.id,
    },
    {
      employeeCode: "NR-1005",
      firstName: "Lina",
      lastName: "Patel",
      email: "lina.patel@noru.example",
      phone: "+254700100005",
      status: "ACTIVE",
      hireDate: new Date("2023-09-18T00:00:00.000Z"),
      departmentId: byDepartment.Maintenance.id,
      roleId: byRole.Technician.id,
    },
  ];

  const employees = await Promise.all(
    employeeSeeds.map((employee) =>
      prisma.employee.upsert({
        where: {
          hotelId_employeeCode: {
            hotelId: hotel.id,
            employeeCode: employee.employeeCode,
          },
        },
        create: {
          hotelId: hotel.id,
          ...employee,
        },
        update: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          status: employee.status,
          hireDate: employee.hireDate,
          departmentId: employee.departmentId,
          roleId: employee.roleId,
        },
      }),
    ),
  );

  const shiftSeeds = [
    {
      name: "Morning Front Desk",
      startTime: "07:00",
      endTime: "15:00",
      requiredStaff: 2,
      departmentId: byDepartment["Front Desk"].id,
    },
    {
      name: "Room Turnover",
      startTime: "08:00",
      endTime: "16:00",
      requiredStaff: 3,
      departmentId: byDepartment.Housekeeping.id,
    },
    {
      name: "Breakfast Service",
      startTime: "05:30",
      endTime: "13:30",
      requiredStaff: 2,
      departmentId: byDepartment["Food & Beverage"].id,
    },
    {
      name: "Facilities Cover",
      startTime: "12:00",
      endTime: "20:00",
      requiredStaff: 1,
      departmentId: byDepartment.Maintenance.id,
    },
  ];

  const shifts = await Promise.all(
    shiftSeeds.map(async (shift) => {
      const existingShift = await prisma.shift.findFirst({
        where: {
          hotelId: hotel.id,
          name: shift.name,
        },
      });

      if (!existingShift) {
        return prisma.shift.create({
          data: {
            hotelId: hotel.id,
            ...shift,
          },
        });
      }

      return prisma.shift.update({
        where: {
          id: existingShift.id,
        },
        data: {
          startTime: shift.startTime,
          endTime: shift.endTime,
          requiredStaff: shift.requiredStaff,
          departmentId: shift.departmentId,
        },
      });
    }),
  );

  const today = startOfDayUtc(new Date());
  const assignmentSeeds = [
    {
      employeeId: employees[0].id,
      shiftId: shifts[0].id,
      date: today,
    },
    {
      employeeId: employees[1].id,
      shiftId: shifts[1].id,
      date: today,
    },
    {
      employeeId: employees[2].id,
      shiftId: shifts[1].id,
      date: today,
    },
    {
      employeeId: employees[4].id,
      shiftId: shifts[3].id,
      date: addDays(today, 1),
    },
    {
      employeeId: employees[0].id,
      shiftId: shifts[0].id,
      date: addDays(today, 1),
    },
  ];

  await Promise.all(
    assignmentSeeds.map((assignment) =>
      prisma.shiftAssignment.upsert({
        where: {
          hotelId_employeeId_shiftId_date: {
            hotelId: hotel.id,
            employeeId: assignment.employeeId,
            shiftId: assignment.shiftId,
            date: assignment.date,
          },
        },
        create: {
          hotelId: hotel.id,
          ...assignment,
        },
        update: {
          status: "SCHEDULED",
        },
      }),
    ),
  );

  const yesterday = addDays(today, -1);
  const attendanceSeeds = [
    {
      employeeId: employees[0].id,
      date: yesterday,
      clockIn: atUtcTime(yesterday, "07:03"),
      clockOut: atUtcTime(yesterday, "15:05"),
      status: "PRESENT",
      notes: null,
    },
    {
      employeeId: employees[1].id,
      date: yesterday,
      clockIn: atUtcTime(yesterday, "08:27"),
      clockOut: atUtcTime(yesterday, "16:10"),
      status: "LATE",
      notes: "Traffic delay reported to supervisor.",
    },
    {
      employeeId: employees[2].id,
      date: yesterday,
      clockIn: null,
      clockOut: null,
      status: "ABSENT",
      notes: "No clock-in recorded.",
    },
    {
      employeeId: employees[3].id,
      date: yesterday,
      clockIn: null,
      clockOut: null,
      status: "ON_LEAVE",
      notes: null,
    },
  ];

  await Promise.all(
    attendanceSeeds.map((attendance) =>
      prisma.attendance.upsert({
        where: {
          hotelId_employeeId_date: {
            hotelId: hotel.id,
            employeeId: attendance.employeeId,
            date: attendance.date,
          },
        },
        create: {
          hotelId: hotel.id,
          ...attendance,
        },
        update: {
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut,
          status: attendance.status,
          notes: attendance.notes,
        },
      }),
    ),
  );

  console.log(`Seeded ${hotel.name}, ${secondHotel.name}, and login accounts.`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
