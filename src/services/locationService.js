import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { randomUUID } from 'expo-crypto';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { runRepository } from '../database/local/runRepository';
import { createTrackingController } from '../features/tracking/controller';
import { GPS_RULES } from '../features/tracking/engine';
import { LOCATION_TASK } from '../features/tracking/taskName';

let foregroundSubscription = null;
let runtimeError = '';
export const getTrackingError = () => runtimeError;
export const nativeRecordingAvailable = Constants.executionEnvironment !== 'storeClient';

async function currentFix() {
  let timer;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('GPS is taking too long. Move outdoors and try again.')), 20000); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function checkGps() {
  if (!nativeRecordingAvailable) throw new Error('Install a new pitad development build to record runs.');
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('Location services are off. Enable GPS in device settings.');
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error(permission.canAskAgain ? 'Location permission is needed to record your route.' : 'Location permission is blocked. Enable it in device settings.');
  const fix = /** @type {import('expo-location').LocationObject} */ (await currentFix());
  if (!Number.isFinite(fix.coords.latitude) || !Number.isFinite(fix.coords.longitude) || Math.abs(fix.coords.latitude) > 90 || Math.abs(fix.coords.longitude) > 180 ||
      !Number.isFinite(fix.coords.accuracy) || fix.coords.accuracy <= 0 || fix.coords.accuracy > GPS_RULES.accuracy ||
      Math.abs(Date.now() - fix.timestamp) > GPS_RULES.staleMs || fix.mocked) {
    throw new Error('Waiting for a precise GPS fix. Enable precise location, move outdoors, and try again.');
  }
  return fix;
}

export async function enableBackground() {
  if (!(await Location.getForegroundPermissionsAsync()).granted) throw new Error('Check GPS first to enable location access.');
  if (!nativeRecordingAvailable || !(await TaskManager.isAvailableAsync())) throw new Error('Background tracking needs a development build.');
  const permission = await Location.requestBackgroundPermissionsAsync();
  if (!permission.granted) throw new Error('Background permission was not granted. Select Always / Allow all the time in settings, or choose foreground-only recording.');
  return true;
}

const options = { accuracy: Location.Accuracy.Highest, distanceInterval: 2, timeInterval: 1000 };
async function stopSensors() {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
async function failRecording() {
  runtimeError = 'GPS recording stopped after a location or storage error. Your saved points are safe. Check storage and resume.';
  await stopSensors().catch(() => {});
  await runRepository.interrupt(runtimeError).catch(() => {});
}

export const trackingService = createTrackingController({
  repository: runRepository, now: () => Date.now(), newId: () => randomUUID(),
  location: {
    async prepare(mode) {
      if (AppState.currentState !== 'active') throw new Error('Return to the app before starting GPS.');
      await checkGps();
      if (mode === 'background' && (!(await TaskManager.isAvailableAsync()) || !(await Location.getBackgroundPermissionsAsync()).granted)) {
        throw new Error('Enable background recording first, or select foreground-only mode.');
      }
    },
    async start(mode) {
      runtimeError = '';
      // Permission prompts can background the app. Recheck before starting.
      if (AppState.currentState !== 'active') throw new Error('Return to pitad to start recording.');
      if (mode === 'background') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, { ...options,
          activityType: Location.ActivityType.Fitness, pausesUpdatesAutomatically: false,
          deferredUpdatesInterval: 0, deferredUpdatesDistance: 0, showsBackgroundLocationIndicator: true,
          foregroundService: { notificationTitle: 'pitad is recording your run', notificationBody: 'Your route is saved on this device. Open pitad to pause or finish.', killServiceOnDestroy: true },
        });
      } else {
        foregroundSubscription = await Location.watchPositionAsync(options,
          (fix) => { void runRepository.ingest([fix], Date.now()).catch(failRecording); },
          () => { void failRecording(); });
      }
    },
    stop: stopSensors,
    isRunning: (mode) => mode === 'background' ? Location.hasStartedLocationUpdatesAsync(LOCATION_TASK) : Promise.resolve(!!foregroundSubscription),
  },
});
