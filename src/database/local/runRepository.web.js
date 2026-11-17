const unavailable = async (..._args) => { throw new Error('Run recording is available in the iOS and Android development builds.'); };
export const runRepository = {
  active: async () => null, get: async (..._args) => null, list: async (..._args) => [], points: async (..._args) => [],
  create: unavailable, transition: unavailable, ingest: unavailable, setError: unavailable, interrupt: unavailable, rename: unavailable,
};
