// A session can exceed Keychain's historical per-value limit. Each chunk is
// at most 400 Unicode code points (<= 1600 UTF-8 bytes). Publish the manifest last so
// an interrupted write never exposes half of a new session.
export function createChunkedStorage(storage) {
  const readManifest = async (key) => {
    const value = await storage.getItem(`${key}.manifest`);
    if (!value) return null;
    const manifest = JSON.parse(value);
    if (!Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 1000 ||
      typeof manifest.id !== 'string' || !/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error('Invalid secure session metadata.');
    }
    return manifest;
  };
  const clearChunks = async (key, manifest) => {
    if (!manifest) return;
    await Promise.all(Array.from({ length: manifest.count }, (_, i) => storage.removeItem(`${key}.${manifest.id}.${i}`)));
  };
  const adapter = {
    async getItem(key) {
      const manifest = await readManifest(key);
      if (!manifest) return null;
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => storage.getItem(`${key}.${manifest.id}.${i}`)));
      if (chunks.some((chunk) => chunk === null)) throw new Error('Secure session is incomplete.');
      return chunks.join('');
    },
    async setItem(key, value) {
      const previous = await readManifest(key).catch(() => null);
      const characters = Array.from(value);
      const manifest = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: Math.max(1, Math.ceil(characters.length / 400)) };
      if (manifest.count > 1000) throw new Error('Session exceeds secure storage limit.');
      try {
        for (let i = 0; i < manifest.count; i++) {
          await storage.setItem(`${key}.${manifest.id}.${i}`, characters.slice(i * 400, (i + 1) * 400).join(''));
        }
        await storage.setItem(`${key}.manifest`, JSON.stringify(manifest));
      } catch (error) {
        await clearChunks(key, manifest).catch(() => {});
        throw error;
      }
      // Cleanup failure must not turn a committed write into a failed sign-in.
      await clearChunks(key, previous).catch(() => {});
    },
    async removeItem(key) {
      const manifest = await readManifest(key).catch(() => null);
      await storage.removeItem(`${key}.manifest`);
      await clearChunks(key, manifest);
    },
  };
  // Serialize reads, writes, and logout within this client. Session refresh and
  // explicit sign-in can otherwise race while replacing chunk manifests.
  let pending = Promise.resolve();
  /** @template T @param {() => Promise<T>} operation @returns {Promise<T>} */
  function enqueue(operation) {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }
  return {
    getItem: (key) => enqueue(() => adapter.getItem(key)),
    setItem: (key, value) => enqueue(() => adapter.setItem(key, value)),
    removeItem: (key) => enqueue(() => adapter.removeItem(key)),
  };
}
