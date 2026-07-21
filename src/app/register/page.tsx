import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";

export default function RegisterPage() {
  return (
    <AuthShell>
      <div className="auth-card">
        <p className="eyebrow">Employee access</p>
        <h2>Invitation required</h2>
        <Notice>
          Registration is invite-only. Ask an administrator to invite your
          work email.
        </Notice>
        <div className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </AuthShell>
  );
}
