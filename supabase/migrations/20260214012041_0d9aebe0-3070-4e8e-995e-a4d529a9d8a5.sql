
-- Fix overly permissive policies on student_intelligence
DROP POLICY IF EXISTS "Service insert intelligence" ON public.student_intelligence;
DROP POLICY IF EXISTS "Service update intelligence" ON public.student_intelligence;

-- Fix overly permissive policies on student_flags  
DROP POLICY IF EXISTS "Service insert flags" ON public.student_flags;
DROP POLICY IF EXISTS "Service update flags" ON public.student_flags;
