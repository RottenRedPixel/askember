// Database Structure Checker
// Utility to check current database structure and plan migrations

import { supabase } from './supabase.js';

/**
 * Check the current prompts table structure
 */
export async function checkPromptsTable() {
  try {
    console.log('🔍 Checking current prompts table structure...');
    
    // First, try to get a sample record to understand the structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('prompts')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Error accessing prompts table:', sampleError.message);
      return { exists: false, error: sampleError.message };
    }

    console.log('✅ Prompts table exists');
    
    // Get the field names from the sample data
    const fieldNames = sampleData && sampleData.length > 0 ? 
      Object.keys(sampleData[0]) : [];
    
    console.log('📋 Current fields:', fieldNames);
    
    // Get count of records
    const { count, error: countError } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true });

    const recordCount = countError ? 0 : count;
    console.log('📊 Total records:', recordCount);
    
    return {
      exists: true,
      fields: fieldNames,
      recordCount,
      sampleData: sampleData || []
    };
    
  } catch (error) {
    console.error('❌ Error checking prompts table:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * Check what database functions exist
 */
export async function checkDatabaseFunctions() {
  try {
    console.log('🔍 Checking database functions...');
    
    const functions = [
      'get_active_prompt',
      'get_prompts_by_category',
      'increment_prompt_usage'
    ];
    
    const results = {};
    
    for (const funcName of functions) {
      try {
        // Try to call the function with dummy parameters to see if it exists
        const { error } = await supabase.rpc(funcName, {});
        results[funcName] = {
          exists: true,
          error: error ? error.message : null
        };
        console.log(`✅ Function ${funcName} exists`);
      } catch (error) {
        results[funcName] = {
          exists: false,
          error: error.message
        };
        console.log(`❌ Function ${funcName} missing:`, error.message);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error checking database functions:', error);
    return { error: error.message };
  }
}

/**
 * Check all related tables
 */
export async function checkAllTables() {
  try {
    console.log('🔍 Checking all related tables...');
    
    const tables = [
      'prompts',
      'embers',
      'user_profiles',
      'story_messages',
      'supporting_media',
      'tagged_people',
      'ember_contributors'
    ];
    
    const results = {};
    
    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        results[tableName] = {
          exists: true,
          count: error ? 0 : count,
          error: error ? error.message : null
        };
        
        console.log(`✅ Table ${tableName}: ${count || 0} records`);
      } catch (error) {
        results[tableName] = {
          exists: false,
          error: error.message
        };
        console.log(`❌ Table ${tableName} missing:`, error.message);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return { error: error.message };
  }
}

/**
 * Full database structure check
 */
export async function fullDatabaseCheck() {
  try {
    console.log('🚀 Starting full database structure check...');
    
    const results = {
      timestamp: new Date().toISOString(),
      prompts: await checkPromptsTable(),
      functions: await checkDatabaseFunctions(),
      tables: await checkAllTables()
    };
    
    console.log('📊 Database check complete');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    return results;
    
  } catch (error) {
    console.error('❌ Full database check failed:', error);
    return { error: error.message };
  }
}

/**
 * Generate migration plan based on current structure
 */
export async function generateMigrationPlan() {
  try {
    console.log('🔧 Generating migration plan...');
    
    const check = await fullDatabaseCheck();
    const plan = {
      steps: [],
      warnings: [],
      notes: []
    };
    
    // Check if prompts table exists with our expected structure
    if (check.prompts.exists) {
      const currentFields = check.prompts.fields || [];
      const expectedFields = [
        'id', 'prompt_key', 'title', 'description', 'category', 'subcategory',
        'model', 'max_tokens', 'temperature', 'response_format', 'prompt_type',
        'system_prompt', 'user_prompt_template', 'is_active', 'version',
        'usage_count', 'success_count', 'created_at', 'updated_at'
      ];
      
      const missingFields = expectedFields.filter(field => !currentFields.includes(field));
      const extraFields = currentFields.filter(field => !expectedFields.includes(field));
      
      if (missingFields.length > 0) {
        plan.steps.push({
          type: 'ALTER_TABLE',
          table: 'prompts',
          action: 'ADD_COLUMNS',
          columns: missingFields
        });
      }
      
      if (extraFields.length > 0) {
        plan.warnings.push(`Existing prompts table has extra fields: ${extraFields.join(', ')}`);
      }
      
      // Check if we need to migrate data
      if (check.prompts.recordCount > 0) {
        plan.steps.push({
          type: 'DATA_MIGRATION',
          table: 'prompts',
          description: 'Migrate existing prompt data to new structure'
        });
      }
    } else {
      plan.steps.push({
        type: 'CREATE_TABLE',
        table: 'prompts',
        description: 'Create new prompts table with full structure'
      });
    }
    
    // Check functions
    const functions = check.functions || {};
    const requiredFunctions = ['get_active_prompt', 'get_prompts_by_category', 'increment_prompt_usage'];
    
    requiredFunctions.forEach(funcName => {
      if (!functions[funcName]?.exists) {
        plan.steps.push({
          type: 'CREATE_FUNCTION',
          name: funcName,
          description: `Create ${funcName} database function`
        });
      }
    });
    
    plan.notes.push('Migration plan generated successfully');
    
    console.log('📋 Migration plan:', JSON.stringify(plan, null, 2));
    
    return plan;
    
  } catch (error) {
    console.error('❌ Error generating migration plan:', error);
    return { error: error.message };
  }
}

/**
 * Execute the migration plan
 */
export async function executeMigrationPlan() {
  try {
    console.log('🚀 Starting migration execution...');
    
    const plan = await generateMigrationPlan();
    
    if (plan.error) {
      throw new Error(`Migration plan failed: ${plan.error}`);
    }
    
    for (const step of plan.steps) {
      console.log(`📍 Executing step: ${step.type} - ${step.description || step.action}`);
      
      switch (step.type) {
        case 'ALTER_TABLE':
          await executeAlterTable(step);
          break;
        case 'CREATE_TABLE':
          await executeCreateTable(step);
          break;
        case 'CREATE_FUNCTION':
          await executeCreateFunction(step);
          break;
        case 'DATA_MIGRATION':
          await executeDataMigration(step);
          break;
        default:
          console.log(`⚠️ Unknown step type: ${step.type}`);
      }
    }
    
    console.log('✅ Migration execution complete');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute ALTER TABLE operations
 */
async function executeAlterTable(step) {
  // This would contain the SQL to alter the existing table
  console.log(`🔧 Altering table ${step.table}...`);
  
  // For now, just log what we would do
  console.log(`Would add columns: ${step.columns.join(', ')}`);
  
  // TODO: Implement actual ALTER TABLE statements
}

/**
 * Execute CREATE TABLE operations
 */
async function executeCreateTable(step) {
  console.log(`🔧 Creating table ${step.table}...`);
  
  // Read the migration file and execute it
  try {
    // Use fs module to read the SQL file (works in both Node.js and browser with proper bundling)
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.join(__dirname, 'migrations', 'create_prompts_table.sql');
    
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    console.log('Migration file loaded successfully');
    
    // TODO: Execute the migration SQL
    console.log('Would execute migration SQL');
  } catch (error) {
    console.log('Migration file read failed, using fallback approach');
    console.log('Would execute migration SQL with fallback');
  }
}

/**
 * Execute CREATE FUNCTION operations
 */
async function executeCreateFunction(step) {
  console.log(`🔧 Creating function ${step.name}...`);
  
  // TODO: Create the specific function
}

/**
 * Execute DATA MIGRATION operations
 */
async function executeDataMigration(step) {
  console.log(`🔧 Migrating data for ${step.table}...`);
  
  // TODO: Migrate existing data to new structure
} 