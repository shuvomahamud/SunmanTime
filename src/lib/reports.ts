import type { TimeEntryWithProfile } from "@/lib/types";

export type UserReport = {
  key: string;
  name: string;
  email: string;
  entries: TimeEntryWithProfile[];
  totalMinutes: number;
};

export function entryDurationMinutes(entry: TimeEntryWithProfile) {
  if (!entry.end_time) return 0;
  const milliseconds =
    new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
  return milliseconds > 0 ? Math.floor(milliseconds / 60_000) : 0;
}

export function reportEmployeeName(entry: TimeEntryWithProfile) {
  if (!entry.profiles) {
    return entry.legacy_user_id
      ? `Legacy user #${entry.legacy_user_id}`
      : "Unknown employee";
  }

  const fullName =
    `${entry.profiles.first_name} ${entry.profiles.last_name}`.trim();
  return fullName || entry.profiles.username;
}

export function groupReportEntries(entries: TimeEntryWithProfile[]) {
  const reports = new Map<string, UserReport>();

  for (const entry of entries) {
    const key = entry.user_id
      ? `user:${entry.user_id}`
      : `legacy:${entry.legacy_user_id ?? "unknown"}`;
    const existing = reports.get(key);

    if (existing) {
      existing.entries.push(entry);
      existing.totalMinutes += entryDurationMinutes(entry);
      continue;
    }

    reports.set(key, {
      key,
      name: reportEmployeeName(entry),
      email: entry.profiles?.email ?? "",
      entries: [entry],
      totalMinutes: entryDurationMinutes(entry),
    });
  }

  return [...reports.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function formatMinutesAsClock(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
