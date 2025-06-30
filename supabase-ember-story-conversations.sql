-- Migration: Create ember story conversations and messages tables
-- This creates tables for storing Story Q&A conversations related to specific embers

-- Create ember_story_conversations table
-- This represents a conversation session between a user and Ember about a specific story
CREATE TABLE IF NOT EXISTS public.ember_story_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES public.embers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT, -- Optional title for the conversation (e.g. "The Story")
    conversation_type TEXT NOT NULL DEFAULT 'story' CHECK (conversation_type IN ('story', 'memory', 'details')),
    is_completed BOOLEAN DEFAULT FALSE, -- Whether user has finished the conversation
    message_count INTEGER DEFAULT 0, -- Cache for number of messages
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ember_story_messages table
-- This stores individual Q&A exchanges within conversations
CREATE TABLE IF NOT EXISTS public.ember_story_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.ember_story_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('ember', 'user')), -- Who sent the message
    message_type TEXT NOT NULL CHECK (message_type IN ('question', 'answer')) DEFAULT 'question',
    content TEXT NOT NULL, -- The text content of the message
    sequence_number INTEGER NOT NULL, -- Order of messages in conversation (starts at 1)
    
    -- Audio recording fields
    has_audio BOOLEAN DEFAULT FALSE,
    audio_url TEXT, -- URL to the MP3 file in blob storage
    audio_filename TEXT, -- Original filename for reference
    audio_duration_seconds DECIMAL(10,2), -- Duration in seconds
    audio_size_bytes BIGINT, -- File size in bytes
    
    -- Processing status
    transcription_status TEXT DEFAULT 'none' CHECK (transcription_status IN ('none', 'processing', 'completed', 'failed')),
    transcription_confidence DECIMAL(5,4), -- 0.0 to 1.0 confidence score from ElevenLabs
    
    -- Metadata
    response_time_seconds DECIMAL(10,2), -- How long user took to respond (for analytics)
    is_edited BOOLEAN DEFAULT FALSE, -- Whether the message was edited after creation
    edit_count INTEGER DEFAULT 0, -- Number of times edited
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure sequence numbers are unique within a conversation
    UNIQUE(conversation_id, sequence_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_story_conversations_ember_id ON public.ember_story_conversations(ember_id);
CREATE INDEX IF NOT EXISTS idx_story_conversations_user_id ON public.ember_story_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_story_conversations_created_at ON public.ember_story_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_conversations_last_activity ON public.ember_story_conversations(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_story_messages_conversation_id ON public.ember_story_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_story_messages_sequence ON public.ember_story_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_story_messages_sender ON public.ember_story_messages(sender);
CREATE INDEX IF NOT EXISTS idx_story_messages_audio ON public.ember_story_messages(has_audio) WHERE has_audio = TRUE;
CREATE INDEX IF NOT EXISTS idx_story_messages_created_at ON public.ember_story_messages(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.ember_story_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ember_story_messages ENABLE ROW LEVEL SECURITY;

-- Policies for ember_story_conversations
-- Users can view their own conversations
CREATE POLICY "Users can view own story conversations"
    ON public.ember_story_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create conversations for their own embers or embers they have access to
CREATE POLICY "Users can create story conversations"
    ON public.ember_story_conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own story conversations"
    ON public.ember_story_conversations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own story conversations"
    ON public.ember_story_conversations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for ember_story_messages
-- Users can view messages from their own conversations
CREATE POLICY "Users can view own story messages"
    ON public.ember_story_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

-- Users can create messages in their own conversations
CREATE POLICY "Users can create story messages"
    ON public.ember_story_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

-- Users can update messages in their own conversations
CREATE POLICY "Users can update own story messages"
    ON public.ember_story_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

-- Users can delete messages in their own conversations
CREATE POLICY "Users can delete own story messages"
    ON public.ember_story_messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

-- Function to update conversation stats when messages are added/removed
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update message count and last activity
        UPDATE public.ember_story_conversations 
        SET 
            message_count = message_count + 1,
            last_activity = NOW(),
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update message count
        UPDATE public.ember_story_conversations 
        SET 
            message_count = GREATEST(message_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.conversation_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain conversation stats
CREATE TRIGGER trigger_update_conversation_stats_insert
    AFTER INSERT ON public.ember_story_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_stats();

CREATE TRIGGER trigger_update_conversation_stats_delete
    AFTER DELETE ON public.ember_story_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_stats();

-- Function to auto-set sequence numbers
CREATE OR REPLACE FUNCTION set_message_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM public.ember_story_messages
    WHERE conversation_id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set sequence numbers
CREATE TRIGGER trigger_set_message_sequence_number
    BEFORE INSERT ON public.ember_story_messages
    FOR EACH ROW
    WHEN (NEW.sequence_number IS NULL)
    EXECUTE FUNCTION set_message_sequence_number(); 