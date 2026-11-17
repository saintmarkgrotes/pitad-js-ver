import { createRun } from './engine.js';

export function createTrackingController({ repository, location, now, newId }) {
  let pending = Promise.resolve();
  /** @template T @param {() => Promise<T>} operation @returns {Promise<T>} */
  const serial = (operation) => {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  };
  const own = async (userId) => {
    const run = await repository.active();
    if (!run || run.userId !== userId) throw new Error('No unfinished run belongs to this account.');
    return run;
  };
  async function stop() {
    try { await location.stop(); }
    catch { await repository.setError('Your run is paused and saved. GPS could not stop; tap Finish or retry stopping GPS.'); throw new Error('GPS could not stop. Your run remains saved. Please retry.'); }
  }
  async function activate(run) {
    try { await location.start(run.mode); }
    catch {
      await repository.transition(run.id, run.userId, 'pause', now());
      await location.stop().catch(() => {});
      await repository.setError('GPS did not start. Check permissions and resume when ready.');
      throw new Error('GPS did not start. Your unfinished run is saved; check permissions and try Resume.');
    }
    return run;
  }
  return {
    start: (userId, mode) => serial(async () => {
      if (!userId) throw new Error('Sign in before recording a run.');
      if (await repository.active()) throw new Error('An unfinished run already exists on this device. Finish it with the account that started it.');
      await location.prepare(mode);
      const run = createRun({ id: newId(), userId, mode, now: now() });
      await repository.create(run);
      return activate(run);
    }),
    pause: (userId) => serial(async () => {
      const run = await own(userId);
      if (run.status === 'recording') await repository.transition(run.id, userId, 'pause', now());
      await stop();
      await repository.setError('');
      return repository.active();
    }),
    resume: (userId) => serial(async () => {
      const run = await own(userId);
      if (run.status !== 'paused') throw new Error('This run is already recording.');
      await stop();
      await location.prepare(run.mode);
      return activate(await repository.transition(run.id, userId, 'resume', now()));
    }),
    finish: (userId) => serial(async () => {
      let run = await own(userId);
      if (run.status === 'recording') run = await repository.transition(run.id, userId, 'pause', now());
      await stop();
      return repository.transition(run.id, userId, 'finish', now());
    }),
    recover: (userId) => serial(async () => {
      let run = await repository.active();
      if (!run) { await location.stop(); return null; }
      const running = await location.isRunning(run.mode);
      if (run.status === 'recording' && (!running || run.userId !== userId)) {
        // Missing time after OS termination is unknown, not invented running time.
        const cutoff = Math.max(run.activeSince, run.lastFixAt);
        run = await repository.transition(run.id, run.userId, 'pause', cutoff);
        await repository.setError('Recording was interrupted. Saved points are safe. Resume to continue.');
      }
      if (run.status === 'paused' || run.userId !== userId) await stop();
      return run.userId === userId ? repository.active() : null;
    }),
    backgrounded: () => serial(async () => {
      const run = await repository.active();
      if (run?.status === 'recording' && run.mode === 'foreground') {
        await repository.transition(run.id, run.userId, 'pause', now());
        await stop();
        await repository.setError('Foreground-only recording paused when you left the app. Resume when ready.');
      }
    }),
  };
}
