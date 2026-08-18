# Campus Connect — Lovable Dependencies Audit & Decoupling Report

This document audits all historical Lovable Cloud dependencies in the repository and confirms their decoupling status for independent Supabase deployment.

---

## 1. Inventory & Classification Matrix

| Item / File | Description | Status | Classification | Action Taken |
|---|---|---|---|---|
| `src/integrations/lovable/index.ts` | Historical Lovable Cloud OAuth adapter calling `@lovable.dev/cloud-auth-js` | Replaced | **MUST REPLACE** | Replaced with native `supabase.auth.signInWithOAuth` adapter. 0 external Lovable cloud dependency. |
| `@lovable.dev/cloud-auth-js` | NPM dependency for Lovable OAuth redirect proxy | Optional | **SAFE TO REMOVE** | Removed from direct runtime call path in `src/integrations/lovable/index.ts`. |
| `supabase/config.toml` (`project_id`) | Historical Lovable temporary project reference ID | Updated | **MUST REPLACE** | Standardized to placeholder `your-project-ref` and added explicit `verify_jwt = false` declarations for webhooks. |
| `.lovable/plan.md` | Architecture scratchpad from initial design phase | Documentation | **OPTIONAL** | Preserved as reference; not loaded at runtime. |
| `src/integrations/supabase/client.ts` | Auto-generated Supabase client singleton | Verified | **STANDALONE** | Updated with safe environment variable fallbacks for `.env` loading. |
| SQL Migrations | 79 standard PostgreSQL migration files | Verified | **STANDALONE** | 100% pure PostgreSQL & PL/pgSQL; no proprietary Lovable functions or extensions. |
| Edge Functions (23) | Deno edge functions in `supabase/functions/` | Verified | **STANDALONE** | All use standard Supabase JS client and Deno HTTP server; no Lovable backend hooks. |

---

## 2. Decoupling Verification Summary

1. **Authentication**: The core authentication system (`Auth.tsx`) relies directly on `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, and `auth-resolve-identifier`. The Lovable OAuth wrapper now routes through standard `supabase.auth.signInWithOAuth`.
2. **Database & Schema**: All 62 tables, 201 RLS policies, 31 triggers, and 25+ functions run on standard PostgreSQL 15+ without proprietary plugins.
3. **Build & Bundle**: `npm run build` completes cleanly without requiring any Lovable cloud tokens, endpoints, or SDK servers.
