# Campus Connect — Official Product Documentation

**Last Updated:** 10 August 2026
**Current implementation version:** `3.0.0` (from `package.json`)
**Documentation status:** Grounded audit — written by inspecting routes, components, database schema, RLS policies, storage buckets and Edge Functions in the live repository. Anything not present in code is explicitly marked **🔵 Planned / Future**.

Legend used throughout:
🟢 Implemented  🟡 Partial  🔴 Broken / known issue  🔵 Planned / Future

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Project Name** | Campus Connect |
| **Tagline** | Everything happening in your college, in one place. |
| **One-line Description** | A multi-tenant college ERP and student-engagement platform combining academics, attendance, community, entrepreneurship and gamification in a single mobile-first PWA. |
| **Target Users** | Students, Faculty, College Admins, Platform Super Admins |
| **Current Status** | Production deployed, actively iterating |

### Full Description
Campus Connect is a multi-tenant SaaS platform where each college is an isolated tenant (`colleges` table, `college_id` on almost every record). Students get a native-feeling mobile app for attendance, timetable, results, assignments, announcements, events, E-Cell activities, points/leaderboards and a Digital ID. Faculty get lecture, attendance and analytics tooling. College Admins get a full ERP back office (students, departments, programmes, classes, timetable, exams, documents, promotions, reports). Super Admins operate the platform itself (colleges, admins, analytics, security, system health, landing-page CMS).

### Problem Statement
College operations are fragmented across notice boards, WhatsApp groups, spreadsheets and legacy ERPs. Students have no single place to see what matters today; admins have no reliable engagement or attendance intelligence.

### Solution
One tenant-isolated platform where the same underlying data (lectures, attendance, points, events) powers four role-specific experiences, backed by PostgreSQL Row Level Security so each college and each user sees only what they should.

### Vision / Mission
- **Vision:** Every Indian college runs its daily academic life on one intelligent, student-first app.
- **Mission:** Replace fragmented notices and spreadsheets with a secure, real-time, multi-tenant campus operating system.

---

## 2. Platform Summary

**Student** — Mobile-first PWA at `/app/*` with a 5-tab bottom navigation (Home, Academics, Community, E-Cell, Profile), a Feature Hub (`/app/more`), QR/OTP attendance marking, Digital ID, points and leaderboards.

**Faculty** — Desktop/tablet workspace at `/faculty/*`: dashboard, lectures, attendance, students, announcements, schedule, assignments, analytics, profile.

**Admin** — Full ERP at `/platform/admin/*`: ~40 modules covering the student lifecycle, academic structure, attendance control, exams, documents, events, E-Cell approvals, notifications, reports, permissions and settings.

**Super Admin** — Platform control plane at `/platform/admin-control/*`: colleges, admins, cross-college students, analytics, security, system health, landing content editor, leads.

**How they connect:** Admin defines the academic structure (departments → programmes → classes) and approves students into it. Faculty and Admin create lectures; students mark attendance against those lectures; attendance feeds points, streaks, intelligence scores and leaderboards; Super Admin observes all tenants in aggregate.

---

## 3. Architecture at a Glance

```
Super Admin (platform)
  └── College (tenant, colleges.id = college_id everywhere)
        ├── Departments
        │     └── Programmes / Courses
        │           └── Classes (FY / SY / TY + section)
        │                 └── Students (profiles)
        ├── Faculty
        ├── Lectures ── Attendance ── Points ── Leaderboards
        ├── Timetable slots
        ├── Exams ── Exam results
        ├── Events (incl. E-Cell events) ── Stall registrations ── Point claims
        └── Announcements / Notifications / Documents / Channels
```

---

## 4. Complete Feature Inventory

### 4.1 Student Features

