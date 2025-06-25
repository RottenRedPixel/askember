import { supabase } from './supabase';

/**
 * Make the current logged-in user a super admin
 * This is a one-time setup function
 */
export const makeCurrentUserSuperAdmin = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No user logged in:', userError);
      return { success: false, error: 'No user logged in' };
    }

    console.log('Making user super admin:', user.email);

    // First, try to update existing profile
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'super_admin' })
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.log('Update failed, trying insert:', updateError.message);
      
      // If update failed, try to insert new profile
      const { data: insertData, error: insertError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: user.id,
          role: 'super_admin'
        }])
        .select();

      if (insertError) {
        console.error('Insert failed:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log('Created new super admin profile:', insertData);
      return { success: true, message: 'Created new super admin profile', data: insertData };
    }

    console.log('Updated user to super admin:', updateData);
    return { success: true, message: 'User updated to super admin', data: updateData };

  } catch (error) {
    console.error('Error making user super admin:', error);
    return { success: false, error: error.message };
  }
};

// Auto-run function for easy console access
window.makeUserSuperAdmin = makeCurrentUserSuperAdmin; 