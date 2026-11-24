// The native entry page says where a recipe came from by the app's visible name ("From Cook's
// Workbench: Frikandelle."), as the web entry screen does; until 2026-11-24 it printed the raw id
// ("From culina: …"). The page needs GTK, so this reads its source: it must word the origins with
// the app core's `originText` and never pass an origin's raw `app` to the text. The words
// themselves are pinned in packages/app/test/origin.test.ts. Not proved: the page drawn in GTK.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { originText, stringsEn } from '@emptio/app/core';

const page = readFileSync(new URL('../src/ui/entry-page.ts', import.meta.url), 'utf8');

test('the entry page words the origins with originText', () => {
  expect(page).toMatch(/originText\(origin, entry\.addedAt, t\)/);
  expect(page).not.toMatch(/t\.entry\.recipe\(origin\.app/);
});

test('with the texts the native app uses, Culina is named as Cook’s Workbench', () => {
  expect(
    originText({ kind: 'recipe', app: 'culina', title: 'Frikandelle' }, '2026-11-24', stringsEn),
  ).toBe("From Cook's Workbench: Frikandelle.");
});
