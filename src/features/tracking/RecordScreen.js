import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Label, Notice, PageHeading, Screen } from '../../components/common/ui';
import RouteMap from '../../components/maps/RouteMap';
import { checkGps, enableBackground, getTrackingError, nativeRecordingAvailable, trackingService } from '../../services/locationService';
import { useAuthStore } from '../../store/authStore';
import { useRecording } from '../../hooks/useRecording';
import { useProfile } from '../../hooks/useProfile';
import { useTrackingAction } from './useTrackingAction';
import { metrics } from './engine';
import RunMetrics from './RunMetrics';
import { useTheme } from '../../theme/useTheme';

export default function RecordScreen() {
  if (Platform.OS === 'web') return <Screen><PageHeading eyebrow="RECORD" title="Take pitad outside." description="GPS run recording is available in the iOS and Android development builds. Your browser preview does not record location." /></Screen>;
  return <NativeRecorder />;
}

function NativeRecorder() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const { run, points, loading, error, now, refresh } = useRecording();
  const { data: profile } = useProfile();
  const action = useTrackingAction();
  const { colors } = useTheme();
  const [fix, setFix] = useState(null);
  const [background, setBackground] = useState(true);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const unit = profile?.distance_unit || 'km';
  const stats = run ? metrics(run, now) : null;
  const perform = (operation) => action.run(async () => { try { await operation(); } finally { await refresh(); } });
  function finish() {
    Alert.alert('Finish this run?', 'Your route and stats will be saved on this device.', [
      { text: 'Keep running', style: 'cancel' },
      { text: 'Finish and save', onPress: () => perform(async () => {
        const completed = await trackingService.finish(userId);
        router.push({ pathname: '/run/[id]', params: { id: completed.id } });
      }) },
    ]);
  }
  return <Screen>
    <PageHeading eyebrow="RECORD" title={run ? run.status === 'paused' ? 'Take a breath.' : 'Find your rhythm.' : 'Your starting line.'}
      description={run ? run.mode === 'background' ? 'Background recording · saved on this device' : 'Foreground only · pauses when you leave the app' : 'Step outdoors and find a clear view of the sky.'} />
    {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel="Loading saved recording" /> : run ? <>
      <Notice text={run.status === 'paused' ? 'PAUSED · resume when you’re ready' : stats.fresh ? `GPS accuracy: ±${Math.round(run.lastAccuracy || 0)} m` : 'Waiting for reliable GPS. Distance will not be filled in across signal gaps.'} />
      {!!run.error && <Notice error text={run.error} />}
      {!!getTrackingError() && <Notice error text={getTrackingError()} />}
      <RunMetrics stats={stats} unit={unit} live />
      <View style={{ gap: 12 }}>
        <Button title={run.status === 'paused' ? 'Resume run' : 'Pause run'} loading={action.loading} onPress={() => perform(() => run.status === 'paused' ? trackingService.resume(userId) : trackingService.pause(userId))} />
        <Button secondary title="Finish run" disabled={action.loading} onPress={finish} />
        {run.status === 'paused' && !!run.error && <Button secondary title="Retry stopping GPS" disabled={action.loading} onPress={() => perform(() => trackingService.pause(userId))} />}
      </View>
      <RouteMap points={points} />
      <Label variant="caption" muted>{run.splits.length} complete kilometer splits · {run.rejected} filtered fixes · {run.gaps} signal gaps</Label>
    </> : <>
      {!nativeRecordingAvailable && <Notice text="Install a new development build. Expo Go is not supported for run recording." />}
      <Card>
        <Label variant="heading">1. Get GPS ready</Label>
        <Label muted>Precise location is used only while a run is recording. Accepted points are saved privately on this device.</Label>
        {fix && <Notice text={`GPS checked: ±${Math.round(fix.coords.accuracy)} m. A fresh fix will be checked before starting.`} />}
        <Button title="Check GPS & permissions" disabled={!nativeRecordingAvailable || action.loading} onPress={() => perform(async () => setFix(await checkGps()))} />
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Label style={{ flex: 1, fontWeight: '700' }}>2. Record with the screen locked</Label>
          <Switch accessibilityLabel="Background recording" value={background} onValueChange={setBackground} disabled={action.loading} />
        </View>
        <Label muted>{background ? 'Allow background location so your run can continue while the screen is locked or another app is open. Android may open Settings; choose Allow all the time. On iOS, choose Always. An ongoing location indicator is shown while recording.' : 'Foreground only: keep pitad open. Leaving the app or locking the screen pauses the run.'}</Label>
        {background && <Button secondary title={backgroundEnabled ? 'Background access enabled · check again' : 'Enable background location'} disabled={!fix || action.loading} onPress={() => perform(async () => setBackgroundEnabled(await enableBackground()))} />}
      </Card>
      <Button title="Start run" loading={action.loading} disabled={!fix || !nativeRecordingAvailable || (background && !backgroundEnabled)} onPress={() => perform(() => trackingService.start(userId, background ? 'background' : 'foreground'))} />
    </>}
    <Notice error text={action.error || error} />
    {!!error && <Button secondary title="Retry loading recording" onPress={refresh} />}
    <Button secondary title="Open device settings" onPress={() => action.run(() => Linking.openSettings())} />
  </Screen>;
}
