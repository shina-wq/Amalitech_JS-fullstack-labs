import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaskManager, DataUnavailableError } from '../src/TaskManager.js';

const data = {
  users: [
    { id: 1, name: 'Ada', email: 'ada@x.io' },
    { id: 2, name: 'Linus', email: 'linus@x.io' },
  ],
  todos: [
    { id: 1, title: 'Write docs', completed: true, userId: 1 },
    { id: 2, title: 'Fix bug', completed: false, userId: 1 },
    { id: 3, title: 'Review docs', completed: false, userId: 2 },
    { id: 4, title: 'Orphan', completed: false, userId: 99 },
    { id: 'broken' },
  ],
};

const fakeAPI = (result) => ({
  fetchAll: async () => {
    if (result instanceof Error) throw result;
    return result;
  },
});

let dir;
const createManager = (api, snapshotName = 'snapshot.json') =>
  new TaskManager({ api, snapshotFile: join(dir, snapshotName), exportDir: join(dir, 'exports') });

before(async () => { dir = await mkdtemp(join(tmpdir(), 'task-manager-')); });
after(() => rm(dir, { recursive: true, force: true }));

describe('loading', () => {
  test('loads from the API, skipping malformed records', async () => {
    const manager = createManager(fakeAPI(data));
    assert.deepEqual(await manager.load(), { source: 'api', users: 2, tasks: 4 });
    assert.equal(manager.getUser(1).tasks.length, 2);
  });

  test('falls back to the saved snapshot when the API fails', async () => {
    await createManager(fakeAPI(data)).load();
    const manager = createManager(fakeAPI(new Error('offline')));

    assert.equal((await manager.load()).source, 'snapshot');
    assert.equal(manager.tasks.length, 4);
  });

  test('throws DataUnavailableError with no API and no snapshot', async () => {
    const manager = createManager(fakeAPI(new Error('offline')), 'missing.json');
    await assert.rejects(manager.load(), DataUnavailableError);
  });

  test('rejects a corrupt snapshot', async () => {
    await writeFile(join(dir, 'corrupt.json'), '{"users": 1}');
    const manager = createManager(fakeAPI(new Error('offline')), 'corrupt.json');
    await assert.rejects(manager.load(), DataUnavailableError);
  });

  test('handles empty responses', async () => {
    const manager = createManager(fakeAPI({ users: [], todos: [] }));
    await manager.load();
    assert.equal(manager.getReport().overall.total, 0);
  });

  test('guards access before load', () => {
    assert.throws(() => createManager(fakeAPI(data)).tasks, /not loaded/);
  });
});

describe('operations', () => {
  let manager;
  before(async () => {
    manager = createManager(fakeAPI(data));
    await manager.load();
  });

  test('getTasks combines filters, search and sorting', () => {
    const ids = (tasks) => tasks.map(({ id }) => id);
    assert.deepEqual(ids(manager.getTasks({ status: 'completed' })), [1]);
    assert.deepEqual(ids(manager.getTasks({ userId: 1, sortBy: ['-id'] })), [2, 1]);
    assert.deepEqual(ids(manager.getTasks({ query: 'docs', status: 'pending' })), [3]);
  });

  test('getTasks validates criteria', () => {
    assert.throws(() => manager.getTasks({ status: 'done' }), RangeError);
    assert.throws(() => manager.getTasks({ priority: 'critical' }), RangeError);
    assert.throws(() => manager.getTasks({ userId: 42 }), /User #42 not found/);
  });

  test('toggleTask flips completion and rejects unknown ids', () => {
    assert.equal(manager.toggleTask(2).completed, true);
    assert.equal(manager.toggleTask(2).completed, false);
    assert.throws(() => manager.toggleTask(999), /Task #999 not found/);
  });

  test('exportJSON writes a report and strips directories from the filename', async () => {
    const filePath = await manager.exportJSON('../escape.json');
    const exported = JSON.parse(await readFile(filePath, 'utf8'));

    assert.ok(filePath.startsWith(join(dir, 'exports')));
    assert.equal(exported.report.overall.total, 4);
    assert.equal(exported.users[0].tasks[0].status, 'completed');
  });
});
