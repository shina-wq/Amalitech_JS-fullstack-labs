import { logger } from './logger.js';

// Fresh hit "I already have a recent answer"
// De-duplication "Someone else is already fetching this right now"
// Stale fallback "The fetch failed, but I have an old answer"
export const withCache = (fn, { ttl = 60_000 } = {}) => {
  const store = new Map(); // key -> { value, expires }
  const pending = new Map(); // key -> in-flight promise

  const cached = (...args) => {
    const key = JSON.stringify(args);
    const hit = store.get(key);

    if (hit && hit.expires > Date.now()) {
      logger.debug(`cache hit: ${key}`);
      return Promise.resolve(hit.value);
    }
    if (pending.has(key)) return pending.get(key);

    const request = fn(...args)
      .then((value) => {
        store.set(key, { value, expires: Date.now() + ttl });
        return value;
      })
      .catch((error) => {
        if (!hit) throw error;
        logger.warn(`${error.message} — using cached data`);
        return hit.value;
      })
      .finally(() => pending.delete(key));

    pending.set(key, request);
    return request;
  };

  cached.clear = () => store.clear();
  return cached;
};
