import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";
import { formatInTimeZone } from "date-fns-tz";

const businessTimeZone = "America/New_York";
const apply = process.argv.includes("--apply");
const sendResets = process.argv.includes("--send-resets");
const sqlitePath = path.resolve(
  process.cwd(),
  process.env.DJANGO_SQLITE_PATH ??
    "../django-apps/LeaveManagement/db.sqlite3",
);
const overridesPath = path.resolve(
  process.cwd(),
  "migration/email-overrides.json",
);
const cleanupPath = path.resolve(process.cwd(), "migration/data-cleanup.json");

if (!fs.existsSync(sqlitePath)) {
  throw new Error(`SQLite database not found: ${sqlitePath}`);
}

const sqlite = new Database(sqlitePath, {
  readonly: true,
  fileMustExist: true,
});
const users = sqlite
  .prepare(
    `select id, username, email, first_name, last_name,
            is_active, is_staff, is_superuser, date_joined
       from auth_user
      order by id`,
  )
  .all();
const sourceEntries = sqlite
  .prepare(
    `select id, userid, startTime as start_time, endTime as end_time
       from home_timetable
      order by id`,
  )
  .all();

const cleanup = fs.existsSync(cleanupPath)
  ? JSON.parse(fs.readFileSync(cleanupPath, "utf8"))
  : {};
const userMerges = cleanup.userMerges ?? {};
const excludedEntryIds = new Set(
  (cleanup.excludedEntryIds ?? []).map((id) => Number(id)),
);
const entries = sourceEntries.filter(
  (entry) => !excludedEntryIds.has(Number(entry.id)),
);

let overrides = {};
if (fs.existsSync(overridesPath)) {
  const parsed = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
  overrides = parsed.overrides ?? parsed;
}

const resolvedUsers = users.map((user) => ({
  ...user,
  canonical_user_id: Number(userMerges[String(user.id)] ?? user.id),
  original_email: String(user.email).trim(),
  resolved_email: String(overrides[String(user.id)] ?? user.email)
    .trim()
    .toLowerCase(),
}));

for (const user of resolvedUsers) {
  if (!resolvedUsers.some((candidate) => candidate.id === user.canonical_user_id)) {
    throw new Error(
      `Cleanup maps legacy user ${user.id} to missing user ${user.canonical_user_id}`,
    );
  }
}

const accountUsers = resolvedUsers.filter(
  (user) => user.id === user.canonical_user_id,
);

const emailOwners = new Map();
for (const user of accountUsers) {
  const owners = emailOwners.get(user.resolved_email) ?? [];
  owners.push(user.id);
  emailOwners.set(user.resolved_email, owners);
}

const conflicts = [...emailOwners.entries()].filter(
  ([email, ids]) => !email.includes("@") || ids.length > 1,
);
const knownUserIds = new Set(users.map((user) => user.id));
const orphanEntries = entries.filter((entry) => !knownUserIds.has(entry.userid));
const openEntries = entries.filter((entry) => !entry.end_time);
const negativeEntries = entries.filter(
  (entry) =>
    entry.end_time &&
    new Date(`${entry.end_time.replace(" ", "T")}Z`) <
      new Date(`${entry.start_time.replace(" ", "T")}Z`),
);

console.log("Django → Neon migration audit");
console.log(`SQLite: ${sqlitePath}`);
console.log(`Users: ${users.length}`);
console.log(`Neon employee profiles after approved merges: ${accountUsers.length}`);
console.log(`Source time entries: ${sourceEntries.length}`);
console.log(`Time entries after approved duplicate exclusions: ${entries.length}`);
console.log(
  `Merged legacy users: ${resolvedUsers.filter((user) => user.id !== user.canonical_user_id).length}`,
);
console.log(`Excluded duplicate time entries: ${excludedEntryIds.size}`);
console.log(`Orphaned time entries preserved: ${orphanEntries.length}`);
console.log(`Open time entries preserved: ${openEntries.length}`);
console.log(
  `Negative-duration entries preserved for review: ${negativeEntries.length}`,
);

