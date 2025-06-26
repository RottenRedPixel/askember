import { supabase } from './supabase';

// Get ember with sharing information
export async function getEmberWithSharing(emberId) {
  try {
    const { data: ember, error: emberError } = await supabase
      .from('embers')
      .select('*')
      .eq('id', emberId)
      .single();

    if (emberError) throw emberError;

    // Get shares for this ember
    const { data: shares, error: sharesError } = await supabase
      .from('ember_shares')
      .select('*')
      .eq('ember_id', emberId)
      .eq('is_active', true);

    if (sharesError) throw sharesError;

    // Get user's permission level
    const { data: permission, error: permissionError } = await supabase
      .rpc('get_ember_permission', { ember_uuid: emberId });

    if (permissionError) throw permissionError;

    return {
      ...ember,
      shares: shares || [],
      userPermission: permission || 'none'
    };
  } catch (error) {
    console.error('Error fetching ember with sharing:', error);
    throw error;
  }
}

// Share ember with specific email
export async function shareEmber(emberId, email, permissionLevel) {
  try {
    const { data, error } = await supabase
      .from('ember_shares')
      .upsert({
        ember_id: emberId,
        shared_with_email: email.toLowerCase(),
        permission_level: permissionLevel,
        shared_by_user_id: (await supabase.auth.getUser()).data.user.id,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sharing ember:', error);
    throw error;
  }
}

// Remove share
export async function removeShare(shareId) {
  try {
    const { error } = await supabase
      .from('ember_shares')
      .update({ is_active: false })
      .eq('id', shareId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing share:', error);
    throw error;
  }
}

// Update ember public settings
export async function updateEmberPublicSettings(emberId, isPublic, allowPublicEdit = false) {
  try {
    const { data, error } = await supabase
      .from('embers')
      .update({
        is_public: isPublic,
        allow_public_edit: allowPublicEdit
      })
      .eq('id', emberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating ember public settings:', error);
    throw error;
  }
}

// Update share permission
export async function updateSharePermission(shareId, permissionLevel) {
  try {
    const { data, error } = await supabase
      .from('ember_shares')
      .update({ permission_level: permissionLevel })
      .eq('id', shareId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating share permission:', error);
    throw error;
  }
}

// Get sharing link for ember
export function getEmberSharingLink(emberId) {
  return `${window.location.origin}/embers/${emberId}`;
} 