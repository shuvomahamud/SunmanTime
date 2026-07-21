import { formatClockTime, formatDuration } from "@/lib/dates";
import type { TimeEntry, TimeEntryWithProfile } from "@/lib/types";

type TimeTableProps = {
  entries: Array<TimeEntry | TimeEntryWithProfile>;
  showEmployee?: boolean;
  showDate?: boolean;
  emptyMessage?: string;
};

function employeeName(entry: TimeEntry | TimeEntryWithProfile) {
  if (!("profiles" in entry) || !entry.profiles) {
    return entry.legacy_user_id
      ? `Legacy user #${entry.legacy_user_id}`
      : "Unknown employee";
  }
  const fullName =
    `${entry.profiles.first_name} ${entry.profiles.last_name}`.trim();
  return fullName || entry.profiles.username;
}

export function TimeTable({
  entries,
  showEmployee = false,
  showDate = true,
  emptyMessage = "No attendance records found.",
}: TimeTableProps) {
  if (!entries.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {showEmployee ? <th>Employee</th> : null}
            {showDate ? <th>Work date</th> : null}
            <th>Clock in</th>
            <th>Clock out</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              {showEmployee ? <td className="strong">{employeeName(entry)}</td> : null}
              {showDate ? <td>{entry.work_date}</td> : null}
              <td>{formatClockTime(entry.start_time)}</td>
              <td>{formatClockTime(entry.end_time)}</td>
              <td>{formatDuration(entry.start_time, entry.end_time)}</td>
              <td>
                <span className={`status ${entry.end_time ? "complete" : "open"}`}>
                  {entry.end_time ? "Complete" : "Clocked in"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

