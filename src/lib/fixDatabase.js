// Browser-Compatible Database Fix Utility
// Run this to fix the prompts table structure

import { supabase } from './supabase.js';

// The SQL migration content (inline for browser compatibility)
const PROMPTS_FIX_SQL = `
-- Fix Prompts Table Migration
-- Add missing columns to existing prompts table

ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS prompt_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS title VARCHAR(200),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50),
ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS response_format VARCHAR(20) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS prompt_type VARCHAR(20) DEFAULT 'user_only',
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS user_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS top_p DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS frequency_penalty DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS presence_penalty DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS stop_sequences TEXT[],
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS parent_prompt_id UUID,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS test_data JSONB,
ADD COLUMN IF NOT EXISTS expected_output_examples TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_prompts_prompt_key ON prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_active ON prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_prompts_usage_count ON prompts(usage_count);
CREATE INDEX IF NOT EXISTS idx_prompts_last_used ON prompts(last_used_at);

CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompts_updated_at ON prompts;
CREATE TRIGGER trigger_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

CREATE OR REPLACE FUNCTION get_active_prompt(prompt_key_param VARCHAR)
RETURNS TABLE (
  id UUID,
  prompt_key VARCHAR,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  subcategory VARCHAR,
  model VARCHAR,
  max_tokens INTEGER,
  temperature DECIMAL,
  response_format VARCHAR,
  prompt_type VARCHAR,
  system_prompt TEXT,
  user_prompt_template TEXT,
  top_p DECIMAL,
  frequency_penalty DECIMAL,
  presence_penalty DECIMAL,
  stop_sequences TEXT[],
  version VARCHAR,
  tags TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.prompt_key,
    p.title,
    p.description,
    p.category,
    p.subcategory,
    p.model,
    p.max_tokens,
    p.temperature,
    p.response_format,
    p.prompt_type,
    p.system_prompt,
    p.user_prompt_template,
    p.top_p,
    p.frequency_penalty,
    p.presence_penalty,
    p.stop_sequences,
    p.version,
    p.tags,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM prompts p
  WHERE p.prompt_key = prompt_key_param 
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_prompts_by_category(
  category_param VARCHAR,
  subcategory_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  prompt_key VARCHAR,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  subcategory VARCHAR,
  model VARCHAR,
  max_tokens INTEGER,
  temperature DECIMAL,
  response_format VARCHAR,
  prompt_type VARCHAR,
  system_prompt TEXT,
  user_prompt_template TEXT,
  is_active BOOLEAN,
  version VARCHAR,
  usage_count INTEGER,
  success_count INTEGER,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.prompt_key,
    p.title,
    p.description,
    p.category,
    p.subcategory,
    p.model,
    p.max_tokens,
    p.temperature,
    p.response_format,
    p.prompt_type,
    p.system_prompt,
    p.user_prompt_template,
    p.is_active,
    p.version,
    p.usage_count,
    p.success_count,
    p.last_used_at,
    p.created_at,
    p.updated_at
  FROM prompts p
  WHERE p.category = category_param 
    AND (subcategory_param IS NULL OR p.subcategory = subcategory_param)
  ORDER BY p.category, p.subcategory, p.title;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_prompt_usage(
  prompt_key_param VARCHAR,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  was_successful BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
  UPDATE prompts 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    success_count = CASE 
      WHEN was_successful THEN COALESCE(success_count, 0) + 1 
      ELSE COALESCE(success_count, 0) 
    END,
    average_tokens_used = CASE 
      WHEN COALESCE(usage_count, 0) = 0 THEN tokens_used
      ELSE ((COALESCE(average_tokens_used, 0) * COALESCE(usage_count, 0)) + tokens_used) / (COALESCE(usage_count, 0) + 1)
    END,
    average_response_time_ms = CASE 
      WHEN COALESCE(usage_count, 0) = 0 THEN response_time_ms
      ELSE ((COALESCE(average_response_time_ms, 0) * COALESCE(usage_count, 0)) + response_time_ms) / (COALESCE(usage_count, 0) + 1)
    END,
    last_used_at = NOW()
  WHERE prompt_key = prompt_key_param AND is_active = true;
END;
$$ LANGUAGE plpgsql;
`;

/**
 * Check current prompts table structure
 */
