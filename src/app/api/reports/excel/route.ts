import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { listReportEntries } from "@/lib/db/queries";
import { formatClockTime, formatDuration, monthBounds, normalizeMonth } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = normalizeMonth(url.searchParams.get("month") ?? undefined);
  const bounds = monthBounds(month);
  await requireAdmin();
  const entries = await listReportEntries(bounds.start, bounds.end, true);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sunman Time";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(bounds.label, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Employee", key: "employee", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Work date", key: "workDate", width: 14 },
    { header: "Clock in", key: "clockIn", width: 14 },
    { header: "Clock out", key: "clockOut", width: 14 },
    { header: "Duration", key: "duration", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Legacy ID", key: "legacyId", width: 12 },
  ];

  for (const entry of entries) {
    const profile = entry.profiles;
    sheet.addRow({
      employee: profile
        ? `${profile.first_name} ${profile.last_name}`.trim() || profile.username
        : `Legacy user #${entry.legacy_user_id ?? "unknown"}`,
      email: profile?.email ?? "",
      workDate: entry.work_date,
      clockIn: formatClockTime(entry.start_time),
      clockOut: formatClockTime(entry.end_time),
      duration: formatDuration(entry.start_time, entry.end_time),
      status: entry.end_time ? "Complete" : "Open",
      legacyId: entry.legacy_id ?? "",
    });
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF173F35" },
  };
  header.height = 26;
  sheet.autoFilter = { from: "A1", to: "H1" };
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle" };
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F6F4" },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sunman-time-${month}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