| Feature | Route | Purpose | Status |
|---|---|---|---|
| Dashboard | `/app/dashboard` | Personalised home: greeting, points, streak, insights strip, live lecture widget, upcoming events, challenges | 🟢 |
| Academics Hub | `/app/academics` | Router hub for attendance, timetable, results, assignments, documents, lectures | 🟢 |
| Community Hub | `/app/community` | Router hub for announcements, events, polls, leaderboard, messages | 🟢 |
| More / Feature Hub | `/app/more` | Searchable, categorised grid of every student feature (PhonePe-style) | 🟢 |
| Attendance | `/app/attendance`, `/app/attendance/history` | Module hero analytics, overall %, weekly trend, 75% calculator, risk indicators | 🟢 |
| Mark attendance (scan) | `/app/scan` | QR + OTP attendance marking via `mark-attendance` Edge Function | 🟢 |
| Timetable | `/app/timetable` | Weekly schedule from `timetable_slots` | 🟢 |
| Lectures | `/app/lectures`, `/app/lectures/:id` | Scheduled / live / ended lectures with real-time status | 🟢 |
| Results | `/app/results` | CGPA/percentage hero, per-exam results, grade distribution, performance trend | 🟢 |
| Assignments | `/app/assignments` | Assignment list + submissions | 🟢 |
| Documents | `/app/documents` | Access-controlled study material and circulars | 🟢 |
| Announcements | `/app/announcements` | Targeted announcement feed (all / programme / class) | 🟢 |
| Events | `/app/events` | Campus + E-Cell events with featured flags | 🟢 |
| Polls | `/app/polls` | Vote on active polls (anonymous supported) | 🟢 |
| Daily content | `/app/daily` | Daily quote / tip / content card | 🟢 |
| Daily check-in | `/app/checkin` | Streak check-in via `daily-checkin` Edge Function | 🟢 |
| Points | `/app/points` | Points ledger, sources, totals | 🟢 |
| Leaderboard | `/app/leaderboard` | All-time, weekly and My Class boards with top-3 podium | 🟢 |
| Achievements | `/app/achievements` | Unlocked achievements from `student_achievements` | 🟢 |
| Learning Circles (Programmes) | `/app/programmes`, `/app/programmes/:id` | Programme membership + programme-tagged lectures | 🟢 |
| E-Cell Hub | `/app/ecell` | E-Cell events, activities, point claims | 🟢 |
| Stall Registration | `/app/ecell/stalls` | Register a stall for an event; admin-approved | 🟢 |
| Digital ID | `/app/id-card` | Photo, name, enrollment no., college, class, QR, verified badge | 🟢 |
| Messages | `/app/messages`, `/app/messages/*` | Channels + direct messages with attachments/reactions | 🟡 |
| Inbox / Notifications | `/app/inbox`, `/app/notifications` | Notification recipients feed with read state | 🟢 |
| Profile | `/app/profile` | Glass hero, avatar upload, completion meter, grouped settings bottom-sheets | 🟢 |
| Settings | `/app/settings`, `/settings/notifications`, `/settings/security` | Preferences, notification toggles, sessions, account deletion request | 🟢 |
| Support | `/app/support` | Ticket creation + ticket thread messages | 🟢 |
| PWA Install | `/app/install` | Install guidance and PWA status | 🟢 |
| Analytics | `/app/analytics` | Personal engagement/intelligence analytics | 🟡 |
| Global search | Command palette | Cross-module search | 🟡 |

### 4.2 Faculty Features

| Feature | Route | Status |
|---|---|---|
| Dashboard | `/faculty/dashboard` | 🟢 |
| My Lectures | `/faculty/my-lectures` | 🟢 |
| Attendance | `/faculty/attendance` | 🟢 |
| Students | `/faculty/students` | 🟢 |
| Announcements | `/faculty/announcements` | 🟢 |
| Schedule | `/faculty/schedule` | 🟢 |
| Assignments | `/faculty/assignments` | 🟢 |
| Analytics | `/faculty/analytics` (`get_faculty_lecture_analytics`) | 🟢 |
| Profile | `/faculty/profile` | 🟢 |

### 4.3 Admin Features (`/platform/admin/*`)

