import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { trackingService, nativeRecordingAvailable } from '../../services/locationService';
import { runRepository } from '../../database/local/runRepository';

// Only application lifecycle wiring lives here. Sensors and persisted state do
// not belong to this component and survive navigation between screens.
export function TrackingProvider({ children }) {
  const { session, ready } = useAuthStore();
  const userId = session?.user.id;
  useEffect(() => {
    if (!ready || !nativeRecordingAvailable) return;
    const report = () => runRepository.setError('Unable to restore recording. Check device storage and reopen Record.').catch(() => {});
    void trackingService.recover(userId).catch(report);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void trackingService.recover(userId).catch(report);
      else void trackingService.backgrounded().catch(report);
    });
    return () => subscription.remove();
  }, [ready, userId]);
  return children;
}
