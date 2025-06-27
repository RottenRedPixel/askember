import { supabase } from './supabase';

/**
 * Get all suggested names for an ember
 */
export async function getEmberSuggestedNames(emberId) {
  try {
    const { data, error } = await supabase
      .rpc('get_ember_suggested_names', { ember_uuid: emberId });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching suggested names:', error);
    throw error;
  }
}

/**
 * Add a new suggested name to an ember
 */
export async function addSuggestedName(emberId, suggestedName, isCustom = true) {
  try {
    const { data, error } = await supabase
      .rpc('add_ember_suggested_name', { 
        ember_uuid: emberId, 
        name_text: suggestedName,
        is_custom_name: isCustom
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding suggested name:', error);
    throw error;
  }
}

/**
 * Initialize default suggested names for a new ember
 */
export async function initializeDefaultSuggestedNames(emberId) {
  const defaultNames = [
    'Sunset Memory',
    'Golden Hour', 
    'Perfect Moment'
  ];

  try {
    const promises = defaultNames.map(name => 
      addSuggestedName(emberId, name, false) // false = not custom
    );
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error initializing default suggested names:', error);
    throw error;
  }
}

/**
 * Delete a suggested name (only if user created it or owns the ember)
 */
export async function deleteSuggestedName(nameId) {
  try {
    const { error } = await supabase
      .from('ember_suggested_names')
      .delete()
      .eq('id', nameId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting suggested name:', error);
    throw error;
  }
} 