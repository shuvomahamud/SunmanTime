import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { logout } from "../login/actions";

export default function AccountDisabledPage() {
  return (
    <AuthShell>
      <div className="auth-card">
        <p className="eyebrow">Account unavailable</p>
        <h2>Your employee profile is not active.</h2>
        <p className="muted">
          Contact an administrator if you believe this is a mistake.
        </p>
        <form action={logout} className="form-stack">
          <SubmitButton className="button-primary">Return to sign in</SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
