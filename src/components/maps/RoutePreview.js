import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Label } from '../common/ui';
import { useTheme } from '../../theme/useTheme';
import { routeRegion, routeSegments } from '../../features/tracking/routeGeometry';

export default function RoutePreview({ points }) {
  const { colors } = useTheme();
  const region = routeRegion(points);
  if (!region) return <View style={{ padding: 24, minHeight: 180, justifyContent: 'center', backgroundColor: colors.tint }}><Label muted>Your route appears after the first reliable GPS fix.</Label></View>;
  const project = (point) => {
    const longitudeDelta = ((point.longitude - region.longitude + 540) % 360) - 180;
    return [160 + longitudeDelta / region.longitudeDelta * 280, 110 - (point.latitude - region.latitude) / region.latitudeDelta * 180];
  };
  const end = project(points[points.length - 1]);
  return <View style={{ backgroundColor: colors.tint, padding: 12, borderRadius: 12 }}>
    <Svg viewBox="0 0 320 220" width="100%" height={220} accessibilityLabel="Recorded GPS route preview">
      {routeSegments(points).map((segment, i) => <Polyline key={i} points={segment.map((p) => project(p).join(',')).join(' ')} stroke={colors.primary} strokeWidth={3} fill="none" />)}
      <Circle cx={end[0]} cy={end[1]} r={5} fill={colors.primary} />
    </Svg>
    <Label variant="caption" muted>GPS coordinate preview · no street-map tiles</Label>
  </View>;
}
