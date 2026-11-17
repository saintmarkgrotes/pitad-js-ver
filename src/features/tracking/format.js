export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export function formatPace(secondsPerKm, unit = 'km') {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) return '—';
  const seconds = Math.round(secondsPerKm * (unit === 'mi' ? 1.609344 : 1));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function formatDistance(meters, unit = 'km') { return (meters / (unit === 'mi' ? 1609.344 : 1000)).toFixed(2); }
