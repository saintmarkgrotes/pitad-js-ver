import { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Notice } from '../../components/common/ui';
import { NavLink } from '../../components/common/NavLink';
import { isSupabaseConfigured } from '../../database/supabase/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuthStore } from '../../store/authStore';
import { fieldErrors, loginSchema } from '../../validation/auth';
import { AuthShell } from './AuthShell';
import { authApi } from './api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const action = useAsyncAction();
  const sessionError = useAuthStore((state) => state.error);
  function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    setErrors(parsed.success ? {} : fieldErrors(parsed.error));
    if (parsed.success) action.run(() => authApi.login(parsed.data));
  }
  return <AuthShell title="Welcome back." description="A fresh start is just a sign-in away.">
    <View style={{ gap: 16 }}>
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} error={errors.password} password autoCapitalize="none" autoComplete="current-password" onSubmitEditing={submit} />
      <NavLink href="/reset-password">Forgot password?</NavLink>
      <Notice error text={action.error || sessionError} />
      <Button title="Sign in" onPress={submit} loading={action.loading} disabled={!isSupabaseConfigured} />
      <NavLink href={{ pathname: '/verify-email', params: { email } }}>Confirm your email</NavLink>
      <NavLink href="/register">New to pitad? Create an account →</NavLink>
    </View>
  </AuthShell>;
}
