export type UserRole = "employee" | "admin";

export type Profile = {
  id: string;
  legacy_user_id: number | null;
  username: string;
  email: string;
  legacy_email: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TimeEntry = {
  id: number;
  legacy_id: number | null;
  user_id: string | null;
  legacy_user_id: number | null;
  work_date: string;
  sequence: number;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntryWithProfile = TimeEntry & {
  profiles: Pick<
    Profile,
    "first_name" | "last_name" | "username" | "email"
  > | null;
};
