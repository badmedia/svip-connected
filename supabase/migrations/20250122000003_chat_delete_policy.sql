-- Add DELETE policy for chats table
-- Users can delete chats they are part of (either as requester or helper)
CREATE POLICY "Users can delete their own chats"
ON public.chats FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = helper_id);
