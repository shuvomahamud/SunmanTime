import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell>
      <div className="auth-card">
        <p className="eyebrow">Employee portal</p>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to clock time and review your attendance.</p>
        <Notice variant="error">{params.error}</Notice>
        <Notice>{params.message}</Notice>
        <form action={login} className="form-stack">
          <input type="hidden" name="next" value={params.next ?? "/"} />
          <label>
            <span>Email address</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <SubmitButton className="button-primary" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <div className="auth-links">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </AuthShell>
  );
}
