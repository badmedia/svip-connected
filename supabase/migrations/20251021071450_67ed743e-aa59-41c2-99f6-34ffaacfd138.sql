-- Create enum for task types
CREATE TYPE public.task_type AS ENUM ('offer', 'request');

-- Create enum for task categories
CREATE TYPE public.task_category AS ENUM ('notes_typing', 'ppt_design', 'tutoring', 'app_testing', 'writing_help');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Update profiles table with college info
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS college_id_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER NOT NULL CHECK (budget >= 20 AND budget <= 200),
  category task_category NOT NULL,
  task_type task_type NOT NULL,
  status task_status DEFAULT 'open' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  helper_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(task_id, requester_id, helper_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create endorsements table
CREATE TABLE public.endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(from_user_id, to_user_id, task_id)
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Tasks are viewable by everyone"
ON public.tasks FOR SELECT
USING (true);

CREATE POLICY "Users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for chats
CREATE POLICY "Users can view their own chats"
ON public.chats FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = helper_id);

CREATE POLICY "Users can create chats for tasks"
ON public.chats FOR INSERT
WITH CHECK (auth.uid() = helper_id OR auth.uid() = requester_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id
    AND (chats.requester_id = auth.uid() OR chats.helper_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their chats"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = chat_id
    AND (chats.requester_id = auth.uid() OR chats.helper_id = auth.uid())
  )
);

-- RLS Policies for endorsements
CREATE POLICY "Endorsements are viewable by everyone"
ON public.endorsements FOR SELECT
USING (true);

CREATE POLICY "Users can create endorsements"
ON public.endorsements FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;