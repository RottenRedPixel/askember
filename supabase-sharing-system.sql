-- Sharing System for Embers
-- Add sharing fields to embers table
ALTER TABLE embers ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE embers ADD COLUMN IF NOT EXISTS allow_public_edit BOOLEAN DEFAULT false;

-- Create ember_shares table for individual sharing permissions
CREATE TABLE IF NOT EXISTS ember_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES embers(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'contributor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(ember_id, shared_with_email)
);

-- Enable RLS on ember_shares
ALTER TABLE ember_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ember_shares
CREATE POLICY "Users can view shares for their embers" ON ember_shares
    FOR SELECT USING (
        shared_by_user_id = auth.uid() OR 
        shared_with_email = auth.jwt() ->> 'email'
    );

CREATE POLICY "Users can create shares for their embers" ON ember_shares
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_shares.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shares for their embers" ON ember_shares
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_shares.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shares for their embers" ON ember_shares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_shares.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

-- Update embers RLS policy to include shared access
DROP POLICY IF EXISTS "Users can view their own embers" ON embers;
CREATE POLICY "Users can view their own embers or shared embers" ON embers
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_public = true OR
        EXISTS (
            SELECT 1 FROM ember_shares 
            WHERE ember_shares.ember_id = embers.id 
            AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
            AND ember_shares.is_active = true
            AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
        )
    );

-- Function to get user permission level for an ember
CREATE OR REPLACE FUNCTION get_ember_permission(ember_uuid UUID, user_email TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    user_email_param TEXT := COALESCE(user_email, auth.jwt() ->> 'email');
    ember_record embers%ROWTYPE;
    share_record ember_shares%ROWTYPE;
BEGIN
    -- Get ember details
    SELECT * INTO ember_record FROM embers WHERE id = ember_uuid;
    
    IF NOT FOUND THEN
        RETURN 'none';
    END IF;
    
    -- Check if user is owner
    IF ember_record.user_id = auth.uid() THEN
        RETURN 'owner';
    END IF;
    
    -- Check if ember is public
    IF ember_record.is_public THEN
        IF ember_record.allow_public_edit THEN
            RETURN 'contributor';
        ELSE
            RETURN 'view';
        END IF;
    END IF;
    
    -- Check specific shares
    SELECT * INTO share_record 
    FROM ember_shares 
    WHERE ember_id = ember_uuid 
    AND shared_with_email = user_email_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
    
    IF FOUND THEN
        RETURN share_record.permission_level;
    END IF;
    
    RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 