# BRAIN.md — Campus Connect Permanent Technical Memory & Architecture Guide

> **Notice for AI Agents & Developers**:  
> Read this document **first** before making architectural decisions or modifying core modules.  
> This file reflects the actual, active production codebase. Do not make assumptions, invent missing tables, or reintroduce removed features.

---

## 1. Project Overview

**Campus Connect** is a unified, production-grade collegiate operating system and digital campus ecosystem built for higher education institutions.

The platform provides a single pane of glass for:
1. **Students**: Real-time lecture schedules, digital ID cards, QR/code-based attendance tracking, academic submissions, document locker, CGPA/marks tracking, community announcements, campus events, and an entrepreneurship cell (E-Cell) marketplace.
2. **Faculty**: Dedicated command workspace to schedule lectures, track attendance, manage class rosters, grade assignments, publish departmental notices, and view academic analytics.
3. **Institutional Administrators (Admin)**: Departmental management, programme/degree curricula, class section configuration, faculty & student allotments, batch academic promotions, attendance monthly audits, document issuance & verification, and campus-wide governance.
4. **Platform Operators (Super Admin)**: Multi-tenant college provisioning, tenant feature flags, administrative account assignment, system health telemetry, global leads, and platform branding.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (PWA)                              │
│  React 18 (TypeScript) · Vite 6 · Tailwind CSS · Radix UI · Framer Motion  │
│  State: TanStack React Query (v5) · Router: React Router DOM (v6)           │
│  Icons: Hugeicons (Unified AppIcon System) · Styling: HSL Design System     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER (Supabase Backend)                       │
│  PostgreSQL Database · Row Level Security (RLS) · Realtime WebSocket        │
│  GoTrue Auth · Supabase Storage · 23 Deno Edge Functions                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Edge Execution
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOSTING & INFRASTRUCTURE                            │
│  Frontend: Vercel SPA (Automatic rewrites to /index.html)                   │
│  PWA: Service Worker (Vite PWA / Workbox) with Offline Fallback             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: Single Page Application (SPA) built with React 18, TypeScript, and Vite.
- **Backend as a Service**: Supabase (PostgreSQL 14+, Row Level Security, Supabase Auth, Storage).
- **Serverless Compute**: 23 Supabase Deno Edge Functions for administrative privileged tasks (student/faculty provisioning, bulk promotions, notification dispatch).
- **Deployment**: Vercel for web hosting (`vercel.json` rewrites all paths to `/index.html`).

---

## 3. Folder Structure

```
campusconnect/
├── public/                    # Static assets, icons, manifest, service worker (sw.js)
├── src/
│   ├── assets/                # Bundled local images (logo.png, bkbnc-logo.png)
│   ├── components/            # Reusable UI & domain components
│   │   ├── admin/             # Shared Admin components
│   │   ├── attendance/        # QR Scanner & attendance cards
│   │   ├── auth/              # ProtectedRoute, SessionGuard, OnboardingGate
│   │   ├── icons/             # Hugeicons-backed unified AppIcon system
│   │   ├── image/             # ImageCropper, ImageCropDialog (1:1 crop engine)
│   │   ├── layout/            # AppLayout, AppSidebar, ErrorBoundary, ModuleHero
│   │   ├── notifications/     # TopbarNotificationCenter, WebPushManager
│   │   ├── platform/          # FeatureGate, PlatformModeGuard
│   │   ├── pwa/               # AppSplash, PWA install prompts, SW managers
│   │   ├── search/            # CommandPalette (Ctrl+K / Cmd+K)
│   │   ├── tenant/            # TenantBrandingApplicator
│   │   └── ui/                # Radix UI + Tailwind design tokens (GlassCard, Button...)
│   ├── config/                # Centralized configs (branding.ts, menu.ts...)
│   ├── hooks/                 # Reusable hooks (useAuth, useTenant, usePlatformBranding...)
│   ├── integrations/
│   │   └── supabase/          # Supabase client (client.ts) and types (types.ts)
│   ├── layout/                # Student layout wrappers (BottomNavigation, PageContainer)
│   ├── motion/                # Framer motion tokens & page transitions
│   ├── pages/                 # Route pages organized by persona
│   │   ├── admin/             # Admin console modules (faculty, students, timetable...)
│   │   ├── faculty/           # Faculty command centre (schedule, attendance, students...)
│   │   ├── onboarding/        # First-time onboarding wizard
│   │   ├── platform/          # Super Admin control centre
│   │   ├── student/           # Student app pages & hubs (Academics, E-Cell, More...)
│   │   └── verify/            # Public document verification page
│   ├── providers/             # React context providers (Auth, Tenant, Query, AppProviders)
│   ├── router/                # AppRouter, ProtectedRoute, RouteLoader
│   ├── services/              # API and client helper services
│   ├── test/                  # Automated Vitest test suites
│   ├── ui-engine/             # Navigation engine & tab resolution logic
│   ├── App.tsx                # Application shell & root provider tree
│   ├── index.css              # Design system tokens, glassmorphism utilities, animations
│   └── main.tsx               # DOM entry point
├── supabase/
│   ├── functions/             # 23 Deno Edge Functions
│   └── migrations/            # 80+ PostgreSQL schema migrations
├── vercel.json                # SPA rewrite configuration
├── vite.config.ts             # Vite build & PWA configuration
└── package.json               # Project dependencies & scripts
```

