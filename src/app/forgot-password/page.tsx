import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordReset } from "../login/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <div className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h2>Reset your password</h2>
        <p className="muted">We’ll email you a secure reset link.</p>
        <Notice variant="error">{params.error}</Notice>
        <form action={requestPasswordReset} className="form-stack">
          <label>
            <span>Email address</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <SubmitButton className="button-primary" pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
        <div className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </AuthShell>
  );
}

