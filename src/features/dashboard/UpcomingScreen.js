import { View } from 'react-native';
import { Compass, Play, ChartNoAxesColumnIncreasing } from 'lucide-react-native';
import { Card, Label, PageHeading, Screen } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';

const sections = {
  explore: { eyebrow: 'EXPLORE', title: 'Find a new perspective.', icon: Compass, heading: 'More roads ahead.', description: 'Route discovery, running clubs, and community challenges are planned for a later release.' },
  record: { eyebrow: 'RECORD', title: 'Your next starting line.', icon: Play, heading: 'Run recording is coming next.', description: 'GPS recording is not available in this build. Tracking, pause and resume, and run summaries will arrive together after device testing.' },
  progress: { eyebrow: 'PROGRESS', title: 'Small steps. Real progress.', icon: ChartNoAxesColumnIncreasing, heading: 'Your story will take shape here.', description: 'Weekly distance, personal records, and training insights will become available after run recording and activity storage.' },
};
export default function UpcomingScreen({ section }) {
  const { colors } = useTheme();
  const content = sections[section];
  const Icon = content.icon;
  return <Screen>
    <PageHeading eyebrow={content.eyebrow} title={content.title} />
    <View style={{ paddingVertical: 40 }}><Icon color={colors.primary} size={64} strokeWidth={1.4} /></View>
    <Card><Label variant="heading">{content.heading}</Label><Label muted>{content.description}</Label></Card>
  </Screen>;
}
