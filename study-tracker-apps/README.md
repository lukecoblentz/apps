# Study Tracker App

Next.js + MongoDB app for classes, assignments, auth, Canvas sync, and (planned) calendar export.

## 1) Install dependencies

```bash
npm install
```

## 2) Environment variables

Copy `.env.example` to `.env.local` and fill in values:

- `MONGODB_URI` — MongoDB Atlas (or local) connection string.
- `NEXTAUTH_URL` — App origin (e.g. `http://localhost:3000` locally, or your production URL).
- `NEXTAUTH_SECRET` — Long random string (e.g. `openssl rand -base64 32`).
- **Reminders (optional locally, recommended in production):** `RESEND_API_KEY`, `EMAIL_FROM` (verified sender), `CRON_SECRET` (protects `/api/cron/reminders`; Vercel sends this as `Authorization: Bearer …` when the job runs).
- **Google Calendar OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optional `GOOGLE_REDIRECT_URI` (defaults to `${NEXTAUTH_URL}/api/google/callback`).
- **Microsoft Calendar OAuth:** `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and optional `MICROSOFT_REDIRECT_URI` (defaults to `${NEXTAUTH_URL}/api/microsoft/callback`).

## 3) Run development server

```bash
npm run dev
```

Open the URL shown in the terminal (often `http://localhost:3000`).

## One-time: remove legacy demo data

If you used the app before authentication, old rows may have `userId: "demo-user"`. Remove them after setting `MONGODB_URI`:

```bash
npm run migrate:cleanup-demo
```

Requires Node 20+ (`--env-file`) or set `MONGODB_URI` in the environment yourself before running `node scripts/cleanup-legacy-demo-user.mjs`.

## Deploy (e.g. Vercel)

1. Push the repo and import the project in [Vercel](https://vercel.com).
2. Set environment variables in the Vercel project: `MONGODB_URI`, `NEXTAUTH_URL` (your production URL, e.g. `https://your-app.vercel.app`), `NEXTAUTH_SECRET`, plus **reminders**: `RESEND_API_KEY`, `EMAIL_FROM` (verified sender in [Resend](https://resend.com)), and `CRON_SECRET` (random string; Vercel Cron will call `/api/cron/reminders` with `Authorization: Bearer` this value).
3. `vercel.json` schedules **hourly** reminder emails (`0 * * * *`). After deploy, confirm **Cron Jobs** appear in the Vercel project.
4. In MongoDB Atlas, allow network access from Vercel (often `0.0.0.0/0` for serverless, or Vercel’s static egress if you use dedicated IPs).
5. Deploy; sign in, set reminder presets under **Settings**, add assignments with due dates, and test **Canvas sync** if you use Canvas.

### Local test: reminder cron

With `.env.local` containing `CRON_SECRET` (optional locally), `RESEND_API_KEY`, and `EMAIL_FROM`:

```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/reminders
```

If `CRON_SECRET` is unset in local dev, the route accepts unauthenticated GET for quick testing only (do not use that in production).

## Included features

- Email/password auth (NextAuth) scoped per user.
- Classes (colors, edit/remove) and assignments (edit, due dates, done/todo).
- Dashboard tabs: due today, overdue, next 7 days, recently done.
- Settings: reminder presets (email via Resend + hourly Vercel Cron), Canvas base URL + token, sync from Canvas planner items.
- Google Calendar OAuth connect/disconnect + assignment push/update.
- Outlook Calendar OAuth connect/disconnect + assignment push/update.
