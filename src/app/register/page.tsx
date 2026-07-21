import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { register } from "../login/actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const registrationEnabled = process.env.ALLOW_PUBLIC_SIGNUP === "true";

  return (
    <AuthShell>
      <div className="auth-card">
        <p className="eyebrow">New employee</p>
        <h2>Create an account</h2>
        <Notice variant="error">
          {params.error ??
            (!registrationEnabled
              ? "Registration is invite-only. Contact an administrator."
              : undefined)}
        </Notice>
        {registrationEnabled ? (
          <form action={register} className="form-stack">
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input name="firstName" autoComplete="given-name" required />
              </label>
              <label>
                <span>Last name</span>
                <input name="lastName" autoComplete="family-name" required />
              </label>
            </div>
            <label>
              <span>Username</span>
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              <span>Email address</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <SubmitButton className="button-primary">Create account</SubmitButton>
          </form>
        ) : null}
        <div className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </AuthShell>
  );
}

