import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/lib/auth";
import { listProfiles } from "@/lib/db/queries";
import { setEmployeeActive } from "./actions";
import { EmployeeInviteModal } from "./employee-invite-modal";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { profile } = await requireAdmin();
  const [profiles, params] = await Promise.all([
    listProfiles(),
    searchParams,
  ]);
  const employees = profiles.filter((employee) => employee.role === "employee");

  return (
    <AppShell profile={profile}>
      <PageHeader
        eyebrow="Access management"
        title="Employees"
        description="Manage employee access and invitations from one directory."
        action={<EmployeeInviteModal />}
      />

      <Notice variant="error">{params.error}</Notice>
      <Notice>{params.message}</Notice>

      <section className="panel employee-list-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Directory</p>
            <h2>{employees.length} employees</h2>
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
                  <th>Status</th>
                  <th>Access</th>
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
                      <span
                        className={`status ${
                          employee.is_active ? "complete" : "inactive"
                        }`}
                      >
                        {employee.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <form action={setEmployeeActive}>
                        <input type="hidden" name="userId" value={employee.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={employee.is_active ? "false" : "true"}
                        />
                        <SubmitButton
                          className="button-secondary table-action"
                          pendingLabel="Updating…"
                        >
                          {employee.is_active ? "Deactivate" : "Activate"}
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
    </AppShell>
  );
}
