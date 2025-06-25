-- Enable SQL execution from the app (DEVELOPMENT ONLY)
-- WARNING: This is for development purposes only. Remove in production.

CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow super admins to execute SQL
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can execute SQL';
  END IF;
  
  -- Execute the SQL and return result as JSON
  EXECUTE sql_query;
  
  -- Return success status
  result := json_build_object('status', 'success', 'message', 'SQL executed successfully');
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    result := json_build_object(
      'status', 'error', 
      'message', SQLERRM,
      'detail', SQLSTATE
    );
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated; 