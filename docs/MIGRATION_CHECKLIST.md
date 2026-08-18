# Campus Connect — Production Migration Checklist

Use this checklist to ensure all components of the Campus Connect system are deployed and operating correctly on your independent Supabase production environment.

---

## 1. Database & Schema
- [ ] Supabase CLI linked to target project (`npx supabase link --project-ref <ref>`)
- [ ] All 79 migrations applied sequentially without error (`npx supabase db push`)
- [ ] All 62 tables confirmed present in `public` schema
- [ ] `supabase/seed.sql` executed and default reference rows seeded
- [ ] Composite indexes verified on `attendance(lecture_id, student_user_id)` and `attendance(marked_at)`

## 2. Row-Level Security (RLS)
- [ ] RLS enabled on all 62 tables
- [ ] Security Definer helper functions created with `SET search_path = public`
- [ ] Multi-tenant isolation verified: User from College A cannot query College B records
- [ ] Super Admin bypass verified: Super Admin can query and manage all colleges
- [ ] Student role restrictions verified: Students cannot self-credit points or adjust attendance

## 3. Storage Buckets
- [ ] Bucket `lecture-flyers` created (Public, 5MB limit, image types allowed)
- [ ] Bucket `documents` created (Public, 50MB limit, documents & images allowed)
- [ ] Bucket `verify-documents` created (Private, 20MB limit, PDF only)
- [ ] Bucket `submissions` created (Private, 20MB limit, docs & images allowed)
- [ ] Storage RLS policies active for authenticated staff and student folders

## 4. Edge Functions & Secrets
- [ ] All 23 Edge Functions deployed to Supabase project
- [ ] Gateway JWT verification bypassed for public/webhook functions (`auth-resolve-identifier`, `health-check`, `notification-scheduler`, `ensure-admin-account`, `bootstrap-clean-reset`)
- [ ] Secret `SETUP_SECRET` configured (min 32 random characters)
- [ ] Secret `NOTIFICATION_CRON_SECRET` configured (min 32 random characters)
- [ ] Secret `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY` configured
- [ ] Secret `VAPID_SUBJECT` configured (`mailto:...`)
- [ ] Secret `ADMIN_EMAIL` & `ADMIN_PASSWORD` configured
- [ ] Secret `SUPER_ADMIN_EMAIL` & `SUPER_ADMIN_PASSWORD` configured

## 5. Authentication & Initial Accounts
- [ ] Initial Super Admin account created and verified via `ensure-admin-account`
- [ ] Initial College Admin account verified
- [ ] Student ID identifier login verified (`auth-resolve-identifier`)
- [ ] Email/Password login, logout, and token auto-refresh verified in browser

## 6. Realtime Subscriptions
- [ ] Realtime publication enabled for `attendance`, `notification_recipients`, `messages`, `announcements`
- [ ] Live attendance counter updates in real time on faculty/admin dashboard
- [ ] In-app notification bell count updates on incoming notification

## 7. Background & Scheduled Jobs
- [ ] `notification-scheduler` cron job scheduled (via Postgres `pg_cron` or external scheduler)
- [ ] Daily streak audit job scheduled

## 8. Frontend Environment & Build
- [ ] `.env` populated with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- [ ] `npm run build` succeeds with 0 errors
- [ ] Static files deployed to web hosting (Vercel, Cloudflare Pages, Firebase Hosting, or Cloud Run)

## 9. Mobile & PWA
- [ ] PWA manifest (`manifest.json`) and service worker (`public/sw.js`) active
- [ ] Android Capacitor build updated with production Supabase URL

## 10. Backup & Rollback
- [ ] Automated daily Supabase PostgreSQL database backups enabled
- [ ] Point-in-time recovery (PITR) enabled for enterprise deployment
- [ ] Rollback strategy and snapshot tested
