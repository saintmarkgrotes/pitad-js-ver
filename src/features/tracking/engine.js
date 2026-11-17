// All units are meters and milliseconds. The reducer has no React/native imports.
export const GPS_RULES = Object.freeze({ accuracy: 25, maxSpeed: 12, gapMs: 15000, movingSpeed: 0.7, staleMs: 10000 });
const radians = (degrees) => degrees * Math.PI / 180;

export function haversine(a, b) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

export function createRun({ id, userId, now, mode = 'background' }) {
  return { version: 1, id, userId, status: 'recording', mode, startedAt: now, activeSince: now, activeMs: 0,
    finishedAt: null, pausedAt: null, distance: 0, movingMs: 0, elevationGain: 0, bestPace: null,
    lastSeenAt: 0, lastFixAt: 0, lastAccuracy: null, anchor: null, segment: 0, seq: 0,
    window: [], splits: [], splitActiveMs: 0, altitude: null, altitudeBase: null,
    rejected: 0, gaps: 0, error: '', title: 'Outdoor run' };
}

export function activeTime(state, now) {
  return state.activeMs + (state.status === 'recording' ? Math.max(0, now - state.activeSince) : 0);
}

export function transitionRun(state, action, now) {
  if (action === 'resume' && state.status === 'paused') return { ...state, status: 'recording', activeSince: now,
    pausedAt: null, anchor: null, window: [], segment: state.segment + 1, altitude: null, altitudeBase: null, error: '' };
  if (action === 'pause' && state.status === 'recording') return { ...state, status: 'paused', activeMs: activeTime(state, now),
    pausedAt: now, anchor: null, window: [], altitude: null, altitudeBase: null };
  if (action === 'finish' && state.status !== 'finished') return { ...state, status: 'finished', activeMs: activeTime(state, now), finishedAt: now, anchor: null, window: [] };
  throw new Error(`Cannot ${action} a ${state.status} run.`);
}

// Interpolate the distance at the exact window boundary, rather than using the
// last pair of GPS samples. A minimum observed span and distance suppress spikes.
export function windowPace(samples, end, duration) {
  if (samples.length < 2) return null;
  const start = end - duration;
  if (samples[0].t > start) return null;
  let left = samples[0];
  let distanceAtStart = left.d;
  for (const right of samples.slice(1)) {
    if (right.t >= start) {
      distanceAtStart = left.d + (right.d - left.d) * ((start - left.t) / (right.t - left.t));
      break;
    }
    left = right;
  }
  const delta = samples[samples.length - 1].d - distanceAtStart;
  return delta >= 5 ? duration / delta : null; // ms/m equals seconds/km
}

function toPoint(location) {
  const c = location?.coords;
  if (!c || !Number.isFinite(location.timestamp) || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) ||
    Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) return null;
  return { latitude: c.latitude, longitude: c.longitude, timestamp: location.timestamp, accuracy: c.accuracy,
    altitude: Number.isFinite(c.altitude) ? c.altitude : null,
    altitudeAccuracy: Number.isFinite(c.altitudeAccuracy) ? c.altitudeAccuracy : null,
    speed: Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null, mocked: location.mocked === true };
}

