# Campus Connect — Scheduled Jobs & Background Processes

> **CRITICAL RECONCILIATION FINDING**:  
> **SCHEDULED JOBS CURRENTLY ACTIVE IN SQL = 0**  
> Migrations enable the `pg_cron` and `pg_net` extensions, but no `cron.schedule` statements are committed in SQL. All scheduled background tasks must be manually configured in the new independent Supabase instance.

---

## 1. Background Jobs Specification

| Job Name | Purpose | Target Function | Required Frequency | Required Secret / Auth | Recommended Supabase Configuration | Status |
|---|---|---|---|---|---|---|
| **Notification Scheduler** | Dispatches queued push & in-app notifications | `notification-scheduler` Edge Function | Every 1 minute (`* * * * *`) | `NOTIFICATION_CRON_SECRET` (Header: `x-cron-secret`) | `pg_cron` calling Edge Function via `pg_net` or external webhook | **MANUAL CONFIGURATION REQUIRED** |
| **Attendance Auto-Finalize** | Closes expired lecture attendance windows and confirms points | `finalize-attendance` Edge Function | Every 15 minutes (`*/15 * * * *`) | `SUPABASE_SERVICE_ROLE_KEY` | `pg_cron` calling Edge Function via `pg_net` | **MANUAL CONFIGURATION REQUIRED** |
| **Daily Streak Invalidation** | Resets broken check-in streaks for inactive students | SQL statement | Daily at 00:05 UTC (`5 0 * * *`) | Service Role / Database internal | Direct `pg_cron` SQL query | **MANUAL CONFIGURATION REQUIRED** |

---

## 2. Supabase Setup SQL for pg_cron
*(Run in the Supabase SQL Editor after project creation and Edge Function deployment)*

```sql
-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Schedule 1-Minute Notification Dispatcher
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

-- 3. Schedule Daily Streak Cleanup
SELECT cron.schedule(
  'reset-broken-streaks',
  '5 0 * * *',
  $$
  UPDATE public.student_streaks
  SET current_streak = 0
  WHERE last_checkin_date < CURRENT_DATE - INTERVAL '1 day'
    AND current_streak > 0;
  $$
);
```

---

## 3. Alternative: External Cron Trigger
If you prefer not to use `pg_cron`, configure an external scheduler (e.g. Cloud Scheduler, GitHub Actions, or cron-job.org) to execute an HTTP POST to:
- **URL**: `https://<your-project-ref>.supabase.co/functions/v1/notification-scheduler`
- **Headers**: `x-cron-secret: <your-secure-random-cron-secret>`
- **Interval**: 1 minute
