# Campus Connect — Roles & Permissions Matrix

## 1. Core Roles (`app_role` Enum)

| Role | Tenant Scope | Route Hierarchy | Database Access Level | Storage Capabilities | Permitted Edge Functions |
|---|---|---|---|---|---|
| `super_admin` | **Global** (All Colleges) | `/platform/admin-control/*`<br>`/platform/admin/*`<br>`/faculty/*`<br>`/app/*` | Full read/write on all 62 tables | Full administrative access on all 4 buckets | All 23 functions (including tenant reset & admin provisioning) |
| `admin` | **Tenant-Scoped** (`college_id`) | `/platform/admin/*`<br>`/faculty/*`<br>`/app/*` | Full read/write on college-scoped tables | `lecture-flyers` (public upload)<br>`documents` (public upload)<br>`verify-documents` (private upload)<br>`submissions` (review) | College management, student KYC, points adjustment, attendance override |
| `faculty` | **Tenant-Scoped** (`college_id`) | `/faculty/*`<br>`/app/*` | Read/write on `lectures`, `attendance`, `assignments`, `course_materials` | `lecture-flyers` (upload)<br>`documents` (upload)<br>`submissions` (view) | Lecture management, batch attendance generation |
| `student` | **Tenant-Scoped** (`college_id`) | `/app/*` | Read on timetable, lectures; insert on poll votes, check-ins, submissions | `documents` (read)<br>`submissions` (upload to own folder `{user_id}/*`) | `mark-attendance`<br>`daily-checkin`<br>`subscribe-web-push` |

---

## 2. Delegated Administrative Sub-Roles
Sub-role capabilities are stored in `public.permissions` and evaluated by helper functions in frontend UI components (`StaffRoleBadge.tsx`, `AdminPermissionsTab.tsx`):

| Sub-Role | Module | can_view | can_create | can_edit | can_delete |
|---|---|---|---|---|---|
| `hod` | `students` | Yes | No | Yes | No |
| `hod` | `faculty` | Yes | No | Yes | No |
| `hod` | `lectures` | Yes | Yes | Yes | No |
| `hod` | `attendance` | Yes | Yes | Yes | No |
| `hod` | `departments` | Yes | No | No | No |
| `hod` | `reports` | Yes | No | No | No |
| `class_coordinator` | `students` | Yes | No | Yes | No |
| `class_coordinator` | `attendance` | Yes | Yes | Yes | No |
| `class_coordinator` | `lectures` | Yes | No | No | No |
| `class_coordinator` | `announcements` | Yes | Yes | No | No |
| `event_manager` | `events` | Yes | Yes | Yes | Yes |
