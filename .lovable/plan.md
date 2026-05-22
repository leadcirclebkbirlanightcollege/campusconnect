# Campus Connect — MVP Trim + Polish + Performance Pass

Scope picked: **Hard delete code + drop tables** (keep E-CELL) · **Token audit · MVP trim · Timetable polish · Perf pass** · Timetable refined in-place.

This is a destructive pass. Below is exactly what gets deleted, kept, and refined. Nothing here touches auth, RLS model, edge function security, multi-tenancy, or the role hierarchy.

---

## 1. Modules HARD-DELETED

### Code + routes + nav entries removed
| Area | Files removed |
|------|---------------|
| Chat / Collaboration | `src/pages/student/messages/`, `src/pages/admin/channels/` |
| Polls | `src/pages/student/polls/`, `src/pages/admin/polls/` |
| Daily Content | `src/pages/student/content/`, `src/pages/admin/content/` |
| Daily Check-in | `src/pages/student/StudentCheckin.tsx` |
| Challenges | `src/pages/admin/challenges/` |
| Achievements (gamification) | `src/pages/student/StudentAchievements.tsx`, `src/pages/admin/pages/` achievement-related |
| Points / Leaderboard | `src/pages/student/points/`, `src/pages/Leaderboard.tsx`, `src/pages/admin/points/` |
| AI placeholders that hit LLMs | any `ai-*` widget that calls Lovable AI Gateway |
| Heavy analytics | `src/pages/student/StudentAnalytics.tsx`, deep admin reports |
| SuperAdmin bloat | `SAAchievementsTab/Page`, `SAFeedbackTab`, `SAMonitoringTab`, `SASystemMapTab/Page`, `SAActivityLogsTab`, `SABroadcastTab`, `SALecturesTab/Page`, `SALectureMonitorPage`, `SAAttendancePage`, `SALeaderboardPage`, `SAAchievementsPage` |
| Events student-facing | `src/pages/student/events/` — **KEPT** because E-CELL stalls depend on it |

### Edge functions deleted (Supabase)
`daily-checkin`, `daily-content-cron`, `recompute-intelligence`, `admin-adjust-points`

### Edge functions KEPT
auth-resolve-identifier, admin-create-student, admin-generate-attendance, admin-update-attendance, admin-reset-college-students, super-admin-*, academic-promote-students, ensure-admin-account, admin-backfill-user-roles, finalize-attendance, mark-attendance, lecture-status-notify, notification-scheduler, send-notification, subscribe-web-push, generate-vapid-keys, health-check, retention-on-login, update-user-email

### Database tables DROPPED (single migration, CASCADE)
`messages`, `channels`, `channel_members`, `polls`, `poll_votes` (if present), `daily_content`, `daily_checkins`, `daily_rewards_log`, `challenges`, `achievements`, `student_achievements` (if present), heavy `intelligence_*` snapshot tables that only fed analytics widgets.

### Tables KEPT
All academic + tenancy + auth tables: `colleges`, `profiles`, `user_roles`, `departments`, `classes`, `programmes`, `lectures`, `attendance`, `attendance_tokens`, `attendance_audit_log`, `assignments`, `documents`, `exams`, `exam_results`, `timetable_slots`, `class_promotion_rules`, `academic_promotion_runs`, `announcements`, `notifications`, `notification_recipients`, `notification_preferences`, `audit_logs`, `feedback`, `leads`, `login_activity`, `account_deletion_requests`, `core_team_members`, `events`, `erp_import_*`, `permissions`.

---

## 2. Token & color audit

- Confirm `src/index.css` HSL values match the brand palette (already updated last turn — verify each token).
- `rg` sweep for hardcoded `#`, `rgb(`, `rgba(` in `src/components/**` and `src/pages/**`. Replace with semantic Tailwind classes (`bg-card`, `text-foreground`, `border-border-subtle`, `text-primary`, `bg-surface-2`, etc.).
- Verify `tailwind.config.ts` exposes all tokens consumed; add `border-default = rgba(255,255,255,0.08)` only if missing.
- Light-mode tokens untouched (project is dark-first; light mode kept functional).

## 3. Timetable hero polish (in-place)

`src/pages/student/StudentTimetable.tsx` + admin timetable views:
- Today card: gradient ring around primary, soft indigo glow, larger time chip, status pill (`Now / Next / Done`).
- Weekly cards: day-letter avatars with active glow, lecture rows get hover lift + left primary accent bar for current hour.
- Add subtle shimmer skeletons (existing token).
- Empty states tightened with muted illustrations using existing icons.
- No new dependencies, no layout reflow, no breakpoint changes.

## 4. Performance pass

- Audit `AppRouter.tsx`: every page already lazy — verify no eager imports leaked in. Remove imports of deleted pages.
- React Query: confirm `staleTime: 30–60s` on heavy queries; add `placeholderData: keepPreviousData` to timetable, attendance, notifications lists.
- Memoize timetable `slotsByDay` reductions and admin tables.
- Drop `framer-motion` heavy variants from any deleted page consumers — keep micro-interactions via CSS only.
- Confirm no orphan realtime subscriptions remain (messages channel subscription is removed with Collaboration Hub).

## 5. Out of scope (explicitly NOT touched)

- Auth (Supabase), RLS policies on kept tables, edge function logic on kept functions.
- Database schema for kept tables.
- E-CELL hub, stalls, events.
- Routing skeleton, layout shells, PWA, push, network/offline overlays.
- Light mode (kept working as-is).

---

## Execution order

1. Token + nav/route cleanup (non-destructive).
2. Code deletion (pages, edge functions).
3. Single DB migration: drop tables with CASCADE — **requires your confirmation in the migration card**.
4. Delete deployed edge functions on Supabase.
5. Timetable polish.
6. Verify build, console, network.

After approval I will execute in that order. The DB migration card will surface separately for your explicit OK before any table is dropped.
