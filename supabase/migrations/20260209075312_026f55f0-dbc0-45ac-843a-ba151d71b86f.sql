-- Create programmes table
CREATE TABLE public.programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create student programme allotments table
CREATE TABLE public.student_programme_allotments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL,
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  allotted_by uuid NOT NULL,
  allotted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_user_id, programme_id)
);

-- Create lecture programme tags table (many-to-many)
CREATE TABLE public.lecture_programme_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  tagged_by uuid NOT NULL,
  tagged_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (lecture_id, programme_id)
);

-- Enable RLS
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_programme_allotments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_programme_tags ENABLE ROW LEVEL SECURITY;

-- Programmes RLS policies
CREATE POLICY "Active users can view programmes"
  ON public.programmes FOR SELECT
  USING (is_active_user(auth.uid()) AND is_active = true);

CREATE POLICY "Admins can manage programmes"
  ON public.programmes FOR ALL
  USING (is_admin(auth.uid()));

-- Student programme allotments RLS policies
CREATE POLICY "Students can view own allotments"
  ON public.student_programme_allotments FOR SELECT
  USING (student_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage allotments"
  ON public.student_programme_allotments FOR ALL
  USING (is_admin(auth.uid()));

-- Lecture programme tags RLS policies
CREATE POLICY "Active users can view lecture tags"
  ON public.lecture_programme_tags FOR SELECT
  USING (is_active_user(auth.uid()));

CREATE POLICY "Admins can manage lecture tags"
  ON public.lecture_programme_tags FOR ALL
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at on programmes
CREATE TRIGGER update_programmes_updated_at
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_student_programme_allotments_student ON public.student_programme_allotments(student_user_id);
CREATE INDEX idx_student_programme_allotments_programme ON public.student_programme_allotments(programme_id);
CREATE INDEX idx_lecture_programme_tags_lecture ON public.lecture_programme_tags(lecture_id);
CREATE INDEX idx_lecture_programme_tags_programme ON public.lecture_programme_tags(programme_id);