// Why an entry is on the list, in words (src/list/origin.ts): the app a recipe came from by its
// visible name, as the web entry screen and the native entry page say it. Exact strings in
// English and German. What this does not prove: the screens themselves (Emptio's e2e shows the
// web screen; the native page is checked by its source in packages/linux/test/entry-origin.test.ts).
import { expect, test } from 'vitest';
import { appName, originText } from '../src/list/origin';
import { stringsEn } from '../src/strings';
import { stringsDe } from '../src/strings-de';

test('a recipe of Culina names the app by its visible name, not its id', () => {
  const origin = { kind: 'recipe', app: 'culina', title: 'Frikandelle' } as const;
  expect(originText(origin, '2026-11-24T10:00:00.000Z', stringsEn)).toBe(
    "From Cook's Workbench: Frikandelle.",
  );
  expect(originText(origin, '2026-11-24T10:00:00.000Z', stringsDe)).toBe(
    "Aus Cook's Workbench: Frikandelle.",
  );
  expect(appName('mixtura')).toBe('Drink Builder');
});

test('an app the list does not know is shown by its id (control), typed and staple as before', () => {
  expect(
    originText({ kind: 'recipe', app: 'other', title: 'Soup' }, '2026-11-24T10:00:00Z', stringsEn),
  ).toBe('From other: Soup.');
  expect(originText({ kind: 'typed' }, '2026-11-24T10:00:00.000Z', stringsEn)).toBe(
    stringsEn.entry.typed('2026-11-24'),
  );
  expect(originText({ kind: 'staple' }, '2026-11-24T10:00:00.000Z', stringsEn)).toBe(
    stringsEn.entry.staple,
  );
});
