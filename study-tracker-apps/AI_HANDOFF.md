# AI HANDOFF - Study Tracker

## Project
- **Name:** Study Tracker
- **App folder:** `study-tracker-apps` (Next.js app lives here)
- **Git repo root:** `C:\Users\Luke\GitHub\Projects\apps` (monorepo: commit from repo root; app is in `study-tracker-apps/`)
- **Stack:** Next.js App Router + TypeScript + MongoDB (Mongoose) + NextAuth credentials + Resend + Vercel Cron
- **Production URL:** `https://study-tracker-neon.vercel.app`
- **Vercel:** Project name `study-tracker` — **Root Directory must be `study-tracker-apps`** so builds use this app’s `package.json`, not the parent folder.

## Quick context for the next AI session
- Work in `study-tracker-apps/`; **git operations** run from `C:\Users\Luke\GitHub\Projects\apps` (parent repo).
- Production secrets live in **Vercel env vars**, not in the repo; `.env.local` is local only.
- Microsoft token exchange errors: surface in Settings query `detail=`; common fix is **client secret Value** (not ID) and **matching redirect URIs**.
- `README.md` at repo root (`apps/README.md`) may be deleted locally — check `git status` before assuming a clean tree.

## Current Status (working)
- Auth works (register/login) locally and on production.
- Classes + assignments CRUD works.
- Reminder cron route exists at `/api/cron/reminders`.
- Reminder dedupe works via `SentReminder` model.
- Resend is configured for testing with `Study Tracker <onboarding@resend.dev>`.
- Canvas sync MVP: manual Canvas base URL + token, **Sync now** (`/api/canvas/sync`).
- **Google Calendar:** OAuth (`/api/google/connect`, `/api/google/callback`); scopes include `calendar.events` + `calendar.readonly` (list); Settings calendar dropdown + `GET /api/google/calendars`; push/update one or all; optional `googleAutoSync`; `src/lib/google-sync.ts`, `src/lib/google-calendar.ts`.
- **Microsoft Outlook:** OAuth (`/api/microsoft/connect`, `/api/microsoft/callback`); Graph scope uses `https://graph.microsoft.com/Calendars.ReadWrite`; push/update one or all; optional `msAutoSync`; `src/lib/microsoft-oauth.ts`, `src/lib/microsoft-sync.ts`.

## Recent Fixes
- Fixed assignment create duplicate key issue on `(userId, externalId)`:
  - manual assignments now get unique `externalId`
  - assignment index uses partial filter on string `externalId`
- Added better assignment create error handling in UI + API.

## Important Files
- `src/app/api/cron/reminders/route.ts`
- `src/models/SentReminder.ts`
- `src/lib/email.ts`
- `src/app/api/settings/route.ts`
- `src/app/settings/page.tsx`
- `src/app/api/google/connect/route.ts`, `src/app/api/google/callback/route.ts`, `src/app/api/google/calendars/route.ts`, `src/app/api/google/push/route.ts`, `src/app/api/google/push-all/route.ts`
- `src/app/api/microsoft/connect/route.ts`, `src/app/api/microsoft/callback/route.ts`, `src/app/api/microsoft/calendars/route.ts`, `src/app/api/microsoft/push/route.ts`, `src/app/api/microsoft/push-all/route.ts`
- `src/lib/google-calendar.ts`, `src/lib/google-oauth.ts`, `src/lib/google-sync.ts`
- `src/lib/microsoft-oauth.ts`, `src/lib/microsoft-sync.ts`
- `src/app/assignments/page.tsx`
- `src/models/Assignment.ts` (`googleEventId`, `msEventId`)
- `src/models/User.ts` (OAuth tokens + `googleCalendarId`, `msCalendarId`, `googleAutoSync`, `msAutoSync`)
- `middleware.ts`
- `vercel.json`

