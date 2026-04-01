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
- **Assignment model:** `priority`: `low` | `normal` | `high` (default `normal`); **UI labels** “Medium” for `normal`. **Default priority from title** on create (manual + new Canvas rows): `inferPriorityFromTitle` in `src/lib/assignment-priority.ts` (exams/papers → high; labs/assignments → medium; discussion/read/misc → low).
- Reminder cron at `/api/cron/reminders`; dedupe via `SentReminder`.
- Canvas sync: base URL + token, **Sync now** (`POST /api/canvas/sync`). **Not automatic** — no background poll; new instructor assignments appear after the user runs sync (usually seconds). Settings explains this.
- **Google Calendar:** OAuth; `calendar.events` + `calendar.readonly`; Settings dropdown + `GET /api/google/calendars`; push one / push all; optional `googleAutoSync`. **Event shape:** end-of-day deadlines (11:58–11:59 PM in `CALENDAR_DEFAULT_TIMEZONE`) sync as **all-day** events with `Exact deadline:` in description; others stay 1-hour timed. **`src/lib/calendar-due-display.ts`** + **`google-calendar.ts`**: PATCH failure → DELETE + POST recreate; `parseGoogleCalendarApiError`; invalid TZ falls back to `America/New_York`.
- **Microsoft Outlook:** OAuth; `Calendars.ReadWrite`; optional `msCalendarId` + `GET /api/microsoft/calendars`; push one / push all; optional `msAutoSync`.
- **UI / theming:** System + light + dark via `data-theme` on `<html>`, toggle `ThemeToggle`, `localStorage` key `study-tracker-theme`, `beforeInteractive` script in `layout.tsx`. **`StudyTrackerLogo`** SVG in nav.
- **Routes:** `/calendar` — month grid of assignments by local due date; chips link to `/assignments#assignment-{id}`. **`/assignments`:** sections **Overdue** → **Upcoming** → **Completed**; search + class filter; setup checklist; sync explainer; skeleton on first load only (`hasLoadedOnceRef`); optimistic **Mark done** + merge PATCH; completed rows **strikethrough + muted** (`.assignment-row-completed`). **`/invite`** — personal invite link + **`GET /api/user/invite`**; register with `?invite=` sets `invitedByUserId`. Nav **Invite**; **`User`**: `inviteCode`, `invitedByUserId`.
- **Dashboard (`/`):** **`useSession`** waits for `authenticated` before fetching; **`fetchDashboardWithRetry`** (4 attempts, backoff) + `credentials: 'same-origin'` for cold start / transient failures. **`/api/dashboard`:** `export const dynamic = 'force-dynamic'`; try/catch 500. **“Due this week”** = to-dos with `dueAt` after end of **today** through **end of upcoming Sunday 11:59:59 PM** in `CALENDAR_DEFAULT_TIMEZONE` (`endOfUpcomingSundayNight` in `calendar-due-display.ts`), not rolling 7 days.

## Recent Fixes (historical + ongoing)
- Assignment create duplicate key on `(userId, externalId)`: unique manual `externalId`, partial index on string `externalId`.
- Class delete used to orphan assignments; now `AssignmentModel.deleteMany` then class delete.
- Forgot-password 503 on local dev without Resend: dev path logs reset URL and returns 200 with instructions.

