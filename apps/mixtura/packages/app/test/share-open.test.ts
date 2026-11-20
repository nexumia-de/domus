// Opening a share link: the preview state, the one error state per failure,
// and that a link never touches spaces, stock or pairings.
import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { createExchangeActions } from '../src/exchange-actions';
import { encodePayload } from '../src/share/link';
import { openShare, sharedSpec } from '../src/share/open';
import { createShareSender } from '../src/share/send';
import { createStore } from '../src/state';
import { buildExport, type ExportFile, type LocalStore } from '../src/store';
import { openFresh, user } from './helpers';

const AT = '2026-11-18T10:00:00Z';
const prefs = { theme: 'system', units: 'metric' } as const;

async function setup(store: LocalStore | null) {
  const app = createStore(initialState('#/share', prefs));
  const exchange = createExchangeActions({
    app,
    local: () => store,
    seedVersion: () => 'seed-1',
    now: () => new Date(AT),
    download: () => undefined,
  });
  return { app, exchange, host: { app, local: () => store } };
}

const link = (file: unknown): Promise<string> => encodePayload(JSON.stringify(file));

/** The example data with a pairing: a hand-made link may carry one. */
const everything = (): ExportFile => buildExport(user, { exportedAt: AT });

test('a link with pairings adds the drink only', async () => {
  const store = await openFresh();
  const { app, exchange, host } = await setup(store);
  await openShare(host, await link(everything()));
  const flow = app.get().importFlow;
  if (flow.kind !== 'preview') throw new Error(`expected a preview, got ${flow.kind}`);
  expect(flow.share).toBeDefined();
  expect(flow.file.affinities).toEqual([]);
  expect(flow.file.specs.length).toBeGreaterThan(0);
  expect(await exchange.apply('merge')).toBe(true);
  expect(await store.affinities.list()).toEqual([]);
  expect((await store.specs.list()).length).toBe(user.specs.length);
  // Undo takes it back, like a file import.
  await exchange.undo();
  expect(await store.specs.list()).toEqual([]);
});

test('opening the same link again changes nothing', async () => {
  const store = await openFresh();
  const { app, exchange, host } = await setup(store);
  const payload = await link(everything());
  await openShare(host, payload);
  await exchange.apply('merge');
  const before = await store.exchange.exportData({ exportedAt: AT });
  await openShare(host, payload);
  const flow = app.get().importFlow;
  if (flow.kind !== 'preview') throw new Error('expected a preview');
  expect(flow.merge.added.specs + flow.merge.added.ingredients + flow.merge.added.templates).toBe(
    0,
  );
  expect(await store.exchange.exportData({ exportedAt: AT })).toEqual(before);
});

test.each([
  ['damaged text', async (): Promise<string> => '1.AAAAAAAAAAAA', 'damaged'],
  ['a newer link version', async (): Promise<string> => '2.abcd', 'version'],
  ['JSON that is no export', async () => encodePayload('{"x":1}'), 'not-drink'],
  ['text that is no JSON', async () => encodePayload('not json'), 'damaged'],
  [
    'a file of a newer format',
    async () => encodePayload(JSON.stringify({ ...everything(), formatVersion: 99 })),
    'version',
  ],
  [
    'a file that breaks the schema',
    async () => encodePayload(JSON.stringify({ ...everything(), specs: [{ id: 'x' }] })),
    'damaged',
  ],
  [
    'a file without a drink',
    async () =>
      encodePayload(JSON.stringify({ ...everything(), specs: [], ingredients: [], templates: [] })),
    'not-drink',
  ],
] as const)('%s gives the error state %s', async (_name, make, reason) => {
  const store = await openFresh();
  const { app, host } = await setup(store);
  await openShare(host, await make());
  expect(app.get().importFlow).toEqual({ kind: 'share-error', reason });
});

test('without a store the error says so', async () => {
  const { app, host } = await setup(null);
  await openShare(host, await link(everything()));
  expect(app.get().importFlow).toEqual({ kind: 'share-error', reason: 'no-storage' });
});

test('the shared drink is the leaf of the file', () => {
  const file = everything();
  expect(sharedSpec(file)?.name).toBeDefined();
  expect(sharedSpec({ ...file, specs: [] })).toBeNull();
});

test('sending: the sheet state holds a link that opens as a preview in another store', async () => {
  const sender = await openFresh();
  const spec = user.specs[1];
  if (!spec) throw new Error('fixture');
  for (const r of user.ingredients) await sender.ingredients.put(r);
  for (const r of user.templates) await sender.templates.put(r);
  for (const r of user.specs) await sender.specs.put(r);
  const app = createStore(initialState('#/drinks', prefs));
  (globalThis as { location?: unknown }).location = { origin: 'https://x.example', pathname: '/' };
  await createShareSender(
    app,
    () => sender,
    () => new Date(AT),
  ).prepare(spec.id, spec.name);
  const state = app.get().share;
  if (state.kind !== 'ready') throw new Error(`expected ready, got ${state.kind}`);
  expect(state.url.startsWith('https://x.example/#/share/1.')).toBe(true);
  const receiver = await setup(await openFresh());
  await openShare(receiver.host, state.url.split('#/share/')[1] ?? '');
  const flow = receiver.app.get().importFlow;
  if (flow.kind !== 'preview') throw new Error('expected a preview');
  expect(flow.share?.name).toBe(spec.name);
});

test("sending a spec id that is not the user's gives the failed state", async () => {
  const store = await openFresh();
  const app = createStore(initialState('#/drinks', prefs));
  await createShareSender(
    app,
    () => store,
    () => new Date(AT),
  ).prepare('daiquiri', 'X');
  expect(app.get().share.kind).toBe('failed');
});
