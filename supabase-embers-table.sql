-- Migration: Create embers table
-- This creates the embers table for storing user embers (photos/media)

-- Create embers table
CREATE TABLE IF NOT EXISTS public.embers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(45),
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_embers_user_id ON public.embers(user_id);
CREATE INDEX IF NOT EXISTS idx_embers_created_at ON public.embers(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.embers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own embers
CREATE POLICY "Users can view own embers"
    ON public.embers
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own embers
CREATE POLICY "Users can insert own embers"
    ON public.embers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own embers
CREATE POLICY "Users can update own embers"
    ON public.embers
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own embers
CREATE POLICY "Users can delete own embers"
    ON public.embers
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Super admins can do everything
CREATE POLICY "Super admins can manage all embers"
    ON public.embers
    FOR ALL
    USING (is_super_admin());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_embers_updated_at
    BEFORE UPDATE ON public.embers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 