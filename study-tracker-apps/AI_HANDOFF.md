# AI HANDOFF - Study Tracker

## Project
- **Name:** Study Tracker
- **Path:** `C:\Users\Luke\GitHub\Projects\apps\study-tracker-apps`
- **Stack:** Next.js App Router + TypeScript + MongoDB (Mongoose) + NextAuth credentials + Resend + Vercel Cron
- **Production URL:** `https://study-tracker-neon.vercel.app`

## Current Status (working)
- Auth works (register/login) locally and on production.
- Classes + assignments CRUD works.
- Reminder cron route exists at `/api/cron/reminders`.
- Reminder dedupe works via `SentReminder` model.
- Resend is configured for testing with `Study Tracker <onboarding@resend.dev>`.
- Canvas sync MVP works with manual token/base URL + "Sync now".
- Google Calendar MVP added with manual token flow:
  - settings fields for `googleAccessToken` + `googleCalendarId`
  - push endpoint `POST /api/google/push`
  - assignments UI button `Push Google` / `Update Google`

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
- `src/app/api/google/push/route.ts`
- `src/lib/google-calendar.ts`
- `src/app/assignments/page.tsx`
- `src/models/Assignment.ts`
- `src/models/User.ts`
- `middleware.ts`
- `vercel.json`

## Environment Variables
- Required:
  - `MONGODB_URI`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `CRON_SECRET`
- Optional / future:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - `MICROSOFT_CLIENT_ID`
  - `MICROSOFT_CLIENT_SECRET`

## Security Notes
- Never commit secrets or `.env.local`.
- `CRON_SECRET` was rotated after being typed in terminal.
- Runtime logs are in Vercel/Resend/Atlas (not GitHub).
- Manual cron test requires header:
  - `Authorization: Bearer <CRON_SECRET>`

## Known Issues / Follow-ups
- Google Calendar is MVP manual token flow only (OAuth not implemented yet).
- Cron timing depends on schedule in `vercel.json` (currently check this file before testing reminder timing).

## Next Recommended Task
- Implement Google OAuth flow (replace manual token entry), then Outlook sync with same pattern.

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