Student lifecycle: `students`, `students/create`, `create-student`, `verification`, `promotion`, `erp-sync` (bulk CSV import with Zod validation, staging, error preview).
Academic structure: `departments`, `programmes`, `classes`, `allotments`, `timetable`.
Teaching & attendance: `lectures`, `attendance`, `attendance/monthly`, `attendance/corrections`, `scanner`.
Assessment & records: `exams`, `documents`, `verify` (issue verifiable documents with QR).
Engagement: `announcements`, `events`, `notifications`, `challenges`, `points`, `point-claims`, `stalls`, `polls`, `daily-content`, `channels`, `core-team`.
Operations: `dashboard`, `faculty`, `reports`, `reports/export`, `permissions`, `tickets`, `audit-log` / `audit`, `branding`, `settings`, `setup`, `system-control`.
All 🟢 functionally; UI modernisation to the WorkspaceKit design system is 🟡 (in progress).

### 4.4 Super Admin Features (`/platform/admin-control/*`)

`dashboard`, `system-map`, `system-health`, `colleges`, `create-college`, `edit-college/:id`, `admins`, `create-admin`, `edit-admin/:id`, `students`, `student/:id`, `lectures`, `lecture/:id`, `attendance`, `leaderboard`, `achievements`, `notifications`, `send-notification`, `analytics` (`get_platform_analytics`), `security`, `platform-settings`, `landing-editor` (landing page CMS), `leads`. All 🟢.

---

## 5. Authentication & Onboarding

- **Provider:** Supabase Auth (email + password). Google sign-in code was intentionally removed from `Auth.tsx` — **not available**.
- **Email normalisation:** `trim().toLowerCase()` on both signup and login.
- **Email confirmation:** auto-confirm is enabled, so a new account can sign in immediately.
- **Leaked-password protection:** HIBP check enabled.
- **Session:** persisted in `localStorage`, auto token refresh, plus `SessionGuard` (10-min silent refresh, 30-min inactivity logout, redirect on `SIGNED_OUT`).
- **Identifier login:** `auth-resolve-identifier` Edge Function resolves a College Student ID to the account email.
- **Routes:** `/auth`, `/auth/login`, `/auth/signup`, `/onboarding`, `/onboarding-wizard`, `/pending-approval`.
- **Password reset:** 🟡 not a dedicated `/reset-password` page in the current router.

### Student Approval Flow (🟢)
```
Signup → Profile completion (name, enrollment no., college student ID, course, year, photo)
      → approval_status = pending  → /pending-approval
      → Admin verification (admin_preview_student_assignment)
      → admin_approve_student(): college assignment + department + class mapping
      → approval_status = approved, role = student → /app/dashboard
```
Course → department → class mapping is derived server-side (`course_code_to_class_suffix`, `ensure_department_classes`, `admin_regenerate_classes`). Rejection uses `admin_reject_student(reason)`.

---

## 6. Roles & Permissions

Roles live in a dedicated `user_roles` table (never on `profiles`), enum `app_role`: `student`, `faculty`, `admin`, `super_admin`. Checks run through SECURITY DEFINER functions: `is_student`, `is_faculty`, `is_admin`, `is_super_admin`, `is_active_user`, `get_my_college_id()`.

Module-level granularity is stored in `permissions` (role × module × view/create/edit/delete, scoped by `college_id`).

Route enforcement: `ProtectedRoute` resolves the role from the TenantProvider cache and redirects — super admin → `/platform/admin-control/dashboard`, admin → `/platform/admin/dashboard`, faculty → `/faculty/dashboard`, student → `/app/dashboard`.

---

## 7. Database & Backend

- **Backend:** Lovable Cloud (Supabase) — PostgreSQL + Auth + Storage + Edge Functions.
- **Tables in `public`:** 62. **Migrations:** 74. **Edge Functions:** 23. **Storage buckets:** 8.
- **Multi-tenancy:** `college_id` column + RLS policies gated on `get_my_college_id()`; super admin bypasses via `is_super_admin()`.

