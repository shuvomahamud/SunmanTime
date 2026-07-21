import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { TimeTable } from "@/components/time-table";
import { clockIn, clockOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import {
  listActiveProfiles,
  listTodayEntries,
  listUserEntries,
} from "@/lib/db/queries";
import {
  currentBusinessHour,
  currentWorkDate,
  currentWorkMonth,
  monthBounds,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const { profile } = await requireUser();

  if (profile.role === "admin") {
    const today = currentWorkDate();
    const [typedEntries, activeEmployees] = await Promise.all([
      listTodayEntries(today),
      listActiveProfiles(),
    ]);
    const employeeIdsPresent = new Set(
      typedEntries.map((entry) => entry.user_id).filter(Boolean),
    );
    const completed = typedEntries.filter((entry) => entry.end_time).length;

    return (
      <AppShell profile={profile}>
        <PageHeader
          eyebrow="Daily operations"
          title="Today’s attendance"
          description={`${format(new Date(`${today}T12:00:00`), "EEEE, MMMM d, yyyy")} · America/New_York`}
        />
        <Notice variant="error">{params.error}</Notice>
        <Notice>{params.message}</Notice>
        <section className="stats-grid" aria-label="Attendance summary">
          <article className="stat-card accent">
            <span>Clocked in</span>
            <strong>{employeeIdsPresent.size}</strong>
            <small>of {activeEmployees.length} active employees</small>
          </article>
          <article className="stat-card">
            <span>Completed shifts</span>
            <strong>{completed}</strong>
            <small>Clocked out today</small>
          </article>
          <article className="stat-card">
            <span>Not clocked in</span>
            <strong>{Math.max(activeEmployees.length - employeeIdsPresent.size, 0)}</strong>
            <small>Active profiles without an entry</small>
          </article>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live roster</p>
              <h2>Employee activity</h2>
            </div>
          </div>
          <TimeTable
            entries={typedEntries}
            showEmployee
            showDate={false}
            emptyMessage="No one has clocked in today."
          />
        </section>
      </AppShell>
    );
  }

  const month = currentWorkMonth();
  const bounds = monthBounds(month);
  const entries = await listUserEntries(profile.id, bounds.start, bounds.end);
  const today = currentWorkDate();
  const todayEntry = entries.find(
    (entry) => entry.work_date === today && entry.sequence === 1,
  );
  const completedMinutes = entries.reduce((total, entry) => {
    if (!entry.end_time) return total;
    const duration =
      new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
    return duration > 0 ? total + Math.floor(duration / 60_000) : total;
  }, 0);

  return (
    <AppShell profile={profile}>
      <PageHeader
        eyebrow="My attendance"
        title={`Good ${currentBusinessHour() < 12 ? "morning" : "afternoon"}, ${profile.first_name}`}
        description={`${format(new Date(`${today}T12:00:00`), "EEEE, MMMM d, yyyy")} · America/New_York`}
        action={
          !todayEntry ? (
            <form action={clockIn}>
              <SubmitButton className="button-primary" pendingLabel="Clocking in…">
                Clock in now
              </SubmitButton>
            </form>
          ) : !todayEntry.end_time ? (
            <form action={clockOut}>
              <SubmitButton className="button-dark" pendingLabel="Clocking out…">
                Clock out
              </SubmitButton>
            </form>
          ) : (
            <span className="day-complete">Today complete</span>
          )
        }
      />
      <Notice variant="error">{params.error}</Notice>
      <Notice>{params.message}</Notice>
      <section className="stats-grid" aria-label="Monthly summary">
        <article className="stat-card accent">
          <span>Today</span>
          <strong>{todayEntry ? (todayEntry.end_time ? "Complete" : "Active") : "Not started"}</strong>
          <small>{todayEntry ? `Started ${new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "America/New_York" }).format(new Date(todayEntry.start_time))}` : "Clock in when your shift begins"}</small>
        </article>
        <article className="stat-card">
          <span>Days this month</span>
          <strong>{new Set(entries.map((entry) => entry.work_date)).size}</strong>
          <small>{bounds.label}</small>
        </article>
        <article className="stat-card">
          <span>Recorded hours</span>
          <strong>{Math.floor(completedMinutes / 60)}h {completedMinutes % 60}m</strong>
          <small>Completed entries only</small>
        </article>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{bounds.label}</p>
            <h2>Your time history</h2>
          </div>
        </div>
        <TimeTable entries={entries} />
      </section>
    </AppShell>
  );
}
