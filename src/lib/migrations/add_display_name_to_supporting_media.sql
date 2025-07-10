-- Migration: Add display_name column to ember_supporting_media table
-- This migration adds a display_name column to store custom names for supporting media files

-- Add the display_name column to ember_supporting_media table
ALTER TABLE ember_supporting_media 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing records to have display_name based on file_name
-- This will generate display names for existing media files
UPDATE ember_supporting_media 
SET display_name = CASE 
    WHEN file_name IS NOT NULL AND file_name != '' THEN
        -- Remove file extension
        REGEXP_REPLACE(
            -- Capitalize first letter of each word
            INITCAP(
                -- Replace underscores and hyphens with spaces, handle multiple spaces
                REGEXP_REPLACE(
                    REGEXP_REPLACE(file_name, '\.[^.]*$', ''),
                    '[_-]', ' ', 'g'
                )
            ),
            '\s+', ' ', 'g'
        )
    ELSE 
        COALESCE(INITCAP(file_category), 'Media')
END
WHERE display_name IS NULL;

-- Add index for better performance on display_name queries
CREATE INDEX IF NOT EXISTS idx_ember_supporting_media_display_name 
ON ember_supporting_media(display_name);

-- Add comment to document the column
COMMENT ON COLUMN ember_supporting_media.display_name IS 'Custom display name for the supporting media file, used in script references'; 