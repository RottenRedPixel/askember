-- Migration: Create image_analysis table
-- This creates the table for storing OpenAI deep image analysis results

-- Create image_analysis table
CREATE TABLE IF NOT EXISTS public.image_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES public.embers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_text TEXT NOT NULL, -- Full OpenAI analysis response
    image_url TEXT NOT NULL, -- URL of the analyzed image
    
    -- OpenAI API metadata
    openai_model TEXT DEFAULT 'gpt-4o',
    tokens_used INTEGER,
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Processing status
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    
    -- Analysis summary fields (extracted from the text analysis)
    people_count INTEGER,
    environment_type TEXT, -- indoor/outdoor/mixed
    activity_type TEXT, -- celebration, work, leisure, etc.
    emotions_detected TEXT[], -- array of detected emotions
    objects_detected TEXT[], -- array of detected objects
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one analysis per ember
    UNIQUE(ember_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_image_analysis_ember_id ON public.image_analysis(ember_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_user_id ON public.image_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_status ON public.image_analysis(status);
CREATE INDEX IF NOT EXISTS idx_image_analysis_timestamp ON public.image_analysis(analysis_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_image_analysis_created_at ON public.image_analysis(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.image_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analysis for their own embers
CREATE POLICY "Users can view analysis for own embers"
    ON public.image_analysis
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        ember_id IN (
            SELECT id FROM public.embers WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can view analysis for shared embers
CREATE POLICY "Users can view analysis for shared embers"
    ON public.image_analysis
    FOR SELECT
    USING (
        ember_id IN (
            SELECT ember_id 
            FROM public.ember_shares 
            WHERE shared_with_email = auth.jwt() ->> 'email'
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

-- Policy: Users can insert analysis for their own embers
CREATE POLICY "Users can insert analysis for own embers"
    ON public.image_analysis
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        ember_id IN (
            SELECT id FROM public.embers WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update analysis for their own embers
CREATE POLICY "Users can update analysis for own embers"
    ON public.image_analysis
    FOR UPDATE
    USING (
        user_id = auth.uid() AND
        ember_id IN (
            SELECT id FROM public.embers WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        ember_id IN (
            SELECT id FROM public.embers WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete analysis for their own embers
CREATE POLICY "Users can delete analysis for own embers"
    ON public.image_analysis
    FOR DELETE
    USING (
        user_id = auth.uid() AND
        ember_id IN (
            SELECT id FROM public.embers WHERE user_id = auth.uid()
        )
    );

-- Policy: Super admins can manage all analysis records
CREATE POLICY "Super admins can manage all image analysis"
    ON public.image_analysis
    FOR ALL
    USING (is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_image_analysis_updated_at
    BEFORE UPDATE ON public.image_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to save image analysis
CREATE OR REPLACE FUNCTION save_image_analysis(
    p_ember_id UUID,
    p_user_id UUID,
    p_analysis_text TEXT,
    p_image_url TEXT,
    p_openai_model TEXT DEFAULT 'gpt-4o',
    p_tokens_used INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    analysis_id UUID;
BEGIN
    -- Insert or update analysis record
    INSERT INTO public.image_analysis (
        ember_id,
        user_id,
        analysis_text,
        image_url,
        openai_model,
        tokens_used,
        status
    ) VALUES (
        p_ember_id,
        p_user_id,
        p_analysis_text,
        p_image_url,
        p_openai_model,
        p_tokens_used,
        'completed'
    )
    ON CONFLICT (ember_id) 
    DO UPDATE SET
        analysis_text = EXCLUDED.analysis_text,
        image_url = EXCLUDED.image_url,
        openai_model = EXCLUDED.openai_model,
        tokens_used = EXCLUDED.tokens_used,
        status = 'completed',
        analysis_timestamp = NOW(),
        updated_at = NOW()
    RETURNING id INTO analysis_id;
    
    RETURN analysis_id;
END;
$$;

-- Create function to get image analysis for an ember
CREATE OR REPLACE FUNCTION get_image_analysis(p_ember_id UUID)
RETURNS TABLE (
    id UUID,
    ember_id UUID,
    user_id UUID,
    analysis_text TEXT,
    image_url TEXT,
    openai_model TEXT,
    tokens_used INTEGER,
    analysis_timestamp TIMESTAMP WITH TIME ZONE,
    status TEXT,
    people_count INTEGER,
    environment_type TEXT,
    activity_type TEXT,
    emotions_detected TEXT[],
    objects_detected TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        ia.id,
        ia.ember_id,
        ia.user_id,
        ia.analysis_text,
        ia.image_url,
        ia.openai_model,
        ia.tokens_used,
        ia.analysis_timestamp,
        ia.status,
        ia.people_count,
        ia.environment_type,
        ia.activity_type,
        ia.emotions_detected,
        ia.objects_detected,
        ia.created_at,
        ia.updated_at
    FROM public.image_analysis ia
    WHERE ia.ember_id = p_ember_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_image_analysis(UUID, UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_image_analysis(UUID) TO authenticated; 