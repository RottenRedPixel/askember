-- Create the ember_story_cuts table to store generated story cuts
CREATE TABLE IF NOT EXISTS ember_story_cuts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ember_id UUID NOT NULL REFERENCES embers(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Story Cut Metadata
  title TEXT NOT NULL,
  style TEXT NOT NULL, -- e.g., 'news-hour', 'movie-trailer', etc.
  duration INTEGER NOT NULL, -- in seconds
  word_count INTEGER,
  story_focus TEXT, -- optional focus/direction
  
  -- Generated Scripts
  full_script TEXT NOT NULL,
  ember_voice_lines JSONB DEFAULT '[]'::jsonb, -- array of strings
  narrator_voice_lines JSONB DEFAULT '[]'::jsonb, -- array of strings
  
  -- Voice Casting Information
  ember_voice_id TEXT NOT NULL, -- ElevenLabs voice ID
  ember_voice_name TEXT NOT NULL, -- human-readable voice name
  narrator_voice_id TEXT NOT NULL, -- ElevenLabs voice ID  
  narrator_voice_name TEXT NOT NULL, -- human-readable voice name
  selected_contributors JSONB DEFAULT '[]'::jsonb, -- array of contributor objects
  
  -- Additional Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- flexible metadata storage
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS ember_story_cuts_ember_id_idx ON ember_story_cuts(ember_id);
CREATE INDEX IF NOT EXISTS ember_story_cuts_creator_user_id_idx ON ember_story_cuts(creator_user_id);
CREATE INDEX IF NOT EXISTS ember_story_cuts_style_idx ON ember_story_cuts(style);
CREATE INDEX IF NOT EXISTS ember_story_cuts_created_at_idx ON ember_story_cuts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE ember_story_cuts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Users can view story cuts for embers they have access to
CREATE POLICY "Users can view story cuts for accessible embers" ON ember_story_cuts
  FOR SELECT USING (
    ember_id IN (
      SELECT e.id FROM embers e
      LEFT JOIN ember_shares es ON e.id = es.ember_id
      WHERE e.user_id = auth.uid()  -- Owner
        OR e.is_public = true  -- Public embers
        OR (es.shared_with_email = auth.jwt() ->> 'email'
        AND es.is_active = true 
        AND (es.expires_at IS NULL OR es.expires_at > now())) -- Shared user
    )
  );

-- Policy: Users can create story cuts for embers they can contribute to  
CREATE POLICY "Users can create story cuts for contributable embers" ON ember_story_cuts
  FOR INSERT WITH CHECK (
    ember_id IN (
      SELECT e.id FROM embers e
      LEFT JOIN ember_shares es ON e.id = es.ember_id
      WHERE e.user_id = auth.uid()  -- Owner
        OR (e.is_public = true AND e.allow_public_edit = true)  -- Public edit allowed
        OR (es.shared_with_email = auth.jwt() ->> 'email'
        AND es.permission_level IN ('contributor') 
        AND es.is_active = true 
        AND (es.expires_at IS NULL OR es.expires_at > now())) -- Contributors only
    )
    AND creator_user_id = auth.uid()
  );

-- Policy: Users can update their own story cuts
CREATE POLICY "Users can update their own story cuts" ON ember_story_cuts
  FOR UPDATE USING (creator_user_id = auth.uid());

-- Policy: Users can delete their own story cuts  
CREATE POLICY "Users can delete their own story cuts" ON ember_story_cuts
  FOR DELETE USING (creator_user_id = auth.uid());

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ember_story_cuts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ember_story_cuts_updated_at
  BEFORE UPDATE ON ember_story_cuts
  FOR EACH ROW
  EXECUTE FUNCTION update_ember_story_cuts_updated_at();

-- Grant necessary permissions
GRANT ALL ON ember_story_cuts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 