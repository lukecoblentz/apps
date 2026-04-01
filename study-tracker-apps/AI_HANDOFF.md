# AI HANDOFF - Study Tracker

## Project
- **Name:** Study Tracker
- **App folder:** `study-tracker-apps` (Next.js app lives here)
- **Git repo root:** `C:\Users\Luke\GitHub\Projects\apps` (monorepo: commit from repo root; app is in `study-tracker-apps/`)
- **Stack:** Next.js App Router + TypeScript + MongoDB (Mongoose) + NextAuth credentials + Resend + Vercel Cron
- **Production URL:** `https://study-tracker-neon.vercel.app`
- **Vercel:** Project name `study-tracker` — **Root Directory must be `study-tracker-apps`** so builds use this app’s `package.json`, not the parent folder.

### Vercel Hobby: cron frequency limit (critical)

> **Rate / plan limit:** On the **Hobby** plan, Vercel **only allows cron jobs that run at most once per day** (per job). Schedules that fire **multiple times per day** — for example `0 */4 * * *` (every 4 hours) or `0 * * * *` (hourly) — are **rejected**. The symptom is the same as a bad `vercel.json`: **deployments fail or never complete**, the dashboard may look stuck, and production won’t update until the schedule is fixed.
>
> **This repo’s fix:** Canvas sync uses **`0 6 * * *`** (daily, 06:00 UTC). Reminders use **`0 12 * * *`** (daily, 12:00 UTC). Do **not** revert to sub-daily server crons on Hobby without upgrading to **Pro** (or using an external scheduler). **Client-side:** while the app is open, `useCanvasAutoSync` still calls `/api/canvas/sync` about **every 4 hours** — that is separate from Vercel Cron and does not hit this limit.
>
> **Reference:** [Vercel Cron — usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) (plan limits and allowed frequencies).

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
- Canvas sync: base URL + token, **Sync now** (`POST /api/canvas/sync`). **Server:** daily cron `GET /api/cron/canvas-sync` on Hobby-safe schedule (see **`vercel.json`** + **Vercel Hobby: cron frequency limit** at top of this doc). **Client:** `useCanvasAutoSync` triggers sync ~every 4h while the app is open. Settings / Assignments explain timing and show last sync + errors.
- **Google Calendar:** OAuth; `calendar.events` + `calendar.readonly`; Settings dropdown + `GET /api/google/calendars`; push one / push all; optional `googleAutoSync`. **Event shape:** end-of-day deadlines (11:58–11:59 PM in `CALENDAR_DEFAULT_TIMEZONE`) sync as **all-day** events with `Exact deadline:` in description; others stay 1-hour timed. **`src/lib/calendar-due-display.ts`** + **`google-calendar.ts`**: PATCH failure → DELETE + POST recreate; `parseGoogleCalendarApiError`; invalid TZ falls back to `America/New_York`.
- **Microsoft Outlook:** OAuth; `Calendars.ReadWrite`; optional `msCalendarId` + `GET /api/microsoft/calendars`; push one / push all; optional `msAutoSync`.
- **UI / theming:** System + light + dark via `data-theme` on `<html>`, toggle `ThemeToggle`, `localStorage` key `study-tracker-theme`, `beforeInteractive` script in `layout.tsx`. **`StudyTrackerLogo`** SVG in nav.
- **Nav (signed-in):** **Menu** button opens a **left drawer** (portal to `document.body`) with main app links — avoids crowding the top bar. **Do not** render `position: fixed` drawer/backdrop inside `<header class="nav">`: `backdrop-filter` on the header creates a containing block in Chromium so the drawer would only be ~nav-height tall. **`SettingsIconLink`** — gear icon in the header (same chrome as theme toggle) → `/settings`; **Settings** is not duplicated in the drawer list.
- **Settings page:** Sticky **section pills** (Goals, Reminders, Canvas, Google, Outlook) with hash anchors `#settings-goals`, `#settings-reminders`, `#settings-canvas`, `#settings-google`, `#settings-outlook`; hash scroll on load; **← Dashboard** return link; `:target` / scroll-margin styles in `globals.css`.
- **Routes:** `/calendar` — month grid of assignments by local due date; chips link to `/assignments#assignment-{id}`. **`/assignments`:** sections **Overdue** → **Upcoming** → **Completed**; search + class filter; setup checklist; sync explainer; skeleton on first load only (`hasLoadedOnceRef`); optimistic **Mark done** / **Reopen** + merge PATCH; **`normalizeAssignmentStatus`** in `assignments-list.ts` (load, partition, merge); compare IDs with **`String(x._id)`**; PATCH **`cache: 'no-store'`**; **Reopen** primary on completed rows; completed rows **strikethrough + muted** (`.assignment-row-completed`). **`/invite`** — personal invite link + **`GET /api/user/invite`**; register with `?invite=` sets `invitedByUserId`. Nav **Invite**; **`User`**: `inviteCode`, `invitedByUserId`.
- **Dashboard (`/`):** **`useSession`** waits for `authenticated` before fetching; **`fetchDashboardWithRetry`** (4 attempts, backoff) + `credentials: 'same-origin'` for cold start / transient failures. **`/api/dashboard`:** `export const dynamic = 'force-dynamic'`; try/catch 500. **“Due this week”** = to-dos with `dueAt` after end of **today** through **end of upcoming Sunday 11:59:59 PM** in `CALENDAR_DEFAULT_TIMEZONE` (`endOfUpcomingSundayNight` in `calendar-due-display.ts`), not rolling 7 days.

