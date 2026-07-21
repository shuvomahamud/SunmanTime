import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNull,
  lte,
} from "drizzle-orm";
import type { Profile, TimeEntry, TimeEntryWithProfile } from "@/lib/types";
import { getDb } from "./index";
import { profiles, timeEntries } from "./schema";

const profileSummary = {
  first_name: profiles.first_name,
  last_name: profiles.last_name,
  username: profiles.username,
  email: profiles.email,
};

function addProfile(
  row: {
    entry: TimeEntry;
    profile: TimeEntryWithProfile["profiles"];
  },
): TimeEntryWithProfile {
  return { ...row.entry, profiles: row.profile };
}

export async function findProfile(userId: string) {
  const [profile] = await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return profile as Profile | undefined;
}

export async function listActiveProfiles() {
  return (await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.is_active, true))
    .orderBy(asc(profiles.first_name), asc(profiles.last_name))) as Profile[];
}

export async function listTodayEntries(workDate: string) {
  const rows = await getDb()
    .select({ entry: timeEntries, profile: profileSummary })
    .from(timeEntries)
    .leftJoin(profiles, eq(timeEntries.user_id, profiles.id))
    .where(eq(timeEntries.work_date, workDate))
    .orderBy(asc(timeEntries.start_time));
  return rows.map(addProfile);
}

export async function listUserEntries(
  userId: string,
  startDate: string,
  endDate: string,
) {
  return (await getDb()
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.user_id, userId),
        gte(timeEntries.work_date, startDate),
        lte(timeEntries.work_date, endDate),
      ),
    )
    .orderBy(desc(timeEntries.work_date), asc(timeEntries.sequence))) as TimeEntry[];
}

export async function listReportEntries(
  startDate: string,
  endDate: string,
  ascending = false,
) {
  const rows = await getDb()
    .select({ entry: timeEntries, profile: profileSummary })
    .from(timeEntries)
    .leftJoin(profiles, eq(timeEntries.user_id, profiles.id))
    .where(
      and(
        gte(timeEntries.work_date, startDate),
        lte(timeEntries.work_date, endDate),
      ),
    )
    .orderBy(
      ascending ? asc(timeEntries.work_date) : desc(timeEntries.work_date),
      asc(timeEntries.start_time),
    );
  return rows.map(addProfile);
}

export async function createClockIn(userId: string, workDate: string) {
  const [entry] = await getDb()
    .insert(timeEntries)
    .values({ user_id: userId, work_date: workDate, sequence: 1 })
    .onConflictDoNothing({
      target: [
        timeEntries.user_id,
        timeEntries.work_date,
        timeEntries.sequence,
      ],
    })
    .returning();

  if (!entry) throw new Error("Already clocked in for this workday");
  return entry;
}

export async function closeClockIn(userId: string, workDate: string) {
  const [entry] = await getDb()
    .update(timeEntries)
    .set({ end_time: new Date().toISOString() })
    .where(
      and(
        eq(timeEntries.user_id, userId),
        eq(timeEntries.work_date, workDate),
        eq(timeEntries.sequence, 1),
        isNull(timeEntries.end_time),
      ),
    )
    .returning();

  if (!entry) throw new Error("No open clock-in exists for this workday");
  return entry;
}
