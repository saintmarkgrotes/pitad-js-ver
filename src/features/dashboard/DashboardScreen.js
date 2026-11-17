import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import { Brand, Button, Card, Label, PageHeading, Screen } from '../../components/common/ui';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '../../theme/useTheme';
import RecentRuns from '../activities/RecentRuns';

export default function DashboardScreen() {
  const { data: profile } = useProfile();
  const { colors } = useTheme();
  return <Screen>
    <Brand />
    <PageHeading eyebrow="A LITTLE FURTHER, EVERY DAY" title={profile?.display_name ? `Welcome, ${profile.display_name}.` : 'Your next chapter.'} description="Every runner starts somewhere. Make this space your own." />
    <Card style={{ backgroundColor: colors.tint, borderColor: colors.tint }}>
      <ArrowUpRight color={colors.primary} size={36} />
      <Label variant="heading">Built around your pace.</Label>
      <Label muted>Your account is ready. Set your name, choose your distance unit, and make yourself at home.</Label>
      <Button title="Record a run" onPress={() => router.push('/record')} />
      <Button secondary title="Edit your profile" onPress={() => router.push('/profile')} />
    </Card>
    <View style={{ gap: 16 }}>
      <Label variant="heading">Your running journal</Label>
      <RecentRuns />
    </View>
    <Label variant="caption" muted>One step at a time. There’s no pace you need to keep up with but your own.</Label>
  </Screen>;
}
