"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-form-panel">
      <div className="auth-card">
        <p className="eyebrow">Something went wrong</p>
        <h2>We couldn’t load this page.</h2>
        <p className="muted">
          Check the application configuration or try the request again.
        </p>
        <button className="button-primary link-button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

