# Native App Experience — Implementation Plan

This is a large, multi-phase transformation. Shipping it all in one turn would produce shallow work. I'll deliver it in **6 focused phases**, each independently valuable. You approve phase-by-phase.

Scope guardrail: **navigation, flow, and interconnection only** — no feature removal, no visual redesign of feature screens, no schema changes.

---

## Phase 1 — Persistent App Shell + New Bottom Nav (Student)

Rebuild the mobile shell so screens live *inside* one continuous app frame instead of full-page swaps.

- New 5-tab bottom nav: **Home · Academics · Campus · E-Cell · Profile**
  - Home = Dashboard
  - Academics = Lectures + Timetable + Attendance + Assignments (tabbed sub-nav)
  - Campus = Events + Announcements + Polls + Daily (tabbed)
  - E-Cell = Leaderboard + Achievements + Programmes (Learning Circles) (tabbed)
  - Profile = Settings + Digital ID + Inbox
- Persistent shell: bottom nav + top header never unmount; only inner `<Outlet />` transitions
- Shared-element style page transitions (slide for forward, fade for tab switch) via existing Framer Motion tokens
- Preserve scroll position per tab (nav stack per tab, Instagram-style)

## Phase 2 — Smart Back + Nav Stack Memory

- Per-tab navigation stack (like iOS tab bars)
- Back button pops the *contextual* stack, not browser history
- Remember last-opened sub-tab inside each module (sessionStorage)
- "Return to where you were" on app resume

## Phase 3 — Global Search (⌘K + mobile pull-down)

Extend existing `CommandPalette` into a universal search that queries in parallel:
- students, faculty, events, lectures, documents, classes, programmes, departments, announcements
- Grouped results, keyboard nav, direct deep-link on select
- Accessible from header search icon on every screen

## Phase 4 — Cross-Module Reactivity (the "alive" feeling)

Centralize invalidations so one action ripples everywhere:
- New `useAppEvents()` bus (React Query invalidation orchestrator)
- Mark attendance → invalidates `dashboard`, `points`, `streak`, `leaderboard`, `intelligence`, `achievements`
- Point claim approved → wallet + dashboard + leaderboard + celebration toast
- Achievement unlocked → toast + profile + leaderboard badge refresh
- Event register → dashboard upcoming + calendar reminder
- Supabase Realtime subscription on `notifications`, `points_ledger`, `attendance_records` at shell level so any screen reflects updates live

## Phase 5 — Contextual FAB + Deep-Link Cards

- Single `<ContextualFAB />` in shell; action changes by route:
  - Dashboard → Quick Action sheet
  - Attendance → Scan QR
  - Events → Add Reminder
  - Documents → Upload
  - Profile → Edit
- Audit dashboard cards → every card gets `onClick` deep-link to its detail page (no dead ends)
- Every notification payload includes a `deep_link` field routed by a single handler

## Phase 6 — Faculty / Admin / Super-Admin Parity

Apply the same shell pattern (persistent nav, contextual FAB, cross-module invalidation, global search) to the other three roles. Their sidebars stay, but transitions, back-stack, and reactivity match the student experience.

---

## Technical Notes

- No DB migrations. All changes are frontend routing + state.
- Existing routes stay valid (backward compatible for bookmarks / push deep links).
- New files: `src/layout/AppShellMobile.tsx`, `src/layout/TabStack.tsx`, `src/hooks/useAppEvents.ts`, `src/hooks/useNavStack.ts`, `src/components/shell/ContextualFAB.tsx`, `src/components/search/GlobalSearch.tsx`.
- Bottom nav config moves into `src/ui-engine/navigation-engine.ts`.

---

## Ask

Approve to start **Phase 1** now? Or reorder / drop phases? I recommend 1 → 4 → 3 → 5 → 2 → 6 for maximum perceived "aliveness" per phase.
