
Goal: Refactor Campus Connect UI to be fully mobile-responsive and production-ready, while preserving existing business logic + backend integration. Implement a post-login sidebar layout, move authenticated navigation under `/app/*`, and fix mobile pain points (Admin Dashboard tabs, Monthly sheet scrolling, action buttons stacking). Add a robust dark mode toggle persisted in localStorage with no flicker.

--------------------------------------------------------------------
1) Current state (what we have today)
--------------------------------------------------------------------
Routing
- Public routes: `/` (Index), `/auth`
- Protected routes: `/student`, `/student/profile`, `/student/inbox`, `/student/scan`, `/attendance`, `/lectures`, `/lectures/:id`, `/admin`, `/leaderboard`
- Protection: `ProtectedRoute` checks session + `user_roles.role` (admin vs student); defaults to student when role missing to avoid loops.

Layouts
- Student layout: `AppShell` currently uses a top header/nav + footer.
- Admin layout: `AdminShell` also uses a top header/nav + footer.
- `RoleShell` decides AdminShell vs AppShell for routes like leaderboard.

Sidebar
- A full shadcn sidebar system exists at `src/components/ui/sidebar.tsx` (supports mobile sheet drawer + desktop persistent).

Dark mode
- CSS supports `.dark` variables in `src/index.css`.
- `next-themes` is installed and used by `src/components/ui/sonner.tsx`, but there is no ThemeProvider wiring yet, and no guaranteed “no flicker on load”.

Admin mobile issues
- `AdminDashboard` uses a `TabsList` with `grid-cols-9`, which will overflow on mobile.
- Monthly sheet already has a ScrollArea and min-width, but action buttons are not mobile-stacked.

