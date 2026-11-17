const unavailable = async (..._args) => { throw new Error('Use an iOS or Android development build to record a run.'); };
export const nativeRecordingAvailable = false;
export const getTrackingError = () => '';
export const checkGps = unavailable;
export const enableBackground = unavailable;
export const trackingService = { start: unavailable, pause: unavailable, resume: unavailable, finish: unavailable,
  recover: async (..._args) => null, backgrounded: async () => {} };
