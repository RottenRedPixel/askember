import { create } from 'zustand';
import { supabase } from './lib/supabase';

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
      // Use the custom function to get user profiles with email
      const { data, error } = await supabase
        .rpc('get_user_profiles_with_email');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Transform the data to match the expected format
      const transformedUsers = (data || []).map(user => ({
        id: user.id,
        user_id: user.user_id,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        auth_users: {
          email: user.email,
          created_at: user.auth_created_at,
          last_sign_in_at: user.last_sign_in_at
        }
      }));

      set({ allUsers: transformedUsers });
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
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

  // Initialize auth state
  initializeAuth: async () => {
    console.log('🔐 Starting auth initialization...');
    try {
      console.log('🔐 Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      console.log('🔐 Session retrieved, user:', user ? user.id : 'null');
      
      set({ user, isLoading: false });
      console.log('🔐 Auth state updated - isLoading set to false');

      // Fetch user profile if user exists
      if (user) {
        console.log('🔐 Fetching user profile...');
        await get().fetchUserProfile(user.id);
        console.log('🔐 User profile fetch completed');
      }

      // Listen for auth changes
      console.log('🔐 Setting up auth state listener...');
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event, 'session:', session ? 'exists' : 'null');
        const newUser = session?.user ?? null;
        set({ user: newUser, isLoading: false });
        
        if (newUser) {
          console.log('🔐 New user detected, fetching profile...');
          await get().fetchUserProfile(newUser.id);
        } else {
          console.log('🔐 User signed out, clearing profile');
          set({ userProfile: null, isAdmin: false });
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