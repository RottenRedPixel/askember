import { supabase } from './supabase.js';

export const checkRLSPolicies = async () => {
  try {
    console.log('📋 Checking RLS policies for ember_supporting_media...\n');
    
    // Check if RLS is enabled
    const { data: tableInfo, error: tableError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename, rowsecurity')
      .eq('tablename', 'ember_supporting_media');
    
    if (tableError) {
      console.error('❌ Error checking table info:', tableError);
      return;
    }
    
    console.log('🏗️  Table info:', tableInfo);
    
    // Try to use a raw SQL query to check policies
    const { data: policies, error: policiesError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'ember_supporting_media'
        ORDER BY policyname;
      `
    });
    
    if (policiesError) {
      console.log('⚠️  Could not get policies via RPC, trying alternative method...');
      
      // Try to get policies using auth.uid() check
      const { data: testData, error: testError } = await supabase
        .from('ember_supporting_media')
        .select('id, file_name, display_name')
        .limit(1);
        
      console.log('🔍 Test SELECT result:', { testData, testError });
      
      // Try a simple update on the same record to see the difference
      if (testData && testData.length > 0) {
        const testId = testData[0].id;
        console.log(`🧪 Attempting test UPDATE on record ${testId}...`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('ember_supporting_media')
          .update({ display_name: testData[0].display_name }) // Update with same value
          .eq('id', testId)
          .select();
          
        console.log('🔍 Test UPDATE result:', { updateData, updateError, dataLength: updateData?.length });
      }
    } else {
      console.log('✅ RLS Policies:', policies);
    }
    
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error);
  }
}; 