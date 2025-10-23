-- Create user encryption keys table
CREATE TABLE public.user_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  key_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, key_id)
);

-- Create chat encryption keys table
CREATE TABLE public.chat_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  encrypted_shared_key TEXT NOT NULL,
  key_id TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add encryption columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS encrypted_message TEXT,
ADD COLUMN IF NOT EXISTS encryption_key_id TEXT,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

-- Enable RLS on new tables
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_keys
CREATE POLICY "Users can view their own keys"
ON public.user_keys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keys"
ON public.user_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keys"
ON public.user_keys FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for chat_keys
CREATE POLICY "Users can view chat keys for their chats"
ON public.chat_keys FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = chat_keys.chat_id
    AND (chats.requester_id = auth.uid() OR chats.helper_id = auth.uid())
  )
);

CREATE POLICY "Users can create chat keys for their chats"
ON public.chat_keys FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = chat_id
    AND (chats.requester_id = auth.uid() OR chats.helper_id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_user_keys_user_id ON public.user_keys(user_id);
CREATE INDEX idx_user_keys_active ON public.user_keys(user_id, is_active);
CREATE INDEX idx_chat_keys_chat_id ON public.chat_keys(chat_id);
CREATE INDEX idx_messages_encryption ON public.messages(chat_id, encryption_key_id);