### Major entities
`colleges`, `profiles`, `user_roles`, `departments`, `programmes`, `classes`, `timetable_slots`, `lectures`, `attendance`, `attendance_tokens`, `attendance_audit_log`, `exams`, `exam_results`, `assignments`, `submissions`, `documents`, `verify_documents`, `announcements`, `events`, `stall_registrations`, `point_claims`, `points_ledger`, `points_rules`, `challenges`, `achievements`, `student_achievements`, `student_streaks`, `student_intelligence`, `student_goals`, `student_flags`, `daily_checkins`, `daily_content`, `daily_rewards_log`, `polls`, `poll_votes`, `channels`, `channel_members`, `messages`, `notifications`, `notification_recipients`, `notification_preferences`, `push_subscriptions`, `support_tickets`, `ticket_messages`, `feedback`, `audit_logs`, `login_activity`, `security_alerts`, `account_deletion_requests`, `academic_promotion_runs`, `class_promotion_rules`, `erp_import_batches` / `_staging` / `_errors`, `permissions`, `platform_settings`, `platform_branding`, `institution_partners`, `leads`, `core_team_members`.

### Storage buckets
| Bucket | Public | Contents |
|---|---|---|
| `avatars` | public | Profile photos |
| `lecture-flyers` | public | Lecture flyers |
| `team-photos` | public | Core team photos |
| `documents` | private | Study material / circulars |
| `assignments` | private | Assignment attachments |
| `submissions` | private | Student submissions |
| `message-attachments` | private | Chat attachments |
| `verify-documents` | private | Issued verifiable PDFs |

### Edge Functions (23)
`academic-promote-students`, `admin-adjust-points`, `admin-backfill-user-roles`, `admin-create-student`, `admin-generate-attendance`, `admin-reset-college-students`, `admin-update-attendance`, `auth-resolve-identifier`, `bootstrap-clean-reset`, `daily-checkin`, `ensure-admin-account`, `finalize-attendance`, `generate-vapid-keys`, `health-check`, `lecture-status-notify`, `mark-attendance`, `notification-scheduler`, `retention-on-login`, `send-notification`, `subscribe-web-push`, `super-admin-create-admin`, `super-admin-reset-students`, `update-user-email`.

### Notable database functions
`admin_approve_student`, `admin_reject_student`, `admin_preview_student_assignment`, `admin_regenerate_classes`, `admin_get_attendance_corrections`, `award_points`, `unlock_achievement`, `get_leaderboard`, `get_weekly_leaderboard`, `get_class_leaderboard`, `get_my_points_total`, `get_my_streak`, `get_my_tier_progress`, `get_my_achievements`, `get_growth_insights`, `get_lecture_attendance_summary`, `get_admin_college_analytics`, `get_faculty_lecture_analytics`, `get_platform_analytics`, `get_event_stall_summary`, `export_monthly_attendance_combined`, `verify_document_public`, `log_audit_event`.

---

## 8. Attendance System

- Admin/faculty create a lecture (`scheduled` → `live` → `ended`).
- Going live generates an `attendance_tokens` row (QR token + hashed OTP, expiry, active flag).
- Student scans at `/app/scan`; `mark-attendance` validates the token with constant-time comparison, prevents duplicates, and writes `attendance`.
- `finalize-attendance` closes the session; `points_rules.points_per_attendance` drives the ledger entry.
- Corrections go through `admin-update-attendance` and are recorded immutably in `attendance_audit_log` (no delete/update policies).
- Monthly export via `export_monthly_attendance_combined`.

---

## 9. E-Cell Ecosystem

- Events flagged with `events.is_ecell_event`; `events_set_college_id()` trigger enforces tenant stamping.
- Students register stalls (`stall_registrations`: type food/game/startup/other, status pending/approved/rejected) and submit `point_claims` (event attendance, participation, winning, idea submission, other) with evidence URLs.
- Admin reviews both at `/platform/admin/stalls` and `/platform/admin/point-claims`; approving a claim awards points via the `point_claim_award_on_approve` trigger.
- `get_event_stall_summary(event_id)` powers admin summaries; `max_stalls` caps registration.

---

## 10. Gamification

Implemented 🟢: points ledger with sources and admin manual adjustment (audited), `points_rules`, daily check-ins and `student_streaks` (current + longest), achievements catalogue + unlocks, challenges with bonus points, tier progress (`get_my_tier_progress`: bronze/silver/gold thresholds), all-time / weekly / class leaderboards with top-3 podium, and `student_intelligence` scoring (attendance consistency, behaviour reliability, engagement index, tier, risk flags).

