import { afterEach, expect, test } from 'vitest';
import { openStore, setStoreLogSink } from '../src/store';
import { toId, type LogDetail, type StoreEvent } from '../src/store/log';
import { clockOf, freshFactory } from './store-helpers';

const SECRET = 'zebra-note-9f3 grandmother pepper';

afterEach(() => setStoreLogSink(null));

test('logs name ids and counts, never names or notes', async () => {
  const entries: [StoreEvent, LogDetail][] = [];
  setStoreLogSink((event, detail) => entries.push([event, detail]));
  const factory = freshFactory();
  const record = {
    id: 'u-aaaa',
    name: `Name ${SECRET}`,
    'x-note': SECRET,
    parentId: 'alliums',
  };
  const opened = await openStore({
    now: clockOf('2026-11-18T08:00:00.000Z'),
    indexedDB: factory,
    migrations: [],
  });
  if (!opened.ok) throw new Error('open failed');
  await opened.store.put('ingredients', record);
  await opened.store.get('ingredients', 'u-aaaa');
  await opened.store.remove('ingredients', 'u-aaaa');
  opened.store.close();

  const noteMigration = {
    from: 1,
    to: 2,
    migrate: () => {
      throw new Error('no text here');
    },
  };
  await openStore({
    now: () => '2026-11-18T09:00:00.000Z',
    indexedDB: factory,
    migrations: [noteMigration],
  });

  const events = entries.map(([event]) => event);
  expect(events).toEqual(
    expect.arrayContaining(['open', 'put', 'remove', 'migrate-start', 'migrate-failed']),
  );
  expect(JSON.stringify(entries)).not.toContain(SECRET);
  expect(entries.find(([event]) => event === 'put')?.[1]).toEqual({
    kind: 'ingredients',
    count: 1,
    ids: ['u-aaaa'],
  });
});

test('only id-shaped strings pass as ids', () => {
  expect(toId('u-3f1c2a52-8d1e')).toBe('u-3f1c2a52-8d1e');
  expect(toId(SECRET)).toBe('(not-an-id)');
  expect(toId(42)).toBe('(not-an-id)');
});

test('without a sink and without the debug flag nothing is printed', async () => {
  const printed: unknown[] = [];
  const original = console.debug;
  console.debug = (...args: unknown[]) => void printed.push(args);
  try {
    const opened = await openStore({
      now: () => '2026-11-18T08:00:00.000Z',
      indexedDB: freshFactory(),
    });
    expect(opened.ok).toBe(true);
  } finally {
    console.debug = original;
  }
  expect(printed).toEqual([]);
});
