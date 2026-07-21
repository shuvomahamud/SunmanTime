import Link from "next/link";
import { BarChart3, Clock3, Download, LogOut, UsersRound } from "lucide-react";
import { logout } from "@/app/login/actions";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const initials = `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`;

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark small" aria-hidden="true">
            <Clock3 size={21} />
          </span>
          <span>
            <strong>Sunman Time</strong>
            <small>Operations portal</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/">
            <Clock3 size={18} />
            Attendance
          </Link>
          {profile.role === "admin" ? (
            <>
              <Link href="/reports">
                <BarChart3 size={18} />
                Reports
              </Link>
              <Link href="/employees">
                <UsersRound size={18} />
                Employees
              </Link>
              <Link href="/api/reports/excel">
                <Download size={18} />
                Export month
              </Link>
            </>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="avatar">{initials || "ST"}</span>
            <span>
              <strong>
                {profile.first_name} {profile.last_name}
              </strong>
              <small>{profile.role === "admin" ? "Administrator" : "Employee"}</small>
            </span>
          </div>
          <form action={logout}>
            <button className="nav-button" type="submit">
              <LogOut size={17} />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