🔵 Planned: explicit XP/Level ladder, badge artwork system, department- and monthly-scoped leaderboards.

---

## 11. Digital ID & Verification

- `/app/id-card` renders photo, name, enrollment number, college, course/department, class and a QR code, plus the verified badge (`profiles.is_verified`).
- Separately, admins issue verifiable documents (`verify_documents`) with a reference + token; the public page `/verify/:reference` calls `verify_document_public(reference, token)`, which returns only non-sensitive fields and increments a verification counter. Revocation is supported.

---

## 12. Navigation Architecture

**Bottom navigation (student, 5 tabs):** Home · Academics · Community · E-Cell · Profile, with a centre contextual FAB (`ContextualFAB`) hidden on read-only screens.
**Hubs:** `AcademicsHub`, `CommunityHub`, `MoreHub` act as module routers.
**Support systems:** `navigation-engine.ts` (tab resolution + route families), `use-smart-back.ts` (intelligent back fallbacks), `ScrollMemory` (per-route scroll restoration), `CommandPalette` (search), deep links (`/lecture/:id`, `/event/:id`, `/student/:id`, `/profile/:id`, …) that redirect to canonical routes, and a `*` wildcard `NotFound`.
**Admin/Faculty:** persistent sidebar shells (`AdminLayout`, `FacultyLayout`, `SuperAdminLayout`).

---

## 13. UI / UX Design System

- **Aesthetic:** "Native Classic" — curved gradient module heroes, 20px card radii, glassmorphism surfaces, pastel module identity tokens.
- **Typography:** Plus Jakarta Sans (primary), DM Sans, Space Grotesk, Syne — self-hosted via Fontsource.
- **Tokens:** all colours/gradients/shadows are HSL semantic tokens in `src/index.css` + `tailwind.config.ts`; admin/super-admin shells scope a Cloud White + Indigo palette via `[data-admin-shell]`.
- **Primitives:** `ModuleHero`, `PageContainer`, `PageHeader`, `WorkspaceKit` (hero, toolbar, list, row, status, empty, loading, submit) for faculty/admin, `PremiumEmpty` illustrated empty states, skeleton set, bottom sheets with grabbers.
- **Motion:** framer-motion, 120/180/240ms GPU-safe timings, staggered card entrance, pull-to-refresh, `prefers-reduced-motion` respected globally.
- **Mobile:** safe-area utilities (`.safe-pad-*`, `env(safe-area-inset-*)`), `100dvh`, Android display-cutout support, long-press text-selection disabled on UI chrome.

---

## 14. PWA & Mobile Packaging

`vite-plugin-pwa` with a service worker (`public/sw.js`), a dedicated push worker (`public/sw-push.js`), `offline.html`, install prompt banner, splash, and update manager (force/soft update with `refreshToLatest` cache busting). Native Web Push is self-hosted with VAPID + AES-128-GCM (`subscribe-web-push`, `send-notification`) — no third-party SDKs. Capacitor 8 Android/iOS shells are present for store packaging.

---

## 15. Security

Implemented 🟢:
- RLS enabled on all public tables, with policies scoped by `get_my_college_id()` and role-check SECURITY DEFINER functions (avoids recursive-policy issues).
- Roles isolated in `user_roles` — no role column on `profiles` (prevents privilege escalation).
- Private storage buckets for documents, assignments, submissions, message attachments and verifiable PDFs.
- Immutable audit trails: `audit_logs`, `attendance_audit_log`, `login_activity`, `security_alerts` (no UPDATE/DELETE policies).
- Public document verification returns only whitelisted fields via a SECURITY DEFINER RPC.
- HIBP leaked-password protection; anonymous sign-ups disabled.
- Constant-time OTP comparison and duplicate-scan locking in attendance.

Known limitations 🟡:
- No dedicated `/reset-password` page.
- ESLint reports a large number of pre-existing `no-explicit-any` errors (code quality, not a runtime vulnerability).
- Messaging module RLS is functional but the feature itself is partial.
- Cross-role end-to-end penetration testing has not been executed in an automated suite.

---

## 16. Technology Stack (read from project config)

