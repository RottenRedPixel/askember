-- Setup ONLY the RLS policies for prompts table
-- This avoids function conflicts

-- Re-enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Admin can read all prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admin can insert prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admin can update prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admin can delete prompts" ON public.prompts;
DROP POLICY IF EXISTS "Public can read active prompts" ON public.prompts;

-- Create policies for admin access
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

-- Allow public read access to active prompts (for app functionality)
CREATE POLICY "Public can read active prompts" ON public.prompts
  FOR SELECT USING (is_active = true);

-- Test the policies
SELECT 'RLS policies created successfully!' as status;

-- Check if current user can access prompts
SELECT 
  'Access test:' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN 'ADMIN ACCESS GRANTED'
    ELSE 'User access only (can read active prompts)'
  END as access_level; 