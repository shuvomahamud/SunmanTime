import Link from "next/link";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TimeTable } from "@/components/time-table";
import { requireAdmin } from "@/lib/auth";
import { listReportEntries } from "@/lib/db/queries";
import { monthBounds, normalizeMonth } from "@/lib/dates";
import { formatMinutesAsClock, groupReportEntries } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = normalizeMonth(params.month);
  const bounds = monthBounds(month);
  const { profile } = await requireAdmin();
  const entries = await listReportEntries(bounds.start, bounds.end);
  const userReports = groupReportEntries(entries);
  const totalMinutes = userReports.reduce(
    (total, report) => total + report.totalMinutes,
    0,
  );

  return (
    <AppShell profile={profile}>
      <PageHeader
        eyebrow="Operations reporting"
        title="Monthly attendance"
        description="Review attendance history and export a payroll-ready workbook."
        action={
          <Link className="button-primary link-button" href={`/api/reports/excel?month=${month}`}>
            <Download size={17} />
            Export Excel
          </Link>
        }
      />
      <section className="report-toolbar">
        <form method="get">
          <label htmlFor="month">Reporting month</label>
          <input id="month" name="month" type="month" defaultValue={month} />
          <button className="button-secondary" type="submit">View report</button>
        </form>
        <div className="report-total">
          <span>Total recorded time</span>
          <strong>{formatMinutesAsClock(totalMinutes)}</strong>
          <small>
            {userReports.length} employees · {entries.length} entries · {bounds.label}
          </small>
        </div>
      </section>
      {userReports.length ? (
        <div className="report-user-list">
          {userReports.map((report) => (
            <section className="panel" key={report.key}>
              <div className="panel-heading report-user-heading">
                <div>
                  <p className="eyebrow">{report.email || "Employee report"}</p>
                  <h2>{report.name}</h2>
                </div>
                <div className="report-user-total">
                  <strong>{formatMinutesAsClock(report.totalMinutes)}</strong>
                  <small>{report.entries.length} entries</small>
                </div>
              </div>
              <TimeTable entries={report.entries} />
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <div className="empty-state">No attendance records found for {bounds.label}.</div>
        </section>
      )}
    </AppShell>
  );
}
