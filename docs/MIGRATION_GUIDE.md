# Campus Connect — Independent Supabase Migration Guide

This step-by-step guide walks you through deploying the Campus Connect backend to an independently managed Supabase project.

---

## Pre-Requisites
1. Node.js 18+ and npm installed.
2. Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```
3. A new, empty Supabase project created on [supabase.com](https://supabase.com).

---

## Step 1: Link Your Project CLI
In the repository root, login and link your new project:
```bash
supabase login
supabase link --project-ref <your-supabase-project-id>
```

---

## Step 2: Apply All 79 Database Migrations
Push the complete schema, tables, triggers, and RLS policies:
```bash
supabase db push
```
*Result: Recreates all 62 active tables, 48 functions, and 201 RLS policies.*

---

## Step 3: Seed Default System Reference Data
Execute the idempotent seed file:
```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```
*Result: Provisions initial platform settings, achievements catalog, branding, and permissions.*

---

## Step 4: Storage Bucket Configuration
*(MANUAL CONFIGURATION REQUIRED)*

1. Navigate to **Storage** in the Supabase Dashboard.
2. Verify / Create the 4 buckets:
   - **`lecture-flyers`** → Set to **Public**
   - **`documents`** → Set to **Public**
   - **`submissions`** → Set to **Private**
   - **`verify-documents`** → Set to **Private** *(Must be manually created if not created automatically)*

---

## Step 5: Configure Edge Function Secrets
Set the required runtime secrets in your Supabase project:
```bash
supabase secrets set \
  SETUP_SECRET="<your-secure-random-setup-secret>" \
  NOTIFICATION_CRON_SECRET="<your-secure-random-cron-secret>" \
  VAPID_PUBLIC_KEY="<your-vapid-public-key>" \
  VAPID_PRIVATE_KEY="<your-vapid-private-key>" \
  VAPID_SUBJECT="mailto:admin@yourcollege.edu" \
  ADMIN_EMAIL="admin@yourcollege.edu" \
  ADMIN_PASSWORD="<your-initial-admin-password>" \
  SUPER_ADMIN_EMAIL="superadmin@yourcollege.edu" \
  SUPER_ADMIN_PASSWORD="<your-initial-super-admin-password>"
```

---

## Step 6: Deploy Edge Functions
Deploy all 23 Edge Functions:
```bash
supabase functions deploy
```

---

## Step 7: Bootstrap Root Administrator Accounts
Invoke the idempotent bootstrapping function using your `SETUP_SECRET`:
```bash
curl -X POST "https://<your-project-ref>.supabase.co/functions/v1/ensure-admin-account" \
  -H "x-setup-secret: <your-secure-random-setup-secret>" \
  -H "Content-Type: application/json"
```

---

## Step 8: Configure Scheduled Jobs (pg_cron)
*(MANUAL CONFIGURATION REQUIRED)*

Enable `pg_cron` and `pg_net` in the Supabase SQL Editor and register the recurring notification scheduler:
```sql
-- Register 1-minute background notification dispatcher
SELECT cron.schedule(
  'dispatch-scheduled-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/notification-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<your-secure-random-cron-secret>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Step 9: Configure Frontend Environment & Build
1. In your deployment platform (Vercel, Cloud Run, Netlify), configure:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
   VITE_SUPABASE_PROJECT_ID=<your-project-ref>
   ```
2. Build the production application:
   ```bash
   npm run build
   ```
