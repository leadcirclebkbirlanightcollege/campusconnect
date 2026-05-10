
# ERP Master Sync Engine — Implementation Plan

## Important architectural reconciliation

Your spec mentions **Clerk** and a dedicated **`students`** table. The existing Campus Connect platform uses:

- **Supabase Auth** (not Clerk) — already integrated, with `auth.users` + `profiles` + `user_roles`
- **`profiles`** as the student/user record (no separate `students` table)
- **`colleges`**, **`programmes`**, **`student_programme_allotments`** already exist
- Multi-tenant `college_id` isolation via `get_my_college_id()` + RLS — already enforced

I will **extend** this existing architecture rather than introduce a parallel system. Specifically:

- Keep **Supabase Auth** as the identity provider (Clerk would require ripping out the auth stack — out of scope and would break every existing module).
- Extend `profiles` with ERP fields instead of creating a duplicate `students` table.
- Add new `departments` table + extend existing `programmes`.
- All ERP metadata and onboarding flags live on `profiles`.

If you genuinely need Clerk instead of Supabase Auth, that's a separate migration project — please confirm before we proceed and I'll plan it independently.

---

## Scope of this build

A complete ERP-driven onboarding + yearly replacement engine, broken into 5 deliverable phases.

### Phase A — Database foundation (1 migration)

New tables:
- `departments` (college_id, name, normalized_name UNIQUE per college, is_active)
- `erp_import_staging` (batch_id, raw JSON, parsed JSON, validation_state, parsed_state)
- `erp_import_batches` (batch_id PK, college_id, admin_id, filename, totals: total/valid/invalid/created/updated/archived, status, started_at, completed_at)
- `erp_import_errors` (batch_id, row_number, reason, raw_data)

Extend `programmes`:
- add `department_id`, `programme_code`, `is_active` (if missing)
- unique (college_id, programme_code)

Extend `profiles`:
- `enrollment_no` (UNIQUE per college), `roll_no`, `admission_no`, `erp_student_id`
- `gender`, `guardian_name`, `mobile`, `category`, `enrollment_status`
- `validity_start`, `validity_end`, `academic_session`
- `department_id`, `programme_id`
- `is_active`, `archived_at`
- `onboarding_completed` (bool), `profile_completed` (bool), `password_changed` (bool)
- `must_change_password` (bool, default true for ERP-created accounts)

RLS: admins read/write only their own `college_id`; students read own row; super_admin global. Mirror existing patterns using `get_my_college_id()` + `is_admin()`.

History preservation: archival is a flag flip (`is_active=false`, `archived_at=now()`), never a hard delete. Foreign keys to attendance/events/points already cascade-safe via existing `is_deleted` patterns.

### Phase B — ERP parser library (`src/lib/erp/`)

Pure TS modules, fully unit-testable:
- `parseExcel.ts` — uses `xlsx` (already viable in browser) to read .xlsx/.csv into rows
- `columnMap.ts` — fixed mapping per spec (Name → full_name, etc.)
- `programmeParser.ts` — split `"1151061 : Bachelor of Science (Computer Science)"` → `{ code, name }`
- `departmentExtractor.ts` — derive department from `Discipline` else from parenthetical in programme name; normalize (lowercase, trim, collapse whitespace) for dedup matching
- `rowValidator.ts` — Zod schema for required fields (name, enrollment_no, email format, mobile shape); collects per-row errors
- `diffEngine.ts` — given existing `profiles` slice + parsed rows, produces `{ create[], update[], archive[], unchanged[] }` keyed by `enrollment_no`

### Phase C — Edge function `erp-sync` (staged pipeline)

Single function with `step` parameter, called sequentially by the UI to keep work chunked and resumable:

