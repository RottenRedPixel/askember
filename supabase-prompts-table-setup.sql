-- Complete prompts table setup with RLS policies
-- This ensures the prompts table exists with proper admin-only access

-- Create prompts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  subcategory TEXT,
  prompt_key TEXT NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS prompts_category_idx ON public.prompts(category);
CREATE INDEX IF NOT EXISTS prompts_prompt_key_idx ON public.prompts(prompt_key);
CREATE INDEX IF NOT EXISTS prompts_is_active_idx ON public.prompts(is_active);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_prompts_updated_at ON public.prompts;
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them safely
DROP POLICY IF EXISTS "Admin can read all prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admin can insert prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admin can update prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admin can delete prompts" ON public.prompts;
DROP POLICY IF EXISTS "Public can read active prompts" ON public.prompts;

-- Create RLS policies
-- Admins can do everything
CREATE POLICY "Admin can read all prompts" ON public.prompts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can insert prompts" ON public.prompts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can update prompts" ON public.prompts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can delete prompts" ON public.prompts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Public read access to active prompts (for non-admin users to use in the app)
CREATE POLICY "Public can read active prompts" ON public.prompts
  FOR SELECT USING (is_active = true);

-- Create helper functions for getting prompts

-- Function to get active prompt by key
CREATE OR REPLACE FUNCTION get_active_prompt(prompt_key_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  prompt_key TEXT,
  system_prompt TEXT,
  user_prompt_template TEXT,
  variables JSONB,
  metadata JSONB,
  is_active BOOLEAN,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT 
    p.id, p.name, p.description, p.category, p.subcategory,
    p.prompt_key, p.system_prompt, p.user_prompt_template,
    p.variables, p.metadata, p.is_active, p.created_by,
    p.created_at, p.updated_at
  FROM public.prompts p
  WHERE p.prompt_key = prompt_key_param 
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
$$;

-- Function to get prompts by category
CREATE OR REPLACE FUNCTION get_prompts_by_category(
  category_param TEXT,
  subcategory_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  prompt_key TEXT,
  system_prompt TEXT,
  user_prompt_template TEXT,
  variables JSONB,
  metadata JSONB,
  is_active BOOLEAN,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT 
    p.id, p.name, p.description, p.category, p.subcategory,
    p.prompt_key, p.system_prompt, p.user_prompt_template,
    p.variables, p.metadata, p.is_active, p.created_by,
    p.created_at, p.updated_at
  FROM public.prompts p
  WHERE p.category = category_param
    AND (subcategory_param IS NULL OR p.subcategory = subcategory_param)
    AND p.is_active = true
  ORDER BY p.name;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.prompts TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_prompt(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_prompts_by_category(TEXT, TEXT) TO anon, authenticated;

-- Display current setup
SELECT 'Prompts table setup completed successfully!' as status;

-- Show current admin users
SELECT 
  'Current admin users:' as info,
  user_id,
  role,
  first_name,
  last_name
FROM user_profiles 
WHERE role IN ('admin', 'super_admin'); 