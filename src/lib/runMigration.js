// Migration Runner
// Simple utility to run database migrations

import { supabase } from './supabase.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute SQL commands from a migration file
 * @param {string} sqlContent - The SQL content to execute
 * @returns {Promise<Object>} Result of the migration
 */
export async function executeMigration(sqlContent) {
  try {
    console.log('🚀 Starting migration...');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim() === '') continue;
      
      console.log(`📍 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Execute the SQL statement
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          results.push({
            statement: i + 1,
            success: false,
            error: error.message,
            sql: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
          });
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          results.push({
            statement: i + 1,
            success: true,
            data: data,
            sql: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
          });
        }
      } catch (error) {
        console.error(`❌ Exception in statement ${i + 1}:`, error);
        results.push({
          statement: i + 1,
          success: false,
          error: error.message,
          sql: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`📊 Migration complete: ${successCount} successful, ${failCount} failed`);
    
    return {
      success: failCount === 0,
      totalStatements: statements.length,
      successCount,
      failCount,
      results
    };
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

/**
 * Run the fixed prompts migration
 * @returns {Promise<Object>} Result of the migration
 */
export async function runPromptsFixMigration() {
  try {
    console.log('🔧 Running prompts table fix migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'fix_prompts_table.sql');
    const sqlContent = readFileSync(migrationPath, 'utf8');
    
    console.log('📂 Migration file loaded');
    
    // Execute the migration
    const result = await executeMigration(sqlContent);
    
    if (result.success) {
      console.log('✅ Prompts table fix migration completed successfully!');
    } else {
      console.error('❌ Prompts table fix migration failed');
      console.error('Failed operations:', result.results.filter(r => !r.success));
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error running prompts fix migration:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check prompts table structure after migration
 * @returns {Promise<Object>} Table structure info
 */
export async function checkPromptsTableStructure() {
  try {
    console.log('🔍 Checking prompts table structure...');
    
    const { data, error } = await supabase.rpc('get_prompts_table_info');
    
    if (error) {
      console.error('❌ Error checking table structure:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Prompts table structure:');
    console.table(data);
    
    return {
      success: true,
      columns: data
    };
    
  } catch (error) {
    console.error('❌ Error checking prompts table:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test the migration functions
 * @returns {Promise<Object>} Test results
 */
export async function testMigrationFunctions() {
  try {
    console.log('🧪 Testing migration functions...');
    
    const tests = [];
    
    // Test get_active_prompt function
    try {
      const { data, error } = await supabase.rpc('get_active_prompt', {
        prompt_key_param: 'test_key'
      });
      
      tests.push({
        name: 'get_active_prompt',
        success: !error,
        error: error?.message,
        result: data
      });
    } catch (error) {
      tests.push({
        name: 'get_active_prompt',
        success: false,
        error: error.message
      });
    }
    
    // Test get_prompts_by_category function
    try {
      const { data, error } = await supabase.rpc('get_prompts_by_category', {
        category_param: 'test_category'
      });
      
      tests.push({
        name: 'get_prompts_by_category',
        success: !error,
        error: error?.message,
        result: data
      });
    } catch (error) {
      tests.push({
        name: 'get_prompts_by_category',
        success: false,
        error: error.message
      });
    }
    
    // Test increment_prompt_usage function
    try {
      const { data, error } = await supabase.rpc('increment_prompt_usage', {
        prompt_key_param: 'test_key',
        tokens_used: 100,
        response_time_ms: 500,
        was_successful: true
      });
      
      tests.push({
        name: 'increment_prompt_usage',
        success: !error,
        error: error?.message,
        result: data
      });
    } catch (error) {
      tests.push({
        name: 'increment_prompt_usage',
        success: false,
        error: error.message
      });
    }
    
    const successCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;
    
    console.log(`🧪 Function tests complete: ${successCount} passed, ${failCount} failed`);
    
    if (failCount > 0) {
      console.log('❌ Failed tests:', tests.filter(t => !t.success));
    }
    
    return {
      success: failCount === 0,
      tests
    };
    
  } catch (error) {
    console.error('❌ Error testing migration functions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export a simple runner function
export async function runFullMigration() {
  console.log('🚀 Starting full prompts migration...');
  
  // Step 1: Run the migration
  const migrationResult = await runPromptsFixMigration();
  
  if (!migrationResult.success) {
    console.error('❌ Migration failed, stopping here');
    return migrationResult;
  }
  
  // Step 2: Check table structure
  const structureResult = await checkPromptsTableStructure();
  
  if (!structureResult.success) {
    console.error('⚠️ Could not verify table structure, but migration might have succeeded');
  }
  
  // Step 3: Test functions
  const testResult = await testMigrationFunctions();
  
  if (!testResult.success) {
    console.error('⚠️ Some functions failed tests, but migration might have succeeded');
  }
  
  return {
    success: migrationResult.success && structureResult.success && testResult.success,
    migration: migrationResult,
    structure: structureResult,
    tests: testResult
  };
} 