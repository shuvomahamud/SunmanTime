import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword } from "../login/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <div className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h2>Choose a new password</h2>
        <Notice variant="error">{params.error}</Notice>
        {!params.token ? (
          <Notice variant="error">
            This reset link is invalid or expired. Request a new one.
          </Notice>
        ) : null}
        <form action={updatePassword} className="form-stack">
          <input type="hidden" name="token" value={params.token ?? ""} />
          <label>
            <span>New password</span>
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <SubmitButton className="button-primary" disabled={!params.token}>
            Update password
          </SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
