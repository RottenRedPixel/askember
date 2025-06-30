-- Verify if the delete_story_message function exists
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'delete_story_message'
  AND n.nspname = 'public';

-- Also check if there are any functions with similar names
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%delete%story%'
  AND n.nspname = 'public'; 