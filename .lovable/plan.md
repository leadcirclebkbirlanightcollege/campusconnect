# Enterprise Auth, Onboarding & Approval System

## Goal
Extend (not rebuild) the existing Campus Connect auth with: Google sign-in, manual registration, mandatory multi-step onboarding, admin approval gate, and strict route protection — while preserving current RLS, tenancy, and architecture.

## 1. Database (migration)
Extend `profiles` with:
- `profile_completed boolean default false`
- `approval_status text default 'pending'` (check: pending/approved/rejected)
- `college_assigned boolean default false`
- `enrollment_number text unique` (Mumbai University)
- `course_code text`, `course_name text`
- `academic_year text` (FY/SY/TY)
- `gender text`, `date_of_birth date`, `first_name text`, `last_name text`
- `approved_by uuid`, `approved_at timestamptz`, `rejection_reason text`
- Unique partial index on `lower(enrollment_number)`

Backfill: existing students → `profile_completed=true, approval_status='approved', college_assigned=(college_id is not null)` so we don't lock out current users.

RLS:
- Students: can update own profile only while `approval_status='pending'` for academic fields; always for personal fields. Cannot set `college_id`, `approval_status`, `college_assigned`, `approved_*`.
- Admin: can update approval fields + `college_id` within their college scope (or unassigned rows for global admins).

New RPC `admin_approve_student(p_user_id, p_college_id, p_student_id)` and `admin_reject_student(p_user_id, p_reason)` — SECURITY DEFINER, admin-only.

## 2. Auth flow
- `src/pages/Auth.tsx`: add "Continue with Google" via `lovable.auth.signInWithOAuth("google")` + manual register tab (email/password/confirm). Keep existing student-ID login.
- Configure social auth: enable Google provider.
- On sign-in: AuthProvider unchanged; new `useOnboardingStatus()` hook reads `profile_completed`, `approval_status`, `college_assigned`.

## 3. Onboarding (multi-step)
New `src/pages/onboarding/OnboardingWizard.tsx` at `/onboarding`:
- Step 1 — Personal: photo upload (avatars bucket), first/last name, phone, gender, DOB. Prefill from Google identity.
- Step 2 — Academic: enrollment number (required, unique check), college student ID (optional), course dropdown (7 fixed options storing code+name), year (FY/SY/TY).
- Submit → set `profile_completed=true`, `approval_status='pending'`. Redirect to `/pending-approval`.

Modern dark glassmorphism, progress bar, framer-motion transitions, mobile-first.

## 4. Pending approval screen
`src/pages/PendingApproval.tsx`: centered card, status pills (Submitted → Under Review → Approved/Rejected), Refresh Status (refetch), Logout. If `rejected` → show reason + "Edit & Resubmit" → reopens wizard, on resubmit flips status back to `pending`.

## 5. Route guards
Extend `ProtectedRoute` (and `AppGuard`) with onboarding gate:
- `!profile_completed` → `/onboarding`
- `profile_completed && (approval_status!=='approved' || !college_assigned)` → `/pending-approval`
- else → render
- Admins/super_admins/faculty bypass gate.
- Hide bottom nav + sidebars when gated.

## 6. Admin verification UI
New `src/pages/admin/verification/PendingStudentsPage.tsx` + route in `adminNavConfig`:
- Queue of pending students with photo, name, email, enrollment#, course, year, submitted at.
- Search/filter, view photo modal.
- Actions: Assign College (dropdown), Edit Student ID, Approve, Reject (with reason).
- Calls new admin RPCs.

## 7. Security
- Trigger on `profiles` BEFORE UPDATE: prevent students from changing `college_id`, `approval_status`, `college_assigned`, `approved_by`, `approved_at`.
- Enrollment number uniqueness enforced at DB level.
- Admin RPCs validate caller role + college scope.

## 8. Out of scope
- No changes to existing attendance/lectures/timetable/E-Cell modules.
- No changes to existing RLS on unrelated tables.
- Faculty/admin onboarding unchanged.

## Technical notes
- Course list constant in `src/lib/courses.ts`.
- Photo uploads → `avatars` bucket, path `onboarding/{user_id}.jpg`.
- React Query keys: `["onboarding", userId]`, invalidate on submit + on admin approve.
- Realtime: optional subscribe to own profile row on `/pending-approval` for live status flip.

## Execution order
1. Migration (requires approval) → 2. Configure Google auth → 3. Onboarding wizard + pending screen → 4. Route guards → 5. Auth page Google button + manual register → 6. Admin verification page → 7. Smoke test.