## Vercel Cron (`vercel.json`) — do not change casually
- **Purpose:** Vercel runs `GET /api/cron/reminders` on a schedule (see `vercel.json`).
- **Current schedule (as of handoff):** `0 12 * * *` — once per day at **12:00 UTC**. Reminder emails are only checked at that time; do not expect “hourly” reminder behavior unless the schedule is hourly.
- **Why this matters:** An invalid cron expression or a schedule Vercel rejects can **fail production deploys** or leave Cron Jobs in a bad state. We hit this once; fixing the schedule fixed deploy.
- **Before editing `vercel.json` crons:**
  - Use a valid **5-field** cron Vercel accepts (minute hour day month weekday).
  - Confirm the plan’s Cron limits (frequency) in Vercel docs for your tier.
  - If you want **hourly** reminder checks (closer to “remind X hours before due”), prefer something like `0 * * * *` (every hour at :00 UTC), not ad-hoc `*/15`-style experiments unless you have confirmed they are allowed and deploy cleanly.
- **Recommendation:** Treat `vercel.json` cron changes like infra changes: deploy to a preview, confirm the deployment succeeds, then promote. Do not tweak cron “just to test” without reading the schedule semantics (UTC vs local).

## Environment Variables
- **Core (required for app + auth):**
  - `MONGODB_URI`
  - `NEXTAUTH_URL` — must match the site origin users open (e.g. `http://localhost:3000` local, `https://study-tracker-neon.vercel.app` prod). **Vercel:** set per environment; redeploy after changes.
  - `NEXTAUTH_SECRET`
- **Email reminders (production):**
  - `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`
- **Google Calendar (required to use Connect Google / push):**
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Optional: `GOOGLE_REDIRECT_URI` — defaults to `${NEXTAUTH_URL}/api/google/callback`
- **Microsoft Outlook (required to use Connect Outlook / push):**
  - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` — secret must be the **Value**, not Secret ID
  - Optional: `MICROSOFT_REDIRECT_URI` — defaults to `${NEXTAUTH_URL}/api/microsoft/callback`
- **OAuth redirect gotcha:** Register in Google/Azure the exact callback URLs. If the browser uses `http://127.0.0.1:3000` but only `localhost` is registered, add both or use one consistently; optional explicit `MICROSOFT_REDIRECT_URI` / `GOOGLE_REDIRECT_URI` can lock the redirect.

## Security Notes
- Never commit secrets or `.env.local`.
- `CRON_SECRET` was rotated after being typed in terminal.
- Runtime logs are in Vercel/Resend/Atlas (not GitHub).
- Manual cron test requires header:
  - `Authorization: Bearer <CRON_SECRET>`

## Known Issues / Follow-ups
- Reminder timing is **UTC** and follows `vercel.json` — see **Vercel Cron (`vercel.json`) — do not change casually** above before editing.
- Outlook **calendar picker:** `msCalendarId` on user, Settings dropdown + `GET /api/microsoft/calendars`, new events use `/me/calendars/{id}/events` when set; updates still `PATCH /me/events/{id}`.
- Google **calendar picker:** `googleCalendarId` (default `primary`), Settings dropdown + `GET /api/google/calendars` (writable calendars only); connect flow requests `calendar.readonly` in addition to `calendar.events` — **existing users must Reconnect Google** once so the token includes the list scope.
- Google/Microsoft **auto-sync** is best-effort; assignment save still succeeds if calendar API fails.

## Next Recommended Task
- Optional: restore **hourly** reminder cron (`0 * * * *`) if product should match “remind X hours before” more closely — confirm Vercel plan limits first.

---

## Session Template (append below each new chat)
### Date
- YYYY-MM-DD

### Done
- ...

### Current Status
- ...

### Env / Deploy Notes
- ...

### Known Issues
- ...

### Next Task
- ...

### Date
- 2026-03-31

### Done
- Replaced manual Google token input with OAuth connect flow in Settings.
- Added `GET /api/google/connect` and `GET /api/google/callback`.
- Added Google token exchange/refresh helper at `src/lib/google-oauth.ts`.
- Persisted Google refresh token + access token expiry in user model.
- Updated Google push route to auto-refresh access tokens before event push.
- Updated docs/env example for required Google OAuth variables.

### Current Status
- Google Calendar is now connected via OAuth from Settings.
- Assignments `Push Google`/`Update Google` uses stored tokens and refresh when needed.
- Manual token field UI is removed.

### Env / Deploy Notes
- Required for Google connect: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Callback defaults to `${NEXTAUTH_URL}/api/google/callback` unless `GOOGLE_REDIRECT_URI` is set.
- Ensure the same callback URL is added in Google Cloud OAuth credentials.