---

## 4. Routing Map

All application routes are defined in [`src/router/AppRouter.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/router/AppRouter.tsx).

### A. Public & Authentication Routes
| Route | Component | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `/` | `Index.tsx` | Public | Institutional landing page with BKBNC partner showcase |
| `/auth`, `/auth/login`, `/auth/signup` | `Auth.tsx` | Public (guest only) | Unified login & registration screen |
| `/demo`, `/book-demo` | `Demo.tsx`, `BookDemo.tsx` | Public | Interactive platform demo & inquiry form |
| `/onboarding`, `/start` | `CollegeOnboarding.tsx` | Public | Institutional onboarding request |
| `/help`, `/contact`, `/privacy`, `/terms`| Static Pages | Public | Support center and legal pages |
| `/verify/:reference` | `DocumentVerificationPage.tsx` | Public | Cryptographic certificate/credential verification |
| `/pending-approval` | `PendingApproval.tsx` | Authenticated | Holding screen for unverified student accounts |
| `/onboarding-wizard` | `OnboardingWizard.tsx` | Authenticated | First-time profile & college allotment wizard |

### B. Student App (`/app/*` inside `AppLayout`)
| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/app/dashboard` | `StudentDashboard.tsx` | Central student hub with today's timetable & announcements |
| `/app/scan` | `StudentScanAttendance.tsx` | Live camera QR scanner & 6-digit code check-in |
| `/app/id-card` | `StudentDigitalId.tsx` | Interactive digital identity card with security hologram |
| `/app/academics` | `AcademicsHub.tsx` | Academic directory (Lectures, Timetable, Results, Notes) |
| `/app/lectures`, `/app/lectures/:id` | `LecturesList.tsx`, `LectureDetail.tsx` | Scheduled lecture catalogue & detailed view |
| `/app/timetable` | `StudentTimetable.tsx` | Weekly recurring lecture timetable grid |
| `/app/attendance` | `StudentAttendanceHistory.tsx` | Subject-wise attendance % and historical check-in logs |
| `/app/assignments` | `StudentAssignments.tsx` | Course assignment submission portal |
| `/app/documents` | `StudentDocuments.tsx` | Official college document & marksheet repository |
| `/app/results` | `StudentResults.tsx` | Semester exam marks & grades breakdown |
| `/app/community` | `CommunityHub.tsx` | Campus events feed & official announcements |
| `/app/ecell`, `/app/ecell/stalls` | `StudentEcellHub.tsx`, `StudentEcellStalls.tsx` | Entrepreneurship events & student stall marketplace |
| `/app/points` | `StudentPointsPage.tsx` | Campus points balance & reward transactions |
| `/app/leaderboard` | `Leaderboard.tsx` | Academic & engagement leaderboard |
| `/app/more` | `MoreHub.tsx` | Complete feature index & utilities |
| `/app/profile`, `/app/settings` | `StudentProfile.tsx` | Student profile editor & avatar cropper |
| `/app/settings/notifications` | `NotificationSettings.tsx` | Web push & email notification toggles |

### C. Faculty Command Workspace (`/faculty/*` inside `FacultyLayout`)
| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/faculty/dashboard` | `FacultyDashboard.tsx` | Today's active lectures, quick attendance action, metrics |
| `/faculty/my-lectures` | `FacultyMyLectures.tsx` | Full history of scheduled, live, and completed lectures |
| `/faculty/schedule` | `FacultySchedule.tsx` | Daily & weekly schedule overview with slot booking |
| `/faculty/attendance` | `FacultyAttendance.tsx` | Live attendance dashboard with manual roster override |
| `/faculty/students` | `FacultyStudents.tsx` | Student directory filtered by class/division |
| `/faculty/assignments` | `FacultyAssignments.tsx` | Create assignments, view submissions, and grade work |
| `/faculty/announcements` | `FacultyAnnouncements.tsx` | Broadcast departmental announcements |
| `/faculty/analytics` | `FacultyAnalytics.tsx` | Lecture completion rates, attendance trends, engagement |
| `/faculty/profile` | `FacultyProfile.tsx` | Faculty profile, credentials, and image cropper |

### D. Institutional Admin Console (`/platform/admin/*` inside `AdminLayout`)
| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/platform/admin/dashboard` | `AdminOverviewPage.tsx` | Key institutional KPIs, today's operations, live alerts |
| `/platform/admin/students` | `AdminStudentsPage.tsx` | Student registry with bulk actions, filters, and status toggles |
| `/platform/admin/students/create` | `AdminCreateStudentPage.tsx` | Single/bulk student account provisioning |
| `/platform/admin/verification` | `AdminStudentVerificationPage.tsx` | Student document & enrollment approval queue |
| `/platform/admin/faculty` | `AdminFacultyPage.tsx` | Faculty management, timetable allocations, detail drawer |
| `/platform/admin/departments` | `AdminDepartmentsPage.tsx` | Department creation, faculty assignment, active status |
| `/platform/admin/programmes` | `AdminProgrammesPage.tsx` | Degree programmes (B.Com, B.Sc CS, BA) & curricula |
| `/platform/admin/classes` | `AdminClassesPage.tsx` | Academic classes, year (FY/SY/TY), division & sections |
| `/platform/admin/allotments` | `AdminAllotmentsPage.tsx` | Map faculty to classes, subjects, and lecture slots |
| `/platform/admin/lectures` | `AdminLecturesPage.tsx` | Institution-wide lecture monitor & timetable scheduler |
| `/platform/admin/timetable` | `AdminTimetablePage.tsx` | Master weekly timetable matrix |
| `/platform/admin/promotion` | `AdminPromotionPage.tsx` | Year-end batch student promotion engine |
| `/platform/admin/attendance` | `AdminAttendancePage.tsx` | Real-time attendance monitoring & session controls |
| `/platform/admin/attendance/monthly` | `AdminAttendanceMonthlyPage.tsx` | Monthly statutory attendance register & exports |
| `/platform/admin/attendance/corrections` | `AdminAttendanceCorrectionsPage.tsx` | Student attendance dispute resolution queue |
| `/platform/admin/exams` | `AdminExamsPage.tsx` | Examination schedules, marksheets, and GPA release |
| `/platform/admin/documents` | `AdminDocumentsPage.tsx` | Institution document repository & policy uploads |
| `/platform/admin/verify` | `AdminVerifyDocumentsPage.tsx` | Issue verifiable credentials & review QR certificates |
| `/platform/admin/announcements` | `AdminAnnouncementsPage.tsx` | Institution-wide broadcast creator |
| `/platform/admin/events` | `AdminEventsPage.tsx` | Institutional & E-Cell event creation & registration |
| `/platform/admin/notifications` | `AdminNotificationsPage.tsx` | Push notification dispatcher |
| `/platform/admin/challenges` | `AdminChallengesPage.tsx` | Engagement & attendance streak challenges |
| `/platform/admin/points` | `AdminPointsPage.tsx` | Campus points ledger & manual adjustments |
| `/platform/admin/point-claims` | `AdminPointClaimsPage.tsx` | Student activity point claim review |
| `/platform/admin/stalls` | `AdminStallsPage.tsx` | E-Cell marketplace stall requests review |
| `/platform/admin/scanner` | `AdminScannerPage.tsx` | Universal barcode/QR ticket & ID badge scanner |
| `/platform/admin/tickets` | `AdminTicketsPage.tsx` | Student/faculty helpdesk support ticket resolution |
| `/platform/admin/reports/export` | `AdminExportPage.tsx` | CSV/PDF data exports for statutory audits |
| `/platform/admin/permissions` | `AdminPermissionsPage.tsx` | Role-based permission controls & administrator invites |
| `/platform/admin/settings` | `AdminSettingsPage.tsx` | Institutional profile, branding, and academic terms |

### E. Super Admin Control Center (`/platform/admin-control/*` inside `SuperAdminLayout`)
Multi-tenant global administration for colleges, global admins, system telemetry, security audit logs, platform settings, and incoming institution onboarding leads (`SALeadsPage.tsx`).

---

## 5. User Roles & Permissions

Roles are stored in the `public.user_roles` table:
```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'faculty', 'admin', 'super_admin')),
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
```

### Role Hierarchy & Capabilities
1. **`super_admin`**: Full cross-tenant access. Can create colleges, assign institutional admins, configure global feature flags, view audit logs.
2. **`admin`**: Full institutional access scoped to their `college_id`. Can manage students, faculty, departments, classes, attendance, exams, documents, announcements, events.
3. **`faculty`**: Academic operations scoped to their assigned classes & created lectures. Can conduct lectures, record attendance, grade assignments, view student rosters.
4. **`student`**: Self-service student access scoped to their enrolled `class_id` and `college_id`.

### Database Authorization Functions
- `public.is_super_admin(uid)`: Returns `true` if user has `role = 'super_admin'`.
- `public.is_admin(uid)`: Returns `true` if user has `role = 'admin'` or `'super_admin'`.
- `public.is_faculty(uid)`: Returns `true` if user has `role = 'faculty'`, `'admin'`, or `'super_admin'`.
- `public.is_active_user(uid)`: Validates that the user is authenticated, has a valid role, and is not marked `is_deleted = true`.

---

## 6. Authentication Flow

```
[ User Inputs Credentials ]
            │
            ▼
[ Supabase Auth (GoTrue) ] ── (Signs JWT & establishes session)
            │
            ▼
[ AuthProvider.tsx ] ── (Listens via onAuthStateChange)
            │
            ▼
[ TenantProvider.tsx ] ── (Resolves user_roles.role + college_id)
            │
            ▼
[ ProtectedRoute.tsx ] ── (Enforces role permissions)
  ├─ If super_admin  ──► Redirect /platform/admin-control/dashboard
  ├─ If admin        ──► Redirect /platform/admin/dashboard
  ├─ If faculty      ──► Redirect /faculty/dashboard
  └─ If student      ──► [OnboardingGate] ──► /app/dashboard
```

- **Session Guard**: Automatic idle detection and token renewal.
- **Logout Flow**: [`src/hooks/useLogout.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/hooks/useLogout.ts) signs out from Supabase, purges React Query cache, resets session storage, and routes to `/auth`.

---

## 7. Database Architecture

### Core Tables & Schemas

| Table | Primary Purpose | Key Foreign Keys & Constraints |
| :--- | :--- | :--- |
| `colleges` | Tenant records | `id` (UUID PK), `code` (Unique) |
| `profiles` | User profiles (Students & Faculty) | `user_id` (PK -> auth.users), `college_id`, `class_id`, `programme_id` |
| `user_roles` | Role assignments | `user_id`, `college_id`, `role` enum |
| `departments` | Academic departments | `college_id` -> colleges |
| `programmes` | Academic degrees/programmes | `department_id`, `college_id` |
| `classes` | Cohort sections (FY/SY/TY) | `programme_id`, `college_id` |
| `lectures` | Scheduled & active lectures | `created_by` (faculty), `college_id`. **Note**: Column for title is `topic` (no `subject` column) |
| `lecture_allotments` | Map lectures to classes | `lecture_id`, `class_id`, `college_id` |
| `attendance` | Attendance punch records | `lecture_id`, `user_id`, `status` ('present' \| 'absent' \| 'late') |
| `attendance_corrections`| Dispute resolution | `attendance_id`, `user_id`, `status` ('pending' \| 'approved' \| 'rejected') |
| `timetable_slots` | Master schedule | `class_id`, `college_id`, `day_of_week` (1-6) |
| `academic_promotion_runs`| Batch promotion audit | `college_id`, `performed_by` |
| `announcements` | Notice board | `college_id`, `author_id`, `audience_type` |
| `events` | Campus & E-Cell events | `college_id`, `created_by` |
| `event_registrations` | Event signups | `event_id`, `user_id` |
| `assignments` | Course assignments | `class_id`, `college_id`, `created_by` |
| `assignment_submissions`| Student submissions | `assignment_id`, `student_id` |
| `documents` | Verified PDFs / Marksheets | `college_id`, `department_id`, `uploaded_by` |
| `exams` & `exam_results` | Exams & Grades | `exam_id`, `student_id` |
| `notifications` | In-app alerts | `user_id`, `kind`, `lecture_id`, `link` |
| `point_ledger` | Rewards balance | `user_id`, `amount`, `category` |
| `point_claims` | Reward verification | `user_id`, `event_id` |
| `stall_requests` | E-Cell stall registration | `college_id`, `applicant_id` |
| `support_tickets` | Helpdesk tickets | `user_id`, `college_id` |
| `institution_partners` | Landing page showcase | `name`, `logo_url`, `is_active`, `display_order` |

---

## 8. Supabase Edge Functions

All Edge Functions reside in `supabase/functions/` and execute in the Deno runtime with service role privileges:

1. `admin-create-student`: Securely provisions new Student or Faculty accounts in `auth.users`, creates `profiles`, and assigns `user_roles`.
2. `academic-promote-students`: Executes batch promotion of students from FY -> SY -> TY or Graduation with full audit logs in `academic_promotion_runs`.
3. `admin-generate-attendance`: Generates batch attendance records for scheduled lectures.
4. `admin-update-attendance`: Administrative manual correction of attendance records.
5. `lecture-status-notify`: Automated triggers sending push notifications when lectures change status (`live`, `cancelled`, `rescheduled`).
6. `mark-attendance`: Validates QR dynamic tokens and student location to record attendance.
7. `send-notification`: Dispatches push & in-app alerts to target audience cohorts.
8. `subscribe-web-push` & `generate-vapid-keys`: Web Push API encryption and token storage.
9. `admin-adjust-points`: Admin adjustments to student points ledger.
10. `super-admin-create-admin`: Provisions tenant institutional admins.
11. `retention-on-login`: Updates daily streak and check-in rewards upon login.
12. `health-check`: System health ping.

---

## 9. Feature Map

### A. Academic Promotion Engine
- **Files**: `src/pages/admin/promotion/AdminPromotionPage.tsx`
- **Edge Function**: `supabase/functions/academic-promote-students`
- **Tables**: `academic_promotion_runs`, `profiles`, `classes`
- **Workflow**: Admin selects Source Class -> Target Class -> Run Dry-Run Preview -> Confirm Promotion -> Rollback available via `reversed_at`.

### B. Live Lecture & Attendance Workflow
- **Faculty UI**: `src/pages/faculty/FacultyDashboard.tsx`, `FacultyAttendance.tsx`, `ScheduleLectureDialog.tsx`
- **Student UI**: `src/pages/student/StudentScanAttendance.tsx`, `StudentAttendanceHistory.tsx`
- **Admin UI**: `src/pages/admin/pages/AdminLecturesPage.tsx`, `AdminAttendancePage.tsx`
- **Tables**: `lectures`, `lecture_allotments`, `attendance`, `attendance_corrections`

### C. Unified Image Cropper Engine
- **Files**: `src/components/image/ImageCropper.tsx`, `ImageCropDialog.tsx`, `src/lib/crop-image.ts`
- **Workflow**: Enforces a strict 1:1 square aspect ratio with pan, mouse-wheel/pinch zoom, and pixel-perfect canvas extraction before uploading to Supabase Storage.
- **Used in**: Student Profile, Faculty Profile, Onboarding Wizard.

### D. Faculty Management
- **Files**: `src/pages/admin/faculty/AdminFacultyTab.tsx`, `AddFacultyDialog.tsx`, `EditFacultyDialog.tsx`, `FacultyDetailDrawer.tsx`
- **Workflow**: Live query on `user_roles` (`role = 'faculty'`) joined with `profiles`. Shows conducted lectures (`created_by`) and timetable slots (`faculty_name`).

### E. Document Verification
- **Files**: `src/pages/admin/verify/AdminVerifyDocumentsPage.tsx`, `src/pages/verify/DocumentVerificationPage.tsx`
- **Workflow**: Generates cryptographic reference hash for official documents. Public `/verify/:reference` route validates authenticity without requiring login.

---

## 10. Data Flow: End-to-End Examples

### 1. Scheduling & Conducting a Lecture
```
1. Faculty opens ScheduleLectureDialog.tsx (/faculty/dashboard)
2. Enters topic, date, start_time, end_time, venue, target class_id
3. Inserts row into public.lectures (status = 'scheduled')
4. Inserts row into public.lecture_allotments (lecture_id, class_id)
5. Database trigger/Edge Function dispatches notification to enrolled students
6. On lecture start, Faculty toggles status to 'live' and presents dynamic QR
7. Students scan QR via StudentScanAttendance.tsx -> calls mark-attendance Edge Function
8. Record added to public.attendance (status = 'present')
9. Faculty closes lecture -> status set to 'completed' -> attendance finalized
```

### 2. Batch Student Academic Promotion
```
1. Admin navigates to /platform/admin/promotion
2. Selects academic session (e.g., 2025-2026 to 2026-2027)
3. Selects source cohort (e.g. FY B.Sc CS -> SY B.Sc CS)
4. System executes dry run query displaying student list and eligibility
5. Admin clicks "Execute Promotion" -> invokes academic-promote-students Edge Function
6. Edge function updates profiles.class_id, profiles.year, and profiles.semester
7. Audit record saved in public.academic_promotion_runs with full student state snapshot
```

---

## 11. Shared Components

| Component | Location | Purpose |
| :--- | :--- | :--- |
| `AppIcon` | `src/components/icons/AppIcon.tsx` | Hugeicons drop-in icon engine |
| `ImageCropDialog` | `src/components/image/ImageCropDialog.tsx` | 1:1 Canvas cropping dialog |
| `GlassCard` | `src/components/ui/GlassCard.tsx` | Glassmorphism card container |
| `ModuleHero` | `src/layout/ModuleHero.tsx` | Standardized header banner for hubs |
| `PageContainer` | `src/layout/PageContainer.tsx` | Responsive padded page shell |
| `CommandPalette` | `src/components/search/CommandPalette.tsx` | Global Ctrl+K / Cmd+K search |
| `TopbarNotificationCenter` | `src/components/notifications/` | Real-time bell dropdown & badge |
| `AdminSidebar` | `src/pages/admin/AdminSidebar.tsx` | Collapsible, grouped Admin sidebar |
| `StudentDigitalId` | `src/pages/student/StudentDigitalId.tsx` | Digital ID card with hologram |

---

## 12. Production Architecture

- **Production URL**: `https://campusconnect.net.in` (and institutional subdomains).
- **Vercel Config**: `vercel.json` rewrites all requests `/(.*)` to `/index.html` to enable HTML5 PushState routing in SPA.
- **PWA Service Worker**: `public/sw.js` built via `vite-plugin-pwa` with custom Workbox runtime caching for Supabase REST endpoints, offline fallback, and Web Push notifications.
- **Design System**: Light neutral background (`hsl(220 20% 97%)`), Deep Navy typography (`hsl(222 47% 11%)`), Blue primary accent (`hsl(217 91% 60%)`), subtle borders, no unnecessary glass/blur over-effects.

---

## 13. Important Dependencies

- `@supabase/supabase-js` (`^2.108.1`): Database, Auth, Realtime, and Storage client.
- `@tanstack/react-query` (`^5.101.0`): Server-state synchronization, caching, optimistic updates.
- `framer-motion` (`^12.40.0`): Micro-interactions, spring transitions, drawer animations.
- `@hugeicons/react` (`^1.1.9`): Academic & modern vector icon system.
- `@zxing/browser` (`^0.1.5`): In-browser high-speed QR and barcode scanning.
- `react-hook-form` (`^7.78.0`) + `zod` (`^3.25.76`): Schema validation and form management.
- `react-easy-crop` (`^6.2.3`): Image cropping engine.
- `sonner` (`^1.7.4`): Toast notifications.
- `recharts` (`^2.15.4`): Attendance and analytics charts.
- `vaul` (`^0.9.9`): Mobile-friendly sliding drawers.

---

## 14. Known Constraints & Assumptions

1. **`lectures` Table Schema**:
   - The title column in the `lectures` table is **`topic`** (there is **no** `subject` column in `lectures`).
   - Timetable slots use `subject` column in `timetable_slots`.
2. **Faculty Identification**:
   - Faculty accounts use `profiles.student_id` to store their **Employee / Faculty ID**.
3. **Soft Deletions**:
   - `profiles.is_deleted = true` is used for account deactivation. Never execute hard `DELETE FROM profiles`.
4. **Tenant Isolation**:
   - Every operational table (`students`, `faculty`, `lectures`, `classes`, `departments`, `events`) must filter by `college_id` unless the logged-in user is `super_admin`.
5. **No Hardcoded Dates**:
   - Do not write temporary seasonal campaign hardcoded dates into core layout components.

---

## 15. Dangerous Areas (High Risk)

- **Auth & RLS Policies**: Modifying policies in `supabase/migrations` without testing can lock out entire student or faculty cohorts.
- **Academic Promotion Execution**: Reversals depend on `academic_promotion_runs.details`. Avoid manipulating raw `profiles.class_id` without logging the run.
- **Foreign Key Cascades**: Deleting a `class` or `department` row directly can cascade-delete associated students, lectures, or allotments.

---

## 16. Known Technical Debt

- Several older migration files in `supabase/migrations` contain repetitive RLS definitions that were superseded by subsequent migrations. Treat the latest migration files and `types.ts` as the source of truth.
- Some legacy route paths (`/app/admin/*`, `/lecture/:id`) are redirected in `AppRouter.tsx` to maintain backwards compatibility with existing bookmarks and shared links. Keep these redirects intact.

---

## 17. Obsolete / Removed Functionality

- **Independence Day Seasonal Layer**:
  - The temporary Independence Day campaign components (`IndependenceDayLaunch.tsx`, `IndependenceDayHeroAccent.tsx`, `AshokaChakra.tsx`, `SeasonalKit.tsx`, `SeasonalProvider.tsx`, `config/seasonal.ts`, and `data-season="independence"` CSS) were **completely removed**.
  - **Do NOT recreate or restore seasonal campaign layers** into core navigation or app layouts. Generic challenges and events infrastructure must remain purely neutral.
- **Legacy Image Assets**:
  - Legacy `/__l5e/assets-v1/...` image proxy URLs are obsolete. All official logos are bundled in `src/assets/` (`logo.png`, `bkbnc-logo.png`) or uploaded directly to Supabase Storage buckets.

---

## 18. Development Rules for Future AI Sessions

1. **Check `BRAIN.md` First**: Always read this file before performing wide repository searches.
2. **Strict Verification**: Always run `npx tsc --noEmit` and `npm test` after making changes.
3. **No Mock Data**: Always connect components to real Supabase database queries and Edge Functions. Never introduce fake demo data in production code.
4. **Preserve Navigation Structure**: Maintain the 8 structured Admin navigation sections (`Command`, `Academics`, `Academic Operations`, `Attendance`, `Exams & Content`, `Campus`, `E-Cell`, `System`).
5. **Icon Standard**: Always import icons from `@/components/icons` to leverage the unified Hugeicons engine.
6. **Image Upload Standard**: Always use `ImageCropDialog` to crop avatar images with a 1:1 aspect ratio before saving.
7. **Keep `BRAIN.md` Updated**: If you create a new table, route, Edge Function, or change an architectural contract, update this file in the same session.

---

- **Issue**: RLS error `new row violates row-level security policy for table 'lectures'`.
  - **Cause**: The `lectures` table initially only granted INSERT/UPDATE/DELETE permissions to `is_admin(auth.uid())`. Faculty members (`is_faculty(auth.uid())`) were blocked from scheduling, updating ("Go Live"/"End"), and deleting their own lectures.
  - **Fix**: Updated RLS policies on `public.lectures`, `public.lecture_programme_tags`, and `public.attendance` to allow `is_faculty(auth.uid())` when `created_by = auth.uid()` and scoped to their tenant `college_id = get_my_college_id()`.
- **Issue**: TypeScript error `SelectQueryError<"column 'subject' does not exist on 'lectures'.">`.
  - **Cause**: Trying to query `subject` on `lectures`.
  - **Fix**: Query `topic` instead.
- **Issue**: Broken logo on hard refresh or missing network images.
  - **Cause**: Relying on unauthenticated remote URLs or obsolete proxy paths.
  - **Fix**: Bundle static logos in `src/assets/` and always add `onError={(e) => { e.currentTarget.src = fallbackAsset; }}`.
- **Issue**: Sidebar collapse layout shift.
  - **Cause**: Fixed pixel widths on text containers without `min-w-0` and `truncate`.
  - **Fix**: Use `min-w-0 flex-1 truncate` on all sidebar brand and navigation labels.

---

## 20. Quick Developer Reference

| Requirement | Path / File |
| :--- | :--- |
| **Main App Shell** | [`src/App.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/App.tsx) |
| **Routing Map** | [`src/router/AppRouter.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/router/AppRouter.tsx) |
| **Admin Navigation Config** | [`src/pages/admin/adminNavConfig.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/pages/admin/adminNavConfig.ts) |
| **Admin Sidebar** | [`src/pages/admin/AdminSidebar.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/pages/admin/AdminSidebar.tsx) |
| **Admin Layout** | [`src/pages/admin/AdminLayout.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/pages/admin/AdminLayout.tsx) |
| **Faculty Layout & Pages** | [`src/pages/faculty/`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/pages/faculty) |
| **Student Hubs & Pages** | [`src/pages/student/`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/pages/student) |
| **Error Handling Engine** | [`src/lib/error-handling.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/lib/error-handling.ts) |
| **Query Error State** | [`src/components/ui/DataErrorState.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/components/ui/DataErrorState.tsx) |
| **Database Schema Types** | [`src/integrations/supabase/types.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/integrations/supabase/types.ts) |
| **Supabase Client** | [`src/integrations/supabase/client.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/integrations/supabase/client.ts) |
| **Edge Functions** | [`supabase/functions/`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/supabase/functions) |
| **Database Migrations** | [`supabase/migrations/`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/supabase/migrations) |
| **Design System & CSS** | [`src/index.css`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/index.css) |
| **Unified Icon System** | [`src/components/icons/index.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/components/icons/index.ts) |
| **Image Cropping Engine** | [`src/components/image/ImageCropDialog.tsx`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/components/image/ImageCropDialog.tsx) |

---

## 21. Centralized Error Handling & UX Architecture

1. **Golden Rule**: Users must NEVER see raw PostgreSQL error strings, PostgREST codes, SQL column names, table names, RLS policy texts, or stack traces in UI toasts or dialogs.
2. **Central Normalizer** ([`src/lib/error-handling.ts`](file:///c:/Users/athar/OneDrive/Documents/CAMPUS-X/campusconnect/src/lib/error-handling.ts)):
   - `normalizeError(err, context, fallbackMessage)` classifies all failures into `ErrorCategory` (`validation`, `authentication`, `authorization`, `conflict`, `not_found`, `network`, `timeout`, `rate_limit`, `server`, `client`, `unknown`).
   - Maps PostgreSQL codes (`42501` → permission failure, `23505` → duplicate record, `23503` → relational conflict, `23502` → missing required fields, `57014` → timeout).
   - Generates domain-aware copy for contexts (`schedule-lecture`, `create-student`, `add-faculty`, `save-timetable`, `promote-students`, `login`, `signup`, `mark-attendance`).
3. **Developer Diagnostics**:
   - `logTechnicalError(appError)` retains full technical error strings, codes, and stack traces in developer devtools without exposing passwords, tokens, or personal identifiers.
4. **Standard UI Methods**:
   - **`showErrorToast(err, { context, fallback, onRetry })`**: Dispatches a sanitized, high-contrast toast with an optional `[Retry]` action for recoverable network/server errors.
   - **`showSuccessToast(title, description)`**: Emits consistent confirmation toasts.
   - **`<DataErrorState title="..." onRetry={refetch} />`**: Use inside query loading views when data fails to fetch, preventing blank pages or broken layouts.
5. **Form & Mutation Standards**:
   - All forms must validate required fields, time ordering (`end_time > start_time`), and unique values before dispatching mutations.
   - Action buttons must immediately enter pending state (`isPending`), update label (e.g., "Creating...", "Scheduling..."), and disable double-submission.
