import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Label, Notice, PageHeading, Screen } from '../../components/common/ui';
import { NavLink } from '../../components/common/NavLink';
import { updateProfile } from '../../database/supabase/queries/profile';
import { authApi } from '../authentication/api';
import { useProfile } from '../../hooks/useProfile';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { fieldErrors, profileSchema } from '../../validation/auth';

export default function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const query = useProfile();
  const { colors } = useTheme();
  const logout = useAsyncAction();
  return <Screen keyboard>
    <PageHeading eyebrow="PROFILE" title="Make it yours." description={session?.user.email || ''} />
    {query.isPending ? <ActivityIndicator accessibilityLabel="Loading profile" color={colors.primary} /> : query.isError ? <Card>
      <Notice error text="Your profile could not be loaded. Check your connection and confirm the database migration has been applied." />
      <Button title="Try again" onPress={() => query.refetch()} loading={query.isFetching} />
    </Card> : <ProfileForm key={session.user.id} profile={query.data} userId={session.user.id} />}
    <NavLink href="/reset-password">Reset password →</NavLink>
    <Notice error text={logout.error} />
    <Button secondary title="Sign out of this device" loading={logout.loading} onPress={() => logout.run(authApi.logout)} />
  </Screen>;
}

function ProfileForm({ profile, userId }) {
  const client = useQueryClient();
  const { colors } = useTheme();
  const [values, setValues] = useState(() => ({ display_name: profile.display_name || '', username: profile.username || '', distance_unit: profile.distance_unit, is_private: profile.is_private }));
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (/** @type {import('zod').infer<typeof profileSchema>} */ data) => updateProfile(userId, data),
    onSuccess: (data) => { client.setQueryData(['profile', userId], data); setSaved(true); },
  });
  const update = (field, value) => { setSaved(false); setValues((current) => ({ ...current, [field]: value })); };
  const save = () => {
    const parsed = profileSchema.safeParse(values);
    setErrors(parsed.success ? {} : fieldErrors(parsed.error));
    if (parsed.success) mutation.mutate(parsed.data);
  };
  return <>
      <Card>
        <Label variant="heading">Runner details</Label>
        <Field label="Your name" value={values.display_name} onChangeText={(value) => update('display_name', value)} error={errors.display_name} autoComplete="name" maxLength={60} />
        <Field label="Username" value={values.username} onChangeText={(value) => update('username', value)} error={errors.username} autoCapitalize="none" autoCorrect={false} maxLength={24} />
        <Label variant="caption" muted>3–24 letters, numbers, or underscores.</Label>
      </Card>
      <Card>
        <Label variant="heading">Your preferences</Label>
        <Label>Distance unit</Label>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {['km', 'mi'].map((unit) => <Pressable key={unit} accessibilityRole="radio" accessibilityState={{ checked: values.distance_unit === unit }}
            onPress={() => update('distance_unit', unit)} style={{ flex: 1, minHeight: 50, padding: 12, alignItems: 'center', borderRadius: 10,
              backgroundColor: values.distance_unit === unit ? colors.tint : colors.background, borderWidth: 1, borderColor: values.distance_unit === unit ? colors.primary : colors.border }}>
            <Label>{unit === 'km' ? 'Kilometers' : 'Miles'}</Label>
          </Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1 }}><Label>Private profile</Label><Label variant="caption" muted>Choose your preference for future sharing. Profiles are currently visible only to their owner.</Label></View>
          <Switch accessibilityLabel="Private profile" value={values.is_private} onValueChange={(value) => update('is_private', value)} trackColor={{ true: colors.primary }} />
        </View>
      </Card>
      {mutation.isError && <Notice error text={mutation.error?.['code'] === '23505' ? 'That username is taken. Try another.' : 'Unable to save your profile. Check your connection and try again.'} />}
      {saved && <Notice text="Your preferences have been saved." />}
      <Button title="Save profile" onPress={save} loading={mutation.isPending} />
  </>;
}
