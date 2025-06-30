-- Migration: Create photos table for EXIF metadata
-- This creates the photos table for storing extracted EXIF data from uploaded images

-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ember_id UUID REFERENCES public.embers(id) ON DELETE CASCADE,
    storage_url TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    altitude DECIMAL(10, 2),
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    iso_speed INTEGER,
    aperture_value DECIMAL(3, 1),
    shutter_speed TEXT,
    focal_length DECIMAL(5, 1),
    flash_used BOOLEAN,
    orientation INTEGER,
    original_filename TEXT,
    file_size BIGINT,
    image_width INTEGER,
    image_height INTEGER,
    color_space TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_ember_id ON public.photos(ember_id);
CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON public.photos(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_photos_location ON public.photos(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own photos
CREATE POLICY "Users can view own photos"
    ON public.photos
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own photos
CREATE POLICY "Users can insert own photos"
    ON public.photos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own photos
CREATE POLICY "Users can update own photos"
    ON public.photos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete own photos"
    ON public.photos
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Allow viewing photos for shared embers (read-only access)
CREATE POLICY "Users can view photos from shared embers"
    ON public.photos
    FOR SELECT
    USING (
        ember_id IN (
            SELECT ember_id 
            FROM ember_sharing_profiles 
            WHERE shared_user_id = auth.uid()
        )
    );

-- Policy: Super admins can do everything
CREATE POLICY "Super admins can manage all photos"
    ON public.photos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON public.photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
CREATE POLICY "Photo images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Users can upload their own photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]); 