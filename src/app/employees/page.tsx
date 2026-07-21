import { MailPlus, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/lib/auth";
import { listProfiles } from "@/lib/db/queries";
import { inviteEmployee, sendEmployeeSetupLink } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { profile } = await requireAdmin();
  const [employees, params] = await Promise.all([
    listProfiles(),
    searchParams,
  ]);

  return (
    <AppShell profile={profile}>
      <PageHeader
        eyebrow="Access management"
        title="Employees"
        description="Invite employees and resend secure password-setup links."
      />

      <div className="employee-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Invite-only registration</p>
              <h2>Invite an employee</h2>
            </div>
            <MailPlus size={22} aria-hidden="true" />
          </div>
          <div className="panel-body">
            <Notice variant="error">{params.error}</Notice>
            <Notice>{params.message}</Notice>
            <form action={inviteEmployee} className="form-stack employee-form">
              <div className="form-grid">
                <label>
                  <span>First name</span>
                  <input name="firstName" autoComplete="off" required />
                </label>
                <label>
                  <span>Last name</span>
                  <input name="lastName" autoComplete="off" required />
                </label>
              </div>
              <label>
                <span>Username</span>
                <input
                  name="username"
                  minLength={2}
                  pattern="[a-zA-Z0-9._-]+"
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                <span>Work email</span>
                <input name="email" type="email" autoComplete="off" required />
              </label>
              <SubmitButton
                className="button-primary"
                pendingLabel="Sending invitation…"
              >
                <MailPlus size={17} />
                Send invitation
              </SubmitButton>
              <p className="form-help">
                Neon sends a one-time link so the employee chooses their own
                password. No temporary password is shared.
              </p>
            </form>
          </div>
        </section>

        <section className="panel employee-list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>{employees.length} registered accounts</h2>
            </div>
          </div>
          {employees.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th>Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="strong">
                        {`${employee.first_name} ${employee.last_name}`.trim() ||
                          employee.username}
                      </td>
                      <td>{employee.username}</td>
                      <td>{employee.email}</td>
                      <td>
                        {employee.role === "admin" ? "Administrator" : "Employee"}
                      </td>
                      <td>
                        <span
                          className={`status ${
                            employee.is_active ? "complete" : "inactive"
                          }`}
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <form action={sendEmployeeSetupLink}>
                          <input type="hidden" name="userId" value={employee.id} />
                          <SubmitButton
                            className="button-secondary table-action"
                            pendingLabel="Sending…"
                            disabled={!employee.is_active}
                          >
                            <Send size={14} />
                            Send link
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No employee accounts found.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
