# Campus Connect — Environment Variables Specification

This document details every environment variable used by the frontend application and backend Supabase Edge Functions.

---

## 1. Client-Side Public Variables (`VITE_*`)

These variables are consumed by Vite during development and bundled directly into static JavaScript files during `npm run build`. They are visible to anyone inspecting browser network traffic.

| Variable Name | Required | Purpose | Example Value |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Fully qualified URL of the Supabase API Gateway | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Anonymous public API key (`anon` role) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_PROJECT_ID` | **Yes** | Supabase project reference identifier | `xyzproject` |

> **Security Warning**: NEVER add service-role keys, database passwords, or cron secrets to `VITE_*` variables.

---

## 2. Server-Only Secrets (Supabase Edge Functions)

These secrets are configured directly on the Supabase project using the Supabase CLI (`npx supabase secrets set`) or the Supabase Management Dashboard (**Project Settings > Edge Functions > Secrets**). They are accessible inside Deno Edge Functions via `Deno.env.get("KEY")`.

| Secret Name | Required By | Purpose | Security Classification |
|---|---|---|---|
| `SUPABASE_URL` | Automatic / Edge runtime | Injected automatically by Supabase runtime | System Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative functions | Injected automatically or manually set; grants full database bypass access | **CRITICAL: NEVER EXPOSE** |
| `SETUP_SECRET` | `ensure-admin-account`, `bootstrap-clean-reset` | Shared secret token passed as `Bearer <SETUP_SECRET>` to trigger admin account provisioning | High Secret |
| `NOTIFICATION_CRON_SECRET` | `notification-scheduler` | Shared secret token passed by background cron jobs to authorize scheduled push dispatches | High Secret |
| `VAPID_PUBLIC_KEY` | `send-notification` | Base64URL-encoded P-256 public key for Web Push protocol | Public configuration |
| `VAPID_PRIVATE_KEY` | `send-notification` | Base64URL-encoded PKCS#8 private key for signing Web Push JWTs | **CRITICAL: PRIVATE KEY** |
| `VAPID_SUBJECT` | `send-notification` | Contact URI (e.g. `mailto:admin@yourcollege.edu`) for Web Push servers | Configuration |
| `ADMIN_EMAIL` | `ensure-admin-account`, `bootstrap-clean-reset` | Root college administrator email | Admin Configuration |
| `ADMIN_PASSWORD` | `ensure-admin-account`, `bootstrap-clean-reset` | Initial password for the root college administrator | High Secret |
| `SUPER_ADMIN_EMAIL` | `ensure-admin-account`, `bootstrap-clean-reset` | Root platform super administrator email | Admin Configuration |
| `SUPER_ADMIN_PASSWORD` | `ensure-admin-account`, `bootstrap-clean-reset` | Initial password for the root super administrator | High Secret |

---

## 3. How to Configure in Supabase

### Setting Edge Function Secrets via CLI
```bash
npx supabase secrets set \
  SETUP_SECRET="f3c2a9d8e1b407264a938c71b052e4d9a1c8b7e6f5" \
  NOTIFICATION_CRON_SECRET="8b9c4d2e1a7056f3a8b2c1d0e9f8a7b6c5d4e3f2" \
  VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJuBT30WJmgxodFiAiqWFLhkC5Y" \
  VAPID_PRIVATE_KEY="MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg..." \
  VAPID_SUBJECT="mailto:admin@campusconnect.edu" \
  ADMIN_EMAIL="admin@campusconnect.edu" \
  ADMIN_PASSWORD="SecureAdminPassword123!"
```

### Setting Frontend Variables
Create a local `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Populate `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`.
