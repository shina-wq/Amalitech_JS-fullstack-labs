import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PriorityTask, User } from '../src/models.js';
import * as processor from '../src/taskProcessor.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const future = (days) => Date.now() + days * DAY_MS;

const tasks = [
  { id: 1, title: 'Write report', completed: true, userId: 1, priority: 'low', dueDate: future(5), tags: ['work'] },
  { id: 2, title: 'Buy groceries', completed: false, userId: 1, priority: 'high', dueDate: future(-1), tags: ['home'] },
  { id: 3, title: 'Review report draft', completed: false, userId: 2, priority: 'medium', dueDate: future(10), tags: ['work', 'learning'] },
  { id: 4, title: 'Gym session', completed: false, userId: 2, priority: 'high', dueDate: future(10), tags: ['health'] },
].map((data) => new PriorityTask(data));

describe('toModels', () => {
  test('maps valid records and skips malformed ones', () => {
    const raw = [{ id: 1, title: 'ok', completed: false, userId: 1 }, { id: 'bad' }, null];
    const models = processor.toModels(raw, (record) => PriorityTask.fromAPI(record));

    assert.equal(models.length, 1);
    assert.ok(models[0] instanceof PriorityTask);
  });
});

describe('filters and search', () => {
  test('filterByStatus', () => {
    assert.deepEqual(processor.filterByStatus(tasks, 'completed').map(({ id }) => id), [1]);
    assert.deepEqual(processor.filterByStatus(tasks, 'pending').map(({ id }) => id), [2, 3, 4]);
    assert.deepEqual(processor.filterByStatus(tasks, 'overdue').map(({ id }) => id), [2]);
  });

  test('filterByUser and filterByPriority (variadic)', () => {
    assert.equal(processor.filterByUser(tasks, 2).length, 2);
    assert.equal(processor.filterByPriority(tasks, 'high').length, 2);
    assert.equal(processor.filterByPriority(tasks, 'high', 'low').length, 3);
  });

  test('searchTasks matches all terms across title and tags, case-insensitive', () => {
    assert.deepEqual(processor.searchTasks(tasks, 'REPORT').map(({ id }) => id), [1, 3]);
    assert.deepEqual(processor.searchTasks(tasks, 'report learning').map(({ id }) => id), [3]);
    assert.equal(processor.searchTasks(tasks, 'nothing-here').length, 0);
  });
});

describe('aggregation', () => {
  test('calculateStatistics', () => {
    const stats = processor.calculateStatistics(tasks);

    assert.equal(stats.total, 4);
    assert.equal(stats.completed, 1);
    assert.equal(stats.overdue, 1);
    assert.equal(stats.completionRate, 25);
    assert.deepEqual(stats.byPriority, { low: 1, high: 2, medium: 1 });
    assert.equal(stats.byTag.work, 2);
  });

  test('calculateStatistics handles empty input', () => {
    assert.equal(processor.calculateStatistics().completionRate, 0);
  });

  test('groupByUser returns a Map keyed by userId', () => {
    const groups = processor.groupByUser(tasks);
    assert.ok(groups instanceof Map);
    assert.deepEqual([...groups.keys()], [1, 2]);
    assert.equal(groups.get(2).length, 2);
  });

  test('getUniqueTags returns a Set without duplicates', () => {
    const tags = processor.getUniqueTags(tasks);
    assert.ok(tags instanceof Set);
    assert.equal(tags.size, 4);
  });

  test('generateReport ranks users by completion rate', () => {
    const users = [1, 2].map((id) => new User({ id, name: `User ${id}`, email: `u${id}@x.io` }));
    users.forEach((user) => user.addTask(...processor.filterByUser(tasks, user.id)));

    const report = processor.generateReport(users, tasks);
    assert.deepEqual(report.users.map(({ id, completionRate }) => [id, completionRate]), [[1, 50], [2, 0]]);
  });
});

describe('sortTasks', () => {
  test('sorts by multiple criteria without mutating input', () => {
    const sorted = processor.sortTasks(tasks, '-priority', 'dueDate');
    assert.deepEqual(sorted.map(({ id }) => id), [2, 4, 3, 1]);
    assert.deepEqual(tasks.map(({ id }) => id), [1, 2, 3, 4]);
  });

  test('ties fall through to the next criterion', () => {
    assert.deepEqual(processor.sortTasks(tasks, 'status', '-id').map(({ id }) => id), [4, 3, 2, 1]);
  });

  test('rejects unknown keys', () => {
    assert.throws(() => processor.sortTasks(tasks, 'color'), RangeError);
  });
});