| Layer | Technology |
|---|---|
| Frontend | React 18.3, TypeScript 5.9, Vite 6 |
| Routing | react-router-dom 6.30 |
| State / data | TanStack React Query 5.101 |
| UI framework | Tailwind CSS 3.4 + shadcn/ui (Radix UI primitives) |
| Motion | framer-motion 12.40 |
| Charts | recharts 2.15 |
| Forms & validation | react-hook-form 7.78 + zod 3.25 |
| Backend | Lovable Cloud (Supabase), `@supabase/supabase-js` 2.108 |
| Database | PostgreSQL with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (8 buckets) |
| Serverless | Supabase Edge Functions (Deno) — 23 functions |
| PWA | vite-plugin-pwa 1.3, custom service workers |
| Mobile shell | Capacitor 8 (Android + iOS) |
| QR | @zxing/browser, qrcode.react |
| Testing | Vitest 3.2, Testing Library, Playwright 1.60 (visual regression) |
| Tooling | ESLint 9, SWC React plugin |

---

## 17. Route Map

### Public
| Route | Purpose |
|---|---|
| `/` | Landing page (CMS-driven, Super Admin editable) |
| `/auth`, `/auth/login`, `/auth/signup` | Authentication |
| `/demo`, `/book-demo`, `/start`, `/onboarding` | Marketing / college onboarding |
| `/contact`, `/privacy`, `/terms`, `/help` | Informational |
| `/verify/:reference` | Public document verification |

### Student (`/app/*`, role: student)
`dashboard`, `academics`, `community`, `ecell`, `ecell/stalls`, `more`, `profile`, `settings`, `settings/notifications`, `settings/security`, `notifications`, `inbox`, `messages`, `scan`, `id-card`, `attendance`, `attendance/history`, `timetable`, `lectures`, `lectures/:id`, `programmes`, `programmes/:id`, `assignments`, `results`, `documents`, `announcements`, `events`, `polls`, `daily`, `checkin`, `points`, `achievements`, `leaderboard`, `analytics`, `support`, `install`, `onboarding`.

### Faculty (`/faculty/*`, role: faculty+)
`dashboard`, `my-lectures`, `attendance`, `students`, `announcements`, `schedule`, `assignments`, `analytics`, `profile`.

### Admin (`/platform/admin/*`, role: admin+)
See §4.3 — 40+ child routes.

### Super Admin (`/platform/admin-control/*`, role: super_admin)
See §4.4 — 24 child routes.

### Deep links (redirect to canonical route)
`/lecture/:id`, `/programme/:id`, `/event/:id`, `/announcement/:id`, `/assignment/:id`, `/document/:id`, `/profile/:id`, `/faculty/profile/:id`, `/student/:id`, `/attendance`, `/lectures`, `/leaderboard`, `/admin`.

---

## 18. User Journeys

**Student:** Sign up → complete profile (enrollment no., student ID, course, year, photo) → Pending Approval → admin approves and auto-assigns college/department/class → Dashboard → checks today's lectures → scans QR at a live lecture → attendance recorded + points awarded → views attendance %, results, timetable → browses announcements/events → registers an E-Cell stall → checks leaderboard rank → shows Digital ID at the gate → logout/login with persisted session.

**Faculty:** Login → Dashboard KPIs → My Lectures → start a lecture (goes live, token generated) → monitor live attendance → end lecture → review/correct attendance → view student list and analytics → post an announcement.

**Admin:** Login → Dashboard (live ops, KPIs, risk) → Pending Students → verify and approve → maintain departments/programmes/classes/timetable → create lectures → monitor attendance and run corrections → publish exams/results → issue documents → create events and approve stalls/point claims → run reports/exports → manage permissions and branding → run academic promotion at year end.

**Super Admin:** Login → Colleges (create/edit tenants, feature flags) → Admins (create college admins) → cross-college students → Analytics → Security Center → System Health → Platform Settings → Landing Editor → Leads.

---

## 19. Implementation Status

