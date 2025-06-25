-- Migration: Create ember_chats table
-- This creates the chat table for storing chat messages related to specific embers

-- Create ember_chats table
CREATE TABLE IF NOT EXISTS public.ember_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES public.embers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous users by setting to NULL
    user_name TEXT, -- Store display name for anonymous users or as fallback
    user_email TEXT, -- Optional: store email for anonymous users
    message TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('question', 'answer', 'comment')) DEFAULT 'comment',
    parent_id UUID REFERENCES public.ember_chats(id) ON DELETE CASCADE, -- Links answers to questions, comments to answers
    is_resolved BOOLEAN DEFAULT FALSE, -- Mark questions as resolved
    answer_count INTEGER DEFAULT 0, -- Cache answer count for questions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ember_chats_ember_id ON public.ember_chats(ember_id);
CREATE INDEX IF NOT EXISTS idx_ember_chats_user_id ON public.ember_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ember_chats_created_at ON public.ember_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ember_chats_message_type ON public.ember_chats(message_type);
CREATE INDEX IF NOT EXISTS idx_ember_chats_parent_id ON public.ember_chats(parent_id);
CREATE INDEX IF NOT EXISTS idx_ember_chats_ember_type ON public.ember_chats(ember_id, message_type);

-- Set up Row Level Security (RLS)
ALTER TABLE public.ember_chats ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view chat messages for any ember (public readable)
CREATE POLICY "Chat messages are publicly readable"
    ON public.ember_chats
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own chat messages
CREATE POLICY "Authenticated users can insert chat messages"
    ON public.ember_chats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Anonymous users can insert chat messages (user_id will be NULL)
CREATE POLICY "Anonymous users can insert chat messages"
    ON public.ember_chats
    FOR INSERT
    WITH CHECK (auth.uid() IS NULL AND user_id IS NULL);

-- Policy: Users can update their own chat messages
CREATE POLICY "Users can update own chat messages"
    ON public.ember_chats
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own chat messages
CREATE POLICY "Users can delete own chat messages"
    ON public.ember_chats
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Super admins can manage all chat messages
CREATE POLICY "Super admins can manage all chat messages"
    ON public.ember_chats
    FOR ALL
    USING (is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_ember_chats_updated_at
    BEFORE UPDATE ON public.ember_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 