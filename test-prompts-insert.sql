-- Test script to diagnose the prompts table issue
-- This temporarily disables RLS to test if that's the problem

-- First, check if the table exists
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'prompts' 
ORDER BY ordinal_position;

-- Temporarily disable RLS for testing
ALTER TABLE public.prompts DISABLE ROW LEVEL SECURITY;

-- Test a simple insert
INSERT INTO public.prompts (
  name,
  prompt_key,
  system_prompt,
  category
) VALUES (
  'Test Prompt',
  'test_prompt_123',
  'This is a test system prompt',
  'general'
);

-- Check if insert worked
SELECT COUNT(*) as total_prompts FROM public.prompts;

-- Re-enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

SELECT 'Test completed - check if insert worked above' as result; 