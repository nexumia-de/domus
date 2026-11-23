// Every role a shipped component states has a name in both languages: none is shown as its id.
import { expect, test } from 'vitest';
import { CLASSICS } from '../src/classics';
import { stringsDe, stringsEn } from '../src/strings';

test('the roles of the shipped components are named in English and German', () => {
  const roles = new Set(
    CLASSICS.flatMap((c) => (c.components ?? []).flatMap((p) => (p.role ? [p.role] : []))),
  );
  expect(roles.size).toBeGreaterThan(5);
  for (const role of roles) {
    expect((stringsEn.roles as Record<string, string>)[role], role).toBeTruthy();
    expect((stringsDe.roles as Record<string, string>)[role], role).toBeTruthy();
  }
  expect((stringsDe.roles as Record<string, string>)['side']).toBe('Beilage');
});
