import { Clock3 } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="brand-mark" aria-hidden="true">
          <Clock3 size={28} />
        </div>
        <p className="eyebrow">Sunman Global Express Corp</p>
        <h1>Time, made accountable.</h1>
        <p className="auth-intro">
          A focused attendance workspace for employees and operations leaders.
        </p>
        <div className="auth-proof">
          <span>America/New_York</span>
          <span>Secure employee access</span>
        </div>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  );
}

