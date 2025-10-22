-- Security Hardening Migration
-- This migration adds comprehensive security features

-- Create security logs table for audit trail
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create rate limiting table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, action, window_start)
);

-- Create file uploads table with security metadata
CREATE TABLE public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_name TEXT NOT NULL,
  secure_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  checksum TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  scan_status TEXT DEFAULT 'pending', -- 'pending', 'clean', 'infected', 'error'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user sessions table for better session management
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create account lockout table
CREATE TABLE public.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 1,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, email)
);

-- Add security columns to existing tables
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public', -- 'public', 'friends', 'private'
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS security_questions JSONB;

-- Add security columns to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add security columns to messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Enable RLS for new security tables
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_logs
CREATE POLICY "Users can view their own security logs"
ON public.security_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert security logs"
ON public.security_logs FOR INSERT
WITH CHECK (true);

-- RLS Policies for rate_limits
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
ON public.rate_limits FOR ALL
WITH CHECK (true);

-- RLS Policies for file_uploads
CREATE POLICY "Users can view their own file uploads"
ON public.file_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files"
ON public.file_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.file_uploads FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for account_lockouts
CREATE POLICY "Users can view their own lockout status"
ON public.account_lockouts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage account lockouts"
ON public.account_lockouts FOR ALL
WITH CHECK (true);

-- Enhanced RLS Policies for existing tables

-- Update profiles policies to respect privacy levels
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable based on privacy settings"
ON public.profiles FOR SELECT
USING (
  privacy_level = 'public' OR 
  (privacy_level = 'friends' AND auth.uid() = id) OR
  auth.uid() = id
);

-- Add content validation policies
CREATE POLICY "Tasks must have valid content"
ON public.tasks FOR INSERT
WITH CHECK (
  LENGTH(title) >= 3 AND LENGTH(title) <= 120 AND
  LENGTH(description) >= 10 AND LENGTH(description) <= 2000 AND
  budget >= 20 AND budget <= 200
);

CREATE POLICY "Messages must have valid content"
ON public.messages FOR INSERT
WITH CHECK (
  LENGTH(message) >= 1 AND LENGTH(message) <= 1000
);

-- Create functions for security operations

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = p_user_id 
    AND action = p_action 
    AND window_start >= window_start;
  
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, action, count, window_start)
  VALUES (p_user_id, p_action, 1, now())
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$;

-- Function to check account lockout
CREATE OR REPLACE FUNCTION public.check_account_lockout(
  p_user_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lockout_record RECORD;
BEGIN
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE user_id = p_user_id AND email = p_email;
  
  IF lockout_record IS NULL THEN
    RETURN TRUE; -- No lockout
  END IF;
  
  IF lockout_record.locked_until IS NOT NULL AND lockout_record.locked_until > now() THEN
    RETURN FALSE; -- Account is locked
  END IF;
  
  RETURN TRUE; -- Account is not locked
END;
$$;

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event TEXT,
  p_details JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_logs (event, details, user_id)
  VALUES (p_event, p_details, p_user_id);
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_timestamp ON public.security_logs(timestamp);
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action);
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_account_lockouts_user_email ON public.account_lockouts(user_id, email);

-- Retention job: purge old security data to reduce storage and costs
-- Function to purge old records
CREATE OR REPLACE FUNCTION public.purge_old_security_data()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.security_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '7 days';
  DELETE FROM public.user_sessions WHERE is_active = false AND expires_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Schedule daily run using Supabase pg_cron (if enabled)
-- Requires: extensions cron
-- SELECT cron.schedule('purge_old_security_data_daily', '0 3 * * *', $$SELECT public.purge_old_security_data();$$);

-- Create triggers for automatic security logging
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'profile_updated',
      jsonb_build_object(
        'old_values', to_jsonb(OLD),
        'new_values', to_jsonb(NEW)
      ),
      NEW.id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER profile_changes_log
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();

-- Create trigger for task moderation
CREATE OR REPLACE FUNCTION public.flag_suspicious_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for suspicious patterns
  IF LENGTH(NEW.title) < 3 OR LENGTH(NEW.description) < 10 THEN
    NEW.is_flagged := TRUE;
    NEW.flag_reason := 'Insufficient content';
  END IF;
  
  -- Check for spam patterns
  IF NEW.title ~* '(free|urgent|click here|limited time)' THEN
    NEW.is_flagged := TRUE;
    NEW.flag_reason := 'Potential spam keywords';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER task_content_check
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.flag_suspicious_tasks();
