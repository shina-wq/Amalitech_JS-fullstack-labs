import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { APIClient, APIError } from '../src/api.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const mockFetch = (...responses) => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const next = responses[Math.min(calls.length, responses.length) - 1];
    if (next instanceof Error) throw next;
    return next;
  };
  return calls;
};

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const createClient = () => new APIClient({ retries: 1, rateLimit: 0 });

test('fetchAll fetches users and todos concurrently', async () => {
  const calls = mockFetch(jsonResponse([{ id: 1 }]), jsonResponse([{ id: 2 }]));
  const { users, todos } = await createClient().fetchAll();

  assert.equal(calls.length, 2);
  assert.ok(Array.isArray(users) && Array.isArray(todos));
});

test('repeated requests are served from cache', async () => {
  const calls = mockFetch(jsonResponse([]));
  const client = createClient();

  await client.fetchUsers();
  await client.fetchUsers();
  assert.equal(calls.length, 1);
});

test('HTTP 404 throws a non-retried APIError', async () => {
  const calls = mockFetch(new Response('', { status: 404 }));

  await assert.rejects(createClient().fetchTodos(), (error) =>
    error instanceof APIError && error.type === 'http' && error.status === 404);
  assert.equal(calls.length, 1);
});

test('network errors are retried before failing', async () => {
  const calls = mockFetch(new TypeError('fetch failed'));

  await assert.rejects(createClient().fetchUsers(), { type: 'network' });
  assert.equal(calls.length, 2);
});

test('malformed JSON and non-list payloads throw parse errors', async () => {
  mockFetch(new Response('{oops'));
  await assert.rejects(createClient().fetchUsers(), { type: 'parse' });

  mockFetch(jsonResponse({ not: 'a list' }));
  await assert.rejects(createClient().fetchUsers(), { type: 'parse' });
});

test('fetchTodosForUsers fetches each user concurrently and flattens results', async () => {
  globalThis.fetch = async (url) => jsonResponse([{ url }]);
  const todos = await createClient().fetchTodosForUsers(1, 2);

  assert.deepEqual(todos.map(({ url }) => url.split('.com')[1]), ['/users/1/todos', '/users/2/todos']);
});

test('fetchUserTodos rejects invalid ids', async () => {
  await assert.rejects(createClient().fetchUserTodos('abc'), TypeError);
});
