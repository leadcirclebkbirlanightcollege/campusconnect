# Campus Connect — Independent Supabase Production Setup Guide

Follow this guide to provision and deploy a production-grade Campus Connect backend onto an independent Supabase organization.

---

## 1. Prerequisites

- [Node.js 20+](https://nodejs.org) and `npm`
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase` or use `npx supabase`
- [PostgreSQL Client (`psql`)](https://www.postgresql.org/download/) (optional for direct SQL seeding)
- A Supabase Account with a newly created empty project

---

## 2. Step-by-Step Setup Procedure

### Step 1: Initialize Supabase CLI Authentication
```bash
npx supabase login
```

### Step 2: Link Your Repository to the New Project
```bash
npx supabase link --project-ref <your-supabase-project-ref>
```

---

### Step 3: Apply All 79 Database Migrations
Execute the migrations in sequential timestamp order:
```bash
npx supabase db push
```
*Note*: This runs every migration in `supabase/migrations/`, constructing all 62 tables, RLS policies, triggers, and security functions.

---

### Step 4: Apply Reference Seed Data
Populate required platform defaults (Points rules, Platform settings, Gamification badges, Sub-role permissions):
```bash
psql "<SUPABASE_DATABASE_DIRECT_CONNECTION_STRING>" -f supabase/seed.sql
```
*(You can obtain your database connection string under **Project Settings > Database**).*

---

### Step 5: Configure Storage Buckets & Policies
In the Supabase Dashboard (**Storage > New Bucket**) or via SQL editor, create the 4 required buckets:

```sql
-- 1. Lecture Flyers (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lecture-flyers', 'lecture-flyers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Documents (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/zip', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- 3. Verify Documents (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verify-documents', 'verify-documents', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 4. Submissions (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('submissions', 'submissions', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/zip', 'text/plain'])
ON CONFLICT (id) DO NOTHING;
```

---

### Step 6: Configure Edge Function Secrets
Set your production secrets:
```bash
npx supabase secrets set \
  SETUP_SECRET="<generate-random-token-32-chars>" \
  NOTIFICATION_CRON_SECRET="<generate-random-token-32-chars>" \
  VAPID_PUBLIC_KEY="<your-vapid-public-key>" \
  VAPID_PRIVATE_KEY="<your-vapid-private-key>" \
  VAPID_SUBJECT="mailto:admin@yourcollege.edu" \
  ADMIN_EMAIL="admin@yourcollege.edu" \
  ADMIN_PASSWORD="<secure-initial-password>" \
  SUPER_ADMIN_EMAIL="superadmin@yourcollege.edu" \
  SUPER_ADMIN_PASSWORD="<secure-initial-password>"
```

---

### Step 7: Deploy All 23 Edge Functions
```bash
# Public & Webhook functions (no JWT validation on gateway)
npx supabase functions deploy --no-verify-jwt auth-resolve-identifier
npx supabase functions deploy --no-verify-jwt health-check
npx supabase functions deploy --no-verify-jwt notification-scheduler
npx supabase functions deploy --no-verify-jwt ensure-admin-account
npx supabase functions deploy --no-verify-jwt bootstrap-clean-reset

# Authenticated Application Functions
npx supabase functions deploy send-notification
npx supabase functions deploy subscribe-web-push
npx supabase functions deploy generate-vapid-keys
npx supabase functions deploy mark-attendance
npx supabase functions deploy admin-generate-attendance
npx supabase functions deploy admin-update-attendance
npx supabase functions deploy finalize-attendance
npx supabase functions deploy lecture-status-notify
npx supabase functions deploy super-admin-create-admin
npx supabase functions deploy super-admin-reset-students
npx supabase functions deploy admin-reset-college-students
npx supabase functions deploy admin-create-student
npx supabase functions deploy admin-adjust-points
npx supabase functions deploy admin-backfill-user-roles
npx supabase functions deploy academic-promote-students
npx supabase functions deploy daily-checkin
npx supabase functions deploy retention-on-login
npx supabase functions deploy update-user-email
```

---

### Step 8: Enable Realtime Replication
Run in SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_polls;
```

---

### Step 9: Bootstrap Initial Super Admin & College Admin Accounts
Invoke the `ensure-admin-account` Edge Function:
```bash
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/ensure-admin-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_SETUP_SECRET>"
```

---

### Step 10: Configure Frontend Environment Variables & Build
Create `.env` in the project root:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

Build the static distribution:
```bash
npm run build
```

---

### Step 11: Production Verification & Smoke Test
1. Visit the deployed application URL.
2. Sign in with the bootstrap Super Admin credentials.
3. Access `/platform/admin-control/dashboard` and verify tenant listing.
4. Create an institution college tenant and add departments and programmes.
5. Create a student account and test QR attendance marking.
