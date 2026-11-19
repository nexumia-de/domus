import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { createStore } from '../src/state';
import { type Ingredient, type LocalStore } from '../src/store';
import { applyOutcome, type SyncOk } from '../src/sync';
import { user } from './helpers';
import { gone, instant, live } from './helpers/sync-client';
import { openFresh } from './helpers';

const custom = user.ingredients[0] as Ingredient;

async function setup() {
  const local: LocalStore = await openFresh();
  const place = (await local.placeSelection()).entry;
  const app = createStore(initialState('#/stock', { theme: 'system', units: 'metric' }));
  const row = (id: string, at: number, present = true) => ({
    ...live(id, at, present),
    placeId: place,
  });
  const ok = (rows: SyncOk['rows'], extra: Partial<SyncOk> = {}): SyncOk => ({
    kind: 'ok',
    changedLocal: true,
    wrote: false,
    place: { id: place, name: 'Home', updatedAt: instant(0) },
    rows,
    entities: [],
    ...extra,
  });
  return { local, place, app, row, ok };
}

test('stores merged rows, the new name and new custom ingredients in one go and redraws', async () => {
  const { local, place, app, row, ok } = await setup();
  const rev = app.get().stockRev;
  const outcome = ok([row('gin', 3), { ...gone('rum', 4), placeId: place }], {
    place: { id: place, name: 'Flat', updatedAt: '2099-01-01T00:00:00Z' },
    entities: [custom],
  });
  await applyOutcome(local, app, outcome);
  expect(await local.stock.get([place, 'gin'])).toMatchObject({ present: true });
  expect(await local.stock.get([place, 'rum'])).toMatchObject({ deleted: true });
  expect((await local.places.get(place))?.name).toBe('Flat');
  expect(await local.ingredients.get(custom.id)).toMatchObject({ name: custom.name });
  expect(app.get().stockRev).toBeGreaterThan(rev);
});

test('a local change made while the cycle was in flight is kept', async () => {
  const { local, place, app, row, ok } = await setup();
  await local.stock.put(row('gin', 2));
  const outcome = ok([row('gin', 2), row('rum', 3)]); // the cycle's view, taken earlier
  await local.stock.put(row('gin', 8, false)); // the user toggles during the cycle
  await local.stock.put(row('lime', 9)); // and adds one
  await applyOutcome(local, app, outcome);
  expect(await local.stock.get([place, 'gin'])).toMatchObject({
    present: false,
    updatedAt: instant(8),
  });
  expect(await local.stock.get([place, 'lime'])).toBeDefined();
  expect(await local.stock.get([place, 'rum'])).toBeDefined();
});

test('an older remote record does not replace a newer local one', async () => {
  const { local, place, app, row, ok } = await setup();
  await local.stock.put(row('gin', 8));
  await applyOutcome(local, app, ok([row('gin', 3, false)]));
  expect(await local.stock.get([place, 'gin'])).toMatchObject({ present: true });
});

test('records that break the schema or name another place are skipped, the rest is stored', async () => {
  const { local, place, app, row, ok } = await setup();
  const bad = { ...row('gin', 3), updatedAt: 'yesterday' };
  const foreign = { ...row('rum', 3), placeId: 'u-9b8a7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d' };
  await applyOutcome(
    local,
    app,
    ok([bad, foreign, row('lime', 3)], { entities: [{ ...custom, level: 'nonsense' } as never] }),
  );
  expect(
    (await local.stock.list()).filter((r) => r.placeId === place).map((r) => r.ingredientId),
  ).toEqual(['lime']);
  expect(await local.ingredients.get(custom.id)).toBeUndefined();
});

test('an ingredient the device already has is not replaced', async () => {
  const { local, app, row, ok } = await setup();
  await local.ingredients.put({ ...custom, name: 'My own name' });
  await applyOutcome(local, app, ok([row(custom.id, 3)], { entities: [custom] }));
  expect((await local.ingredients.get(custom.id))?.name).toBe('My own name');
});
