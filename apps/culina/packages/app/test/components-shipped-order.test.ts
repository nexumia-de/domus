// The order in which Keep writes a shipped component and the components its lines name: the named
// ones first, so that a store failure half way never leaves a component naming one that is not
// there. `saveRecord` is wrapped to record the order and still writes through to the in-memory
// store (fake-indexeddb); the failure half way itself is not simulated here.
import { beforeEach, expect, test, vi } from 'vitest';
import type { Classic } from '@culina/engine';
import { keepShippedComponent } from '../src/classics/keep';
import { startNotebook } from '../src/notebook';
import { PAN_DISH } from './classics-fixture';
import { freshFactory } from './store-helpers';

const saved: { kind: string; name: string }[] = [];

vi.mock('../src/notebook', async (original) => {
  const actual = await original<typeof import('../src/notebook')>();
  return {
    ...actual,
    saveRecord: (async (kind: string, record: { name: string }) => {
      saved.push({ kind, name: record.name });
      return (actual.saveRecord as (k: string, r: unknown) => unknown)(kind, record);
    }) as typeof actual.saveRecord,
  };
});

const WITH_SUB: Classic = {
  ...PAN_DISH,
  components: [
    ...(PAN_DISH.components ?? []),
    {
      id: 'example-plate',
      name: { en: 'Example plate', de: 'Beispielteller' },
      lines: [
        { ref: { kind: 'component', id: 'example-sauce' }, amount: { value: 100, unit: 'g' } },
      ],
    },
  ],
};

beforeEach(async () => {
  saved.length = 0;
  await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-22T08:00:00.000Z' });
});

test('Keep writes the component its lines name before the component itself', async () => {
  const done = await keepShippedComponent(WITH_SUB, 'example-plate', 2, 'en');
  expect(done.ok).toBe(true);
  expect(saved.filter((s) => s.kind === 'components').map((s) => s.name)).toEqual([
    'Example sauce',
    'Example plate',
  ]);
});
