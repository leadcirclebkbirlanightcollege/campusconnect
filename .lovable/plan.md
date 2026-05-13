## Phase 6 — Admin & Super Admin Enterprise Redesign

Executed in 3 sequenced batches. Batch A is mandatory & destructive (ERP removal, password reset, hard-delete tool). Batches B/C are the visual/UX redesign.

---

### BATCH A — Mandatory cleanup & data tools (ship first)

**A1. Remove ERP Sync Engine completely**
- Delete `src/pages/admin/erp-sync/ErpSyncPage.tsx`
- Delete `src/lib/erp/` (types, parseExcel, programmeParser, departmentExtractor, rowValidator, columnMap, index)
- Delete edge function `supabase/functions/erp-sync/` and call `supabase--delete_edge_functions(["erp-sync"])`
- Remove ERP route from `src/router/AppRouter.tsx`
- Remove ERP nav item from `src/pages/admin/adminNavConfig.ts`
- Remove `xlsx` dependency if only used by ERP
- Keep DB tables (`erp_import_*`) for now — non-blocking; flag for later cleanup migration
- Keep `OnboardingGuard` minimal but disable forced onboarding (password = `student` policy)

**A2. Simplify student auth — password = `student`**
- New edge function `admin-create-student` (or update existing) sets default password literal `student`
- Remove forced password-change requirement in `OnboardingFlow` / `OnboardingGuard`: students go straight to dashboard after login
- Keep `OnboardingFlow` accessible as optional profile-completion, but no longer blocking

**A3. Super Admin "Reset Student Database" tool**
- New edge function `super-admin-reset-students`:
  - Verifies caller is `super_admin`
  - Deletes from `attendance`, `points_ledger`, `student_programme_allotments`, `student_intelligence`, `student_streaks`, `student_achievements`, `daily_checkins`, `notification_recipients` (student rows), `profiles` (where role=student), `user_roles` where role='student', then `auth.admin.deleteUser` for each
- Frontend: new tile in Super Admin Security/Platform Settings page → "Reset Student Database"
  - Danger modal, typed confirmation `DELETE ALL STUDENTS`, double-confirm, success toast with count

---

### BATCH B — Admin Command Center redesign (operational focus)

- `AdminOverviewPage` / `AdminOverviewTab`: top KPI strip (Students / Faculty / Attendance Today / Active Events / Pending Requests) using existing `MetricCard` with animated counters
- Refresh `QuickActionsGrid`: replace current 8 generic actions with the requested operation-first set (Add Student, Add Faculty, Create Event, Create Announcement, Approve Stalls, Approve Point Claims) — larger cards, clearer iconography, clean dark-mode contrast
- Tighten `AdminLayout` topbar density; ensure no invisible buttons / opacity issues
- Sidebar: drop ERP Sync, regroup nav into Operations / People / Academic / Engagement / Settings

### BATCH C — Tables, forms, Super Admin polish

- Create reusable `<EnterpriseTable>` primitive (sticky header, search toolbar, filter chips, pagination, row hover, status badges, mobile card fallback) and refactor 2 high-traffic admin tables (Students, Attendance Corrections) onto it as the pattern
- Modal/form polish pass: spacious sections, sticky footer actions, inline validation styling tokens
- Super Admin dashboard: elevate visual hierarchy vs Admin (gradient header strip, platform KPIs, system health widget tiles, security alerts panel) on `SuperAdminDashboard`
- Pass on contrast / dark mode / button visibility across admin & super-admin shells

---

### What this plan does NOT touch
- Student-facing pages (Phase 3–5) — untouched
- E-Cell pages — untouched
- Backend academic logic (lectures, attendance marking) — untouched
- DB schema for ERP tables — left in place; only UI/edge function removed

---

### Confirmation needed before I start
1. OK to **delete the `erp-sync` edge function and `src/lib/erp/`** (irreversible without revert)?
2. OK that **`OnboardingFlow` becomes optional** (students log in straight to dashboard with `student` password, no forced reset)?
3. For the **Reset Student Database** tool — should it also wipe `erp_import_batches/errors/staging` rows, or only student-owned data?
