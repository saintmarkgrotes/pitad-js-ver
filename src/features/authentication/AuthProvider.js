import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../../database/supabase/client';
import { queryClient } from '../../services/queryClient';
import { useAuthStore } from '../../store/authStore';
import { observeSession } from './session';

export function AuthProvider({ children }) {
  useEffect(() => {
    if (!supabase) { useAuthStore.setState({ ready: true }); return; }
    const stop = observeSession(supabase.auth, (session) => {
      const oldUser = useAuthStore.getState().session?.user.id;
      if (oldUser !== session?.user.id) queryClient.clear();
      useAuthStore.setState({ session, ready: true, error: '' });
    }, () => useAuthStore.setState({ ready: true, error: 'Your saved session could not be restored. Please sign in again.' }));
    const updateRefresh = (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    const subscription = Platform.OS !== 'web' ? AppState.addEventListener('change', updateRefresh) : null;
    if (Platform.OS !== 'web') updateRefresh(AppState.currentState);
    return () => { stop(); subscription?.remove(); if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh(); };
  }, []);
  return children;
}
