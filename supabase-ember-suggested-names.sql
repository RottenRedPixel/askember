-- Ember Suggested Names Table
-- This table stores all suggested names for embers (both default and custom)
-- Separate from voting to allow names to exist independently of votes

CREATE TABLE IF NOT EXISTS ember_suggested_names (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES embers(id) ON DELETE CASCADE,
    suggested_name TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(ember_id, suggested_name)
);

-- Enable RLS
ALTER TABLE ember_suggested_names ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view suggested names for embers they can access" ON ember_suggested_names
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_suggested_names.ember_id 
            AND (
                embers.user_id = auth.uid() OR 
                embers.is_public = true OR
                EXISTS (
                    SELECT 1 FROM ember_shares 
                    WHERE ember_shares.ember_id = embers.id 
                    AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
                    AND ember_shares.is_active = true
                    AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
                )
            )
        )
    );

CREATE POLICY "Users can add suggested names to embers they can access" ON ember_suggested_names
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_suggested_names.ember_id 
            AND (
                embers.user_id = auth.uid() OR 
                embers.is_public = true OR
                EXISTS (
                    SELECT 1 FROM ember_shares 
                    WHERE ember_shares.ember_id = embers.id 
                    AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
                    AND ember_shares.is_active = true
                    AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
                )
            )
        )
    );

CREATE POLICY "Users can update suggested names they created" ON ember_suggested_names
    FOR UPDATE USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can delete suggested names they created or if they own the ember" ON ember_suggested_names
    FOR DELETE USING (
        created_by_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_suggested_names.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

-- Function to get all suggested names for an ember
CREATE OR REPLACE FUNCTION get_ember_suggested_names(ember_uuid UUID)
RETURNS TABLE (
    id UUID,
    suggested_name TEXT,
    is_custom BOOLEAN,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        esn.id,
        esn.suggested_name,
        esn.is_custom,
        esn.created_by_user_id,
        esn.created_at
    FROM ember_suggested_names esn
    WHERE esn.ember_id = ember_uuid 
    AND esn.is_active = true
    ORDER BY esn.is_custom ASC, esn.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a suggested name
CREATE OR REPLACE FUNCTION add_ember_suggested_name(
    ember_uuid UUID, 
    name_text TEXT, 
    is_custom_name BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO ember_suggested_names (
        ember_id, 
        suggested_name, 
        is_custom, 
        created_by_user_id
    ) VALUES (
        ember_uuid, 
        name_text, 
        is_custom_name, 
        auth.uid()
    )
    ON CONFLICT (ember_id, suggested_name) DO NOTHING
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 