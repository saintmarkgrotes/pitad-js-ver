import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, Compass, Gauge, Route } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Brand, Button, Label, Screen } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  return <Screen>
    <Brand />
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ height: 200, marginVertical: 8, backgroundColor: colors.tint, borderRadius: 16, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 340 200">
        {[0, 1, 2, 3, 4].map((i) => <Path key={i} d={`M ${-70 + i * 55} 210 L ${70 + i * 55} -10`} stroke={colors.border} strokeWidth={1} />)}
        <Path d="M 42 158 C 120 177 98 85 172 108 S 213 33 294 40" stroke={colors.primary} strokeWidth={7} fill="none" strokeLinecap="round" />
        <Circle cx="42" cy="158" r="7" fill={colors.surface} stroke={colors.primary} strokeWidth={4} />
        <Circle cx="294" cy="40" r="8" fill={colors.primary} />
      </Svg>
      <View style={{ position: 'absolute', bottom: 16, right: 16 }}><ArrowUpRight size={32} color={colors.primary} /></View>
    </View>
    <View style={{ gap: 16 }}>
      <Label variant="label" style={{ color: colors.primary }}>FIND YOUR FORWARD</Label>
      <Label variant="hero">Your run.{ '\n' }Your pace.</Label>
      <Label muted>A little further. A little stronger. Make room for the runner you want to become.</Label>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingVertical: 8 }}>
      {[[Route, 'Run'], [Gauge, 'Grow'], [Compass, 'Explore']].map(([Icon, text]) => {
        const FeatureIcon = /** @type {typeof Route} */ (Icon);
        return <View key={String(text)} style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          <FeatureIcon size={18} color={colors.muted} /><Label variant="caption" muted>{String(text)}</Label>
        </View>;
      })}
    </View>
    <View style={{ gap: 12, marginTop: 'auto' }}>
      <Button title="Create an account" onPress={() => router.push('/register')} />
      <Button secondary title="I already have an account" onPress={() => router.push('/login')} />
    </View>
  </Screen>;
}
