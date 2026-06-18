# Campus Connect — Improvement & Feature Roadmap

Focus: **eliminate manual work** for staff, ship **quick wins** across the platform, and add **2 substantial modules** that are already half-promised by the codebase. No monetization scope (per your direction).

## Current state (audit summary)

The platform already has: attendance (QR/OTP), lectures, timetable, exams/results, assignments (text only), documents, programmes/circles, announcements, events, E-Cell stalls + point claims, notifications, leaderboard, digital ID, intelligence scoring, multi-tenant super admin, CRM leads, landing editor, PWA + push.

Gaps surfaced: 3 feature flags are **defined but unimplemented** (`messages`, `polls`, `daily_content`), assignment uploads missing, no automated nudges, no in-app tickets, no segmented broadcasts, CRM is shallow, no product analytics, no gradebook for internal marks.

---

## Phase 1 — Quick Wins (kills daily manual work)

Small, high-leverage changes shipped in one pass.

**1. Assignment file uploads (student + faculty)**
- Add Supabase Storage bucket `assignment-submissions` (private, RLS per `student_user_id`).
- Student: drag-drop / file picker on `StudentAssignments.tsx`, attach up to 5 files (PDF/img/docx, 20 MB each).
- Faculty: download all submissions as a zip from `FacultyAssignments.tsx`; show file list + grade inline.

**2. Segmented bulk notifications**
- Extend admin notification composer with audience filters: department, class, year, attendance risk tier, programme, custom CSV of student IDs.
- Live preview of recipient count before send. Saves admins from copy-pasting lists.

**3. Automated engagement triggers (cron via edge functions)**
- Daily `pg_cron` → `engagement-triggers` edge function:
  - Attendance < 75% → push + inbox alert (once per week).
  - Streak about to break (no check-in by 8 PM) → push reminder.
  - Assignment due in 24 h with no submission → push.
  - Admin digest at 7 AM: live lectures today, pending claims, pending verifications.
- All toggleable per user in `notification_preferences`.

**4. CRM upgrades for super-admin Leads**
- Add `lead_notes` table (timestamped notes per lead, author).
- Follow-up date + reminder badge on lead row.
- Source tag (landing/book-demo/referral/manual) and a conversion funnel chart on the Leads page.

**5. Help & Support → real ticket system**
- New `support_tickets` table (subject, body, category, status, priority, college_id).
- Student submits from `HelpSupport.tsx`; admin triage page under System → Tickets with assign/reply/close. Threaded replies via `ticket_messages`.

**6. Admin polish**
- Saved filters on Students table (e.g. "Risk <60%", "Pending verification").
- Bulk actions: send notification, adjust points, export selected.
- "Copy timetable from last week" button.

---

## Phase 2 — Bigger Features (close half-promised flags)

**A. Messaging & Class Channels** (`messages` flag — already advertised)
- `channels` and `messages` tables already exist — wire UI:
  - Student inbox tab "Channels": class channels (auto-joined by class/programme), DMs to faculty.
  - Faculty: post to assigned class channels, pin messages, attach files.
  - Realtime via Supabase Realtime; unread badge in bottom nav.
  - Admin moderation: report message, delete with audit log.

**B. Polls & Surveys** (`polls` flag — `polls`/`poll_votes` tables exist)
- Admin/faculty create poll (single/multi/rating, anonymous toggle, expiry, target audience reusing the segmentation from Phase 1).
- Student widget on dashboard: "1 poll waiting" → vote inline.
- Live results page with department/year breakdown and CSV export.

**C. Daily Content Feed** (`daily_content` flag, table exists)
- Admin schedules a daily card (quote, tip, video link, opportunity).
- Student dashboard hero strip + dedicated `/app/today` feed with history and bookmarks.
- Drives DAU; pairs naturally with the streak system.

**D. Internal Gradebook (CIE marks)**
- New `internal_assessments` (type: midterm/quiz/practical/CIE, max marks, weightage) and `internal_marks` tables.
- Faculty enters per-student marks in a spreadsheet-style grid (paste from Excel).
- Student sees a "Progressive Marks" tab inside Results with weighted total.
- Removes the #1 manual workflow staff still do in spreadsheets.

---

## Phase 3 — Platform-wide hygiene

- **Product analytics**: lightweight self-hosted event logger (`analytics_events` table + `useTrack` hook) — page views, feature usage, funnel from landing → signup → onboarding → first attendance. Super-admin dashboard tile.
- **Content moderation queue**: flagged announcements/messages/stall descriptions go into a queue with approve/reject + reason; auto-flag via simple keyword list.
- **Data retention**: per-college retention policy (e.g. archive attendance > 3 years), nightly job moves rows to `*_archive` tables. GDPR delete-my-data button in student profile that triggers an `account_deletion_requests` row (table already exists).
- **Audit log viewer**: filterable timeline in super-admin Security tab (already partially built — extend).

---

## Technical Notes

- **Database**: ~8 new tables (`support_tickets`, `ticket_messages`, `lead_notes`, `internal_assessments`, `internal_marks`, `analytics_events`, `moderation_queue`, `*_archive` shadows). All with strict `college_id` RLS using `get_my_college_id()` and explicit GRANTs per project rules.
- **Edge functions**: `engagement-triggers` (cron), `send-segmented-notification`, `archive-old-records` (cron).
- **Storage buckets**: `assignment-submissions`, `ticket-attachments`.
- **Feature gating**: every new module wrapped in `FeatureGate` so super-admin can toggle per college.
- **Mobile-first**: all student additions respect the max-420px policy; admin/faculty additions use the 12-col ERP grid.
- **Performance**: keep React Query staleTime 30–60 s; reuse existing analytics RPC pattern for any dashboard tiles.
- **No third-party SDKs** (Firebase/PostHog) per core rule — analytics is self-hosted.

---

## Suggested Execution Order

1. Phase 1 (#1–#6) — one PR per item, ~1 day each.
2. Phase 2 A → B → C → D in that order (impact-weighted).
3. Phase 3 last, alongside steady polish.

Tell me which phase / items to start, or say "go" to begin with Phase 1 quick wins.
