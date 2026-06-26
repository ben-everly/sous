# Deploying Sous

Production setup checklist. The backend is a hosted Supabase project; the Next.js app
runs on any App Router–capable host.

## 1. Supabase project

- [ ] Create a project at <https://supabase.com>.
- [ ] From **Project Settings → API**, copy the **Project URL** and **publishable key** (§6).

## 2. Migrations

- [ ] `npx supabase link --project-ref <ref>`
- [ ] `npx supabase db push`

## 3. JWT signing keys

- [ ] In the dashboard's JWT settings, migrate to **asymmetric (ES256)** keys.

## 4. Google OAuth

- [ ] **Google Cloud Console** → create an **OAuth 2.0 Client ID** (Web application).
- [ ] Set its **Authorized redirect URI** to `https://<ref>.supabase.co/auth/v1/callback`
      (the Supabase endpoint — **not** the app's `/auth/callback`).
- [ ] **Supabase → Authentication → Providers → Google**: enable, paste the client ID + secret.

## 5. Auth URLs

- [ ] **Supabase → Authentication → URL Configuration**:
  - **Site URL** — the app's origin, e.g. `https://app.example.com`
  - **Additional Redirect URLs** — list each path explicitly; GoTrue rejects
    any target not on this list and silently falls back to the Site URL, which
    breaks email confirmation and password reset:
    - `https://app.example.com/auth/callback`
    - `https://app.example.com/auth/confirm`
    - `https://app.example.com/reset-password`

## 6. App environment variables

Set on the host:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Project URL from §1
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key from §1

## 7. Deploy the app

- [ ] Build and deploy the Next.js app with the §6 env vars set.
- [ ] Point the domain at it; confirm `/login` loads and Google sign-in round-trips.

## 8. Auth hardening

> **Gate — do not expose email/password sign-in until both are done.** The local
> `config.toml` loosens the email send rate limits purely to make reset testable against
> Mailpit. Shipping those limits without production SMTP turns `/forgot-password` into an
> email-bomb and timing-enumeration surface — the non-enumerating copy buys nothing if an
> attacker can hammer the endpoint. Tighten limits and configure SMTP together, not as
> independent follow-ups.

- [ ] **Production SMTP** for transactional email (password reset) — tracked in **SIDE-135**.
      Without it the reset link never sends in production.
- [ ] **Supabase → Authentication → Rate Limits**: set production limits — the local
      `config.toml` loosens the email limits (`email_sent` under `[auth.rate_limit]`,
      `max_frequency` under `[auth.email]`) for dev/Mailpit testing; tighten them in the
      dashboard rather than shipping the dev values. See `config.toml` for the current values.
