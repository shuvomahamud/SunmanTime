import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { listReportEntries } from "@/lib/db/queries";
import { formatClockTime, monthBounds, normalizeMonth } from "@/lib/dates";
import {
  entryDurationMinutes,
  formatMinutesAsClock,
  groupReportEntries,
} from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = normalizeMonth(url.searchParams.get("month") ?? undefined);
  const selectedUser = url.searchParams.get("user");
  const bounds = monthBounds(month);
  await requireAdmin();
  const entries = await listReportEntries(bounds.start, bounds.end, true);
  const allUserReports = groupReportEntries(entries);
  const userReports = selectedUser
    ? allUserReports.filter((report) => report.key === selectedUser)
    : allUserReports;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sunman Time";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(bounds.label, {
    views: [{ state: "frozen", xSplit: 1, ySplit: 6 }],
  });
  const lastColumn = Math.max(1, userReports.length * 3 + 1);
  const daysInMonth = Number(bounds.end.slice(-2));
  const firstDayRow = 8;
  const totalRow = firstDayRow + daysInMonth;

  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value = `Sunman Time — ${bounds.label}`;
  sheet.getCell(1, 1).font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  sheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };
  sheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F35" } };
  sheet.getRow(1).height = 34;

  sheet.getCell("A4").value = bounds.label;
  sheet.getCell("A4").font = { bold: true, color: { argb: "FF173F35" } };
  sheet.mergeCells(5, 1, 6, 1);
  sheet.getCell("A5").value = "Date";
  sheet.getColumn(1).width = 12;

  for (let day = 1; day <= daysInMonth; day += 1) {
    sheet.getCell(firstDayRow + day - 1, 1).value = day;
  }

  userReports.forEach((report, reportIndex) => {
    const startColumn = reportIndex * 3 + 2;
    const endColumn = startColumn + 2;
    sheet.mergeCells(5, startColumn, 5, endColumn);
    sheet.getCell(5, startColumn).value = report.name;
    sheet.getCell(6, startColumn).value = "In Time";
    sheet.getCell(6, startColumn + 1).value = "Out Time";
    sheet.getCell(6, startColumn + 2).value = "Hours";
    sheet.getColumn(startColumn).width = 14;
    sheet.getColumn(startColumn + 1).width = 14;
    sheet.getColumn(startColumn + 2).width = 12;

    const entriesByDay = new Map<number, typeof report.entries>();
    for (const entry of report.entries) {
      const day = Number(entry.work_date.slice(-2));
      const dayEntries = entriesByDay.get(day) ?? [];
      dayEntries.push(entry);
      entriesByDay.set(day, dayEntries);
    }

    for (const [day, dayEntries] of entriesByDay) {
      const row = firstDayRow + day - 1;
      const sorted = [...dayEntries].sort(
        (left, right) =>
          new Date(left.start_time).getTime() - new Date(right.start_time).getTime(),
      );
      const completed = sorted.filter((entry) => entry.end_time);
      const totalMinutes = sorted.reduce(
        (total, entry) => total + entryDurationMinutes(entry),
        0,
      );
      sheet.getCell(row, startColumn).value = formatClockTime(sorted[0].start_time);
      sheet.getCell(row, startColumn + 1).value = completed.length
        ? formatClockTime(completed[completed.length - 1].end_time)
        : "";
      sheet.getCell(row, startColumn + 2).value = totalMinutes
        ? formatMinutesAsClock(totalMinutes)
        : "";
    }

    sheet.mergeCells(totalRow, startColumn, totalRow, startColumn + 1);
    sheet.getCell(totalRow, startColumn).value = "Total";
    sheet.getCell(totalRow, startColumn + 2).value = formatMinutesAsClock(
      report.totalMinutes,
    );
  });

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF255D4E" },
  };
  for (const rowNumber of [5, 6]) {
    const row = sheet.getRow(rowNumber);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
  }

  for (let rowNumber = firstDayRow; rowNumber < totalRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 21;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if ((rowNumber - firstDayRow) % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6F4" } };
      }
    });
  }

  const totals = sheet.getRow(totalRow);
  totals.height = 24;
  totals.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FF173F35" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC9F2DF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  for (let rowNumber = 5; rowNumber <= totalRow; rowNumber += 1) {
    for (let column = 1; column <= lastColumn; column += 1) {
      sheet.getCell(rowNumber, column).border = {
        top: { style: "thin", color: { argb: "FFD7E1DC" } },
        left: { style: "thin", color: { argb: "FFD7E1DC" } },
        bottom: { style: "thin", color: { argb: "FFD7E1DC" } },
        right: { style: "thin", color: { argb: "FFD7E1DC" } },
      };
    }
  }

  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(lastColumn).letter}${totalRow}`;

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
