-- Fix permission value mismatch in ember_shares table
-- Convert any 'edit' permission values to 'contributor' to match database constraint

-- Update any existing 'edit' permission values to 'contributor'
UPDATE ember_shares 
SET permission_level = 'contributor' 
WHERE permission_level = 'edit';

-- Verify the update
SELECT permission_level, COUNT(*) as count
FROM ember_shares 
GROUP BY permission_level;

-- Make sure constraint allows only valid values
ALTER TABLE ember_shares 
DROP CONSTRAINT IF EXISTS ember_shares_permission_level_check;

ALTER TABLE ember_shares 
ADD CONSTRAINT ember_shares_permission_level_check 
CHECK (permission_level IN ('view', 'contributor'));

-- Update the get_ember_permission function to handle legacy 'edit' values if needed
CREATE OR REPLACE FUNCTION get_ember_permission(ember_uuid UUID, user_email TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    user_email_param TEXT := COALESCE(user_email, auth.jwt() ->> 'email');
    ember_record embers%ROWTYPE;
    share_record ember_shares%ROWTYPE;
    permission_value TEXT;
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
        -- Handle legacy 'edit' values by converting to 'contributor'
        permission_value := share_record.permission_level;
        IF permission_value = 'edit' THEN
            permission_value := 'contributor';
        END IF;
        RETURN permission_value;
    END IF;
    
    RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 