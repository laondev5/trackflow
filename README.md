# ✓ TaskFlow

A mobile-first **PWA task manager** built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **shadcn/ui**, **Zustand**, and **MongoDB (Mongoose)**. It includes authentication, real-time overdue alerts, push notifications, and **email reminders sent with Nodemailer**.

The feature set borrows the best ideas from Todoist, TickTick, Things 3, Microsoft To Do, and Any.do.

## Features

### Capture & organize
- **Natural-language quick add** (Todoist-style): `Pay rent every month on the 1st #bills p1 @home`
  - Dates/times via `chrono-node` ("tomorrow 6pm", "next friday", "in 3 days")
  - `p1`–`p4` / `!!!` priority, `#tags`, `@project`, and "every day/weekday/week/month/year"
  - Live preview chips show what was understood before you save
- **Projects** with emoji icons and colors, plus progress bars
- **Tags**, **4 priority levels**, **subtasks** with progress, and **notes**
- **Repeating tasks** (daily, weekdays, weekly, monthly, yearly). Completing one schedules the next occurrence.
- **Kanban board** (To do / In progress / Done) with drag & drop on desktop and move buttons on mobile

### ✨ AI task planner (Gemini + Groq)
- Paste or **dictate** instructions, meeting notes, or a brain dump. The AI turns them into separate tasks with titles, notes, subtasks, due dates/times, priorities, reminders, repeats, projects, and tags.
- **Review before saving**: untick tasks, edit titles, or remove dates, reminders, projects, and tags, then add them all at once. Projects that don't exist yet are created for you.
- Relative dates ("next Friday", "end of month", "tonight") are resolved in **your time zone**. The prompt includes a 3-week calendar so the model doesn't miscount weekdays.
- **Gemini** (`GEMINI_MODEL`, default `gemini-2.5-flash`, with structured JSON output) runs first. **Groq** (`GROQ_MODEL`, default `openai/gpt-oss-120b`) takes over automatically if Gemini fails.
- API keys never leave the server. Each user is limited to 30 AI requests per 10 minutes.
- Open it from **Plan with AI** in the sidebar, the ✨ button in the mobile header or quick add, or press `A`.

### Views
- **Today**: greeting card with daily progress ring, an **Overdue** section with one-tap "Move to today", and a list of tasks completed today
- **Upcoming**: 14-day agenda with a date strip
- **Calendar**: month grid with priority dots and a per-day list
- **Inbox**, **Search** (titles, notes, subtasks, tags, projects), and **Completed** history
- **Smart filters**: Overdue, Urgent, No date, With reminders, Repeating
- **Sorting**: smart, priority, due date, newest, A→Z

### Never miss a deadline
| Channel | When the app is open | When the app is closed |
|---|---|---|
| In-app toast (Done / Snooze 10m) | ✅ reminder time & when a task becomes overdue | — |
| Daily "you have N overdue tasks" alert | ✅ | — |
| System notification | ✅ (via service worker) | ✅ Web Push (VAPID) |
| Notification center (bell with badge) | ✅ | ✅ saved server-side |
| **Email (Nodemailer)** | ✅ | ✅ reminders, overdue alerts, daily plan |

- Per-task reminders (at due time, 5/15/30 min, 1–2 h, or 1 day before; for all-day tasks: morning of, day before, and so on)
- A default reminder applied to new tasks
- **Daily plan email** at your chosen hour, in your time zone
- Overdue emails are batched into one email per user
- Atomic "claims" in MongoDB mean reminders are never sent twice, even if cron runs overlap

### Productivity
- **Focus timer (Pomodoro)** linked to a task, with a chime, vibration, and notification. It keeps running across navigation.
- **Insights**: streak, done today/week, 7-day chart, on-time rate, and open tasks by priority

### Mobile-first PWA
- Installable (manifest, generated icons, maskable icon, app shortcuts for *Add task*, *Upcoming*, *Focus*)
- Bottom tab bar with a center **+** button, bottom-sheet editors (vaul Drawer), safe-area insets
- **Swipe right to complete, swipe left to delete**, with **Undo** toasts
- **Offline support**: the service worker caches the app shell and pages, and Zustand keeps your last synced tasks in local storage. An offline banner appears when you lose connection.
- Optimistic UI: changes appear instantly and roll back if the server rejects them
- Light, dark, and system themes; desktop sidebar and keyboard shortcuts (`Q` add, `/` search)

### Auth & security
- Email + password (bcrypt, 12 rounds), **JWT session in an httpOnly cookie** (`jose`)
- Route protection in `src/proxy.ts` (the Next 16 replacement for middleware)
- Forgot/reset password by email (hashed single-use token, expires in 1 hour), change password
- Zod validation on every endpoint, per-user data scoping, and rate limiting on auth endpoints

