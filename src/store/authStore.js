import { create } from 'zustand';

export const useAuthStore = create(() => ({
  session: /** @type {import('@supabase/supabase-js').Session | null} */ (null),
  ready: false,
  error: '',
}));
