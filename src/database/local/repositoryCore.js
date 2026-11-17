import { consumeLocations, transitionRun } from '../../features/tracking/engine.js';
import { RECORDING_SCHEMA } from './migrations/001-recording.js';

// The adapter is shared by native Expo SQLite and the real SQLite test harness.
// Every operation uses one serialized connection. BEGIN IMMEDIATE reserves the
// writer before reading state, including across separate background runtimes.
export function createRunRepository(openDatabase) {
  let pending = Promise.resolve();
  let ready;
  async function initialize() {
    const db = await openDatabase();
    await db.execAsync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const { user_version: version } = await db.getFirstAsync('PRAGMA user_version');
    if (version > 1) throw new Error('This recording database needs a newer version of pitad.');
    if (version === 0) {
      await db.execAsync('BEGIN IMMEDIATE');
      try { await db.execAsync(RECORDING_SCHEMA); await db.execAsync('COMMIT'); }
      catch (error) { await db.execAsync('ROLLBACK'); throw error; }
    }
    return db;
  }
  function queue(operation, write = false) {
    const result = pending.then(async () => {
      if (!ready) ready = initialize().catch((error) => { ready = null; throw error; });
      const db = await ready;
      if (!write) return operation(db);
      await db.execAsync('BEGIN IMMEDIATE');
      try { const value = await operation(db); await db.execAsync('COMMIT'); return value; }
      catch (error) { await db.execAsync('ROLLBACK'); throw error; }
    });
    pending = result.then(() => undefined, () => undefined);
    return result;
  }
  const decode = (row) => row ? JSON.parse(row.state_json) : null;
  const getActive = async (db) => decode(await db.getFirstAsync("SELECT state_json FROM local_runs WHERE status != 'finished'"));
  async function save(db, state) {
    await db.runAsync('UPDATE local_runs SET status=?, state_json=?, updated_at=? WHERE id=?', state.status, JSON.stringify(state), Date.now(), state.id);
  }
  return {
    active: () => queue(getActive),
    get: (id, userId) => queue(async (db) => decode(await db.getFirstAsync('SELECT state_json FROM local_runs WHERE id=? AND user_id=?', id, userId))),
    list: (userId) => queue(async (db) => (await db.getAllAsync("SELECT state_json FROM local_runs WHERE user_id=? AND status='finished' ORDER BY started_at DESC LIMIT 50", userId)).map(decode)),
    create: (state) => queue(async (db) => {
      if (await getActive(db)) throw new Error('Finish the unfinished run on this device before starting another.');
      await db.runAsync('INSERT INTO local_runs(id,user_id,status,started_at,state_json,updated_at) VALUES (?,?,?,?,?,?)', state.id, state.userId, state.status, state.startedAt, JSON.stringify(state), state.startedAt);
      return state;
    }, true),
    transition: (id, userId, action, now) => queue(async (db) => {
      const current = decode(await db.getFirstAsync('SELECT state_json FROM local_runs WHERE id=? AND user_id=?', id, userId));
      if (!current) throw new Error('Run not found for this account.');
      const updated = transitionRun(current, action, now);
      await save(db, updated);
      return updated;
    }, true),
    ingest: (locations, now) => queue(async (db) => {
      const current = await getActive(db);
      if (!current || current.status !== 'recording') return;
      const { state, points } = consumeLocations(current, locations, now);
      for (const point of points) await db.runAsync('INSERT INTO local_points(run_id,seq,timestamp,point_json) VALUES (?,?,?,?)', state.id, point.seq, point.timestamp, JSON.stringify(point));
      await save(db, state);
    }, true),
    setError: (message) => queue(async (db) => {
      const state = await getActive(db);
      if (state) await save(db, { ...state, error: message });
    }, true),
    interrupt: (message) => queue(async (db) => {
      let state = await getActive(db);
      if (!state) return;
      if (state.status === 'recording') state = transitionRun(state, 'pause', Math.max(state.activeSince, state.lastFixAt));
      await save(db, { ...state, error: message });
    }, true),
    points: (id, userId, afterSeq = 0) => queue(async (db) => {
      // Ownership is part of the query, not a caller-side assumption.
      const rows = await db.getAllAsync(`SELECT p.point_json FROM local_points p JOIN local_runs r ON r.id=p.run_id
        WHERE p.run_id=? AND r.user_id=? AND p.seq>? ORDER BY p.seq LIMIT 2000`, id, userId, afterSeq);
      return rows.map((row) => JSON.parse(row.point_json));
    }),
    rename: (id, userId, title) => queue(async (db) => {
      if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 100) throw new Error('Use a title between 1 and 100 characters.');
      const state = decode(await db.getFirstAsync('SELECT state_json FROM local_runs WHERE id=? AND user_id=?', id, userId));
      if (!state || state.status !== 'finished') throw new Error('Finish this run before editing its title.');
      const updated = { ...state, title: title.trim() };
      await save(db, updated);
      return updated;
    }, true),
  };
}
