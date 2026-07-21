# Sunman Time

Next.js replacement for the legacy Django attendance application. It uses the
App Router, Neon Auth, Neon Postgres, Drizzle ORM, server-side authorization,
and is designed for Vercel.

## Architecture

- Neon Auth owns credentials, secure sessions, verification, and password resets.
- `profiles` stores employee identity, active status, and application roles.
- `time_entries` stores attendance history in America/New_York workdays.
- All application database access happens on the server after authorization.
- Neon Auth's shared sender delivers authentication emails; the application does
  not use a separate email service.

Public registration is disabled by default. Set `ALLOW_PUBLIC_SIGNUP=true` only
if open employee registration is genuinely desired.

## Features translated from Django

- Employee email/password authentication and password recovery
- Employee clock-in and clock-out
- Employee monthly attendance history and hour totals
- Administrator daily attendance dashboard
- Administrator monthly report and `.xlsx` export
- America/New_York workday boundaries
- Preserved Django IDs for audit and migration verification

## Local setup

Requirements: Node.js 22, a Neon project, and Neon Auth enabled on its branch.

1. Authenticate and link this directory:

   ```bash
   npx neonctl@latest auth
   npx neonctl@latest link --project-id YOUR_PROJECT_ID --branch production
   ```

   Linking pulls the Neon variables into the git-ignored `.env.local`.

2. Add an independent cookie-signing secret to `.env.local`:

   ```bash
   openssl rand -base64 48
   ```

   Store the result as `NEON_AUTH_COOKIE_SECRET`. Do not reuse a database or API
   password.

3. Apply the application schema and start the app:

   ```bash
   npm install
   npm run db:apply
   npm run dev
   ```

4. Open `http://localhost:3000`. Localhost access must be enabled in Neon Auth.

## Authentication email

The password-reset forms call Neon Auth directly through the server SDK. Neon
creates the reset token, emails the link through its shared sender, and validates
the new password. No email-provider key is required in this application. This
small deployment intentionally starts with the shared sender; test delivery on
the deployed domain before migration reset emails are requested. See
[`docs/email-setup.md`](docs/email-setup.md).

## Legacy data migration

The migration is rerunnable. It creates users with Neon’s authenticated CLI,
upserts profiles by legacy Django ID, imports attendance by legacy entry ID, and
verifies the exact counts.

Run the offline audit first:

```bash
npm run migrate:check
```

If duplicate email collisions are reported, copy
`migration/email-overrides.example.json` to `migration/email-overrides.json`
and assign a unique login email to every listed legacy user ID. The real file is
ignored because it contains employee data.

After linking Neon and applying the schema:

```bash
npm run migrate:apply
```

This creates Neon Auth users without copying incompatible Django password
hashes. Only after preview validation and a successful Neon Auth reset-email
test from the deployed domain should you request password resets:

```bash
npm run migrate:apply-and-reset
```

## Vercel deployment

Connect the same Neon project through the Vercel Marketplace or copy the Neon
variables into Preview and Production. Add these application variables:

- `NEON_AUTH_COOKIE_SECRET` — unique random value per environment
- `NEXT_PUBLIC_SITE_URL` — the environment’s canonical URL
- `ALLOW_PUBLIC_SIGNUP=false`

Add every production and preview domain that may receive auth callbacks to
Neon Auth’s trusted domains. Do not add migration-only employee files to Vercel.

## Safe cutover sequence

1. Validate `npm run migrate:check` and resolve email collisions.
2. Apply the schema and import without sending reset emails.
3. Validate preview login with a dedicated test account.
4. Compare profile, attendance, orphan, and open-entry counts.
5. Verify Neon Auth reset-email delivery from the production domain.
6. Put Django in maintenance/read-only mode and run the final import.
7. Switch the domain and send password resets.
8. Keep the VPS database snapshot until the new system is accepted.
