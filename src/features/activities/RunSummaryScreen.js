import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, Label, Notice, PageHeading, Screen } from '../../components/common/ui';
import { NavLink } from '../../components/common/NavLink';
import RouteMap from '../../components/maps/RouteMap';
import { useRecording } from '../../hooks/useRecording';
import { useProfile } from '../../hooks/useProfile';
import { useAuthStore } from '../../store/authStore';
import { runRepository } from '../../database/local/runRepository';
import { useTrackingAction } from '../tracking/useTrackingAction';
import { metrics, summarySplits } from '../tracking/engine';
import { formatDuration, formatPace } from '../tracking/format';
import RunMetrics from '../tracking/RunMetrics';

export default function RunSummaryScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { run, points, loading, error, refresh } = useRecording(id);
  const { data: profile } = useProfile();
  const userId = useAuthStore((state) => state.session?.user.id);
  return <Screen>
    <NavLink href="/home">← Home</NavLink>
    {loading ? <ActivityIndicator accessibilityLabel="Loading run summary" /> : !run ? <Notice error text={error || 'This run is not available on this device for your account.'} /> : run.status !== 'finished' ? <>
      <Notice text="This run is still unfinished." /><NavLink href="/record">Return to recording →</NavLink>
    </> : <>
      <PageHeading eyebrow="RUN SAVED" title={run.title} description={new Date(run.startedAt).toLocaleString()} />
      <Notice text="Saved privately on this device. Cloud backup is not available yet; keep the app installed to retain your recordings." />
      <RunMetrics stats={metrics(run)} unit={profile?.distance_unit || 'km'} />
      <RouteMap points={points} />
      <Card><Label variant="heading">Kilometer splits</Label>
        {summarySplits(run).length === 0 ? <Label muted>No distance recorded.</Label> : summarySplits(run).map((split) => <View key={split.km} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <Label>{split.partial ? `${(split.distance / 1000).toFixed(2)} km · partial` : `Km ${split.km}`}</Label>
          <Label>{formatDuration(split.durationMs)} · {formatPace(split.durationMs / split.distance)}/km</Label>
        </View>)}
      </Card>
      <SummaryEditor key={run.id} run={run} userId={userId} refresh={refresh} />
      <Label variant="caption" muted>Average pace uses run time, excluding manual pauses. Best pace is sustained over 30 seconds. Moving time counts reliable GPS movement. Elevation is a smoothed GPS estimate. {run.gaps} signal gaps; {run.rejected} fixes filtered.</Label>
    </>}
  </Screen>;
}

function SummaryEditor({ run, userId, refresh }) {
  const [title, setTitle] = useState(run.title);
  const [weight, setWeight] = useState('70');
  const [saved, setSaved] = useState(false);
  const action = useTrackingAction();
  const kg = Number(weight);
  return <>
    <Card><Label variant="heading">Estimated energy</Label>
      <Field label="Body weight for estimate · kg" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} maxLength={6} />
      <Label variant="heading">{Number.isFinite(kg) && kg >= 20 && kg <= 350 ? `${Math.round(kg * run.distance / 1000)} kcal` : 'Enter a weight from 20–350 kg'}</Label>
      <Label variant="caption" muted>Rough estimate: 1 kcal per kg per kilometer. Default 70 kg; weight is not stored. Not a measured calorie burn.</Label>
    </Card>
    <Field label="Activity title" value={title} onChangeText={(value) => { setTitle(value); setSaved(false); }} maxLength={100} />
    <Notice error text={action.error} />
    {saved && <Notice text="Title saved." />}
    <Button title="Save title" loading={action.loading} onPress={() => action.run(async () => { await runRepository.rename(run.id, userId, title); await refresh(); setSaved(true); })} />
  </>;
}
