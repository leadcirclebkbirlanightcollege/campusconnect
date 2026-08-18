# Campus Connect — Supabase Edge Functions Inventory

Campus Connect includes **23 Deno-based Supabase Edge Functions** located in `/supabase/functions/`. Every function provides CORS headers, standardized error handling, and role or secret verification.

---

## Complete Functions Matrix

| # | Function Name | Purpose | Caller / Auth | Required Role / Secret | Database / RPC Dependencies | Frontend Callers |
|---|---|---|---|---|---|---|
| 1 | `auth-resolve-identifier` | Resolves student ID/roll number to email without exposing user existence | Anonymous / Public | None (Rate limited & generic responses) | `profiles` | `src/pages/Auth.tsx` |
| 2 | `send-notification` | Sends in-app notifications and signs Web Push via native VAPID ES256 | Authenticated Staff / System | `admin`, `super_admin`, or `SERVICE_ROLE` | `notifications`, `notification_recipients`, `push_subscriptions` | `AdminNotificationsPage.tsx`, `SANotificationsPage.tsx` |
| 3 | `subscribe-web-push` | Registers user device Web Push subscription keys | Authenticated User | Any authenticated user | `push_subscriptions` | `src/pages/student/NotificationSettings.tsx`, `PwaInstallPage.tsx` |
| 4 | `notification-scheduler` | Periodic cron trigger to dispatch scheduled notifications | Cron / Background Worker | `NOTIFICATION_CRON_SECRET` | `scheduled_notifications`, invokes `send-notification` | Automated cron / pg_cron |
| 5 | `generate-vapid-keys` | Generates a valid base64url VAPID keypair for Web Push | Super Admin / Setup | Service Role or Super Admin | None (Native Web Crypto) | Initial platform setup / Admin diagnostics |
| 6 | `mark-attendance` | Verifies dynamic TOTP QR token, time window, and geofence distance to mark attendance | Authenticated Student | `student` role | `lectures`, `attendance`, `points_ledger`, `student_streaks` | `src/pages/student/StudentScanAttendance.tsx`, `QrScannerDialog.tsx` |
| 7 | `admin-generate-attendance` | Batch-creates attendance rows for enrolled class students | Authenticated Admin | `admin`, `faculty` | `lectures`, `profiles`, `attendance` | `AdminAttendancePage.tsx` |
| 8 | `admin-update-attendance` | Manual attendance override with immutable audit logging | Authenticated Admin | `admin`, `super_admin` | `attendance`, `attendance_audit_log` | `AdminAttendanceLiveView.tsx`, `AdminAttendancePage.tsx` |
| 9 | `finalize-attendance` | Closes attendance window and credits student points | Authenticated Admin | `admin`, `faculty` | `lectures`, `attendance`, `points_ledger` | `LectureManagementTab.tsx`, `FacultyDashboard.tsx` |
| 10 | `lecture-status-notify` | Broadcasts push notification when a lecture is cancelled or rescheduled | Authenticated Staff | `admin`, `faculty` | `lectures`, invokes `send-notification` | `LectureManagementTab.tsx` |
| 11 | `super-admin-create-admin` | Provisions new college admin accounts in Auth and user_roles | Authenticated Super Admin | `super_admin` | `auth.users`, `user_roles`, `colleges` | `SACreateAdminPage.tsx`, `SAAdminsPage.tsx` |
| 12 | `super-admin-reset-students` | Administrative cohort reset across platform colleges | Authenticated Super Admin | `super_admin` | `auth.users`, `profiles`, `attendance`, `points_ledger` | `SASecurityPage.tsx` |
| 13 | `admin-reset-college-students` | College-level student data reset | Authenticated College Admin | `admin` | `profiles`, `attendance`, `points_ledger` (scoped by `college_id`) | `AdminSettingsPage.tsx` |
| 14 | `admin-create-student` | Direct student onboarding by college administrators | Authenticated College Admin | `admin` | `auth.users`, `profiles`, `user_roles` | `AdminStudentsPage.tsx` |
| 15 | `admin-adjust-points` | Manual points ledger credit or debit with audit note | Authenticated College Admin | `admin`, `super_admin` | `points_ledger` | `AdminPointsPage.tsx` |
| 16 | `admin-backfill-user-roles` | Migration utility for role normalization and college bindings | Authenticated Super Admin | `super_admin` | `auth.users`, `user_roles` | Super Admin maintenance utilities |
| 17 | `academic-promote-students` | Annual student batch progression (e.g., FY -> SY) | Authenticated College Admin | `admin` | `profiles`, `classes` | `AdminStudentsPage.tsx` |
| 18 | `daily-checkin` | Processes student daily engagement and streaks | Authenticated Student | `student` | `daily_checkins`, `student_streaks`, `points_ledger` | `StudentDashboard.tsx` |
| 19 | `retention-on-login` | Computes login activity and cohort retention metrics | Authenticated User | Any authenticated user | `login_activity`, `retention_metrics` | `src/pages/Auth.tsx` |
| 20 | `ensure-admin-account` | Idempotent bootstrap for root super admin and admin accounts | System / Initial Setup | `SETUP_SECRET` (Bearer token) | `auth.users`, `user_roles`, `profiles` | Initial provisioning script |
| 21 | `bootstrap-clean-reset` | Hard-delete test students and resets canonical staff accounts | System / Maintenance | `SETUP_SECRET` (Bearer token) | `auth.users`, all student tables | Standalone CLI bootstrap |
| 22 | `health-check` | System status and database latency probe | Public / Monitor | None | `colleges` table ping | System monitoring / `SASystemHealthPage.tsx` |
| 23 | `update-user-email` | Updates user email in `auth.users` via Supabase Admin API | Authenticated User / Admin | Self or `admin` | `auth.users`, `profiles` | `StudentProfile.tsx`, `AdminProfilePage.tsx` |

