# Campus Connect — Backend Architecture

## Overview
Campus Connect is designed around a multi-tenant, zero-trust relational model powered by PostgreSQL, Supabase Row-Level Security (RLS), and Deno serverless Edge Functions.

---

## 1. Multi-Tenant College Isolation Model
Every college tenant is identified by a unique `college_id` (`UUID`) foreign-key referencing `public.colleges`.

### Tenant Enforcement Mechanism
- **Helper Function**: `public.get_my_college_id()` resolves the authenticated caller's college tenant from `public.user_roles`.
- **Row-Level Security**: Every tenant-scoped table enforces `USING (college_id = public.get_my_college_id())` on SELECT/UPDATE/DELETE and `WITH CHECK (college_id = public.get_my_college_id())` on INSERT.
- **Cross-Tenant Prevention**: Users belonging to College A cannot query, update, or join records belonging to College B.
- **Super Admin Scope**: The platform super-admin bypasses tenant barriers using `public.is_super_admin(auth.uid()) = true`, enabling global oversight while maintaining tenant isolation for standard staff and students.

---

## 2. Core Relational Modules
The 62 public database tables are organized into 9 domain sub-systems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CAMPUS CONNECT DOMAINS                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Multi-Tenancy & Auth   : colleges, profiles, user_roles, permissions│
│ 2. Academic Operations    : programmes, classes, departments, exams    │
│ 3. Timetable & Lectures   : timetable_slots, lectures, lecture_schedule│
│ 4. Attendance Sub-System  : attendance, attendance_audit_log, tokens   │
│ 5. Coursework & LMS       : assignments, submissions, documents        │
│ 6. Gamification Engine    : points_ledger, points_rules, achievements  │
│ 7. Communication Hub      : messages, announcements, campus_polls      │
│ 8. Notifications & Push   : notifications, recipients, push_sub        │
│ 9. Verification & Trust   : verify_documents (Tamper-Proof QR/Token)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Functions & Stored Procedures
- **Total PostgreSQL Functions**: 48 defined in migrations.
  - **Public RPCs (2)**: `verify_document_public`, `verify_document_touch` (granted to `anon` and `authenticated`).
  - **Authenticated Student/User RPCs (14)**: Points balance, tier progression, streaks, badges, leaderboards.
  - **Admin & Super-Admin RPCs (14)**: Analytics summaries, attendance matrix export, KYC student approvals, class re-indexing.
  - **Internal / Trigger / Utility Functions (18)**: Timestamp handlers, audit triggers, points credit procedures, notification generators.

---

## 4. Serverless Edge Functions
23 Deno serverless microservices handle complex orchestration, cryptographic signing, batch operations, and privileged administrative workflows:
- **Web Push Engine**: Native ES256 VAPID JWT signing in `send-notification`.
- **Secure QR Attendance**: Server-side TOTP validation and GPS geofencing in `mark-attendance`.
- **Identity Resolution**: `auth-resolve-identifier` enables Student ID login without exposing user emails or enabling enumeration.
- **Background Tasks**: `notification-scheduler` processes queued broadcasts.
