import { requireSupabase } from '../../database/supabase/client';
import { codeSchema, emailSchema, loginSchema, passwordSchema, registerSchema } from '../../validation/auth';

async function unwrap(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
export const authApi = {
  login(values) { return unwrap(requireSupabase().auth.signInWithPassword(loginSchema.parse(values))); },
  register(values) {
    const { email, password, displayName } = registerSchema.parse(values);
    return unwrap(requireSupabase().auth.signUp({ email, password, options: { data: { display_name: displayName } } }));
  },
  verify(email, token, recovery = false) {
    return unwrap(requireSupabase().auth.verifyOtp({ email: emailSchema.parse(email), token: codeSchema.parse(token), type: recovery ? 'recovery' : 'email' }));
  },
  resend(email) { return unwrap(requireSupabase().auth.resend({ type: 'signup', email: emailSchema.parse(email) })); },
  requestReset(email) { return unwrap(requireSupabase().auth.resetPasswordForEmail(emailSchema.parse(email))); },
  updatePassword(password) { return unwrap(requireSupabase().auth.updateUser({ password: passwordSchema.parse(password) })); },
  async logout() {
    const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
    if (error) throw error;
  },
};