| Module | Status | Notes |
|---|---|---|
| Authentication | 🟢 | Email/password, auto-confirm, HIBP, identifier login; no reset-password page |
| Onboarding & approval | 🟢 | Wizard, pending state, auto dept/class assignment |
| Multi-tenancy & RLS | 🟢 | `college_id` + SECURITY DEFINER role checks across 62 tables |
| Attendance | 🟢 | QR + OTP, audit log, corrections, monthly export |
| Timetable | 🟢 | Weekly slots; live "NOW/NEXT" intelligence is 🔵 |
| Lectures | 🟢 | Scheduled/live/ended, realtime status, push |
| Results & Exams | 🟢 | Admin entry, student CGPA dashboard |
| Assignments | 🟢 | Create, submit, review, marks |
| Documents | 🟢 | Private buckets, access levels |
| Document verification | 🟢 | Public RPC + QR |
| Announcements & Notifications | 🟢 | Targeting, scheduling, web push |
| Events | 🟢 | Featured + E-Cell flag |
| E-Cell | 🟢 | Stalls, point claims, approvals |
| Points & Leaderboards | 🟢 | All-time, weekly, class |
| Achievements & Streaks | 🟢 | Catalogue, unlocks, check-ins |
| XP / Levels / Badges | 🔵 | Tiers exist; explicit XP ladder not implemented |
| Student Intelligence | 🟡 | Scores + insights RPC live; richer weekly digest pending |
| Messaging | 🟡 | Channels/DMs schema and screens exist, not fully polished |
| Campus Pulse unified feed | 🔵 | Content exists in separate modules |
| Faculty panel | 🟢 | All 9 screens on WorkspaceKit |
| Admin panel | 🟡 | Fully functional; UI modernisation partly complete |
| Super Admin panel | 🟢 | 24 screens |
| PWA & Push | 🟢 | SW, offline, install, VAPID push |
| Mobile packaging | 🟢 | Capacitor Android/iOS shells |
| Reports & Exports | 🟢 | CSV/monthly attendance exports |
| Bulk ERP import | 🟢 | Staged, validated, error-previewed |
| Academic promotion | 🟢 | Rules, runs, reversal metadata |

---

## 20. Roadmap

**Currently Implemented** — everything marked 🟢 in §19.

**Partially Implemented** — Admin UI modernisation, messaging, student analytics/intelligence depth, global search coverage.

**Planned** — Campus Pulse unified feed; XP/Levels/Badges; live NOW/NEXT timetable strip; attendance prediction beyond the 75% calculator; department & monthly leaderboards; certificates for E-Cell winners; password reset page.

**Future Ideas** — AI study assistant, parent portal, placement module, fee integration, alumni network, offline-first attendance sync.

---

## 21. Project Statistics

| Metric | Value |
|---|---|
| Roles | 4 (student, faculty, admin, super_admin) |
| Public database tables | 62 |
| Database migrations | 74 |
| Edge Functions | 23 |
| Storage buckets | 8 (3 public, 5 private) |
| Student routes | ~37 |
| Faculty routes | 9 |
| Admin routes | 40+ |
| Super Admin routes | 24 |
| Public/marketing routes | 12 |
| Deep-link aliases | 13 |
| Major user flows | 4 role journeys |

---

## 22. Presentation-Ready Summary

### 30-Second Pitch
Campus Connect is a multi-tenant campus operating system. Students get one mobile app for attendance, timetable, results, events, E-Cell and rewards. Faculty run lectures and attendance. Admins run the entire academic ERP. Super Admins run the platform. Everything is isolated per college with database-level security.

### 1-Minute Pitch
Colleges today run on notice boards, WhatsApp groups and spreadsheets. Campus Connect replaces that with a single mobile-first PWA. A student scans a QR at a live lecture and attendance is recorded instantly, points are awarded, streaks update and their leaderboard rank moves. The same lecture data gives faculty live attendance analytics and gives admins monthly attendance exports and risk flags. On top of academics sits campus life — events, announcements, polls, an E-Cell with stall registration and point claims, and a Digital ID with QR verification. Every college is a fully isolated tenant enforced by PostgreSQL Row Level Security, with its own branding and feature flags, and Super Admins operate all tenants from one control plane. Built on React, Supabase and PostgreSQL, installable as a PWA and packaged for Android and iOS.

