// The shared model is reachable through the engine's entry at the pinned
// version; its own behaviour is tested in materia.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from 'vitest';
import { addDays, daysBetween, expiry } from '../src/index';

test('materia is pinned to an exact version tag', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { dependencies: Record<string, string> };
  expect(manifest.dependencies['@nexumia-de/materia']).toMatch(
    /^github:nexumia-de\/materia#v\d+\.\d+\.\d+$/,
  );
});

test('the installed materia is the pinned version', () => {
  const require = createRequire(import.meta.url);
  const entry = require.resolve('@nexumia-de/materia');
  const installed = JSON.parse(
    readFileSync(new URL('../package.json', `file://${entry}`), 'utf8'),
  ) as { version: string };
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { dependencies: Record<string, string> };
  expect(manifest.dependencies['@nexumia-de/materia']).toBe(
    `github:nexumia-de/materia#v${installed.version}`,
  );
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
