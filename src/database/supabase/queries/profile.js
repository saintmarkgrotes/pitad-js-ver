import { requireSupabase } from '../client';
import { profileSchema } from '../../../validation/auth';

export async function fetchProfile(userId, signal) {
  const { data, error } = await requireSupabase().from('profiles').select('id, display_name, username, distance_unit, is_private, created_at').eq('id', userId).abortSignal(signal).single();
  if (error) throw error;
  return data;
}
export async function updateProfile(userId, values) {
  const { data, error } = await requireSupabase().from('profiles').update(profileSchema.parse(values)).eq('id', userId).select('id, display_name, username, distance_unit, is_private, created_at').single();
  if (error) throw error;
  return data;
}
