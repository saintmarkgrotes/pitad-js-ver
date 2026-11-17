import { View } from 'react-native';
import { Card, Label } from '../../components/common/ui';
import { formatDistance, formatDuration, formatPace } from './format';

export function Metric({ label, value, large = false }) {
  return <View style={{ minWidth: '44%', flexGrow: 1, gap: 6 }}>
    <Label variant="caption" muted>{label}</Label>
    <Label style={{ fontSize: large ? 48 : 26, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 }}>{value}</Label>
  </View>;
}
export default function RunMetrics({ stats, unit, live = false }) {
  return <>
    <Card>
      <Metric large label={`DISTANCE · ${unit}`} value={formatDistance(stats.distance, unit)} />
      <Metric large label="RUN TIME" value={formatDuration(stats.durationMs)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {live && <Metric label={`Current · 10s /${unit}`} value={formatPace(stats.currentPace, unit)} />}
        {live && <Metric label={`Rolling · 30s /${unit}`} value={formatPace(stats.rollingPace, unit)} />}
        <Metric label={`Average /${unit}`} value={formatPace(stats.averagePace, unit)} />
        <Metric label={`Best · 30s /${unit}`} value={formatPace(stats.bestPace, unit)} />
      </View>
    </Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
      <Metric label="Moving time" value={formatDuration(stats.movingMs)} />
      <Metric label="Elapsed time" value={formatDuration(stats.elapsedMs)} />
      <Metric label="Elevation gain · m" value={Math.round(stats.elevationGain).toString()} />
    </View>
  </>;
}
