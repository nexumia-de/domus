// The shared model is reachable through the engine's entry from this
// repository (packages/model); its own behaviour is tested in materia.
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from 'vitest';
import { addDays, daysBetween, expiry } from '../src/index';

test('materia is the package of this repository', () => {
  const require = createRequire(import.meta.url);
  const entry = realpathSync(require.resolve('@nexumia-de/materia'));
  expect(entry.replaceAll('\\', '/')).toMatch(/\/packages\/model\/dist\/[^/]+$/);
});

test('shelf life from materia works through the entry', () => {
  expect(addDays('2026-11-18', 3)).toBe('2026-11-21');
  expect(daysBetween('2026-11-18', '2026-11-21')).toBe(3);
  expect(expiry({ madeOn: '2026-11-18', today: '2026-11-20', shelfLifeDays: 3 })).toMatchObject({
    status: 'use-soon',
    useBy: '2026-11-21',
    daysLeft: 1,
  });
});
