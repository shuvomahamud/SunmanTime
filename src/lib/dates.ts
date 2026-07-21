import { endOfMonth, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export const BUSINESS_TIME_ZONE = "America/New_York";

export function currentWorkDate(date = new Date()) {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
}

export function currentWorkMonth(date = new Date()) {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, "yyyy-MM");
}

export function currentBusinessHour(date = new Date()) {
  return Number(formatInTimeZone(date, BUSINESS_TIME_ZONE, "H"));
}

export function normalizeMonth(value?: string) {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return currentWorkMonth();
}

export function monthBounds(month: string) {
  const start = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(endOfMonth(start), "yyyy-MM-dd"),
    label: format(start, "MMMM yyyy"),
  };
}

export function formatWorkTime(value: string | null) {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), BUSINESS_TIME_ZONE, "MMM d, h:mm a");
}

export function formatClockTime(value: string | null) {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), BUSINESS_TIME_ZONE, "h:mm a");
}

export function formatDuration(start: string, end: string | null) {
  if (!end) return "In progress";
  const milliseconds = new Date(end).getTime() - new Date(start).getTime();
  if (milliseconds < 0) return "Needs review";
  const minutes = Math.floor(milliseconds / 60_000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
