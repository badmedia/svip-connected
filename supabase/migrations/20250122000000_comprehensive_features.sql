-- Comprehensive Features Migration
-- This migration adds all the new features to the SVIP Connect app

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'task_alert', 'chat_message', 'endorsement', 'achievement', 'trust_milestone'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data for the notification
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'helping', 'trust', 'skills', 'community'
  requirements JSONB NOT NULL, -- Criteria to unlock the achievement
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- Create study_groups table
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  college TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  max_members INTEGER DEFAULT 10,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create study_group_members table
CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create study_sessions table
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  meeting_link TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create study_session_attendees table
CREATE TABLE public.study_session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'attending', 'declined'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(session_id, user_id)
);

-- Create resources table for sharing study materials
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT, -- 'pdf', 'image', 'document', 'link'
  subject TEXT,
  tags TEXT[],
  shared_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create trust_score_history table
CREATE TABLE public.trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  change_reason TEXT NOT NULL, -- 'endorsement', 'task_completion', 'helping', 'penalty'
  related_task_id UUID REFERENCES public.tasks(id),
  related_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create saved_searches table
CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  search_filters JSONB NOT NULL, -- Store search criteria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create reports table for moderation
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notifications JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  search_preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add new columns to existing tables
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_help_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_help_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS achievement_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_documents JSONB,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS study_subjects TEXT[];

-- Add new columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS study_group_id UUID REFERENCES public.study_groups(id);

-- Add new columns to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text', -- 'text', 'file', 'image', 'voice'
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Enable RLS for all new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements FOR SELECT
USING (true);

CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for study groups
CREATE POLICY "Study groups are viewable by everyone"
ON public.study_groups FOR SELECT
USING (true);

CREATE POLICY "Users can create study groups"
ON public.study_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own study groups"
ON public.study_groups FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for study group members
CREATE POLICY "Study group members are viewable by group members"
ON public.study_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.study_group_members sm
    WHERE sm.group_id = study_group_members.group_id
    AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join study groups"
ON public.study_group_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for resources
CREATE POLICY "Resources are viewable by everyone if public"
ON public.resources FOR SELECT
USING (is_public = true OR auth.uid() = shared_by);

CREATE POLICY "Users can create resources"
ON public.resources FOR INSERT
WITH CHECK (auth.uid() = shared_by);

-- RLS Policies for trust score history
CREATE POLICY "Users can view their own trust score history"
ON public.trust_score_history FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for saved searches
CREATE POLICY "Users can manage their own saved searches"
ON public.saved_searches FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

-- RLS Policies for user preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences FOR ALL
USING (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, requirements, points) VALUES
('First Helper', 'Help your first student', '🎯', 'helping', '{"help_count": 1}', 10),
('Trust Builder', 'Reach 50 trust score', '⭐', 'trust', '{"trust_score": 50}', 25),
('Skill Master', 'Complete 10 tasks in one skill category', '🏆', 'skills', '{"category_tasks": 10}', 30),
('Community Champion', 'Help 25 students', '👑', 'community', '{"help_count": 25}', 50),
('Study Buddy', 'Join your first study group', '📚', 'community', '{"study_groups": 1}', 15),
('Perfect Helper', 'Get 5-star rating on 10 tasks', '🌟', 'helping', '{"perfect_ratings": 10}', 40),
('Early Bird', 'Complete 5 tasks within 24 hours of posting', '🐦', 'helping', '{"quick_completions": 5}', 20),
('Mentor', 'Help 50 students', '🎓', 'community', '{"help_count": 50}', 75),
('Trust Legend', 'Reach 100 trust score', '💎', 'trust', '{"trust_score": 100}', 100),
('Super Helper', 'Help 100 students', '🚀', 'community', '{"help_count": 100}', 150);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_study_groups_college ON public.study_groups(college);
CREATE INDEX idx_study_groups_subject ON public.study_groups(subject);
CREATE INDEX idx_study_sessions_group_id ON public.study_sessions(group_id);
CREATE INDEX idx_study_sessions_scheduled_at ON public.study_sessions(scheduled_at);
CREATE INDEX idx_resources_subject ON public.resources(subject);
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags);
CREATE INDEX idx_trust_score_history_user_id ON public.trust_score_history(user_id);
CREATE INDEX idx_tasks_tags ON public.tasks USING GIN(tags);
CREATE INDEX idx_tasks_location ON public.tasks(location);
CREATE INDEX idx_tasks_difficulty ON public.tasks(difficulty_level);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;

-- Create function to update trust score
CREATE OR REPLACE FUNCTION public.update_trust_score(
  user_id UUID,
  change_amount INTEGER,
  reason TEXT,
  related_task_id UUID DEFAULT NULL,
  related_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_score INTEGER;
  new_score INTEGER;
BEGIN
  -- Get current trust score
  SELECT trust_score INTO current_score
  FROM public.profiles
  WHERE id = user_id;
  
  -- Calculate new score (minimum 0, maximum 1000)
  new_score := GREATEST(0, LEAST(1000, current_score + change_amount));
  
  -- Update trust score
  UPDATE public.profiles
  SET trust_score = new_score
  WHERE id = user_id;
  
  -- Record the change
  INSERT INTO public.trust_score_history (
    user_id, old_score, new_score, change_reason, related_task_id, related_user_id
  ) VALUES (
    user_id, current_score, new_score, reason, related_task_id, related_user_id
  );
END;
$$;

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_achievements(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  achievement RECORD;
  user_stats RECORD;
BEGIN
  -- Get user statistics
  SELECT 
    trust_score,
    total_help_given,
    total_help_received
  INTO user_stats
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check each achievement
  FOR achievement IN 
    SELECT * FROM public.achievements
    WHERE id NOT IN (
      SELECT achievement_id FROM public.user_achievements WHERE user_id = check_achievements.user_id
    )
  LOOP
    -- Check if user meets requirements (simplified logic)
    IF (achievement.requirements->>'help_count')::INTEGER <= user_stats.total_help_given
    OR (achievement.requirements->>'trust_score')::INTEGER <= user_stats.trust_score THEN
      -- Award achievement
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (user_id, achievement.id);
      
      -- Add points
      UPDATE public.profiles
      SET achievement_points = achievement_points + achievement.points
      WHERE id = user_id;
      
      -- Create notification
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_id, 
        'achievement', 
        'Achievement Unlocked!', 
        'You earned: ' || achievement.name,
        json_build_object('achievement_id', achievement.id, 'points', achievement.points)
      );
    END IF;
  END LOOP;
END;
$$;