## Recent Fixes (historical + ongoing)
- **2026-03-31 — Nav + Settings + assignments UX:** Crowded top bar → **Menu** drawer (`AppNav.tsx`) + **gear** → Settings; drawer/backdrop **portaled to `document.body`** (fixes Chromium `backdrop-filter` clipping fixed drawer to header height). **Settings:** sticky section tabs + hash anchors + Dashboard link. **Assignments:** **Reopen** reliability — `normalizeAssignmentStatus`, `String(_id)` matching, PATCH `cache: 'no-store'`, clearer Zod error display, Reopen as primary on completed rows.
- **2026-03-31 — Vercel Hobby deploy failure:** Canvas cron was `0 */4 * * *` (every 4h). **Hobby disallows multi-invocation-per-day crons** → deploys failed / wouldn’t redeploy. **Fixed:** `0 6 * * *` (daily 06:00 UTC) in `vercel.json`. See **Vercel Hobby: cron frequency limit (critical)** at top of this doc.
- Assignment create duplicate key on `(userId, externalId)`: unique manual `externalId`, partial index on string `externalId`.
- Class delete used to orphan assignments; now `AssignmentModel.deleteMany` then class delete.
- Forgot-password 503 on local dev without Resend: dev path logs reset URL and returns 200 with instructions.

## Important Files
- `src/app/layout.tsx` — nav, `AppNav`, `SettingsIconLink`, `ThemeToggle`, `StudyTrackerLogo`, theme init `Script`
- `src/components/AppNav.tsx` — Menu drawer + `createPortal(..., document.body)`; `NavLink` list (no Settings — use gear).
- `src/components/SettingsIconLink.tsx` — gear link to `/settings` (matches `theme-toggle` styling).
- `src/app/globals.css` — design tokens, dark mode, **`.nav-drawer` / `.nav-menu-btn`** (Menu), **`.settings-tabs`** / section anchors, calendar/assignments/dashboard/skeleton/setup-checklist styles
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
- `src/app/api/cron/canvas-sync/route.ts` — Canvas planner sync for all users with tokens; **must** use a Hobby-compatible daily schedule in `vercel.json` (see **Vercel Hobby: cron frequency limit** at top of this doc)
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

