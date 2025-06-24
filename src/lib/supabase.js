import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (expected)
      throw error;
    }
    return { success: true, message: 'Connected to Supabase successfully!' };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}; 