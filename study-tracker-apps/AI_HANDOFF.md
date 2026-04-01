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
- Auth: register/login; **forgot password** (`/forgot-password`, `POST /api/auth/forgot-password`) and **reset** (`/reset-password?token=…`, `POST /api/auth/reset-password`). Uses Resend + SHA-256 hashed token on `User` (`passwordResetTokenHash`, `passwordResetExpiresAt`, 1h TTL). **Dev (`npm run dev`):** if email fails (no `RESEND_API_KEY`), reset URL is printed in the terminal and token is kept; production still needs Resend.
- Classes + assignments CRUD; **deleting a class** deletes all assignments for that class first (`DELETE /api/classes/[id]`); UI confirm warns.
- **Assignment model:** `priority`: `low` | `normal` | `high` (default `normal`); Canvas-created rows omit it → Mongoose default.
- Reminder cron at `/api/cron/reminders`; dedupe via `SentReminder`.
- Canvas sync: base URL + token, **Sync now** (`/api/canvas/sync`).
- **Google Calendar:** OAuth; `calendar.events` + `calendar.readonly`; Settings dropdown + `GET /api/google/calendars`; push one / push all; optional `googleAutoSync`.
- **Microsoft Outlook:** OAuth; `Calendars.ReadWrite`; optional `msCalendarId` + `GET /api/microsoft/calendars`; push one / push all; optional `msAutoSync`.
- **UI / theming:** System + light + dark via `data-theme` on `<html>`, toggle `ThemeToggle`, `localStorage` key `study-tracker-theme`, `beforeInteractive` script in `layout.tsx`. **`StudyTrackerLogo`** SVG in nav.
- **Routes:** `/calendar` — month grid of assignments by local due date; chips link to `/assignments#assignment-{id}`. **`/assignments`:** sections **Overdue** → **Upcoming** → **Completed**; search + class filter; setup checklist when no classes or no assignments; sync explainer; skeleton while loading; priority on create/edit; **Mark done** primary on to-dos.
- **Dashboard (`/`):** loading skeletons + error state if `/api/dashboard` fails (not a bare “Loading…” forever).

## Recent Fixes (historical + ongoing)
- Assignment create duplicate key on `(userId, externalId)`: unique manual `externalId`, partial index on string `externalId`.
- Class delete used to orphan assignments; now `AssignmentModel.deleteMany` then class delete.
- Forgot-password 503 on local dev without Resend: dev path logs reset URL and returns 200 with instructions.

## Important Files
- `src/app/layout.tsx` — nav, `ThemeToggle`, `StudyTrackerLogo`, theme init `Script`
- `src/app/globals.css` — design tokens, dark mode, calendar/assignments/dashboard/skeleton/setup-checklist styles
- `src/components/ThemeToggle.tsx`, `src/components/StudyTrackerLogo.tsx`
- `src/app/page.tsx` — dashboard (load states, skeletons)
- `src/app/calendar/page.tsx`
- `src/app/assignments/page.tsx` — partitioned lists, filters, checklist, priority
- `src/app/login/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`
- `src/app/api/cron/reminders/route.ts`
- `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`
- `src/lib/email.ts` — reminders + `sendPasswordResetEmail`
- `src/lib/password-reset-token.ts`
- `src/models/SentReminder.ts`
- `src/app/api/settings/route.ts`
- `src/app/settings/page.tsx`
- `src/app/api/google/connect/route.ts`, `callback`, `calendars`, `push`, `push-all`
- `src/app/api/microsoft/connect`, `callback`, `calendars`, `push`, `push-all`
- `src/lib/google-calendar.ts`, `google-oauth.ts`, `google-sync.ts`
- `src/lib/microsoft-oauth.ts`, `microsoft-sync.ts`
- `src/app/api/classes/[id]/route.ts` — DELETE cascades assignments
- `src/lib/validators/assignment.ts`, `assignment-patch.ts`
- `src/models/Assignment.ts` — `googleEventId`, `msEventId`, `priority`
- `src/models/User.ts` — OAuth, calendars, auto-sync, **password reset** fields
- `middleware.ts` — protected routes include `/calendar` (login/register/forgot/reset **not** listed → public)
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
- **Email reminders + password reset:**
  - `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`
  - Forgot/reset emails use the same Resend config; `NEXTAUTH_URL` must match the site for reset links.
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
- Reminder timing is **UTC** and follows `vercel.json` — see **Vercel Cron** section before editing.
- Google users who connected **before** `calendar.readonly` was added should **Reconnect Google** once for calendar list in Settings.
- Google/Microsoft **auto-sync** is best-effort; assignment save still succeeds if calendar API fails.
- **Not built (backlog ideas):** recurring assignments, file attachments, subtasks, estimated time, bulk actions, demo seed data, two-way calendar sync.

## Next Recommended Task
- Optional: **hourly** reminder cron (`0 * * * *`) — confirm Vercel plan limits first.
- Optional: small fields **estimated minutes** and/or **single link URL** per assignment (lighter than full attachments).

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

### Date
- 2026-03-31

### Done (consolidated — later sessions)
- **Calendar page:** `/calendar` in nav + `middleware`; month grid by local due date; chips link to `/assignments#assignment-{id}`; assignments list `id` anchors + hash scroll.
- **Class delete cascade:** `DELETE /api/classes/[id]` runs `AssignmentModel.deleteMany` then deletes class; confirm dialog mentions assignments removed.
- **Forgot / reset password:** `passwordResetTokenHash`, `passwordResetExpiresAt` on `User`; `password-reset-token.ts`; `sendPasswordResetEmail`; `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`; pages `/forgot-password`, `/reset-password`; login “Forgot password?” + post-reset message. **Dev:** if Resend missing, log full reset URL in terminal, keep token (production still 503 + clear token on send failure).
- **Theming + logo:** `globals.css` light/dark tokens; system via `prefers-color-scheme` when no `data-theme`; `ThemeToggle` + `localStorage` `study-tracker-theme`; `beforeInteractive` script in `layout`; `StudyTrackerLogo` SVG in nav.
- **Assignments:** Overdue → Upcoming → Completed sections; search + class filter + clear; setup checklist when `classes.length === 0 || assignments.length === 0`; sync explainer; skeleton while `dataLoading`; empty visual; `priority` on `Assignment` + validators + create/edit UI + High/Low badges; **Mark done** primary for to-dos; `banner-success` for added assignment + board push messages.
- **Dashboard:** load states loading/ready/error; skeleton stats + task rows; error banner if fetch fails.
- **README:** Resend / forgot-password / dev reset URL note.

### Current Status
- See **Current Status (working)** at top of this doc; backlog under **Known Issues / Follow-ups**.

### Env / Deploy Notes
- Terminal reset link only with **`npm run dev`** (`NODE_ENV=development`). `npm run build && start` needs Resend for email.

### Known Issues
- Align with **Known Issues / Follow-ups** (UTC cron, reconnect Google for list scope, auto-sync best-effort, unbuilt: recurring/attachments/subtasks/bulk/demo).

### Next Task
- Optional: hourly cron; or **estimated minutes** / **single link** per assignment.