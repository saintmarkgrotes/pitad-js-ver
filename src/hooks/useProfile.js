import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../database/supabase/queries/profile';
import { useAuthStore } from '../store/authStore';

export function useProfile() {
  const userId = useAuthStore((state) => state.session?.user.id);
  return useQuery({ queryKey: ['profile', userId], queryFn: ({ signal }) => fetchProfile(userId, signal), enabled: !!userId });
}
