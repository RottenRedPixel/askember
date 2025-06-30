-- Migration: Add location fields to embers table
-- This adds location data fields to track the saved location for each ember

-- Add location fields to embers table
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS altitude DECIMAL(10, 2);
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS manual_location TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS location_source TEXT CHECK (location_source IN ('photo', 'manual')) DEFAULT 'photo';

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_embers_location ON public.embers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL; 