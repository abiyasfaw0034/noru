export function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function todayUtc() {
  return startOfDayUtc(new Date());
}

export function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function composeDateTimeInput(date: string, time: string | null | undefined) {
  if (!time) {
    return null;
  }

  return new Date(`${date}T${time}:00.000Z`);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(date));
}

export function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function todayInputValue() {
  return toDateInputValue(todayUtc());
}

/** `YYYY-MM-DD` for a UTC-normalised date, for use as a SQL `date` parameter. */
export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
