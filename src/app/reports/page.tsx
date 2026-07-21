import Link from "next/link";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TimeTable } from "@/components/time-table";
import { requireAdmin } from "@/lib/auth";
import { listReportEntries } from "@/lib/db/queries";
import { monthBounds, normalizeMonth } from "@/lib/dates";

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
  const totalMinutes = entries.reduce((total, entry) => {
    if (!entry.end_time) return total;
    const duration =
      new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
    return duration > 0 ? total + Math.floor(duration / 60_000) : total;
  }, 0);

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
          <strong>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</strong>
          <small>{entries.length} entries · {bounds.label}</small>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{bounds.label}</p>
            <h2>All employee entries</h2>
          </div>
        </div>
        <TimeTable entries={entries} showEmployee />
      </section>
    </AppShell>
  );
}
