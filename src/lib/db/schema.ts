import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["employee", "admin"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    legacy_user_id: bigint("legacy_user_id", { mode: "number" }).unique(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    legacy_email: text("legacy_email"),
    first_name: text("first_name").notNull().default(""),
    last_name: text("last_name").notNull().default(""),
    role: userRole("role").notNull().default("employee"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("profiles_active_idx").on(table.is_active)],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    legacy_id: bigint("legacy_id", { mode: "number" }).unique(),
    user_id: uuid("user_id").references(() => profiles.id, {
      onDelete: "restrict",
    }),
    legacy_user_id: bigint("legacy_user_id", { mode: "number" }),
    work_date: date("work_date", { mode: "string" }).notNull(),
    sequence: smallint("sequence").notNull().default(1),
    start_time: timestamp("start_time", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    end_time: timestamp("end_time", {
      withTimezone: true,
      mode: "string",
    }),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("time_entries_user_workday_sequence_key").on(
      table.user_id,
      table.work_date,
      table.sequence,
    ),
    index("time_entries_user_date_idx").on(table.user_id, table.work_date),
    index("time_entries_work_date_idx").on(table.work_date),
    index("time_entries_legacy_user_idx").on(table.legacy_user_id),
  ],
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  time_entries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  profile: one(profiles, {
    fields: [timeEntries.user_id],
    references: [profiles.id],
  }),
}));
