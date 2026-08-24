import { z } from "zod";

import {
  attendanceStatuses,
  employeeStatuses,
  hotelStatuses,
  shiftAssignmentStatuses,
} from "@/lib/constants";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().nullable().optional(),
);

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().nullable().optional(),
);

export const hotelFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, "Use lowercase letters, numbers, and hyphens"),
  name: z.string().trim().min(2, "Hotel name is required"),
  address: optionalText,
  phone: optionalText,
  email: optionalText,
  timezone: z.string().trim().min(2).default("Africa/Nairobi"),
  status: z.enum(hotelStatuses).default("ACTIVE"),
});

export const departmentFormSchema = z.object({
  name: z.string().trim().min(2, "Department name is required"),
  description: optionalText,
});

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, "Role name is required"),
  description: optionalText,
});

export const loginFormSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
  next: optionalText,
});

export const employeeFormSchema = z.object({
  employeeCode: z.string().trim().min(2, "Employee code is required"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("A valid email is required"),
  phone: optionalText,
  status: z.enum(employeeStatuses),
  hireDate: z.string().min(1, "Hire date is required"),
  departmentId: optionalId,
  roleId: optionalId,
});

export const shiftFormSchema = z.object({
  name: z.string().trim().min(2, "Shift name is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  requiredStaff: z.coerce.number().int().min(1).max(50),
  departmentId: optionalId,
});

export const shiftAssignmentFormSchema = z.object({
  employeeId: z.string().min(1),
  shiftId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(shiftAssignmentStatuses).default("SCHEDULED"),
});

export const attendanceFormSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  clockIn: optionalText,
  clockOut: optionalText,
  status: z.enum(attendanceStatuses),
  notes: optionalText,
});

export function formEntries(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/** PATCH accepts any subset of the create fields. */
export const employeeUpdateSchema = employeeFormSchema.partial();
