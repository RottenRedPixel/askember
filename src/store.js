import { create } from 'zustand';
import { supabase } from './lib/supabase';

const useStore = create((set, get) => ({
  // Counter state (existing)
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  // Auth state
  user: null,
  isLoading: true,
  
  // Auth actions
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  // Initialize auth state
  initializeAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, isLoading: false });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        set({ user: session?.user ?? null, isLoading: false });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },
}));

export default useStore; 