**See also the highlighted block** [Vercel Hobby: cron frequency limit (critical)](#vercel-hobby-cron-frequency-limit-critical) at the top of this file — that is the deploy-breaking constraint on Hobby.

- **Purpose:** Vercel runs `GET /api/cron/reminders` and `GET /api/cron/canvas-sync` on schedules (see `vercel.json`).
- **Hobby plan (rate limit):** Each cron **must not run more than once per calendar day**. Sub-daily schedules (e.g. every 4h, hourly) **fail deployment** — same symptom as when `vercel.json` is invalid (“Vercel won’t load”, deploy stuck). **Pro** (or external schedulers) is required for higher-frequency **server** crons.
- **Current schedules (as in repo):** Reminders `0 12 * * *` (12:00 UTC daily). Canvas sync `0 6 * * *` (06:00 UTC daily). **In-browser** Canvas refresh: ~every **4 hours** via `useCanvasAutoSync` when the app is open (not limited by Vercel Cron the same way).
- **Why this matters:** An invalid cron expression or a schedule your **plan** rejects can **fail production deploys** or leave Cron Jobs in a bad state.
- **Before editing `vercel.json` crons:**
  - Use a valid **5-field** cron Vercel accepts (minute hour day month weekday).
  - **On Hobby:** only **daily** schedules; confirm [usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).
  - **Hourly reminders** (`0 * * * *`) require a tier that allows hourly crons — **not** Hobby; do not add hourly crons on Hobby without verifying the deploy.
- **Recommendation:** Treat `vercel.json` cron changes like infra changes: deploy to a preview, confirm the deployment succeeds, then promote. Do not tweak cron “just to test” without reading the schedule semantics (UTC vs local) **and** plan limits.

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
- **Settings:** Canvas copy — server daily on Hobby + client ~4h while open; **Sync now**; last sync / errors.
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
- **Hobby:** cron schedules **must be daily only** per job — see **Vercel Hobby: cron frequency limit (critical)** at top of `AI_HANDOFF.md`. Sub-daily server crons will break deploys.

### Known Issues
- Service worker / deep offline cache not implemented (installable PWA + manifest only).

### Date
- 2026-03-31 (follow-up)

### Done
- Documented **Vercel Hobby cron rate / frequency limit** prominently at top of `AI_HANDOFF.md` (multi-invocation-per-day schedules fail deploys); expanded **Vercel Cron** section with cross-links and Pro vs Hobby notes; updated Current Status / Recent Fixes / Important Files / consolidated session notes for Canvas daily cron `0 6 * * *` + client `useCanvasAutoSync`.

### Current Status
- Deploys succeed on Hobby with current `vercel.json`. Do not reintroduce `0 */4 * * *` for server Canvas sync on Hobby without upgrading plan or using external cron.

### Next Task
- None required for Hobby cron — optional: Pro-only sub-daily server schedule if product needs it.

### Date
- 2026-03-31

### Done
- **Nav:** Replaced inline horizontal nav links with **`AppNav`** — **Menu** opens a left **drawer** listing Dashboard, Analytics, Subjects, Classes, Assignments, Calendar, Invite (not Settings). **`createPortal`** renders backdrop + drawer to **`document.body`** so `position: fixed` is viewport-sized; rendering inside `<header class="nav">` broke full-height drawer because **`backdrop-filter`** on the header creates a containing block in Chromium (~64px tall strip, scrollable links only).
- **Settings access:** **`SettingsIconLink`** — gear icon in header (`theme-toggle` styling), next to theme toggle when signed in; **`layout.tsx`** updated.
- **Settings page:** Sticky **section pills** with hash links `#settings-goals`, `#settings-reminders`, `#settings-canvas`, `#settings-google`, `#settings-outlook`; **`useEffect`** scrolls to hash after load (respects `prefers-reduced-motion`); **← Dashboard** link; **`globals.css`:** `.settings-tabs`, `.settings-tab-pill`, `.settings-return-link`, `.settings-section[id]` scroll-margin, `.settings-section:target` highlight.
- **Assignments — Reopen / Mark done:** Added **`normalizeAssignmentStatus`** in **`src/lib/assignments-list.ts`**; apply on **GET** load mapping, **`partitionAssignments`**, **`mergeAssignmentFromApi`**. **Toggle** uses normalized current status → `done` ↔ `todo` (avoids bad `status === "todo"` branch when status missing). **Optimistic update + merge** use **`String(x._id) === String(item._id)`**; fetch URL **`encodeURIComponent`**. PATCH fetch **`cache: 'no-store'`**. **Error display** for Zod **`formErrors`**. **UI:** **Reopen** uses **`btn-primary`** (same as Mark done). **`enteringDoneIds`** uses string ids.

### Current Status
- Top bar: logo + Menu + gear + theme + email + Sign out. Settings: quick tabs + hashes. Assignments: reopen should persist in UI state and match server after PATCH.

### Env / Deploy Notes
- None.

### Known Issues
- Same repo-wide backlog (UTC cron, etc.).

### Next Task
- Optional: dashboard rows link to `/assignments#assignment-{id}` for one-click jump to reopen.