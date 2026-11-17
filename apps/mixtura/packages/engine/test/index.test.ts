// Pins the public surface: the names the entry point exports at runtime.
// A name becomes public only by editing this list (and docs/engine.md).
import { expect, test } from 'vitest';
import * as api from '../src/index';
import * as drink from '../src/drink';
import * as model from '../src/model';

const PUBLIC = [
  'ancestors',
  'assignSlots',
  'buildStockIndex',
  'buildTree',
  'checkRange',
  'chooseDilution',
  'computeBalance',
  'computePrepared',
  'convert',
  'descendants',
  'displayUnit',
  'DILUTION',
  'distance',
  'formatAmount',
  'formatAmountDetailed',
  'fromBase',
  'getIngredient',
  'INHERITED',
  'isA',
  'isEstimatedUnit',
  'lineMl',
  'lineRole',
  'makeableSpecs',
  'matchSpec',
  'missingOne',
  'parseAmount',
  'prediluted',
  'resolveAll',
  'resolveCost',
  'resolveProperty',
  'ROOT_TEMPLATES',
  'roundCount',
  'sameClass',
  'scale',
  'scaleLine',
  'scaleLines',
  'shelfLife',
  'substitutesFor',
  'swapCandidates',
  'toBase',
  'toGrams',
  'toMl',
  'UNITS',
  'unitValue',
  'unlockRanking',
];

test('the entry point exports exactly the pinned names', () => {
  expect(Object.keys(api).sort()).toEqual([...PUBLIC].sort());
});

test('nothing internal leaks: field lists, the mixture function and test hooks stay private', () => {
  for (const name of [
    'FIELD_CHECKS',
    'INGREDIENT_FIELDS',
    'PREPARED_FIELDS',
    'mix',
    'engineName',
  ]) {
    expect(Object.keys(api)).not.toContain(name);
  }
});

test('the general model and the drink-specific rules are separate and together are the entry', () => {
  const m = Object.keys(model);
  const d = Object.keys(drink);
  expect(m.filter((n) => d.includes(n))).toEqual([]);
  expect([...m, ...d].sort()).toEqual([...PUBLIC].sort());
  for (const name of ['computeBalance', 'chooseDilution', 'DILUTION', 'checkRange', 'prediluted']) {
    expect(d).toContain(name);
  }
});
