export const hotelStatuses = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export const employeeStatuses = ["ACTIVE", "ON_LEAVE", "INACTIVE"] as const;

export const attendanceStatuses = ["PRESENT", "ABSENT", "LATE", "ON_LEAVE"] as const;

export const shiftAssignmentStatuses = ["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"] as const;

export const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
  ON_LEAVE: "On leave",
  INACTIVE: "Inactive",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
};
