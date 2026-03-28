
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.attendance
  ADD CONSTRAINT fk_attendance_student_profile
  FOREIGN KEY (student_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_attendance_student_user_id ON public.attendance(student_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
