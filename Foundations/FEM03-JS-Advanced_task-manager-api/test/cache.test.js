import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withCache } from '../src/cache.js';
import { createRateLimiter } from '../src/rateLimiter.js';

test('withCache returns cached value without calling fn again', async () => {
  let calls = 0;
  const cached = withCache(async (n) => ++calls + n);

  assert.equal(await cached(1), 2);
  assert.equal(await cached(1), 2);
  assert.equal(calls, 1);
});

test('withCache shares in-flight promises for concurrent calls', async () => {
  let calls = 0;
  const cached = withCache(async () => ++calls);

  await Promise.all([cached(), cached(), cached()]);
  assert.equal(calls, 1);
});

test('withCache falls back to stale value on failure', async () => {
  let fail = false;
  const cached = withCache(async () => {
    if (fail) throw new Error('offline');
    return 'data';
  }, { ttl: 0 });

  assert.equal(await cached(), 'data');
  fail = true;
  assert.equal(await cached(), 'data');
});

test('withCache rethrows when nothing is cached', async () => {
  const cached = withCache(async () => { throw new Error('offline'); });
  await assert.rejects(cached(), /offline/);
});

test('createRateLimiter spaces out task starts', async () => {
  const limit = createRateLimiter({ interval: 50 });
  const starts = await Promise.all([1, 2, 3].map(() => limit(() => Date.now())));

  assert.ok(starts[2] - starts[0] >= 90);
});
