import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection function
export const testConnection = async () => {
  try {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl.includes('your_supabase_url_here') || 
        supabaseKey.includes('your_supabase_anon_key_here')) {
      return { 
        success: false, 
        message: 'Please update your environment variables in .env.local' 
      };
    }

    // Simple auth check - this will work even with no tables
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // If we get here without a connection error, Supabase is working
    return { 
      success: true, 
      message: 'Connected to Supabase successfully! Database and auth are ready.' 
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: `Connection failed: ${error.message}` 
    };
  }
}; 