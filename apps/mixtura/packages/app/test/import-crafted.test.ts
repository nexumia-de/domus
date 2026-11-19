// A crafted export file with `__proto__` and `constructor` keys (issue #107):
// JSON.parse makes them own properties; the schemas allow no extra keys, so
// the file is refused, nothing is written and no prototype is polluted.
import { expect, test } from 'vitest';
import { buildExport, parseExportFile } from '../src/store';
import { openFresh, user } from './helpers';

const AT = '2026-11-17T09:30:00Z';
const good = () => JSON.stringify(buildExport(user, { exportedAt: AT }));
const polluted = () => ({}) as Record<string, unknown>;

/** The good file with `payload` (JSON text of members) added to the object that holds `anchor`. */
const crafted = (anchor: string, payload: string): string => {
  const text = good();
  const at = text.indexOf(anchor);
  expect(at).toBeGreaterThan(0);
  return `${text.slice(0, at)}${payload},${text.slice(at)}`;
};

const attacks: [string, string, string][] = [
  ['top level __proto__', '"app"', '"__proto__":{"polluted":true}'],
  ['top level constructor', '"app"', '"constructor":{"prototype":{"polluted":true}}'],
  ['in an ingredient: __proto__', '"name":"Example house gin"', '"__proto__":{"polluted":true}'],
  [
    'in a record: constructor',
    '"level":"product"',
    '"constructor":{"prototype":{"polluted":true}}',
  ],
];

for (const [name, anchor, payload] of attacks) {
  test(`crafted file (${name}) is refused and pollutes nothing`, async () => {
    const text = crafted(anchor, payload);
    const result = parseExportFile(text, text.length);
    expect(result.ok).toBe(false);
    expect(polluted()['polluted']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    // Nothing reached the store.
    const store = await openFresh();
    expect(await store.specs.list()).toEqual([]);
  });
}

test('the same keys inside free text values are only text', () => {
  const text = good().replace('"notes"', '"notes":"__proto__ constructor", "x"');
  expect(() => parseExportFile(text, text.length)).not.toThrow();
  expect(polluted()['polluted']).toBeUndefined();
});
