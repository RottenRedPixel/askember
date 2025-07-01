-- Temporarily disable RLS on prompts table to test functionality
-- RUN THIS FIRST to get prompt creation working

-- Disable RLS temporarily
ALTER TABLE public.prompts DISABLE ROW LEVEL SECURITY;

-- Test that it's disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'prompts';

SELECT 'RLS disabled - try creating a prompt now!' as status; 