// Script to check ember_supporting_media table structure
// This will help us understand what columns exist and why the update is failing

import { supabase } from './supabase.js';

/**
 * Check what columns exist in ember_supporting_media table
 */
async function checkTableStructure() {
    try {
        console.log('🔍 Checking ember_supporting_media table structure...');

        // Try to get one record with all columns to see what exists
        const { data: sampleData, error: sampleError } = await supabase
            .from('ember_supporting_media')
            .select('*')
            .limit(1);

        if (sampleError) {
            console.error('❌ Error querying table:', sampleError);
            return { success: false, error: sampleError.message };
        }

        if (sampleData && sampleData.length > 0) {
            console.log('✅ Table exists. Sample record columns:');
            console.log('📋 Available columns:', Object.keys(sampleData[0]));

            // Check specifically for display_name
            const hasDisplayName = Object.keys(sampleData[0]).includes('display_name');
            console.log(`${hasDisplayName ? '✅' : '❌'} display_name column exists: ${hasDisplayName}`);

            return {
                success: true,
                columns: Object.keys(sampleData[0]),
                hasDisplayName,
                sampleRecord: sampleData[0]
            };
        } else {
            console.log('⚠️  Table exists but has no records');

            // Try to select specific columns to see which ones exist
            const testColumns = ['id', 'file_name', 'display_name', 'ember_id', 'created_at'];
            const columnTests = {};

            for (const column of testColumns) {
                try {
                    const { error } = await supabase
                        .from('ember_supporting_media')
                        .select(column)
                        .limit(1);

                    columnTests[column] = !error;
                    console.log(`${!error ? '✅' : '❌'} ${column} column: ${!error ? 'exists' : 'missing'}`);
                } catch (err) {
                    columnTests[column] = false;
                    console.log(`❌ ${column} column: missing`);
                }
            }

            return {
                success: true,
                columns: Object.keys(columnTests).filter(col => columnTests[col]),
                hasDisplayName: columnTests.display_name,
                columnTests
            };
        }

    } catch (error) {
        console.error('❌ Error checking table structure:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Try to query the specific record that's failing
 */
async function checkSpecificRecord() {
    try {
        const mediaId = '8e5808e3-ec8d-4a01-b2ad-d0a127ddf88d';
        console.log(`🔍 Checking specific record: ${mediaId}`);

        const { data, error } = await supabase
            .from('ember_supporting_media')
            .select('*')
            .eq('id', mediaId);

        if (error) {
            console.error('❌ Error querying specific record:', error);
            return { success: false, error: error.message };
        }

        if (data && data.length > 0) {
            console.log('✅ Record found:');
            console.log('📋 Record data:', data[0]);
            console.log('📋 Record columns:', Object.keys(data[0]));

            return {
                success: true,
                record: data[0],
                columns: Object.keys(data[0])
            };
        } else {
            console.log('❌ Record not found');
            return { success: false, error: 'Record not found' };
        }

    } catch (error) {
        console.error('❌ Error checking specific record:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test the update query directly
 */
async function testUpdateQuery() {
    try {
        const mediaId = '8e5808e3-ec8d-4a01-b2ad-d0a127ddf88d';
        const testDisplayName = 'Test Display Name';

        console.log(`🧪 Testing update query for record: ${mediaId}`);

        // First check if record exists
        const { data: existingRecord, error: checkError } = await supabase
            .from('ember_supporting_media')
            .select('id, file_name')
            .eq('id', mediaId);

        if (checkError) {
            console.error('❌ Error checking record existence:', checkError);
            return { success: false, error: checkError.message };
        }

        if (!existingRecord || existingRecord.length === 0) {
            console.log('❌ Record does not exist');
            return { success: false, error: 'Record not found' };
        }

        console.log('✅ Record exists:', existingRecord[0]);

        // Now try the update
        const { data: updateData, error: updateError } = await supabase
            .from('ember_supporting_media')
            .update({ display_name: testDisplayName })
            .eq('id', mediaId)
            .select();

        if (updateError) {
            console.error('❌ Update error:', updateError);
            return { success: false, error: updateError.message };
        }

        console.log('🧪 Update result:', updateData);
        console.log('🧪 Rows updated:', updateData ? updateData.length : 0);

        return {
            success: true,
            updateResult: updateData,
            rowsUpdated: updateData ? updateData.length : 0
        };

    } catch (error) {
        console.error('❌ Error testing update query:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
    try {
        console.log('🚀 Starting table diagnostics...\n');

        // Check table structure
        console.log('=== TABLE STRUCTURE CHECK ===');
        const structureResult = await checkTableStructure();
        console.log('Structure check result:', structureResult);
        console.log('');

        // Check specific record
        console.log('=== SPECIFIC RECORD CHECK ===');
        const recordResult = await checkSpecificRecord();
        console.log('Record check result:', recordResult);
        console.log('');

        // Test update query
        console.log('=== UPDATE QUERY TEST ===');
        const updateResult = await testUpdateQuery();
        console.log('Update test result:', updateResult);
        console.log('');

        // Summary
        console.log('=== SUMMARY ===');
        console.log('✅ Diagnostics completed');
        console.log('📋 Table has display_name column:', structureResult.hasDisplayName);
        console.log('📋 Record exists:', recordResult.success);
        console.log('📋 Update test successful:', updateResult.success);

        return {
            tableStructure: structureResult,
            recordCheck: recordResult,
            updateTest: updateResult
        };

    } catch (error) {
        console.error('❌ Error running diagnostics:', error);
        return { success: false, error: error.message };
    }
}

// Run diagnostics
runDiagnostics()
    .then(result => {
        console.log('\n🎉 Diagnostics completed!');
        console.log('Full result:', JSON.stringify(result, null, 2));
    })
    .catch(error => {
        console.error('❌ Diagnostics failed:', error);
    }); 