## Important Files
- `src/app/layout.tsx` — nav, `ThemeToggle`, `StudyTrackerLogo`, theme init `Script`
- `src/app/globals.css` — design tokens, dark mode, calendar/assignments/dashboard/skeleton/setup-checklist styles
- `src/components/ThemeToggle.tsx`, `src/components/StudyTrackerLogo.tsx`
- `src/app/page.tsx` — dashboard (`useSession`, `fetchDashboardWithRetry`, tab labels)
- `src/lib/fetch-dashboard.ts` — dashboard fetch with retries
- `src/app/api/dashboard/route.ts` — week window (`endOfUpcomingSundayNight`), `dynamic = 'force-dynamic'`, try/catch
- `src/lib/assignment-priority.ts`, `src/lib/assignments-list.ts`, `src/lib/assignments-datetime.ts`, `src/lib/assignments-scroll.ts`
- `src/lib/calendar-due-display.ts` — TZ helpers, week end Sunday, end-of-day for calendar sync
- `src/lib/invite-code.ts`, `src/app/api/user/invite/route.ts`, `src/app/register/RegisterForm.tsx`
- `src/app/invite/page.tsx`
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
- `src/lib/google-calendar.ts` (upsert + PATCH fallback + errors), `google-oauth.ts`, `google-sync.ts`
- `src/lib/microsoft-oauth.ts`, `microsoft-sync.ts`
- `src/app/api/classes/[id]/route.ts` — DELETE cascades assignments
- `src/lib/validators/assignment.ts`, `assignment-patch.ts`
- `src/models/Assignment.ts` — `googleEventId`, `msEventId`, `priority`
- `src/models/User.ts` — OAuth, calendars, auto-sync, **password reset** fields, **`inviteCode`**, **`invitedByUserId`**
- `middleware.ts` — protected routes include `/calendar`, `/invite`, `/api/user/:path*`, `/api/microsoft/:path*` (login/register/forgot/reset **not** listed → public)
- `vercel.json`

## Vercel Cron (`vercel.json`) — do not change casually
- **Purpose:** Vercel runs `GET /api/cron/reminders` and `GET /api/cron/canvas-sync` on schedules (see `vercel.json`).
- **Hobby plan:** Cron jobs may run **at most once per day** per job. Schedules like `0 */4 * * *` (every 4 hours) **fail deployment** on Hobby — same symptom as “Vercel won’t load / won’t redeploy” when `vercel.json` is invalid. Use **daily** expressions only (e.g. `0 6 * * *`), or upgrade to Pro for sub-daily schedules.
- **Current schedules:** Reminders `0 12 * * *` (12:00 UTC daily). Canvas sync `0 6 * * *` (06:00 UTC daily). **In-browser** Canvas refresh still runs every 4 hours via `useCanvasAutoSync` when the app is open.
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
- **Calendar / dashboard timezone (optional):** `CALENDAR_DEFAULT_TIMEZONE` — IANA zone (e.g. `America/Los_Angeles`). Used for: Google/Outlook all-day cutoff, dashboard “through Sunday night” window, Microsoft all-day events. Defaults to `America/New_York` if unset or invalid. Documented in `.env.example`.

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

### Done (consolidated — history through 2026-03-31)
- **Calendar page:** `/calendar` in nav + `middleware`; month grid by local due date; chips link to `/assignments#assignment-{id}`; assignments list `id` anchors + hash scroll.
- **Class delete cascade:** `DELETE /api/classes/[id]` runs `AssignmentModel.deleteMany` then deletes class; confirm dialog mentions assignments removed.
- **Forgot / reset password:** `passwordResetTokenHash`, `passwordResetExpiresAt` on `User`; `password-reset-token.ts`; `sendPasswordResetEmail`; `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`; pages `/forgot-password`, `/reset-password`; login “Forgot password?” + post-reset message. **Dev:** if Resend missing, log full reset URL in terminal, keep token (production still 503 + clear token on send failure).
- **Theming + logo:** `globals.css` light/dark tokens; system via `prefers-color-scheme` when no `data-theme`; `ThemeToggle` + `localStorage` `study-tracker-theme`; `beforeInteractive` script in `layout`; `StudyTrackerLogo` SVG in nav.
- **Assignments:** Overdue → Upcoming → Completed sections; search + class filter + clear; setup checklist when `classes.length === 0 || assignments.length === 0`; sync explainer; skeleton while `dataLoading`; empty visual; `priority` on `Assignment` + validators + create/edit UI + High/Low badges; **Mark done** primary for to-dos; `banner-success` for added assignment + board push messages.
- **Dashboard:** load states loading/ready/error; skeleton stats + task rows; error banner if fetch fails.
- **README:** Resend / forgot-password / dev reset URL note.
- **Invite:** `User.inviteCode` (unique when non-empty) + `invitedByUserId`; new users get a code at signup; `GET /api/user/invite` (force-dynamic) backfills codes; `/invite` page + nav link; register accepts `?invite=` and `POST /api/auth/register` body `inviteCode`; middleware: `/invite`, `/api/user/:path*`.
- **Assignments UX:** `assignments-list.ts` partition/filter/merge; optimistic mark-done + scroll to next “Mark done”; `hasLoadedOnceRef` avoids skeleton flash on refetch; edit save + push Google/Outlook merge IDs without full reload; optimistic delete with rollback; `NavLink` `prefetch`; card/page motion + `@media (hover: hover)` card hover; mobile nav horizontal scroll; “Medium” label for `normal` priority.
- **Default priority:** `assignment-priority.ts` + create form auto-infers from title until user changes priority (`priorityTouchedRef`); Canvas **create** sets `priority` via `inferPriorityFromTitle` (`canvas-sync.ts`).
- **Google Calendar display:** `calendar-due-display.ts` — end-of-day (23:58–23:59 in TZ) → all-day events + “Exact deadline:” in description; invalid `CALENDAR_DEFAULT_TIMEZONE` falls back to `America/New_York`; `google-calendar.ts` — `parseGoogleCalendarApiError`, PATCH 400/404/409/412 → DELETE + POST; Microsoft parity in `microsoft-sync.ts`.
- **Google push-all:** ~80ms spacing between items; assignments UI shows first failure string in `actionError` when `failed > 0`.
- **Dashboard “Due this week”:** Replaced rolling 7 days with **after today through end of upcoming Sunday 11:59:59 PM** in `CALENDAR_DEFAULT_TIMEZONE` (`endOfUpcomingSundayNight`, `endOfCalendarDayInTimeZone`, `isSundayYmd`); stat/tab labels updated.
- **Dashboard reliability:** `useSession` — fetch only when `authenticated`; `fetchDashboardWithRetry` (4 tries, exponential backoff); API `try/catch` + `dynamic = 'force-dynamic'` (fixes build static analysis noise).
- **Completed assignments:** `.assignment-row-completed` — strikethrough title + muted meta in Completed section.
- **Settings:** Canvas copy — sync is manual; timing expectations.
- **`src/components/NavLink.tsx`:** explicit `prefetch`.

