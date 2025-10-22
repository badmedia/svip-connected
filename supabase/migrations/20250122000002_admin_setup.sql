-- Admin setup: add is_admin flag and policies for admin-only access

-- Add is_admin to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create a helper function to check admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = uid), FALSE);
$$;

-- Example admin-only view over security logs (optional)
-- Enforce RLS: only admins can read
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own security logs" ON public.security_logs;
CREATE POLICY "Admins can view security logs"
ON public.security_logs FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admin can also manage rate limits, sessions, account lockouts
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.rate_limits;
CREATE POLICY "Admins can view rate limits"
ON public.rate_limits FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Admins can view user sessions"
ON public.user_sessions FOR SELECT
USING (public.is_admin(auth.uid()));

-- Keep insert policies for system as before; only select is restricted to admins