if (conflicts.length) {
  console.error("\nEmail conflicts must be resolved before import:");
  for (const [email, ids] of conflicts) {
    console.error(
      `- ${JSON.stringify(email)} is used by legacy user IDs ${ids.join(", ")}`,
    );
  }
  console.error(
    `\nCopy migration/email-overrides.example.json to ${overridesPath} and map each conflicting legacy ID to a unique email.`,
  );
  process.exitCode = 2;
  sqlite.close();
} else if (!apply) {
  console.log("\nDry run passed. No remote data was changed.");
  console.log("Run `npm run migrate:apply` when the Neon schema is ready.");
  sqlite.close();
} else {
  const databaseUrl = process.env.DATABASE_URL;
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!databaseUrl || !authBaseUrl) {
    throw new Error(
      "DATABASE_URL and NEON_AUTH_BASE_URL are required for --apply",
    );
  }

  const sql = neon(databaseUrl);
  const existingProfiles = await sql`
    select id, legacy_user_id, email from public.profiles
  `;
  const authUsers = await sql`
    select id, email from neon_auth."user"
  `;
  const authIdByEmail = new Map(
    authUsers.map((user) => [String(user.email).toLowerCase(), user.id]),
  );
  const authIdByLegacyId = new Map(
    existingProfiles
      .filter((profile) => profile.legacy_user_id !== null)
      .map((profile) => [Number(profile.legacy_user_id), profile.id]),
  );

  for (const user of accountUsers) {
    let authId = authIdByLegacyId.get(Number(user.id));
    authId ??= authIdByEmail.get(user.resolved_email);

    if (!authId) {
      const displayName =
        `${user.first_name} ${user.last_name}`.trim() || user.username;
      execFileSync(
        "npx",
        [
          "neonctl@latest",
          "neon-auth",
          "user",
          "create",
          "--email",
          user.resolved_email,
          "--name",
          displayName,
          "--output",
          "json",
          "--no-analytics",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );

      const [created] = await sql`
        select id from neon_auth."user"
        where lower(email) = ${user.resolved_email}
        limit 1
      `;
      if (!created) {
        throw new Error(`Neon Auth user was not created for ${user.resolved_email}`);
      }
      authId = created.id;
      authIdByEmail.set(user.resolved_email, authId);
    }

    authIdByLegacyId.set(Number(user.id), authId);
    if (user.is_superuser) {
      execFileSync(
        "npx",
        [
          "neonctl@latest",
          "neon-auth",
          "user",
          "set-role",
          String(authId),
          "--roles",
          "admin",
          "--output",
          "json",
          "--no-analytics",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    }
    await sql`
      insert into public.profiles (
        id, legacy_user_id, username, email, legacy_email,
        first_name, last_name, role, is_active, created_at
      ) values (
        ${authId}, ${user.id}, ${user.username}, ${user.resolved_email},
        ${user.original_email}, ${user.first_name}, ${user.last_name},
        ${user.is_superuser ? "admin" : "employee"}::public.user_role,
        ${Boolean(user.is_active)}, ${`${user.date_joined.replace(" ", "T")}Z`}
      )
      on conflict (legacy_user_id) do update set
        id = excluded.id,
        username = excluded.username,
        email = excluded.email,
        legacy_email = excluded.legacy_email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        role = excluded.role,
        is_active = excluded.is_active,
        created_at = excluded.created_at
    `;
  }

  for (const user of resolvedUsers) {
    const canonicalAuthId = authIdByLegacyId.get(user.canonical_user_id);
    if (!canonicalAuthId) {
      throw new Error(
        `No Neon Auth user mapped for legacy user ${user.canonical_user_id}`,
      );
    }
    authIdByLegacyId.set(Number(user.id), canonicalAuthId);
  }

  const sequenceByUserDate = new Map();
  const migratedEntries = entries.map((entry) => {
    const startTime = `${entry.start_time.replace(" ", "T")}Z`;
    const endTime = entry.end_time
      ? `${entry.end_time.replace(" ", "T")}Z`
      : null;
    const workDate = formatInTimeZone(
      new Date(startTime),
      businessTimeZone,
      "yyyy-MM-dd",
    );
    const sequenceKey = `${authIdByLegacyId.get(Number(entry.userid)) ?? entry.userid}:${workDate}`;
    const sequence = (sequenceByUserDate.get(sequenceKey) ?? 0) + 1;
    sequenceByUserDate.set(sequenceKey, sequence);

    return {
      legacyId: entry.id,
      userId: authIdByLegacyId.get(Number(entry.userid)) ?? null,
      legacyUserId: entry.userid,
      workDate,
      sequence,
      startTime,
      endTime,
    };
  });

  for (let index = 0; index < migratedEntries.length; index += 250) {
    const batch = migratedEntries.slice(index, index + 250);
    await sql.transaction(
      batch.map((entry) => sql`
        insert into public.time_entries (
          legacy_id, user_id, legacy_user_id, work_date,
          sequence, start_time, end_time
        ) values (
          ${entry.legacyId}, ${entry.userId}, ${entry.legacyUserId},
          ${entry.workDate}, ${entry.sequence}, ${entry.startTime}, ${entry.endTime}
        )
        on conflict (legacy_id) do update set
          user_id = excluded.user_id,
          legacy_user_id = excluded.legacy_user_id,
          work_date = excluded.work_date,
          sequence = excluded.sequence,
          start_time = excluded.start_time,
          end_time = excluded.end_time
      `),
    );
    console.log(
      `Imported ${Math.min(index + batch.length, migratedEntries.length)}/${migratedEntries.length} entries`,
    );
  }

  const [counts] = await sql`
    select
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.time_entries) as entries
  `;
  if (
    counts.profiles !== accountUsers.length ||
    counts.entries !== entries.length
  ) {
    throw new Error(
      `Validation failed: expected ${accountUsers.length}/${entries.length} profiles/entries, got ${counts.profiles}/${counts.entries}`,
    );
  }

  if (sendResets) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is required for --send-resets");
    }

    for (const user of accountUsers.filter((item) => item.is_active)) {
      const response = await fetch(`${authBaseUrl}/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.resolved_email,
          redirectTo: `${siteUrl.replace(/\/$/, "")}/reset-password`,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Reset email failed for legacy user ${user.id} (${response.status})`,
        );
      }
    }
    console.log(
      `Password-reset emails requested for ${accountUsers.filter((item) => item.is_active).length} active users.`,
    );
  }

  console.log("\nMigration and count validation completed successfully.");
  sqlite.close();
}