---

## Detailed Function Specifications

### 1. `auth-resolve-identifier`
- **Path**: `supabase/functions/auth-resolve-identifier/index.ts`
- **CORS**: Enabled (`*`)
- **Input**: `{ identifier: string }`
- **Output**: `{ email: string }`
- **Behavior**: If the identifier contains `@`, returns the lowercase string immediately. Otherwise, queries `public.profiles` using the Supabase Service Role client for `student_id = identifier`. Returns HTTP 200 with `{ email: null }` if not found to prevent student ID enumeration attacks.

### 2. `send-notification`
- **Path**: `supabase/functions/send-notification/index.ts`
- **CORS**: Enabled
- **Security**: Verifies caller authentication and role (`admin`, `super_admin`, or service role).
- **Target Types**: `all_colleges`, `college`, `admins_only`, `students_only`, `college_students`, `class`, `programme`, `user`.
- **Push Pipeline**: Queries `push_subscriptions` for matching recipient IDs, signs JWT via Web Crypto ES256 using `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY`, and dispatches payload to browser Web Push endpoints (FCM, Mozilla, Apple Push).

### 3. `notification-scheduler`
- **Path**: `supabase/functions/notification-scheduler/index.ts`
- **CORS**: Enabled
- **Authentication**: Requires `NOTIFICATION_CRON_SECRET` provided via request body `{ secret: "..." }` or `Authorization: Bearer <secret>`.
- **Behavior**: Queries `scheduled_notifications` for items where `status = 'scheduled'` and `scheduled_for <= NOW()`. Dispatches each notification via `send-notification` and marks row as `sent` or `failed`.

### 4. `mark-attendance`
- **Path**: `supabase/functions/mark-attendance/index.ts`
- **Authentication**: JWT of authenticated student.
- **Verification Logic**:
  1. Validates that the lecture is currently active (`is_active = true`, within start/end time window).
  2. Validates dynamic TOTP QR token against `lectures.qr_secret` with a sliding 30-second window.
  3. Validates student latitude/longitude against lecture room coordinates using the Haversine distance formula (enforces maximum configured radius, default 150m).
  4. Inserts into `attendance` and atomic ledger reward into `points_ledger`.

### 5. `ensure-admin-account`
- **Path**: `supabase/functions/ensure-admin-account/index.ts`
- **Authentication**: Requires `SETUP_SECRET` in `Authorization: Bearer <SETUP_SECRET>` header.
- **Behavior**: Inspects `auth.users` via Supabase Admin API. If the target `ADMIN_EMAIL` does not exist, creates the user and assigns `admin` role in `user_roles`. If user exists, updates password and confirms email.

---

## Edge Function Deployment Instructions

Deploy all 23 functions to your independent Supabase project using Supabase CLI:

```bash
# Set required Edge Function secrets
npx supabase secrets set \
  SETUP_SECRET="your-secure-setup-secret" \
  NOTIFICATION_CRON_SECRET="your-secure-cron-secret" \
  VAPID_PUBLIC_KEY="your-vapid-public-key" \
  VAPID_PRIVATE_KEY="your-vapid-private-key" \
  VAPID_SUBJECT="mailto:admin@yourcollege.edu" \
  ADMIN_EMAIL="admin@yourcollege.edu" \
  ADMIN_PASSWORD="your-admin-password" \
  SUPER_ADMIN_EMAIL="superadmin@yourcollege.edu" \
  SUPER_ADMIN_PASSWORD="your-super-admin-password"

# Deploy all functions
npx supabase functions deploy --no-verify-jwt auth-resolve-identifier
npx supabase functions deploy --no-verify-jwt health-check
npx supabase functions deploy --no-verify-jwt notification-scheduler
npx supabase functions deploy --no-verify-jwt ensure-admin-account
npx supabase functions deploy --no-verify-jwt bootstrap-clean-reset
npx supabase functions deploy send-notification
npx supabase functions deploy subscribe-web-push
npx supabase functions deploy generate-vapid-keys
npx supabase functions deploy mark-attendance
npx supabase functions deploy admin-generate-attendance
npx supabase functions deploy admin-update-attendance
npx supabase functions deploy finalize-attendance
npx supabase functions deploy lecture-status-notify
npx supabase functions deploy super-admin-create-admin
npx supabase functions deploy super-admin-reset-students
npx supabase functions deploy admin-reset-college-students
npx supabase functions deploy admin-create-student
npx supabase functions deploy admin-adjust-points
npx supabase functions deploy admin-backfill-user-roles
npx supabase functions deploy academic-promote-students
npx supabase functions deploy daily-checkin
npx supabase functions deploy retention-on-login
npx supabase functions deploy update-user-email
```
