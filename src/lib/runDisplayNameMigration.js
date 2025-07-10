// Migration Runner for Adding display_name to Supporting Media
// This script adds the display_name column to the ember_supporting_media table

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
 * Run the display_name migration
 * @returns {Promise<Object>} Result of the migration
 */
export async function runDisplayNameMigration() {
    try {
        console.log('🔧 Running display_name migration for supporting media...');

        // Read the migration file
        const migrationPath = join(__dirname, 'migrations', 'add_display_name_to_supporting_media.sql');
        const sqlContent = readFileSync(migrationPath, 'utf8');

        console.log('📂 Migration file loaded');

        // Execute the migration
        const result = await executeMigration(sqlContent);

        if (result.success) {
            console.log('✅ Display name migration completed successfully!');
        } else {
            console.error('❌ Display name migration failed');
            console.error('Failed operations:', result.results.filter(r => !r.success));
        }

        return result;

    } catch (error) {
        console.error('❌ Error running display name migration:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if display_name column exists in ember_supporting_media table
 * @returns {Promise<Object>} Column existence check result
 */
export async function checkDisplayNameColumn() {
    try {
        console.log('🔍 Checking if display_name column exists...');

        const { data, error } = await supabase
            .from('ember_supporting_media')
            .select('display_name')
            .limit(1);

        if (error) {
            if (error.message.includes('column') && error.message.includes('display_name')) {
                console.log('❌ display_name column does not exist - migration needed');
                return { exists: false, error: error.message };
            }
            console.error('❌ Error checking column:', error);
            return { exists: false, error: error.message };
        }

        console.log('✅ display_name column exists');
        return { exists: true };

    } catch (error) {
        console.error('❌ Error checking display_name column:', error);
        return {
            exists: false,
            error: error.message
        };
    }
}

/**
 * Main function to run the migration
 */
export async function main() {
    try {
        console.log('🚀 Starting display_name migration process...');

        // Check if column already exists
        const columnCheck = await checkDisplayNameColumn();

        if (columnCheck.exists) {
            console.log('✅ display_name column already exists. No migration needed.');
            return { success: true, message: 'Column already exists' };
        }

        // Run the migration
        const migrationResult = await runDisplayNameMigration();

        if (migrationResult.success) {
            console.log('🎉 Migration completed successfully!');

            // Verify the column was added
            const verifyCheck = await checkDisplayNameColumn();
            if (verifyCheck.exists) {
                console.log('✅ Verification successful - display_name column is now available');
            } else {
                console.log('⚠️  Migration appeared to succeed but column still not detected');
            }
        } else {
            console.error('❌ Migration failed');
        }

        return migrationResult;

    } catch (error) {
        console.error('❌ Error in migration process:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().then(result => {
        console.log('Migration process completed:', result);
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('Migration process failed:', error);
        process.exit(1);
    });
} 