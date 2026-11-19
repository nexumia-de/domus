// The substitutes of an ingredient in words: the factor from the data only, the engine's lookup.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { factorText, substituteItems } from '../src/classics/substitute-view';
import { EXAMPLE_SUBSTITUTES, NAMES } from './classics-fixture';
import { must } from './must';

const tree = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
      'utf8',
    ),
  ) as { ingredients: { id: string; parentId?: string }[] }
).ingredients;

describe('substitutes in words', () => {
  test('a factor with a plain word is said in words, another as times', () => {
    expect(factorText(0.5)).toBe('Amount: about half');
    expect(factorText(1 / 3)).toBe('Amount: about a third');
    expect(factorText(2)).toBe('Amount: about twice');
    expect(factorText(1.25)).toBe('Amount: about 1.25 times');
  });

  test('butter finds the substitute of its group, with the factor in words', () => {
    const items = substituteItems('fdc-173410', tree, EXAMPLE_SUBSTITUTES, 'en', NAMES);
    expect(items.map((i) => i.id)).toEqual(['example-butter-to-oil']);
    const item = must(items[0]);
    expect(item.name).toBe('name of fdc-group-oil');
    expect(item.factor).toBe('Amount: about half');
    expect(item.changes).toContain('Example change');
  });

  test('without a factor the line stays as it is; in German the text is German', () => {
    const item = must(substituteItems('fdc-171413', tree, EXAMPLE_SUBSTITUTES, 'de', NAMES)[0]);
    expect(item.factor).toBeUndefined();
    expect(item.changes).toContain('Beispieländerung');
  });

  test('an ingredient with no substitute gets none, and the lists are never changed', () => {
    expect(substituteItems('fdc-173468', tree, EXAMPLE_SUBSTITUTES, 'en', NAMES)).toEqual([]);
  });
});
