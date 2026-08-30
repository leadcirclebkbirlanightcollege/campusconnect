-- Fix: Add missing `kind` and `lecture_id` columns to notifications table.
-- These columns were referenced by application code and trigger functions
-- (notify_on_lecture_created, notify_on_assignment_created, notify_on_result_published)
-- but were never added via a migration, causing:
--   "column 'kind' of relation 'notifications' does not exist"
-- when creating a lecture (which fires the trigger).

-- 1. Add the `kind` column (TEXT, optional, defaults to 'general')
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'general';

-- 2. Add the `lecture_id` column (UUID FK to lectures, optional)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL;

-- 3. Add an index on lecture_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notifications_lecture_id ON public.notifications(lecture_id);

-- 4. Re-create the trigger functions using the now-existing `kind` column
--    (CREATE OR REPLACE handles the case where they already exist)

CREATE OR REPLACE FUNCTION public.notify_on_lecture_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (title, body, kind, created_by, status, sent_at, lecture_id)
  VALUES (
    'New Lecture: ' || NEW.topic,
    'A new lecture has been scheduled for ' || NEW.lecture_date::text || ' at ' || NEW.start_time::text || ' in ' || NEW.venue,
    'lecture_reminder',
    NEW.created_by,
    'sent',
    NOW(),
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (title, body, kind, created_by, status, sent_at)
  VALUES (
    'New Assignment: ' || NEW.title,
    'A new assignment has been posted. Due date: ' || NEW.due_date::text,
    'general',
    NEW.created_by,
    'sent',
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_result_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (title, body, kind, created_by, status, sent_at, target_user_id)
  VALUES (
    'Exam Result Published',
    'Your result has been published. Check your results page.',
    'general',
    NEW.entered_by,
    'sent',
    NOW(),
    NEW.student_user_id
  );
  RETURN NEW;
END;
$$;
