import { create } from 'zustand';
import { supabase } from './lib/supabase';
import { getAllUsersWithEmails, createAdminUserCreationFunction, createUserProfileAdmin } from './lib/database';

let authListener = null;

const useStore = create((set, get) => ({
  // Counter state (existing)
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  // Auth state
  user: null,
  userProfile: null,
  isLoading: true,
  isAdmin: false,

  // Admin state
  allUsers: [],
  adminLoading: false,

  // Auth actions
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({
    userProfile: profile,
    isAdmin: profile?.role === 'super_admin'
  }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, userProfile: null, isAdmin: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  // Password gate functions
  clearPassword: () => {
    localStorage.removeItem('askember_password_verified');
    window.location.reload();
  },

  // Fetch user profile
  fetchUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (data) {
        get().setUserProfile(data);
        return data;
      }

      // Create profile if it doesn't exist
      const newProfile = {
        user_id: userId,
        role: 'user',
        created_at: new Date().toISOString()
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return null;
      }

      get().setUserProfile(createdProfile);
      return createdProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  },

  // Admin actions
  fetchAllUsers: async () => {
    const { isAdmin } = get();
    if (!isAdmin) return;

    set({ adminLoading: true });
    try {
      const users = await getAllUsersWithEmails();

      set({ allUsers: users });
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
      set({ allUsers: [] });
    } finally {
      set({ adminLoading: false });
    }
  },

  updateUserRole: async (userId, newRole) => {
    const { isAdmin } = get();
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      // Refresh users list
      await get().fetchAllUsers();
      return true;
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      return false;
    }
  },

  updateUserProfile: async (userId, profileData) => {
    const { isAdmin } = get();
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user profile:', error);
        return false;
      }

      // Refresh users list
      await get().fetchAllUsers();
      return true;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return false;
    }
  },

  createUser: async (userData) => {
    const { isAdmin } = get();
    if (!isAdmin) return { success: false, error: 'Not authorized' };

    try {
      console.log('Creating user with data:', userData);

      // Try to create user using admin function
      const data = await createUserProfileAdmin(userData);

      console.log('User profile created successfully:', data);

      // Refresh users list
      await get().fetchAllUsers();

      return { success: true, data };
    } catch (error) {
      console.error('Error in createUser:', error);

      // If the admin function doesn't exist, try to create it
      if (error.message.includes('function') && (error.message.includes('does not exist') || error.message.includes('not found') || error.message.includes('schema cache'))) {
        console.log('Admin function not found, trying to create it...');
        try {
          await createAdminUserCreationFunction();
          console.log('Admin function created, retrying user creation...');

          const data = await createUserProfileAdmin(userData);
          console.log('User profile created successfully after function creation:', data);

          // Refresh users list
          await get().fetchAllUsers();

          return { success: true, data };
        } catch (setupError) {
          console.error('Error setting up admin function:', setupError);
          return { success: false, error: `Setup failed: ${setupError.message}` };
        }
      }

      return { success: false, error: error.message };
    }
  },

  // Setup admin user creation capability
  setupAdminUserCreation: async () => {
    const { isAdmin } = get();
    if (!isAdmin) return { success: false, error: 'Not authorized' };

    try {
      await createAdminUserCreationFunction();
      return { success: true, message: 'Admin user creation function created successfully' };
    } catch (error) {
      console.error('Error setting up admin user creation:', error);
      return { success: false, error: error.message };
    }
  },

  // Send password reset email
  sendPasswordReset: async (email) => {
    const { isAdmin } = get();
    if (!isAdmin) return { success: false, error: 'Not authorized' };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`
      });

      if (error) throw error;

      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Error sending password reset:', error);
      return { success: false, error: error.message };
    }
  },

  // Initialize auth state
  initializeAuth: async () => {
    console.log('🔐 initializeAuth called');
    try {
      // Add a small delay to ensure Supabase is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      console.log('🔐 Initial session check:', { user: user?.id, session: !!session });

      set({ user, isLoading: false });

      if (user) {
        await get().fetchUserProfile(user.id);
      }

      // Unsubscribe previous listener if it exists
      if (authListener && typeof authListener.unsubscribe === 'function') {
        console.log('🔐 Unsubscribing previous auth listener');
        authListener.unsubscribe();
      }

      // Register listener only once
      console.log('🔐 Setting up auth state listener...');
      authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event, 'session:', session ? 'exists' : 'null');
        const newUser = session?.user ?? null;
        const currentUser = get().user;
        console.log('🔐 Listener: currentUser:', currentUser?.id, 'newUser:', newUser?.id);
        // Only update if user actually changed
        if (currentUser?.id !== newUser?.id) {
          set({ user: newUser, isLoading: false });
          if (newUser) {
            console.log('🔐 New user detected, fetching profile...');
            await get().fetchUserProfile(newUser.id);
          } else {
            console.log('🔐 User signed out, clearing profile');
            set({ userProfile: null, isAdmin: false });
          }
        } else {
          console.log('🔐 Listener: user unchanged, skipping update');
        }
      });
      console.log('🔐 Auth initialization completed successfully');
    } catch (error) {
      console.error('🔐 Error initializing auth:', error);
      set({ isLoading: false });
    }
  },
}));

export default useStore; 