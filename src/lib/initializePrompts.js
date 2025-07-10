import { supabase } from './supabase.js';
import { initialPrompts } from './initialPrompts.js';

/**
 * Force update the story_cut_generation prompt in the database
 * This ensures the database has the latest AI-SCRIPT format
 */
export const updateStoryCutGenerationPrompt = async () => {
  try {
    console.log('🔄 Updating story_cut_generation prompt in database...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Find the story cut generation prompt in initial prompts
    const newPrompt = initialPrompts.find(p => p.prompt_key === 'story_cut_generation');
    if (!newPrompt) {
      throw new Error('story_cut_generation prompt not found in initialPrompts');
    }

    console.log('📝 New prompt version:', newPrompt.version);
    console.log('📝 New prompt returns ai_script instead of full_script');

    // Check if prompt exists in database
    const { data: existingPrompt } = await supabase
      .from('prompts')
      .select('*')
      .eq('prompt_key', 'story_cut_generation')
      .eq('is_active', true)
      .single();

    if (existingPrompt) {
      console.log('📝 Existing prompt version:', existingPrompt.version);
      
      // Update existing prompt with new format
      const { data, error } = await supabase
        .from('prompts')
        .update({
          title: newPrompt.title,
          description: newPrompt.description,
          system_prompt: newPrompt.system_prompt,
          user_prompt_template: newPrompt.user_prompt_template,
          // Convert version string to integer (v3.0 -> 3)
          version: parseInt(newPrompt.version.replace(/[v\.]/g, '')) || 3,
          updated_by_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPrompt.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Updated existing prompt to version:', data.version);
      return data;
    } else {
      // Create new prompt
      const promptData = {
        prompt_key: newPrompt.prompt_key,
        name: newPrompt.title,
        title: newPrompt.title,
        description: newPrompt.description,
        category: newPrompt.category,
        subcategory: newPrompt.subcategory,
        model: newPrompt.model,
        max_tokens: newPrompt.max_tokens,
        temperature: newPrompt.temperature,
        response_format: newPrompt.response_format,
        prompt_type: newPrompt.prompt_type,
        system_prompt: newPrompt.system_prompt,
        user_prompt_template: newPrompt.user_prompt_template,
        is_active: true,
        // Convert version string to integer (v3.0 -> 3)
        version: parseInt(newPrompt.version.replace(/[v\.]/g, '')) || 3,
        created_by_user_id: user.id,
        updated_by_user_id: user.id
      };

      const { data, error } = await supabase
        .from('prompts')
        .insert([promptData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Created new prompt version:', data.version);
      return data;
    }
  } catch (error) {
    console.error('❌ Error updating story_cut_generation prompt:', error);
    throw error;
  }
};

/**
 * Quick test function to check what the current prompt returns
 */
export const testCurrentPrompt = async () => {
  try {
    const { data, error } = await supabase.rpc('get_active_prompt', {
      prompt_key_param: 'story_cut_generation'
    });

    if (error) {
      console.error('❌ Error fetching prompt:', error);
      return;
    }

    if (data && data.length > 0) {
      const prompt = data[0];
      console.log('🔍 Current prompt version:', prompt.version);
      console.log('🔍 Returns ai_script?', prompt.user_prompt_template?.includes('ai_script'));
      console.log('🔍 Returns full_script?', prompt.user_prompt_template?.includes('full_script'));
      
      return {
        version: prompt.version,
        hasAiScript: prompt.user_prompt_template?.includes('ai_script'),
        hasFullScript: prompt.user_prompt_template?.includes('full_script')
      };
    } else {
      console.log('❌ No active prompt found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing prompt:', error);
    return null;
  }
}; 