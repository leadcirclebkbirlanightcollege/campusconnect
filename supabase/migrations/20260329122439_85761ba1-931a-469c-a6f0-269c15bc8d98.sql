
-- Trigger: Auto-create notification when a lecture is created
CREATE OR REPLACE FUNCTION public.notify_on_lecture_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (title, body, kind, created_by, status, sent_at)
  VALUES (
    'New Lecture: ' || NEW.topic,
    'A new lecture has been scheduled for ' || NEW.lecture_date::text || ' at ' || NEW.start_time::text || ' in ' || NEW.venue,
    'lecture_reminder',
    NEW.created_by,
    'sent',
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lecture_created
AFTER INSERT ON public.lectures
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_lecture_created();

-- Trigger: Auto-create notification when assignment is created
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

CREATE TRIGGER trg_notify_assignment_created
AFTER INSERT ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_assignment_created();

-- Trigger: Auto-create notification when exam results are published
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

CREATE TRIGGER trg_notify_result_published
AFTER INSERT ON public.exam_results
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_result_published();
