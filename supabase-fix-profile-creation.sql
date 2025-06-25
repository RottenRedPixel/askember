-- Fix for profile creation during user signup
-- This addresses the "Database error saving new user" issue

-- Drop the existing trigger and function to recreate them
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Create a more robust function to handle profile creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER 
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  -- Insert the profile with error handling
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate key errors
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Also create a function to manually fix any users who don't have profiles
CREATE OR REPLACE FUNCTION fix_missing_profiles()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  SELECT id, 'user'
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM public.user_profiles)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Run the fix for any existing users without profiles
SELECT fix_missing_profiles(); 