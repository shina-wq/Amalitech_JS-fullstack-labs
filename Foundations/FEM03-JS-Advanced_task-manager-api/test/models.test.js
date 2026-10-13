import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Task, PriorityTask, User } from '../src/models.js';

const NOW = new Date('2026-01-15T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const raw = { id: 1, title: ' delectus aut autem ', completed: false, userId: 1 };
const rawUser = { id: 1, name: 'Leanne Graham', email: 'leanne@april.biz', company: { name: 'Romaguera' } };

describe('Task', () => {
  test('fromAPI trims title and keeps core fields', () => {
    const task = Task.fromAPI(raw);
    assert.deepEqual({ ...task }, { id: 1, title: 'delectus aut autem', completed: false, userId: 1 });
  });

  test('fromAPI rejects malformed data', () => {
    assert.throws(() => Task.fromAPI({ id: '1', title: 'x' }), TypeError);
    assert.throws(() => Task.fromAPI(null), TypeError);
  });

  test('toggle flips status and is chainable', () => {
    const task = Task.fromAPI(raw);
    assert.equal(task.toggle().getStatus(), 'completed');
    assert.equal(task.toggle().getStatus(), 'pending');
  });

  test('base tasks are never overdue', () => {
    assert.equal(Task.fromAPI(raw).isOverdue(), false);
  });
});

describe('PriorityTask', () => {
  test('derives the same priority, due date and tags on every run', () => {
    const a = PriorityTask.fromAPI(raw, NOW);
    const b = PriorityTask.fromAPI(raw, NOW);
    assert.deepEqual(a, b);
    assert.equal(a.priority, 'medium');
    assert.ok(a instanceof Task);
  });

  test('is overdue only when pending and past due', () => {
    const task = new PriorityTask({ ...raw, dueDate: NOW - DAY_MS });
    assert.equal(task.getStatus(NOW), 'overdue');
    assert.equal(task.toggle().getStatus(NOW), 'completed');
  });

  test('high-priority tasks due soon are urgent', () => {
    const task = new PriorityTask({ ...raw, priority: 'high', dueDate: NOW.getTime() + DAY_MS });
    assert.equal(task.getStatus(NOW), 'urgent');
    assert.ok(task.hasStatus('pending'));
  });

  test('rejects unknown priorities', () => {
    assert.throws(() => new PriorityTask({ ...raw, priority: 'critical' }), RangeError);
  });
});

describe('User', () => {
  const makeUser = () => User.fromAPI(rawUser);
  const tasks = [true, true, false, false].map((completed, i) =>
    new PriorityTask({ ...raw, id: i + 1, completed, dueDate: NOW.getTime() + DAY_MS }));

  test('fromAPI uses optional chaining fallbacks for nested fields', () => {
    const user = makeUser();
    assert.equal(user.company, 'Romaguera');
    assert.equal(user.city, 'Unknown');
  });

  test('addTask accepts many tasks and rejects foreign ones', () => {
    const user = makeUser().addTask(...tasks);
    assert.equal(user.tasks.length, 4);
    assert.throws(() => user.addTask({ id: 9 }), TypeError);
    assert.throws(() => user.addTask(new Task({ ...raw, userId: 2 })), RangeError);
  });

  test('getCompletionRate and getTasksByStatus', () => {
    const user = makeUser();
    assert.equal(user.getCompletionRate(), 0);

    user.addTask(...tasks);
    assert.equal(user.getCompletionRate(), 50);
    assert.equal(user.getTasksByStatus('completed').length, 2);
    assert.equal(user.getTasksByStatus('pending').length, 2);
  });
});
