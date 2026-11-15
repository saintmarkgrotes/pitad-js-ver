import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from '../../services/authStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured = Boolean(url && /^https:\/\/[a-z0-9.-]+\/?$/i.test(url) &&
  !url.includes('your-project') && key?.startsWith('sb_publishable_') && !key.includes('replace_me'));

export const supabase = isSupabaseConfigured ? createClient(url, key, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Connect your Supabase project using the setup instructions in README.md.');
  return supabase;
}