1. `start` — create `erp_import_batches` row, return `batch_id`
2. `upload` — UI POSTs parsed rows in chunks (≤500/req), inserts into `erp_import_staging`
3. `validate` — runs validators, writes per-row state + errors to `erp_import_errors`
4. `preview` — returns counts: valid / duplicate / invalid / new / updated / archived (computed via diff against `profiles`)
5. `commit` — chunked transaction:
   - Upsert `colleges` (admin's college only, by `get_my_college_id()`)
   - Upsert `departments` (normalized name match)
   - Upsert `programmes` (by `programme_code`)
   - For each student row:
     - If new: call Supabase Admin API to create auth user with default password `${enrollment_no}@123`, insert `profiles` + `user_roles(role='student')` + `student_programme_allotments`
     - If existing (match by `enrollment_no` within college): update ERP fields only (do not touch user-edited profile fields like avatar, bio, dob)
   - Mark students missing from upload as `is_active=false, archived_at=now()`
   - Update batch totals + status='completed'
6. `errors` — returns CSV download of failed rows

Security:
- `verify_jwt` validation in code (admin role required)
- All writes scoped to `auth.uid()`'s college via server-side `get_my_college_id()`
- Service role key used only for `auth.admin.createUser` — never exposed to client
- Rate limit: one active batch per admin

Performance:
- Chunked inserts (500 rows per RPC call)
- Bulk upserts via single `INSERT ... ON CONFLICT`
- Validation runs in DB where possible

### Phase D — Admin UI (`src/pages/admin/erp-sync/`)

Route: `Admin → Student Management → ERP Sync`

Components:
- `ErpSyncDashboard.tsx` — landing: "Start new sync" + history table
- `ErpUploader.tsx` — drag/drop + file picker, client-side parse with progress
- `ErpStepper.tsx` — Parsing → Validating → Creating Structures → Comparing → Creating Accounts → Archiving → Done
- `ErpPreview.tsx` — the colored summary card (✔312 valid / ⚠8 dup / ❌2 invalid / 🗂120 archive / 🔄54 update)
- `ErpErrorTable.tsx` — failed rows with download CSV + retry
- `ErpHistoryTable.tsx` — past batches with status, totals, drill-down

Responsive: mobile uses card stack instead of table; uploader becomes full-width tap target.

### Phase E — Student forced onboarding

- New route guard `OnboardingGuard.tsx` wrapping student routes — redirects to `/onboarding` if `must_change_password || !onboarding_completed`
- `/onboarding` flow: 4 steps
  1. Change password (Supabase auth.updateUser)
  2. Complete profile (DOB, emergency contact, skills, bio) — ERP fields shown read-only
  3. Upload avatar (existing `avatars` bucket)
  4. Accept terms → set `onboarding_completed=true`
- ERP-imported fields rendered as locked inputs across the app (small lock icon + tooltip "Synced from ERP")

---

## Files to be created

```
supabase/migrations/<ts>_erp_sync_engine.sql
supabase/functions/erp-sync/index.ts
src/lib/erp/parseExcel.ts
src/lib/erp/columnMap.ts
src/lib/erp/programmeParser.ts
src/lib/erp/departmentExtractor.ts
src/lib/erp/rowValidator.ts
src/lib/erp/diffEngine.ts
src/lib/erp/types.ts
src/pages/admin/erp-sync/ErpSyncPage.tsx
src/pages/admin/erp-sync/ErpUploader.tsx
src/pages/admin/erp-sync/ErpStepper.tsx
src/pages/admin/erp-sync/ErpPreview.tsx
src/pages/admin/erp-sync/ErpErrorTable.tsx
src/pages/admin/erp-sync/ErpHistoryTable.tsx
src/pages/student/onboarding/OnboardingFlow.tsx
src/pages/student/onboarding/steps/{ChangePassword,CompleteProfile,UploadAvatar,AcceptTerms}.tsx
src/components/auth/OnboardingGuard.tsx
```

Files to be modified (small additive changes only):
- `src/router/AppRouter.tsx` — add ERP sync route + onboarding route + guard
- `src/pages/admin/adminNavConfig.ts` — add ERP Sync nav entry
- existing student profile components — add read-only treatment for ERP fields

Dependency add: `xlsx` (npm) for client-side parse.

---

## Out of scope (will NOT touch)
- Clerk migration
- Existing attendance / lectures / events modules
- Faculty/subject ERP (architecture left modular for future)
- Hard deletes of any existing data

---

## Open questions before I build

1. **Auth provider** — confirm Supabase Auth (existing) is fine, OR you really want a Clerk migration (separate project).
2. **Default-password policy** — the spec says `EnrollmentNumber@123` (e.g. `230401@123`). This is weak. OK to use as-is given the forced password change on first login?
3. **College auto-create** — admins are already scoped to one `college_id`. Should ERP "Organizational Unit" column be ignored (admin's college is the truth), or should mismatches throw a validation error? I'll go with **validation error** unless you say otherwise.
4. **Yearly replacement trigger** — every commit performs full replacement (archive missing). Should there be a "partial sync" mode that skips archival? I'll add a checkbox in the preview step (default: full replacement on).

If answers to (1)–(4) are "yes / proceed / your defaults are fine", I'll start with Phase A migration immediately on approval.
