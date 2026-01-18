-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create profiles table (extends auth.users with additional fields)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  student_id TEXT,
  department TEXT,
  class_name TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create lectures table
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  lecture_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT NOT NULL,
  flyer_object_path TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create attendance_tokens table
CREATE TABLE public.attendance_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  used_count INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent')) NOT NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  points_earned INTEGER DEFAULT 0 NOT NULL,
  UNIQUE(lecture_id, student_user_id)
);

-- Create points_ledger table
CREATE TABLE public.points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  source TEXT CHECK (source IN ('attendance', 'manual', 'event')) NOT NULL,
  source_id UUID,
  note TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_role app_role,
  target_user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create notification_recipients table
CREATE TABLE public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(notification_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_lectures_date ON public.lectures(lecture_date);
CREATE INDEX idx_attendance_lecture_id ON public.attendance(lecture_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_user_id);
CREATE INDEX idx_points_ledger_user_id ON public.points_ledger(user_id);
CREATE INDEX idx_notification_recipients_user_id ON public.notification_recipients(user_id);

-- Create helper functions
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'student'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = check_user_id AND is_deleted = FALSE
  );
$$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at
  BEFORE UPDATE ON public.lectures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view active profiles"
  ON public.profiles FOR SELECT
  USING (is_active_user(user_id) OR is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role, admins view all"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for lectures
CREATE POLICY "Active users can view lectures"
  ON public.lectures FOR SELECT
  USING (is_active_user(auth.uid()));

CREATE POLICY "Only admins can manage lectures"
  ON public.lectures FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update lectures"
  ON public.lectures FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete lectures"
  ON public.lectures FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for attendance_tokens
CREATE POLICY "Only admins can view tokens"
  ON public.attendance_tokens FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can create tokens"
  ON public.attendance_tokens FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update tokens"
  ON public.attendance_tokens FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete tokens"
  ON public.attendance_tokens FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for attendance
CREATE POLICY "Users can view own attendance, admins view all"
  ON public.attendance FOR SELECT
  USING (student_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Students can mark own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (student_user_id = auth.uid() AND is_active_user(auth.uid()));

CREATE POLICY "Admins can update attendance"
  ON public.attendance FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete attendance"
  ON public.attendance FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for points_ledger
CREATE POLICY "Users can view own points, admins view all"
  ON public.points_ledger FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "System can insert attendance points"
  ON public.points_ledger FOR INSERT
  WITH CHECK (source = 'attendance' OR is_admin(auth.uid()));

CREATE POLICY "Admins can update points"
  ON public.points_ledger FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete points"
  ON public.points_ledger FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications, admins view all"
  ON public.notifications FOR SELECT
  USING (target_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Only admins can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for notification_recipients
CREATE POLICY "Users can view own notification receipts"
  ON public.notification_recipients FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update own notification read status"
  ON public.notification_recipients FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notification receipts"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (TRUE);

-- Create storage bucket for lecture flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-flyers', 'lecture-flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lecture flyers
CREATE POLICY "Public can view lecture flyers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lecture-flyers');

CREATE POLICY "Admins can upload lecture flyers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lecture-flyers' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update lecture flyers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lecture-flyers' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete lecture flyers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lecture-flyers' AND is_admin(auth.uid()));