export function consumeLocations(state, locations, now = Date.now()) {
  const next = { ...state, window: [...state.window], splits: [...state.splits] };
  const points = [];
  if (state.status !== 'recording') return { state: next, points };
  for (const location of [...locations].sort((a, b) => a.timestamp - b.timestamp)) {
    const p = toPoint(location);
    if (!p || p.timestamp > now || p.mocked) { next.rejected++; continue; }
    if (p.timestamp <= next.lastSeenAt || p.timestamp < next.activeSince) continue;
    next.lastSeenAt = p.timestamp;
    next.lastAccuracy = p.accuracy;
    if (!Number.isFinite(p.accuracy) || p.accuracy <= 0 || p.accuracy > GPS_RULES.accuracy || p.speed > GPS_RULES.maxSpeed) {
      next.rejected++; continue;
    }
    let anchor = next.anchor;
    if (anchor && p.timestamp - next.lastFixAt > GPS_RULES.gapMs) {
      // Never draw or charge distance across a tunnel, restart, or missing GPS interval.
      next.segment++; next.gaps++; next.window = []; anchor = null;
      next.altitude = null; next.altitudeBase = null;
    }
    const dt = anchor ? p.timestamp - anchor.timestamp : 0;
    const distance = anchor ? haversine(anchor, p) : 0;
    if (anchor && distance / (dt / 1000) > GPS_RULES.maxSpeed) { next.rejected++; continue; }
    next.lastFixAt = p.timestamp;
    next.error = '';
    // Accumulate small steps against an anchor until they exceed reported GPS
    // uncertainty. A stationary speed fix re-anchors without charging jitter.
    const threshold = anchor ? Math.max(3, Math.max(anchor.accuracy, p.accuracy) * 0.7) : 0;
    const stationary = p.speed !== null && p.speed < GPS_RULES.movingSpeed;
    if (anchor && !stationary && distance >= threshold && distance / (dt / 1000) >= GPS_RULES.movingSpeed) {
      const before = next.distance;
      next.distance += distance;
      next.movingMs += dt;
      const beforeTime = activeTime(next, anchor.timestamp);
      const afterTime = activeTime(next, p.timestamp);
      while ((next.splits.length + 1) * 1000 <= next.distance) {
        const boundary = (next.splits.length + 1) * 1000;
        const boundaryTime = beforeTime + (afterTime - beforeTime) * ((boundary - before) / distance);
        next.splits.push({ km: next.splits.length + 1, distance: 1000, durationMs: boundaryTime - next.splitActiveMs, cumulativeMs: boundaryTime });
        next.splitActiveMs = boundaryTime;
      }
      if (p.altitude !== null && p.altitudeAccuracy !== null && p.altitudeAccuracy >= 0 && p.altitudeAccuracy <= 10) {
        const filtered = next.altitude === null ? p.altitude : next.altitude + 0.2 * (p.altitude - next.altitude);
        if (next.altitudeBase === null) next.altitudeBase = filtered;
        // Three-meter hysteresis and a vertical-speed ceiling limit altitude noise.
        if (next.altitude === null || Math.abs(filtered - next.altitude) <= (dt / 1000) * 3) {
          next.altitude = filtered;
          if (Math.abs(filtered - next.altitudeBase) >= 3) {
            next.elevationGain += Math.max(0, filtered - next.altitudeBase);
            next.altitudeBase = filtered;
          }
        }
      }
      next.anchor = p;
    } else if (!anchor || stationary || dt > GPS_RULES.gapMs) {
      next.anchor = p;
    }
    next.window.push({ t: p.timestamp, d: next.distance });
    while (next.window.length > 2 && next.window[1].t < p.timestamp - 60000) next.window.shift();
    // Bound even a maliciously high-frequency input stream.
    if (next.window.length > 512) next.window.splice(1, next.window.length - 512);
    const sustained = windowPace(next.window, p.timestamp, 30000);
    if (sustained !== null) next.bestPace = next.bestPace === null ? sustained : Math.min(next.bestPace, sustained);
    next.seq++;
    points.push({ ...p, seq: next.seq, segment: next.segment, distance: next.distance });
  }
  return { state: next, points };
}

export function metrics(state, now = Date.now()) {
  const duration = activeTime(state, now);
  const fresh = state.status === 'recording' && now - state.lastFixAt <= GPS_RULES.staleMs;
  return { distance: state.distance, durationMs: duration, movingMs: state.movingMs,
    elapsedMs: Math.max(0, (state.finishedAt ?? now) - state.startedAt), elevationGain: state.elevationGain,
    averagePace: state.distance >= 5 ? duration / state.distance : null,
    currentPace: fresh ? windowPace(state.window, state.lastFixAt, 10000) : null,
    rollingPace: fresh ? windowPace(state.window, state.lastFixAt, 30000) : null,
    bestPace: state.bestPace, fresh };
}

export function summarySplits(state) {
  const remainder = state.distance - state.splits.length * 1000;
  return remainder > 0.01 ? [...state.splits, { km: state.splits.length + 1, distance: remainder,
    durationMs: state.activeMs - state.splitActiveMs, cumulativeMs: state.activeMs, partial: true }] : state.splits;
}
