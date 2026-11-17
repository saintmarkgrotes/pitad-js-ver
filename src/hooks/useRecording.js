import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { runRepository } from '../database/local/runRepository';
import { useAuthStore } from '../store/authStore';
import { limitRoute } from '../features/tracking/routeGeometry';

export function useRecording(id = null) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [snapshot, setSnapshot] = useState(() => ({ run: null, points: [], loading: true, error: '', now: Date.now() }));
  const refreshRef = useRef(async () => {});
  useEffect(() => {
    let alive = true, busy = false, currentId = null, lastSeq = 0, route = [];
    async function refresh() {
      if (busy || !alive || !userId || AppState.currentState === 'background') return;
      busy = true;
      try {
        const candidate = id ? await runRepository.get(id, userId) : await runRepository.active();
        const run = candidate?.userId === userId ? candidate : null;
        if (run?.id !== currentId) { route = []; lastSeq = 0; currentId = run?.id; }
        if (run && run.seq > lastSeq) {
          // Catch up after a background run in bounded pages. UI renders <=600
          // representative points; the full-resolution recording remains on disk.
          do {
            const page = await runRepository.points(run.id, userId, lastSeq);
            if (!page.length) break;
            lastSeq = page[page.length - 1].seq;
            route = limitRoute([...route, ...page]);
          } while (alive && lastSeq < run.seq);
        }
        if (alive) setSnapshot({ run, points: route, loading: false, error: '', now: Date.now() });
      } catch { if (alive) setSnapshot((previous) => ({ ...previous, loading: false, error: 'Unable to read saved runs. Check available device storage and try again.' })); }
      finally { busy = false; }
    }
    refreshRef.current = refresh;
    void refresh();
    const timer = id ? null : setInterval(refresh, 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { alive = false; if (timer) clearInterval(timer); subscription.remove(); };
  }, [id, userId]);
  // Hide the previous account/route synchronously, before the new effect reads
  // SQLite. A slow read must never leave another runner's route on screen.
  const visible = !snapshot.run || (snapshot.run.userId === userId && (!id || snapshot.run.id === id));
  return { ...snapshot, run: visible ? snapshot.run : null, points: visible ? snapshot.points : [],
    loading: snapshot.loading || !visible, refresh: useCallback(() => refreshRef.current(), []) };
}
