# Campus Connect — Authentication Architecture

## 1. Overview
Campus Connect uses native Supabase Auth (`@supabase/supabase-js`) backed by `auth.users` with dual identifier support:
1. **Email / Password** (Standard staff, faculty, and student accounts)
2. **Student ID / Roll Number / Password** (Dual-identifier resolution via `auth-resolve-identifier`)

---

## 2. Dual-Identifier Resolution Flow

```
[ Student enters Student ID + Password ]
                   │
                   ▼
       [ Frontend calls Edge Function ]
   /functions/v1/auth-resolve-identifier
                   │
                   ▼
  [ Resolves Student ID -> Email securely ]
  (Constant-time response to prevent enumeration)
                   │
                   ▼
   [ Invokes native Supabase Auth SDK ]
  supabase.auth.signInWithPassword({ email, password })
                   │
                   ▼
       [ Session Token Stored ]
         (Browser localStorage)
                   │
                   ▼
 [ TenantProvider & AuthProvider resolve ]
   Role + College ID from public.user_roles
```

---

## 3. Core App Roles & Hierarchy
The application defines 4 core roles in the PostgreSQL enum `app_role`:

| Role | Hierarchy Level | Primary Capabilities | Routing Scope |
|---|---|---|---|
| `super_admin` | Level 4 (Global) | Global multi-college control, tenant provisioning, system health, platform branding | `/platform/admin-control/*` |
| `admin` | Level 3 (Tenant) | College administration, staff/student KYC management, departments, academic sessions | `/platform/admin/*` |
| `faculty` | Level 2 (Tenant) | Lecture creation, live QR attendance generation, assignment grading, syllabus uploads | `/faculty/*` |
| `student` | Level 1 (Tenant) | Timetable view, QR attendance check-in, assignment submissions, gamification & community | `/app/*` |

---

## 4. Sub-Roles & Permissions
Sub-roles are module-level capability assignments defined in `public.permissions`:
- **`hod`** (Head of Department): Department-scoped oversight of lectures, faculty, and student attendance.
- **`class_coordinator`**: Division-level attendance and announcement management.
- **`event_manager`**: Event publishing, stall allocations, and ticket registrations.

---

## 5. Security & Session Handling
- **Session Persistence**: Managed automatically by `@supabase/supabase-js` in standard `localStorage`.
- **JWT Expiry & Refresh**: Handled transparently by Supabase client auth listeners (`onAuthStateChange`).
- **Route Guards**: `RoleRouteGuard` and `ProtectedRoute` block unauthorized UI rendering before components mount.
- **Privilege Escalation Protection**: RLS prevents any client-side update or insert to `public.user_roles`. Role grants require the service-role client or super-admin Edge Functions.
