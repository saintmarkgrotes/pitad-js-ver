import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Card, Label, Notice } from '../../components/common/ui';
import { NavLink } from '../../components/common/NavLink';
import { runRepository } from '../../database/local/runRepository';
import { useAuthStore } from '../../store/authStore';
import { useProfile } from '../../hooks/useProfile';
import { formatDistance, formatDuration } from '../tracking/format';

export default function RecentRuns() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const { data: profile } = useProfile();
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let alive = true;
    runRepository.list(userId).then((items) => { if (alive) { setRuns(items); setError(''); } }).catch(() => { if (alive) setError('Saved runs could not be loaded. Reopen Home to retry.'); });
    return () => { alive = false; };
  }, [userId]));
  const unit = profile?.distance_unit || 'km';
  const ownRuns = runs.filter((run) => run.userId === userId);
  return <>
    <Notice error text={error} />
    {ownRuns.length === 0 ? <Card><Label variant="heading">Room for your first run.</Label><Label muted>Record a run on your phone. Saved runs and summaries will appear here on that device.</Label></Card> : ownRuns.map((run) => <Card key={run.id}>
      <NavLink href={{ pathname: '/run/[id]', params: { id: run.id } }}>{run.title} →</NavLink>
      <Label>{formatDistance(run.distance, unit)} {unit} · {formatDuration(run.activeMs)}</Label>
      <Label variant="caption" muted>{new Date(run.startedAt).toLocaleDateString()} · saved on this device</Label>
    </Card>)}
  </>;
}
