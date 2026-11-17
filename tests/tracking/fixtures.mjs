export const start = 1800000000000;
// Synthetic tracks are TEST INPUT ONLY; production always uses the native GPS.
export function fix(meters, seconds, extra = {}) {
  return { timestamp: start + seconds * 1000, coords: { latitude: 0, longitude: meters / 6371008.8 * 180 / Math.PI,
    accuracy: 3, speed: 3, altitude: 10, altitudeAccuracy: 3, ...extra } };
}
export function straight(seconds, speed = 3, interval = 2) {
  return Array.from({ length: Math.floor(seconds / interval) + 1 }, (_, i) => fix(i * interval * speed, i * interval, { speed }));
}
