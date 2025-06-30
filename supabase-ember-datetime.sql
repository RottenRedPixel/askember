-- Migration: Add date/time fields to embers table
-- This adds date/time data fields to track the saved timestamp for each ember

-- Add date/time fields to embers table
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS ember_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS manual_datetime TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS camera_make TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS camera_model TEXT;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS camera_settings JSONB;
ALTER TABLE public.embers ADD COLUMN IF NOT EXISTS datetime_source TEXT CHECK (datetime_source IN ('photo', 'manual')) DEFAULT 'photo';

-- Create index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_embers_timestamp ON public.embers(ember_timestamp DESC) WHERE ember_timestamp IS NOT NULL; 