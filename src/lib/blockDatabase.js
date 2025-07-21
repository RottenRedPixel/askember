// New database functions that work with blocks instead of scripts
import { supabase } from './supabase.js';

/**
 * Save a story cut with blocks instead of script
 */
export const saveStoryCutWithBlocks = async (storyCutData) => {
    try {
        const insertData = {
            ember_id: storyCutData.emberId,
            creator_user_id: storyCutData.creatorUserId,
            title: storyCutData.title,
            style: storyCutData.style,
            duration: storyCutData.duration,
            word_count: storyCutData.wordCount,
            story_focus: storyCutData.storyFocus,

            // NEW: Use blocks instead of full_script
            blocks: {
                blocks: storyCutData.blocks || []
            },

            // Keep legacy fields for now
            ember_voice_lines: storyCutData.ember_voice_lines,
            narrator_voice_lines: storyCutData.narrator_voice_lines,
            selected_contributors: storyCutData.voiceCasting?.contributors,
            metadata: {
                ...storyCutData.metadata,
                recordedAudio: storyCutData.recordedAudio || {},
                messageIdMap: storyCutData.messageIdMap || {},
                usesBlocks: true // Flag to indicate this uses new format
            }
        };

        // Voice data (same as before)
        if (storyCutData.voiceCasting?.emberVoice?.voice_id) {
            insertData.ember_voice_id = storyCutData.voiceCasting.emberVoice.voice_id;
            insertData.ember_voice_name = storyCutData.ember_voice_name;
        }

        if (storyCutData.voiceCasting?.narratorVoice?.voice_id) {
            insertData.narrator_voice_id = storyCutData.voiceCasting.narratorVoice.voice_id;
            insertData.narrator_voice_name = storyCutData.narrator_voice_name;
        }

        const { data, error } = await supabase
            .from('ember_story_cuts')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;
    } catch (error) {
        console.error('Error saving story cut with blocks:', error);
        throw error;
    }
};

/**
 * Get story cuts with blocks (no script parsing needed)
 */
export const getStoryCutsWithBlocks = async (emberId) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        let data, error;

        if (user) {
            const result = await supabase
                .from('ember_story_cuts')
                .select(`
          *,
          creator:user_profiles!creator_user_id(
            user_id,
            first_name,
            last_name,
            avatar_url
          )
        `)
                .eq('ember_id', emberId)
                .order('created_at', { ascending: false });

            data = result.data;
            error = result.error;
        } else {
            // Public access
            const result = await supabase.rpc('get_public_story_cuts', {
                ember_uuid: emberId
            });
            data = result.data;
            error = result.error;
        }

        if (error) {
            throw new Error(error.message);
        }

        // Transform data to ensure blocks are available
        return (data || []).map(storyCut => ({
            ...storyCut,
            // Ensure blocks exist, fallback to conversion if needed
            blocks: storyCut.blocks?.blocks || []
        }));

    } catch (error) {
        console.error('Error fetching story cuts with blocks:', error);
        throw error;
    }
};

/**
 * Update story cut blocks
 */
export const updateStoryCutBlocks = async (storyCutId, blocks, userId) => {
    try {
        const { data, error } = await supabase
            .from('ember_story_cuts')
            .update({
                blocks: { blocks },
                updated_at: new Date().toISOString()
            })
            .eq('id', storyCutId)
            .eq('creator_user_id', userId)
            .select();

        if (error) {
            throw new Error(error.message);
        }

        return data[0];
    } catch (error) {
        console.error('Error updating story cut blocks:', error);
        throw error;
    }
}; 