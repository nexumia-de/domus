// The worked examples of docs/engine.md are executed against the public entry.
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { examples, run } from './helpers/doc-examples';

const doc = fileURLToPath(new URL('../../../docs/engine.md', import.meta.url));
const list = examples(doc);

test('there is one example per function group', () => {
  expect(list.map((e) => e.title)).toEqual([
    'amounts',
    'ingredients',
    'templates',
    'balance',
    'range',
    'alcohol',
    'batch',
    'shelf',
    'variants',
  ]);
});

test.each(list.map((e) => [e.title, e] as const))(
  'example %s gives the result in the document',
  (_t, e) => {
    expect(run(e.code)).toEqual(e.expected);
  },
);