### Current Status
- See **Current Status (working)** at top of this doc; backlog under **Known Issues / Follow-ups**; env includes optional **`CALENDAR_DEFAULT_TIMEZONE`**.

### Env / Deploy Notes
- Terminal reset link only with **`npm run dev`** (`NODE_ENV=development`). `npm run build && start` needs Resend for email.
- Set **`CALENDAR_DEFAULT_TIMEZONE`** on Vercel if users are not in Eastern US (matches dashboard week boundary + calendar all-day heuristic).

### Known Issues
- Align with **Known Issues / Follow-ups** (UTC cron, reconnect Google for list scope, auto-sync best-effort, unbuilt: recurring/attachments/subtasks/bulk/demo).
- **“Due today”** / server `startOfToday` still use **server local midnight**, not `CALENDAR_DEFAULT_TIMEZONE` — full TZ alignment would be a follow-up.

### Next Task
- Optional: hourly reminder cron; estimated minutes / link per assignment.

### Date
- 2026-03-31

### Done
- Habit-building features: focus timer (25/50/custom, ring, pause/resume, log session, chime + optional notification, completion state), streaks (current/longest from study sessions in `CALENDAR_DEFAULT_TIMEZONE`), goals (daily/weekly on User + progress UI), analytics page with Recharts weekly bar, insights, subject breakdown, recent sessions.
- Subjects: `Subject` model, `/subjects` CRUD, sessions taggable; analytics filter by subject.
- Canvas: server cron `GET /api/cron/canvas-sync` **daily** on Hobby-compatible schedule (`vercel.json`); POST `/api/canvas/sync` updates `canvasLastSyncAt` / `canvasLastSyncError`; client `useCanvasAutoSync` polls every 4h when logged in; Settings + Assignments show last sync and errors; manual vs Canvas badges on assignment rows.
- PWA: `src/app/manifest.ts`, icons under `public/icons/`, `viewport` theme colors.
- Footer support link (Cash App). Nav: Analytics, Subjects.

### Current Status
- Study sessions and goals persist in MongoDB. Theme already used `localStorage` (`study-tracker-theme`).

### Env / Deploy Notes
- Vercel Cron must include both reminder and canvas-sync jobs; `CRON_SECRET` required for cron routes in production.

### Known Issues
- Service worker / deep offline cache not implemented (installable PWA + manifest only).