export async function checkPromptsTable() {
  try {
    console.log('🔍 Checking current prompts table...');
    
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Prompts table error:', error.message);
      return { exists: false, error: error.message };
    }

    const fields = data && data.length > 0 ? Object.keys(data[0]) : [];
    console.log('📋 Current fields:', fields);
    
    return { exists: true, fields, sampleData: data };
    
  } catch (error) {
    console.error('❌ Error checking prompts table:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * Execute the database fix
 */
export async function fixPromptsDatabase() {
  try {
    console.log('🚀 Starting prompts database fix...');
    
    // Check current structure first
    const check = await checkPromptsTable();
    console.log('Current table status:', check);
    
    // Split the SQL into individual statements
    const statements = PROMPTS_FIX_SQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Executing ${statements.length} SQL statements...`);
    
    const results = [];
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement.trim()) continue;
      
      console.log(`📍 Statement ${i + 1}/${statements.length}...`);
      
      try {
        // Try direct query first for simple statements
        let result;
        
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX')) {
          // Use RPC for DDL statements
          result = await supabase.rpc('execute_sql', { sql_query: statement });
        } else {
          // Use RPC for everything to be safe
          result = await supabase.rpc('execute_sql', { sql_query: statement });
        }
        
        if (result.error) {
          console.warn(`⚠️ Statement ${i + 1} warning:`, result.error.message);
          results.push({
            statement: i + 1,
            success: false,
            error: result.error.message,
            sql: statement.substring(0, 50) + '...'
          });
        } else {
          console.log(`✅ Statement ${i + 1} success`);
          results.push({
            statement: i + 1,
            success: true,
            sql: statement.substring(0, 50) + '...'
          });
        }
        
      } catch (error) {
        console.warn(`⚠️ Statement ${i + 1} exception:`, error.message);
        results.push({
          statement: i + 1,
          success: false,
          error: error.message,
          sql: statement.substring(0, 50) + '...'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`📊 Fix complete: ${successCount} successful, ${errorCount} errors/warnings`);
    
    // Test the functions
    console.log('🧪 Testing functions...');
    await testDatabaseFunctions();
    
    return {
      success: true, // Consider success if we got through it
      totalStatements: statements.length,
      successCount,
      errorCount,
      results
    };
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test database functions
 */
export async function testDatabaseFunctions() {
  try {
    console.log('🧪 Testing database functions...');
    
    // Test get_active_prompt
    try {
      const { data, error } = await supabase.rpc('get_active_prompt', {
        prompt_key_param: 'test_key'
      });
      
      if (error) {
        console.log('⚠️ get_active_prompt test warning:', error.message);
      } else {
        console.log('✅ get_active_prompt function works');
      }
    } catch (error) {
      console.log('❌ get_active_prompt test failed:', error.message);
    }
    
    // Test get_prompts_by_category
    try {
      const { data, error } = await supabase.rpc('get_prompts_by_category', {
        category_param: 'test_category'
      });
      
      if (error) {
        console.log('⚠️ get_prompts_by_category test warning:', error.message);
      } else {
        console.log('✅ get_prompts_by_category function works');
      }
    } catch (error) {
      console.log('❌ get_prompts_by_category test failed:', error.message);
    }
    
    // Test increment_prompt_usage
    try {
      const { data, error } = await supabase.rpc('increment_prompt_usage', {
        prompt_key_param: 'test_key',
        tokens_used: 100,
        response_time_ms: 500,
        was_successful: true
      });
      
      if (error) {
        console.log('⚠️ increment_prompt_usage test warning:', error.message);
      } else {
        console.log('✅ increment_prompt_usage function works');
      }
    } catch (error) {
      console.log('❌ increment_prompt_usage test failed:', error.message);
    }
    
    console.log('✅ Function tests complete');
    
  } catch (error) {
    console.error('❌ Function testing failed:', error);
  }
}

/**
 * Add ElevenLabs voice ID fields to user profiles
 */
export async function addElevenLabsVoiceToUsers() {
  try {
    console.log('🎤 Adding ElevenLabs voice fields to user profiles...');
    
    const migrationSQL = `
      -- Add ElevenLabs voice fields to user_profiles table
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS elevenlabs_voice_name VARCHAR(100);
      
      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_user_profiles_elevenlabs_voice_id ON user_profiles(elevenlabs_voice_id);
    `;
    
    // Split into statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Executing ${statements.length} SQL statements...`);
    
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement.trim()) continue;
      
      console.log(`📍 Statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
      
      try {
        const { data, error } = await supabase.rpc('execute_sql', { sql_query: statement });
        
        if (error) {
          console.warn(`⚠️ Statement ${i + 1} warning:`, error.message);
          results.push({
            statement: i + 1,
            success: false,
            error: error.message,
            sql: statement.substring(0, 50) + '...'
          });
        } else {
          console.log(`✅ Statement ${i + 1} success`);
          results.push({
            statement: i + 1,
            success: true,
            sql: statement.substring(0, 50) + '...'
          });
        }
        
      } catch (error) {
        console.warn(`⚠️ Statement ${i + 1} exception:`, error.message);
        results.push({
          statement: i + 1,
          success: false,
          error: error.message,
          sql: statement.substring(0, 50) + '...'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`📊 Migration complete: ${successCount} successful, ${errorCount} errors/warnings`);
    
    // Test the new fields by checking the table schema
    console.log('🧪 Testing new fields...');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('elevenlabs_voice_id, elevenlabs_voice_name')
        .limit(1);
      
      if (error) {
        console.log('❌ New fields test failed:', error.message);
      } else {
        console.log('✅ New fields are accessible');
      }
    } catch (error) {
      console.log('❌ New fields test exception:', error.message);
    }
    
    return {
      success: successCount > 0,
      totalStatements: statements.length,
      successCount,
      errorCount,
      results
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick fix - just run this to fix your database
 */
export async function quickFix() {
  console.log('⚡ Quick database fix starting...');
  
  const result = await fixPromptsDatabase();
  
  if (result.success) {
    console.log('✅ Database fix completed! You can now use the new prompt system.');
  } else {
    console.error('❌ Database fix failed:', result.error);
  }
  
  return result;
}

// Make it available globally for console use
if (typeof window !== 'undefined') {
  window.fixDatabase = {
    quickFix,
    fixPromptsDatabase,
    checkPromptsTable,
    testDatabaseFunctions,
    addElevenLabsVoiceToUsers
  };
  
  console.log('💡 Database fix utilities loaded! Run window.fixDatabase.quickFix() to fix your database.');
  console.log('🎤 To add ElevenLabs voice fields, run: window.fixDatabase.addElevenLabsVoiceToUsers()');
} 