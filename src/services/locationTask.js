import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { runRepository } from '../database/local/runRepository';
import { LOCATION_TASK } from '../features/tracking/taskName';

// Imported by the root layout at module scope, including headless launches.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  try {
    if (error) throw error;
    const locations = /** @type {{ locations?: import('expo-location').LocationObject[] }} */ (data)?.locations;
    if (locations?.length) await runRepository.ingest(locations, Date.now());
  } catch {
    // Do not continue claiming to record when disk writes fail.
    await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
    await runRepository.interrupt('Recording stopped after a GPS or storage error. Saved points are safe. Check free storage and resume.').catch(() => {});
  }
});
