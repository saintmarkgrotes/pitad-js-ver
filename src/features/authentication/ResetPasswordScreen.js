import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Field, Notice } from '../../components/common/ui';
import { isSupabaseConfigured } from '../../database/supabase/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { passwordSchema } from '../../validation/auth';
import { AuthShell } from './AuthShell';
import { authApi } from './api';

export default function ResetPasswordScreen() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const action = useAsyncAction();
  return <AuthShell title={step === 'password' ? 'A fresh start.' : 'Reset your password.'}
    description={step === 'email' ? 'We’ll send a recovery code to your email.' : step === 'code' ? 'If an account exists, a recovery code is on its way. Enter it below.' : 'Choose a new password with at least 12 characters.'} back="/">
    {step === 'email' && <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />}
    {step === 'code' && <Field label="Recovery code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} />}
    {step === 'password' && <>
      <Field label="New password" password value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="new-password" />
      <Field label="Confirm new password" password value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoComplete="new-password" />
    </>}
    <Notice error text={action.error} />
    {step !== 'done' && <Button title={step === 'email' ? 'Send recovery code' : step === 'code' ? 'Verify code' : 'Save new password'}
      loading={action.loading} disabled={!isSupabaseConfigured} onPress={() => action.run(async () => {
        if (step === 'email') { await authApi.requestReset(email); setStep('code'); }
        else if (step === 'code') { await authApi.verify(email, code, true); setStep('password'); }
        else {
          passwordSchema.parse(password);
          if (password !== confirm) { action.setError('Passwords do not match.'); return; }
          await authApi.updatePassword(password);
          setStep('done');
        }
      })} />}
    {step === 'code' && <Button secondary title="Use another email or request a new code" disabled={action.loading} onPress={() => setStep('email')} />}
    {step === 'done' && <><Notice text="Your password has been updated." /><Button title="Continue to pitad" onPress={() => router.replace('/')} /></>}
  </AuthShell>;
}