--------------------------------------------------------------------
2) Key decisions to satisfy your requirements without breaking existing functionality
--------------------------------------------------------------------
A) “All authenticated routes should be under /app/*” AND “Keep existing routes”
- We will introduce the new canonical routes under `/app/*`.
- We will keep current routes (e.g., `/student`, `/admin`, `/attendance`, etc.) as backward-compatible redirects to the new `/app/*` routes.
- This ensures:
  - No break for existing bookmarks/users
  - You still get the clean `/app/*` architecture going forward

B) “Sidebar must load ONLY after successful login”
- The new layout `AppLayout` will only render after an auth check confirms a user exists.
- `/auth` and `/` remain sidebar-free.

C) One unified layout-based architecture
- Replace the current top-navbar shells for authenticated pages with a single `AppLayout` that:
  - renders a left sidebar (desktop)
  - renders a hamburger trigger + mobile drawer sidebar (mobile)
  - renders content in a consistent “main panel” area
  - keeps the mandatory footer line intact across pages

D) Role-based sidebar item visibility
- Sidebar always shows: Dashboard, Attendance, Leaderboard, Profile, Logout
- Sidebar shows Admin item only when role is admin.
- Student never sees Admin item.

--------------------------------------------------------------------
3) Implementation plan (step-by-step)
--------------------------------------------------------------------

Step 1 — Create the new `/app/*` route structure in `src/App.tsx`
- Use React Router “layout routes”:
  - Public:
    - `/` -> Index (no sidebar)
    - `/auth` -> Auth (no sidebar)
  - Protected (new):
    - `/app/*` -> ProtectedRoute (no requiredRole) -> AppLayout (new)
        - `/app/dashboard` -> StudentDashboard
        - `/app/attendance` -> StudentAttendanceHistory
        - `/app/lectures` -> LecturesList
        - `/app/lectures/:id` -> LectureDetail
        - `/app/profile` -> StudentProfile
        - `/app/inbox` -> StudentInbox
        - `/app/scan` -> StudentScanAttendance
        - `/app/leaderboard` -> Leaderboard (wrapped in Role-aware header state if needed, but still inside AppLayout)
    - `/app/admin/*` -> ProtectedRoute requiredRole="admin" -> (Admin pages)
        - `/app/admin/dashboard` -> AdminDashboard (and/or split routes later)
- Backward-compatible redirects:
  - `/student` -> `/app/dashboard`
  - `/student/profile` -> `/app/profile`
  - `/student/inbox` -> `/app/inbox`
  - `/student/scan` -> `/app/scan`
  - `/attendance` -> `/app/attendance`
  - `/lectures` -> `/app/lectures`
  - `/lectures/:id` -> `/app/lectures/:id`
  - `/admin` -> `/app/admin/dashboard`
  - `/leaderboard` -> `/app/leaderboard`
- This preserves existing deep links while making `/app/*` canonical.

Step 2 — Add `AppLayout` (new layout component)
Create a new layout component (e.g., `src/components/layout/AppLayout.tsx`) that provides:
- SidebarProvider wrapping a `div` with `min-h-screen flex w-full`
- Left sidebar component (new `AppSidebar`)
- Main content area:
  - Top bar (only for authenticated pages) containing:
    - SidebarTrigger (hamburger)
    - Page title (optional)
    - Quick actions (optional)
  - Content container with consistent padding:
    - `px-4 py-6` on mobile
    - `md:px-6 md:py-8` on desktop
  - Footer always present with mandatory line:
    - “Developed by - Atharv Jadhav - Department Of Computer Science”
- Ensure the layout uses high contrast tokens (primary-foreground / accent-foreground), no hardcoded whites.

Important: We will remove the “top navbar” feel from AppShell/AdminShell usage by routing everything through AppLayout instead of those shells.

Step 3 — Add `AppSidebar` (new)
Create a component (e.g., `src/components/layout/AppSidebar.tsx`) that uses the existing shadcn sidebar primitives:
- Menu items (icons + labels):
  - Dashboard -> `/app/dashboard`
  - Attendance -> `/app/attendance`
  - Leaderboard -> `/app/leaderboard`
  - Profile -> `/app/profile`
  - Admin -> `/app/admin/dashboard` (only if role === admin)
  - Logout -> sign out then navigate `/auth`
- Role detection:
  - Reuse the existing “get user + user_roles” logic pattern from AppShell / RoleShell.
  - Cache via React Query (consistent with codebase).
- Mobile behavior:
  - On mobile, sidebar is hidden by default and opens in a drawer via SidebarTrigger.
  - Backdrop overlay is already handled by the underlying Sheet component used in sidebar.tsx.

Step 4 — Remove sidebar/nav from public pages (Auth, Index)
- Ensure `/auth` remains exactly a standalone page (already is).
- Update Index so it does not wrap in AppShell (because AppShell currently includes top nav that would violate “no navbar on public pages”).
  - Create a lightweight `PublicLayout` (or inline styles in Index) that provides:
    - background gradients
    - footer line
    - no navigation UI

Step 5 — Dark Mode (no flicker, localStorage, html class)
Implement a small theme system that meets your rules precisely:
- Add a `ThemeToggle` UI in sidebar footer.
- Persist preference in localStorage (e.g., key: `theme` = `light` | `dark`).
- Apply theme by toggling `document.documentElement.classList.toggle("dark", ...)`.
- Prevent flicker:
  - In `src/main.tsx`, before `createRoot(...).render(...)`, read localStorage and apply the class immediately.
  - Also set a very small global transition rule for colors/backgrounds to reduce harsh switching (but avoid layout shift).

Note:
- `next-themes` is installed; we can either:
  1) Use next-themes ThemeProvider properly (clean, battle-tested), OR
  2) Implement a small local theme hook ourselves for maximum control.
- Given your “toggle class on <html>” requirement and “no flicker”, option (2) is simplest and predictable. We can still keep sonner theme stable by passing theme manually if required.

Step 6 — Mobile UI fixes (Admin Dashboard + Monthly Attendance)
A) AdminDashboard tabs responsiveness
- On mobile:
  - Replace the 9-tab grid with a `<Select>` dropdown to choose active tab.
  - Keep the existing `Tabs` state (so logic stays unchanged), only change the UI control.
- On desktop:
  - Keep the existing tabs row, but allow wrapping or horizontal scroll:
    - Replace `grid grid-cols-9` with:
      - `flex flex-wrap gap-2` OR
      - `flex overflow-x-auto` with proper spacing
  - Ensure touch targets are at least ~44px height on mobile.

B) Monthly Attendance sheet improvements
- Horizontal scrolling:
  - Keep ScrollArea, but ensure it actually scrolls on small screens:
    - Wrap table in a div with `overflow-x-auto` + `min-w-max` (or keep current `min-w-[900px]` but ensure the parent allows horizontal scroll).
- Action buttons stacking:
  - In the controls card, change the button container to:
    - `flex flex-col gap-2 sm:flex-row sm:items-end` so mobile stacks vertically.
- Improve readability:
  - Slightly smaller table font on mobile (`text-xs`), and increase cell padding for touch readability.
  - Freeze first two columns (optional later; not required for first pass).

Step 7 — Remove duplicated logout buttons and unify navigation
- StudentDashboard currently has its own Logout button. With a sidebar, we should:
  - Remove page-level logout buttons (or keep temporarily but de-emphasize).
  - Use sidebar logout as the canonical action to reduce clutter.
- Same for AdminShell top actions; once Admin routes run inside AppLayout, AdminShell can be deprecated from routing (but we will not delete it immediately; we’ll stop using it to avoid risky sweeping changes).

Step 8 — Verification checklist (must pass)
Functional
- /auth login -> redirects to correct `/app/*` page with no reload loop.
- Admin user:
  - Can access `/app/admin/dashboard`
  - Sidebar shows Admin item
- Student user:
  - Cannot access `/app/admin/*` (redirects appropriately)
  - Sidebar hides Admin item

UX / Layout
- Sidebar does not appear on `/` or `/auth`.
- Mobile:
  - hamburger opens sidebar drawer
  - overlay/backdrop appears
  - AdminDashboard tab selector works
  - Monthly sheet scrolls horizontally
  - Export/Print buttons stack vertically
- Dark mode:
  - toggles instantly
  - persists after refresh
  - no flicker during initial load

--------------------------------------------------------------------
4) Files that will likely be changed/added (for transparency)
--------------------------------------------------------------------
Routing
- Modify: `src/App.tsx` (introduce `/app/*` layout routes + redirects)

New layout/components
- Add: `src/components/layout/AppLayout.tsx`
- Add: `src/components/layout/AppSidebar.tsx`
- Add: `src/components/layout/ThemeToggle.tsx` (or a small hook file like `src/hooks/use-theme.ts`)

Public page cleanup
- Modify: `src/pages/Index.tsx` (remove AppShell wrapper to comply with “no navbar/sidebar before login”)

Theme init
- Modify: `src/main.tsx` (apply theme class before render)

Mobile fixes
- Modify: `src/pages/admin/AdminDashboard.tsx` (tabs -> dropdown on mobile; wrap/scroll on desktop)
- Modify: `src/pages/admin/attendance/AdminMonthlyAttendance.tsx` (buttons stack; ensure horizontal scroll behaves on mobile)

Potential follow-ups (optional, later)
- Stop using `AppShell` and `AdminShell` entirely for authenticated routes (keep the files, but route everything through AppLayout)
- Standardize page headers (title + breadcrumbs) for a consistent “production” feel

--------------------------------------------------------------------
5) Risks & how we avoid breaking functionality
--------------------------------------------------------------------
- Route migration risk:
  - Mitigated by keeping old routes as redirects to new `/app/*`.
- Role loading edge cases:
  - Already addressed by `ProtectedRoute` defaulting to student when role is missing.
  - We’ll keep that behavior and ensure sidebar role-based items tolerate “role=null” safely.
- Theme flicker:
  - Mitigated by setting html class before rendering React.
- Admin tabs complexity:
  - We will not change underlying tab content logic; only swap the UI selector control depending on viewport.

--------------------------------------------------------------------
6) What you will notice after implementation
--------------------------------------------------------------------
- Public pages (/ and /auth): clean, no sidebar/navbar.
- After login: app opens in a modern “sidebar + main panel” layout.
- Mobile: hamburger-driven sidebar drawer, better spacing, no overflow.
- AdminDashboard: usable on phone (dropdown instead of squished tabs).
- Monthly attendance: scrollable sheet, mobile-friendly actions.
- Dark mode: consistent, persisted, no flicker on reload.