### Known Issues
- If Google does not return a refresh token (can happen without fresh consent), reconnect with consent prompt.
- Outlook sync is not implemented yet.

### Next Task
- Implement Outlook OAuth + event push mirroring Google flow.

### Date
- 2026-03-31

### Done
- Added Google bulk sync endpoint `POST /api/google/push-all`.
- Added "Push all to Google" button in assignments page.
- Added per-user `googleAutoSync` toggle in Settings.
- Auto-sync now runs after assignment create/edit when toggle is enabled.
- Refactored Google sync logic into `src/lib/google-sync.ts`.

### Current Status
- Users can manually push one assignment, push all assignments, or enable automatic Google sync.
- Auto-sync is optional and disabled by default.

### Env / Deploy Notes
- No new env vars required beyond existing Google OAuth env vars.

### Known Issues
- Auto-sync is best-effort and non-blocking; assignment save still succeeds if Google API fails.

### Next Task
- Add Outlook OAuth + push-all + auto-sync parity.

### Date
- 2026-03-31

### Done
- Added Microsoft OAuth connect + callback routes:
  - `GET /api/microsoft/connect`
  - `GET /api/microsoft/callback`
- Added Microsoft one-way push endpoints:
  - `POST /api/microsoft/push`
  - `POST /api/microsoft/push-all`
- Added Microsoft token + auto-sync fields to `User` model.
- Added `msEventId` field to `Assignment` model.
- Added Microsoft sync helpers in `src/lib/microsoft-oauth.ts` and `src/lib/microsoft-sync.ts`.
- Added Settings UI for Outlook connect/disconnect + auto-sync toggle.
- Added Assignments UI buttons:
  - `Push Outlook` / `Update Outlook`
  - `Push all to Outlook`
- Wired assignment create/edit auto-sync for Outlook when enabled.

### Current Status
- Outlook integration is now parity with Google for OAuth, push one, push all, and optional auto-sync.
- Sync direction is one-way only (Study Tracker -> Outlook).

### Env / Deploy Notes
- Required env vars:
  - `MICROSOFT_CLIENT_ID`
  - `MICROSOFT_CLIENT_SECRET`
- Optional:
  - `MICROSOFT_REDIRECT_URI` (defaults to `${NEXTAUTH_URL}/api/microsoft/callback`)

### Known Issues
- No calendar picker for Outlook yet; integration targets default calendar (`/me/events`).
- Auto-sync is best-effort and non-blocking.

### Next Task
- Optional: add Outlook calendar picker + store selected calendar ID.

### Date
- 2026-03-31

### Done
- Added `msCalendarId` on `User` (empty = default calendar).
- Extended `microsoft-sync.ts` to create events via `/me/calendars/{id}/events` when a calendar is selected; `listMicrosoftCalendarsForUser` + `GET /api/microsoft/calendars`.
- Settings: Outlook calendar `<select>` with Refresh list, PATCH on change; cleared `msCalendarId` on disconnect.

### Current Status
- Outlook calendar picker matches the “optional next task” from the prior session.

### Env / Deploy Notes
- No new env vars (uses existing Graph `Calendars.ReadWrite`).

### Known Issues
- Same as repo-wide: reminder cron UTC; auto-sync best-effort.

### Next Task
- Optional: Google calendar list UI parity with Outlook.

### Date
- 2026-03-31

### Done
- Google connect OAuth scopes: added `https://www.googleapis.com/auth/calendar.readonly` alongside `calendar.events` for `calendarList.list`.
- `listGoogleCalendarsForUser` in `google-sync.ts` (writable calendars); `GET /api/google/calendars`.
- Settings: Google calendar `<select>` + Refresh list (same pattern as Outlook); disconnect resets `googleCalendarId` to `primary` (API + UI).

### Current Status
- Google calendar picker parity with Outlook.

### Env / Deploy Notes
- In Google Cloud Console, add the **Calendar read-only** scope to the OAuth client if you restrict scopes in the UI; users who connected before this change should use **Reconnect Google**.

### Known Issues
- Same as repo-wide.

### Next Task
- Optional: hourly reminder cron (see handoff).