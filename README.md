# Noru Hotel Employee Management

Small full-stack Hotel Employee Management System for the software developer technical challenge.

## Stack

- Next.js App Router with TypeScript
- Prisma ORM
- PostgreSQL, ready for Neon cloud
- Pure JWT authentication with httpOnly cookie sessions
- Zod validation
- Server-rendered UI with server actions

## Tenancy Recommendation

The app uses a shared-database multi-tenant design. Every hotel-owned operational table carries a `hotelId`, and the schema includes `User` and `HotelMembership` models so a super admin can manage all hotels while hotel users can later be scoped to one or more hotels.

This is the best fit for Neon at this stage: it avoids the operational overhead of one database per hotel while keeping tenant boundaries explicit in the data model.

## Features

- Super-admin hotel tenant list and active hotel switcher
- Login/logout with signed JWT cookie sessions
- Dedicated department and role management screens
- Employee CRUD
- Employee search, filtering, and pagination by name, code, email, department, role, and status
- Department and role assignment
- Shift template creation, listing, and deletion
- Employee shift assignment and unassignment
- Attendance recording and correction
- Dashboard metrics
- Attendance and shift coverage reports
- JSON APIs for employees and attendance report data

## Database Design

Core models:

- `Hotel`: tenant root for all operational records
- `User`: login identity with a salted password hash and `SUPER_ADMIN` or `HOTEL_USER` system role
- `HotelMembership`: maps users to hotels with owner, manager, or staff access
- `Employee`: personal details, status, department, and role
- `Department`: hotel operating groups such as front desk or housekeeping
- `Role`: job function such as receptionist, supervisor, or chef
- `Shift`: reusable shift template with required staffing
- `ShiftAssignment`: employee scheduled for a shift on a date
- `Attendance`: daily attendance record with optional clock-in and clock-out

Important relationships:

- Hotels own departments, roles, employees, shifts, shift assignments, and attendance records.
- Employees belong to one hotel and can be assigned to a department and role.
- Shift assignments and attendance are unique per hotel and employee/date context.
- Reports always filter by the active hotel.

## Reports

Two reports back the `/reports` screen.

**Shift coverage** is the non-trivial one. A staffing gap is the *absence* of rows:
a shift with nobody on it has no assignment records, so it cannot be found by
querying assignments. The query builds the day/shift slots that should exist —
`generate_series` for the date spine, CROSS JOINed against the hotel's shifts —
then uses a LATERAL subquery to count who was actually assigned to each slot and
aggregate their names. Uncovered slots survive as `assigned = 0`, which is the
row an operations lead actually needs. It runs as one statement in
`getShiftCoverageReport`.

**Attendance summary** uses Prisma's `groupBy` over employee and status for the
last N days, and derives worked hours from the clock-in/clock-out deltas. The
attendance rate is `(PRESENT + LATE) / (PRESENT + LATE + ABSENT)`; ON_LEAVE is
deliberately left out of the denominator so approved leave does not count
against an employee.

## Run Locally

Create a Neon database, then copy `.env.example` to `.env` and replace `DATABASE_URL` with your Neon connection string.
Set `AUTH_SECRET` to a long random value before deploying.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Seeded login accounts:

- Super admin: `admin@noru.example` / `NoruAdmin123!`
- Hotel manager: `manager@noru.example` / `NoruManager123!`

## Auth Design

The app uses a pure JWT + cookie session flow:

- Passwords are salted and hashed with Node `crypto.scrypt`.
- Login signs a short JSON Web Token with `jose`.
- The JWT is stored in an httpOnly, same-site cookie.
- Middleware verifies the cookie before allowing protected routes.
- Server code reloads the user and hotel memberships from Postgres before tenant-scoped reads and writes.

## Useful Scripts

```bash
npm run dev          # Start local app
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run db:generate  # Generate Prisma client
npm run db:push      # Apply Prisma schema to Postgres
npm run db:seed      # Seed demo hotel data
npm run db:studio    # Open Prisma Studio
```

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/employees` | Same `q`, `departmentId`, `roleId`, `status` filters as the UI, plus `page` and `perPage` |
| POST | `/api/employees` | 201 on success, 409 on duplicate code/email, 422 on a cross-tenant department or role |
| GET | `/api/employees/{id}` | Includes the 10 most recent shift assignments and attendance records |
| PATCH | `/api/employees/{id}` | Partial update; any subset of the create fields |
| DELETE | `/api/employees/{id}` | |
| GET | `/api/reports/attendance` | `?days=` window, defaults to 30, capped at 365 |
| GET | `/api/reports/coverage` | `?days=` window, defaults to 7, capped at 30; returns shortfall totals |

Every route resolves the caller's active hotel first and scopes its query to it, so an id
belonging to another tenant returns 404 rather than leaking that the record exists.

The UI is the primary interface, but the APIs are included to show the system can expose data programmatically.
