import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Field, Notice } from '../../components/common/ui';
import { isSupabaseConfigured } from '../../database/supabase/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { AuthShell } from './AuthShell';
import { authApi } from './api';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const action = useAsyncAction();
  return <AuthShell title="Check your inbox." description="Enter the confirmation code from pitad. Check your spam folder if it hasn’t arrived." back="/login">
    <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
    <Field label="Confirmation code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} />
    <Notice error text={action.error} /><Notice text={message} />
    <Button title="Confirm email" loading={action.loading} disabled={!isSupabaseConfigured} onPress={() => action.run(async () => {
      await authApi.verify(email, code);
      router.replace('/');
    })} />
    <Button secondary title="Send a new code" disabled={action.loading || !isSupabaseConfigured} onPress={() => action.run(async () => {
      await authApi.resend(email); setMessage('If confirmation is needed, a new code is on its way.');
    })} />
  </AuthShell>;
}