---

## Getting started

### 1. Requirements
- Node.js 20+ (tested on 24)
- MongoDB: local, Docker (`docker run -d -p 27017:27017 mongo`), or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 2. Install & configure
```bash
npm install
cp .env.example .env.local
```
Edit `.env.local`:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `APP_URL` | Public URL, used in email links |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | Nodemailer SMTP settings |
| `CRON_SECRET` | Protects `/api/cron/reminders` |
| `ENABLE_INTERNAL_CRON` | `true` runs reminders every minute inside the Node server (dev, VPS, Docker, Railway, Render) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY` `VAPID_SUBJECT` | Optional Web Push. Generate with `npx web-push generate-vapid-keys` |

**Gmail:** turn on 2-step verification, create an [App Password](https://myaccount.google.com/apppasswords), then use `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`.

### 3. Run
```bash
npm run dev        # http://localhost:3000
```
Use **Settings → Send test email** to check your SMTP setup.

> The service worker is disabled in `next dev` so you don't get stale caches. To test install/offline/push, run `npm run build && npm start`, or set `NEXT_PUBLIC_SW_IN_DEV=1`.

---

## How reminders are scheduled

`src/lib/reminders.ts` → `runReminderJob()` is idempotent and does three things:
1. **Due reminders**: tasks with `remindAt <= now` that aren't complete → notification + push + email
2. **Overdue**: tasks whose `dueDate` has passed and haven't been flagged yet → one batched email per user
3. **Daily plan**: at each user's `digestHour` in their time zone

Pick one way to trigger it:

| Hosting | Setup |
|---|---|
| `next start` / VPS / Docker / Railway / Render | `ENABLE_INTERNAL_CRON=true` (runs every 60s via `src/instrumentation.ts`) |
| Vercel (Hobby) | `vercel.json` runs once a day (06:00 UTC) as a safety net. **Also** add a frequent trigger: [cron-job.org](https://cron-job.org) (free, every minute) or the included GitHub Action `.github/workflows/reminders.yml` (every 5 min). Set `ENABLE_INTERNAL_CRON=false` |
| Vercel (Pro) | Change the schedule in `vercel.json` to `*/5 * * * *` |
| Any other host | An external scheduler (cron-job.org, GitHub Actions, system cron) calls `POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`, or runs `npm run reminders` |

### cron-job.org setup (recommended on Vercel Hobby)
1. Create a free account at cron-job.org → **Create cronjob**
2. URL: `https://<your-app>.vercel.app/api/cron/reminders`, schedule: every 1 minute
3. **Advanced** → Request method `POST`, header `Authorization` = `Bearer <CRON_SECRET>`
4. Save, then click **Test run**. You should get `{"ok":true,...}`.

## Project structure
```
src/
  proxy.ts                 auth guard for pages
  instrumentation.ts       optional in-process reminder scheduler
  app/
    (auth)/                login, register, forgot/reset password
    (app)/                 today, upcoming, inbox, calendar, board, browse, projects/[id],
                           tags/[tag], filters/[filter], search, completed, stats, focus,
                           notifications, settings
    api/                   auth, tasks (+bulk), projects, notifications, settings,
                           push/subscribe, email/test, cron/reminders
    icons/[size]/          PNG app icons generated with next/og
    manifest.ts            PWA manifest
  components/
    ui/                    shadcn/ui primitives
    layout/                app shell, sidebar, bottom nav, header, alert watcher
    task/                  task item (swipe), list, quick add, editor, due picker
  store/                   Zustand: tasks (optimistic + persisted), session, ui
  lib/                     db, models, auth, mailer + templates, push, reminders,
                           recurrence, natural-language parser, validators
public/sw.js               service worker (offline caching + push)
```

## API overview
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` `/login` `/logout` | Session |
| GET | `/api/auth/me` | Current user + server features |
| POST | `/api/auth/forgot-password` `/reset-password` `/change-password` | Passwords |
| GET/POST | `/api/tasks` | List (open + completed in the last 90 days) / create |
| PATCH/DELETE | `/api/tasks/:id` | Update (handles completion + recurrence) / delete |
| POST | `/api/tasks/bulk` | `reschedule`, `delete`, `reorder`, `clearCompleted` |
| GET/POST, PATCH/DELETE | `/api/projects`, `/api/projects/:id` | Projects |
| GET/PATCH/DELETE | `/api/notifications` | Notification center |
| PATCH | `/api/settings` | Profile & preferences |
| POST/DELETE | `/api/push/subscribe` | Web Push subscriptions |
| POST | `/api/email/test` | Send a test email |
| GET/POST | `/api/ai/plan` | AI status / turn instructions into task drafts |
| GET/POST | `/api/cron/reminders` | Run the reminder job (Bearer `CRON_SECRET`) |
