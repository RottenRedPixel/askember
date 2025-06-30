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

    // Get participant profiles using the secure function
    const { data: participants, error: participantsError } = await supabase
      .rpc('get_ember_participant_profiles', { ember_uuid: emberId });

    console.log('Participants from function:', participants);

    if (participantsError) {
      console.log('Error fetching participants:', participantsError);
    }

    // Separate owner and shared users
    const owner = participants?.find(p => p.is_owner) || null;
    const shares = participants?.filter(p => !p.is_owner).map(p => ({
      id: p.share_id, // Use share_id (ember_shares.id) instead of user profile id
      shared_with_email: p.email,
      permission_level: p.role,
      shared_user: {
        id: p.id, // Keep user profile id here for user info
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        email: p.email
      }
    })) || [];

    // Get user's permission level
    const { data: permission, error: permissionError } = await supabase
      .rpc('get_ember_permission', { ember_uuid: emberId });

    if (permissionError) throw permissionError;

    return {
      ...ember,
      owner: owner,
      shares: shares,
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

// Get embers shared with the current user
export async function getSharedEmbers() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data: shares, error } = await supabase
      .from('ember_shares')
      .select(`
        *,
        ember:embers(*)
      `)
      .eq('shared_with_email', user.email)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Extract ember data and add sharing metadata
    return shares.map(share => ({
      ...share.ember,
      shareInfo: {
        permission_level: share.permission_level,
        shared_by_user_id: share.shared_by_user_id,
        shared_at: share.created_at
      }
    }));
  } catch (error) {
    console.error('Error fetching shared embers:', error);
    throw error;
  }
} 