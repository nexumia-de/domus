// Pins the public surface: the names the entry point exports at runtime.
// A name becomes public only by editing this list (and docs/engine.md).
import { expect, test } from 'vitest';
import * as api from '../src/index';
import * as drink from '../src/drink';
import * as model from '../src/model';

const PUBLIC = [
  'addDays',
  'ancestors',
  'ALCOHOL_PRESETS',
  'ALCOHOL_THRESHOLDS',
  'alcoholThresholds',
  'assignSlots',
  'buildFamily',
  'buildStockIndex',
  'buildTree',
  'checkRange',
  'chooseDilution',
  'classifyAlcohol',
  'computeBalance',
  'computePrepared',
  'convert',
  'dayNumber',
  'daysBetween',
  'descendants',
  'diffSpecs',
  'displayUnit',
  'DILUTION',
  'distance',
  'formatAmount',
  'formatAmountDetailed',
  'fromBase',
  'expiry',
  'findFamilyCycles',
  'getIngredient',
  'INHERITED',
  'isA',
  'isEstimatedUnit',
  'limitingShelfLife',
  'lineMl',
  'lineRole',
  'makeableSpecs',
  'matchSpec',
  'missingOne',
  'pairRanking',
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
  'summariseRiff',
  'swapCandidates',
  'toBase',
  'toGrams',
  'toMl',
  'UNITS',
  'USE_SOON_DAYS',
  'variantSuggestions',
  'VARIANT_TEMPLATES',
  'unitValue',
  'unlockRanking',
  'buildExport',
  'countsOf',
  'exportFileName',
  'formatMigrations',
  'FORMAT_VERSION',
  'isNoOp',
  'isUserId',
  'KINDS',
  'MAX_FILE_BYTES',
  'migrateFile',
  'parseExportFile',
  'planImport',
  'totalCount',
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
