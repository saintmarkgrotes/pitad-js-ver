import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Label, Notice } from '../../components/common/ui';
import { NavLink } from '../../components/common/NavLink';
import { isSupabaseConfigured } from '../../database/supabase/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { fieldErrors, registerSchema } from '../../validation/auth';
import { AuthShell } from './AuthShell';
import { authApi } from './api';

export default function RegisterScreen() {
  const [values, setValues] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const action = useAsyncAction();
  const update = (field) => (value) => setValues((current) => ({ ...current, [field]: value }));
  function submit() {
    const parsed = registerSchema.safeParse(values);
    setErrors(parsed.success ? {} : fieldErrors(parsed.error));
    if (!parsed.success) return;
    action.run(async () => {
      const result = await authApi.register(parsed.data);
      if (!result.session) router.replace({ pathname: '/verify-email', params: { email: parsed.data.email } });
    });
  }
  return <AuthShell title="Start your story." description="Create your account. Find your own rhythm.">
    <View style={{ gap: 16 }}>
      <Field label="Your name" value={values.displayName} onChangeText={update('displayName')} error={errors.displayName} autoComplete="name" maxLength={60} />
      <Field label="Email" value={values.email} onChangeText={update('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={values.password} onChangeText={update('password')} error={errors.password} password autoCapitalize="none" autoComplete="new-password" />
      <Label variant="caption" muted>Use at least 12 characters. A memorable passphrase works well.</Label>
      <Field label="Confirm password" value={values.confirmPassword} onChangeText={update('confirmPassword')} error={errors.confirmPassword} password autoCapitalize="none" autoComplete="new-password" onSubmitEditing={submit} />
      <Notice error text={action.error} />
      <Button title="Create account" onPress={submit} loading={action.loading} disabled={!isSupabaseConfigured} />
      <Label variant="caption" muted>Your profile starts private. You control your preferences from your profile.</Label>
      <NavLink href="/login">Already a member? Sign in →</NavLink>
    </View>
  </AuthShell>;
}