### Student Perspective
"Open the app: today's lectures, my attendance %, what's due, what's happening on campus, my points and my rank — in one screen."

### Institution Perspective
"One system for admissions verification, academic structure, attendance compliance, results, documents, communication and engagement — with per-college data isolation and full audit trails."

### Top 10 Features
1. QR + OTP live attendance with immutable audit trail
2. Attendance analytics with 75% requirement calculator
3. Multi-tenant college isolation via RLS
4. Automated student approval → department → class assignment
5. Points, streaks, achievements and three leaderboards
6. E-Cell hub with stall registration and point claims
7. Digital Student ID + public document verification portal
8. Full admin ERP (departments, programmes, classes, timetable, exams, promotion)
9. Self-hosted web push notifications (no third-party SDKs)
10. Installable PWA with offline support and Capacitor mobile shells

### Key Differentiators
True multi-tenancy with per-college branding and feature flags · database-enforced security rather than client-side checks · engagement layer built on real academic data, not vanity metrics · zero third-party SDK dependency for push · one design system across four role experiences.

### Why Campus Connect?
Because a college does not need five disconnected tools — it needs one place where academics, communication, community and identity meet, and where every record is secure, auditable and scoped to the institution that owns it.

---

## 23. PPT Content Reference

| # | Slide | Key message | Points | Visual | Module |
|---|---|---|---|---|---|
| 1 | Campus Connect | Everything happening in your college, in one place | Multi-tenant campus OS · 4 roles · mobile-first PWA | Logo + app mockup | — |
| 2 | The Problem | Campus life is fragmented | Notice boards & WhatsApp · manual attendance registers · spreadsheets · no engagement data | Collage of fragmented tools | — |
| 3 | Our Solution | One platform, four experiences | Student app · faculty tools · admin ERP · platform control · shared secure data | Architecture diagram (§3) | Architecture |
| 4 | Student Experience | A native-feeling campus app | 5-tab navigation · personalised dashboard · feature hub · premium design system | Dashboard + bottom nav | Student |
| 5 | Academics | Academics that answer questions | Attendance analytics · 75% calculator · timetable · results/CGPA · assignments · documents | Attendance module hero | Academics Hub |
| 6 | Attendance | Attendance in 3 seconds | Live lecture → QR + OTP · duplicate-proof · audit log · admin corrections · monthly export | Scan screen + admin summary | Attendance |
| 7 | Campus Life | Never miss what matters | Targeted announcements · events · polls · daily content · push notifications | Events + announcements feed | Community Hub |
| 8 | E-Cell | Entrepreneurship, organised | E-Cell events · stall registration · point claims · admin approvals | Stall registration flow | E-Cell |
| 9 | Gamification | Participation that compounds | Points ledger · streaks · achievements · all-time/weekly/class leaderboards · challenges | Leaderboard podium | Points |
| 10 | Digital Identity | Verifiable student identity | Digital ID with QR · verified badge · public document verification portal | ID card + `/verify` page | Digital ID |
| 11 | Faculty & Admin | Run the college, not the paperwork | Lecture control centre · 40+ admin modules · bulk ERP import · promotion engine · reports | Admin dashboard | Admin |
| 12 | Security & Multi-Tenancy | Security at the database, not the browser | RLS on 62 tables · `college_id` isolation · roles in a separate table · private buckets · audit logs | Isolation diagram | Security |
| 13 | Technology | Modern, boring-on-purpose stack | React + TypeScript + Vite · Supabase/PostgreSQL · 23 Edge Functions · PWA + Capacitor | Stack logos | Stack |
| 14 | Roadmap | What's next | Campus Pulse feed · XP & levels · live timetable strip · certificates · analytics depth | Roadmap timeline | Roadmap |
| 15 | Closing | One cohesive campus platform | Recap of top features + call to action | Hero shot | — |

---

## 24. Maintenance Note

Update this document whenever routes, tables, Edge Functions, buckets or role behaviour change. Verify counts by re-reading `src/router/AppRouter.tsx`, `supabase/functions/`, `supabase/migrations/`, the storage bucket list and the `public` schema before publishing new figures.

*This document contains no credentials, API keys, service-role keys, tokens or personal data.*
