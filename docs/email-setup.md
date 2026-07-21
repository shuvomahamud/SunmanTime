# Neon Auth password email setup

Neon Auth owns password hashing, sessions, reset tokens, and reset-email
delivery. This project uses Neon Auth's shared sender, so the Next.js application
does not need a separate email service or email-provider credentials.

Neon describes the shared sender as a development service. It is the deliberate
starting choice for this small deployment, but delivery must be tested from the
real Vercel domain before employee reset emails are requested. A supported email
provider can be added inside Neon Auth later if delivery becomes inadequate;
none is configured or required by the application now.

Keep public registration off, enable localhost in the Neon Auth configuration,
and test with an address you control.

Required local variables:

```text
DATABASE_URL
NEON_AUTH_BASE_URL
NEON_AUTH_COOKIE_SECRET
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The reset flow is:

1. `/forgot-password` submits the email to Neon Auth.
2. Neon Auth creates the token and sends the reset link.
3. The link opens `/reset-password?token=...`.
4. The application submits that token and the new password to Neon Auth.

The response shown to the requester is intentionally identical whether the
email exists or not, which avoids exposing the employee list.

## Vercel setup

Before sending employee invitations or migration resets:

1. Keep the production branch's Neon Auth email provider set to **Shared**.
2. Add the canonical application domain to Neon Auth's trusted domains.
3. Set `NEXT_PUBLIC_SITE_URL` to that exact HTTPS origin in Vercel.
4. Generate a unique `NEON_AUTH_COOKIE_SECRET` for Production and another for
   Preview. Never place either value in a `NEXT_PUBLIC_` variable.
5. Request one reset for a dedicated test user and confirm the link reaches the
   correct domain and can be used only once.
6. Confirm delivery before running `npm run migrate:apply-and-reset`.

## Cutover safety

- Import and validate counts before sending any reset links.
- Keep new-user signup disabled in Neon Auth; administrators create employees
  from the protected `/employees` page.
- Do not log tokens, passwords, or connection strings.
- Rotate any credential that appears in terminal output or deployment logs.
