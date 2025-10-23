-- Ensure proper cascade delete for chat-related data
-- This migration ensures that when a chat is deleted, all related data is also deleted

-- Verify and update foreign key constraints to ensure CASCADE delete
-- Messages should be deleted when chat is deleted
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_chat_id_fkey 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

-- Chat keys should be deleted when chat is deleted
ALTER TABLE public.chat_keys 
DROP CONSTRAINT IF EXISTS chat_keys_chat_id_fkey;

ALTER TABLE public.chat_keys 
ADD CONSTRAINT chat_keys_chat_id_fkey 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

-- Create a function to clean up orphaned messages (safety measure)
CREATE OR REPLACE FUNCTION cleanup_orphaned_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete messages that reference non-existent chats
    DELETE FROM public.messages 
    WHERE chat_id NOT IN (SELECT id FROM public.chats);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up % orphaned messages', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get chat statistics before deletion
CREATE OR REPLACE FUNCTION get_chat_stats(chat_uuid UUID)
RETURNS TABLE(
    message_count BIGINT,
    chat_key_count BIGINT,
    total_size_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.messages WHERE chat_id = chat_uuid) as message_count,
        (SELECT COUNT(*) FROM public.chat_keys WHERE chat_id = chat_uuid) as chat_key_count,
        (SELECT COALESCE(SUM(LENGTH(message)), 0) FROM public.messages WHERE chat_id = chat_uuid) as total_size_bytes;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for message deletion (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can delete messages in their chats'
    ) THEN
        CREATE POLICY "Users can delete messages in their chats"
        ON public.messages FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.chats
                WHERE chats.id = messages.chat_id
                AND (chats.requester_id = auth.uid() OR chats.helper_id = auth.uid())
            )
        );
    END IF;
END $$;

-- Add RLS policy for chat_keys deletion (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_keys' 
        AND policyname = 'Users can delete chat keys for their chats'
    ) THEN
        CREATE POLICY "Users can delete chat keys for their chats"
        ON public.chat_keys FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.chats
                WHERE chats.id = chat_keys.chat_id
                AND (chats.requester_id = auth.uid() OR chats.helper_id = auth.uid())
            )
        );
    END IF;
END $$;
