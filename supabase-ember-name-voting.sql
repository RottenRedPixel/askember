-- Migration: Create ember_name_votes table for voting on ember names
-- This allows shared users to vote on suggested names for embers

-- Create ember_name_votes table
CREATE TABLE IF NOT EXISTS public.ember_name_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES public.embers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous users
    user_email TEXT, -- Store email for anonymous voters
    suggested_name TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraints to ensure one vote per user per ember
CREATE UNIQUE INDEX IF NOT EXISTS idx_ember_votes_user_unique 
    ON public.ember_name_votes(ember_id, user_id) 
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ember_votes_email_unique 
    ON public.ember_name_votes(ember_id, user_email) 
    WHERE user_email IS NOT NULL AND user_id IS NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ember_name_votes_ember_id ON public.ember_name_votes(ember_id);
CREATE INDEX IF NOT EXISTS idx_ember_name_votes_created_at ON public.ember_name_votes(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.ember_name_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view votes for embers they have access to
CREATE POLICY "Users can view votes for accessible embers"
    ON public.ember_name_votes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.embers 
            WHERE embers.id = ember_name_votes.ember_id 
            AND (
                embers.user_id = auth.uid() OR  -- Owner
                embers.is_public = true OR      -- Public ember
                EXISTS (
                    SELECT 1 FROM public.ember_shares 
                    WHERE ember_shares.ember_id = embers.id 
                    AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
                    AND ember_shares.is_active = true
                    AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
                )
            )
        )
    );

-- Policy: Authenticated users can insert their own votes
CREATE POLICY "Authenticated users can vote"
    ON public.ember_name_votes
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.embers 
            WHERE embers.id = ember_name_votes.ember_id 
            AND (
                embers.user_id = auth.uid() OR  -- Owner
                embers.is_public = true OR      -- Public ember
                EXISTS (
                    SELECT 1 FROM public.ember_shares 
                    WHERE ember_shares.ember_id = embers.id 
                    AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
                    AND ember_shares.is_active = true
                    AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
                )
            )
        )
    );

-- Policy: Anonymous users can vote with email
CREATE POLICY "Anonymous users can vote with email"
    ON public.ember_name_votes
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NULL AND 
        user_id IS NULL AND 
        user_email IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.embers 
            WHERE embers.id = ember_name_votes.ember_id 
            AND embers.is_public = true
        )
    );

-- Policy: Users can update their own votes
CREATE POLICY "Users can update own votes"
    ON public.ember_name_votes
    FOR UPDATE
    USING (
        (auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND user_email = auth.jwt() ->> 'email')
    )
    WITH CHECK (
        (auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND user_email = auth.jwt() ->> 'email')
    );

-- Policy: Users can delete their own votes
CREATE POLICY "Users can delete own votes"
    ON public.ember_name_votes
    FOR DELETE
    USING (
        (auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND user_email = auth.jwt() ->> 'email')
    );

-- Policy: Super admins can manage all votes
CREATE POLICY "Super admins can manage all votes"
    ON public.ember_name_votes
    FOR ALL
    USING (is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_ember_name_votes_updated_at
    BEFORE UPDATE ON public.ember_name_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get voting results for an ember
CREATE OR REPLACE FUNCTION get_ember_voting_results(ember_uuid UUID)
RETURNS TABLE (
    suggested_name TEXT,
    vote_count BIGINT,
    is_custom BOOLEAN,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH vote_counts AS (
        SELECT 
            env.suggested_name,
            COUNT(*) as vote_count,
            env.is_custom
        FROM ember_name_votes env
        WHERE env.ember_id = ember_uuid
        GROUP BY env.suggested_name, env.is_custom
    ),
    total_votes AS (
        SELECT SUM(vote_count) as total FROM vote_counts
    )
    SELECT 
        vc.suggested_name,
        vc.vote_count,
        vc.is_custom,
        ROUND((vc.vote_count::NUMERIC / tv.total::NUMERIC) * 100, 1) as percentage
    FROM vote_counts vc
    CROSS JOIN total_votes tv
    ORDER BY vc.vote_count DESC, vc.suggested_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has voted
CREATE OR REPLACE FUNCTION get_user_vote(ember_uuid UUID, check_user_id UUID DEFAULT NULL, check_email TEXT DEFAULT NULL)
RETURNS TABLE (
    suggested_name TEXT,
    is_custom BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    user_id_param UUID := COALESCE(check_user_id, auth.uid());
    email_param TEXT := COALESCE(check_email, auth.jwt() ->> 'email');
BEGIN
    RETURN QUERY
    SELECT 
        env.suggested_name,
        env.is_custom,
        env.created_at
    FROM ember_name_votes env
    WHERE env.ember_id = ember_uuid 
    AND (
        (user_id_param IS NOT NULL AND env.user_id = user_id_param) OR
        (user_id_param IS NULL AND env.user_email = email_param)
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 