---
type: Specification
title: Engine
description: The engine package as one documented entry point (@mixtura/engine): purpose, purity, every exported function with its signature, the general model apart from the drink-specific rules, vector folders and format, how to add a rule, one executed example per function group, the build and its size.
tags: [engine, api, vectors, build, purity]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: two-apps
    title: 'Decision: two apps, one engine'
    url: decisions/two-apps-one-engine.md
---

# Engine

`packages/engine` (`@mixtura/engine`) holds every rule of Mixtura as pure
functions over data: units and amounts, the ingredient tree with inherited
properties, prepared ingredients, templates and matching, balance figures
with dilution, batching. The app, and later a second app, use it only
through `import ... from '@mixtura/engine'`.

# Purity

No clock, no randomness, no DOM or host API, no logging, no import from the
app. Time, random numbers and ids come in as input. ESLint enforces this
for `packages/engine/src/**` ([development](development.md#the-engine-is-pure)),
a test fails when the rule is removed, and the build checks that
`dist/engine.mjs` contains no DOM or Node-only reference. Results are
numbers, statuses and reasons: an unknown stays unknown and names the
ingredients that made it so; nothing is a verdict ([balance](balance.md)).

# Entry point

`src/index.ts` is the only public entry and `package.json` `exports` allows
nothing else but the read-only seed data files:

| Export path                        | What                                                                |
| ---------------------------------- | ------------------------------------------------------------------- |
| `.`                                | The engine: `dist/engine.mjs` and `dist/index.d.ts`                 |
| `./seed/ingredients.json`          | Seed ingredients with attribution ([seed data](seed-data.md#files)) |
| `./seed/specs.json`                | Seed specs                                                          |
| `./seed/vocabulary.json`           | Glass and method names                                              |
| `./seed/LICENSE-bar-assistant.txt` | Licence text of the seed source                                     |

The lint rule `no-restricted-imports` fails any file of `packages/app` that
imports another path of the engine (`@mixtura/engine/src/...`, a relative
path into `packages/engine`); `test/app-imports.test.ts` lints fixtures that
must fail. `test/index.test.ts` pins the list of exported names, so a name
becomes public only by editing that list and this document.

## General and drink-specific

The decision ([two apps, one engine](decisions/two-apps-one-engine.md))
keeps drink rules apart from the general model, in two files that
`index.ts` joins:

| File           | Content                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/model.ts` | General model: amounts and units, ingredient tree, roles, inherited properties, prepared ingredients, substitution, slots and matching of a spec to templates |
| `src/drink.ts` | Drink-specific: balance figures (ABV, sugar, acid), dilution, usual-range check, the six root templates, batching with water                                  |

Everything in `model.ts` could move to shared code unchanged; `drink.ts`
imports from it, never the other way round.

# API

Units everywhere: volumes in ml (amounts in the unit of the unit table
[units](units.md), `UnitId`), mass in g, ABV and acid in percent, sugar in
g per 100 ml, shelf life in days, ratios in parts. Every function has a
TSDoc comment with `@param` and `@returns` that says the unit; a test
requires it and requires every exported name to be in the tables below.
Types are exported with `export type`, and the entity types mirror the
JSON Schemas in `packages/engine/schemas/`
([data model](data-model.md); `ingredients-types.test.ts` compares them).
Amount functions return `{ ok, value }` or `{ ok: false, error }`; the
others return result objects as documented in their module files
([amounts](engine-amounts.md), [ingredients](ingredients.md),
[balance](balance.md), [templates](templates.md)).

## General model (`src/model.ts`)

| Name                   | Signature                                                                                                            | Job                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `INHERITED`            | `readonly InheritedProperty[]`                                                                                       | The names of the properties a child inherits from its ancestors.                                         |
| `UNITS`                | `readonly UnitRow[]`                                                                                                 | The unit table of data/units.json: id, symbols, kind, size in ml or g, status and evidence of each unit. |
| `ancestors`            | `(tree: IngredientTree, id: string): string[] \| undefined`                                                          | The ancestors of an ingredient.                                                                          |
| `assignSlots`          | `(tree: IngredientTree, template: Template, lines: readonly MatchLine[], options?: MatchOptions): SlotAssignment`    | Assigns spec lines to the slots of a template by role.                                                   |
| `buildStockIndex`      | `(tree: IngredientTree, specs: readonly StockSpec[]): StockIndex`                                                    | Builds the stock index of a tree and specs: what does not depend on the stock, kept for reuse.           |
| `buildTree`            | `(list: readonly Ingredient[]): TreeResult`                                                                          | Validates the list and builds the ingredient tree.                                                       |
| `computePrepared`      | `(tree: IngredientTree, specs: SpecLookup, id: string): PreparedResult`                                              | Computes ABV, sugar, acid and volume of a prepared ingredient from its spec.                             |
| `convert`              | `(amount: Amount, to: UnitId, overrides?: UnitOverrides): Result<Amount>`                                            | Converts between two units of the same kind (volume to volume, mass to mass).                            |
| `descendants`          | `(tree: IngredientTree, id: string): string[] \| undefined`                                                          | The descendants of an ingredient.                                                                        |
| `displayUnit`          | `(unit: UnitId, system: DisplaySystem): UnitId`                                                                      | The unit an amount is shown in: its own if it belongs to the system or is a convention.                  |
| `distance`             | `(tree: IngredientTree, a: string, b: string): number \| undefined`                                                  | The distance of two ingredients in the tree.                                                             |
| `formatAmount`         | `(amount: Amount, options?: FormatOptions): Result<string>`                                                          | Formats an amount for display (rounded for reading, never stored).                                       |
| `formatAmountDetailed` | `(amount: Amount, options?: FormatOptions): Result<Formatted>`                                                       | Like `formatAmount`, with the shown amount and the rounding step.                                        |
| `fromBase`             | `(base: number, unit: UnitId, overrides?: UnitOverrides): Result<Amount>`                                            | An amount of the base unit (ml or g) expressed in `unit`.                                                |
| `getIngredient`        | `(tree: IngredientTree, id: string): Ingredient \| undefined`                                                        | An ingredient by id.                                                                                     |
| `isA`                  | `(tree: IngredientTree, child: string, ancestor: string): boolean`                                                   | Whether one ingredient is the other or below it.                                                         |
| `isEstimatedUnit`      | `(id: UnitId): boolean`                                                                                              | True when balance must flag the figure as estimated: a convention volume.                                |
| `lineMl`               | `(line: MatchLine, options?: MatchOptions, tree?: IngredientTree): { ml: number; } \| { reason: UnmeasuredReason; }` | The volume of a line.                                                                                    |
| `lineRole`             | `(tree: IngredientTree, line: MatchLine): { role: Role; } \| { reason: UnassignedReason; }`                          | The role a line has: its own, else the ingredient's resolved role.                                       |
| `makeableSpecs`        | `(index: StockIndex, stock: readonly StockEntry[], options?: StockOptions): MakeableReport`                          | Which specs the stock allows, per line how it is satisfied or why not (docs/makeable.md).                |
| `matchSpec`            | `(tree: IngredientTree, templates: readonly Template[], spec: MatchSpec, options?: MatchOptions): MatchResult`       | Matches a spec to templates by roles and ratios and ranks every candidate.                               |
| `missingOne`           | `(index: StockIndex, report: MakeableReport): MissingOne[]`                                                          | Specs that miss exactly one ingredient, with its substitutes.                                            |
| `parseAmount`          | `(text: string, options?: ParseOptions): Result<Amount>`                                                             | Parses text such as `1 1/2 oz` into an exact amount; never throws for user input.                        |
| `resolveAll`           | `(tree: IngredientTree, id: string): ResolvedProperties`                                                             | All inherited properties of one ingredient with their sources.                                           |
| `resolveCost`          | `(tree: IngredientTree, id: string): Resolved<Cost>`                                                                 | The price record of the ingredient itself: cost is never inherited.                                      |
| `resolveProperty`      | `(tree: IngredientTree, id: string, property: P): Resolved<NonNullable<Ingredient[P]>>`                              | Reads a property from the ingredient or its nearest ancestor that has it.                                |
| `sameClass`            | `(tree: IngredientTree, a: string, b: string): boolean`                                                              | Whether two ingredients can stand in for each other by class.                                            |
| `scale`                | `(amount: Amount, factor: number): Result<Amount>`                                                                   | Multiplies an amount; the unit stays.                                                                    |
| `substitutesFor`       | `(tree: IngredientTree, id: string): Substitutes`                                                                    | Ingredients of the same class and role as `id`, nearest first.                                           |
| `swapCandidates`       | `(tree: IngredientTree, id: string, options?: SwapOptions): SwapCandidates`                                          | Swap candidates for a line in groups (class, role, near), nearest first.                                 |
| `toBase`               | `(amount: Amount, overrides?: UnitOverrides): Result<{ value: number; kind: "mass" \| "volume"; }>`                  | The amount in the base unit of its kind: ml for volume, g for mass.                                      |
| `toGrams`              | `(amount: Amount, overrides?: UnitOverrides): Result<number>`                                                        | The mass of an amount.                                                                                   |
| `toMl`                 | `(amount: Amount, overrides?: UnitOverrides): Result<number>`                                                        | The volume of an amount.                                                                                 |
| `unitValue`            | `(id: UnitId, overrides?: UnitOverrides): number \| null`                                                            | The size of one unit.                                                                                    |
| `unlockRanking`        | `(index: StockIndex, stock: readonly StockEntry[], options?: StockOptions): UnlockResult`                            | Ranks the ingredients not in stock by the specs each would make makeable on its own.                     |

## Drink-specific (`src/drink.ts`)

| Name                 | Signature                                                                                                                                                | Job                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALCOHOL_THRESHOLDS` | `AlcoholThresholds`                                                                                                                                      | The default lines of `data/alcohol-thresholds.json`: ABV after dilution below 0.5 % is `none`, up to 10 % is `low` (percent).                                                                                 |
| `ALCOHOL_PRESETS`    | `{ without, low: readonly AlcoholPreset[]; default: { without: string; low: string } }`                                                                  | The selectable lines of `data/alcohol-thresholds.json` with id, percent, bound, evidence and basis; the app's Settings offers them.                                                                           |
| `alcoholThresholds`  | `(withoutId?: string, lowId?: string): AlcoholThresholds`                                                                                                | The thresholds for chosen preset ids; an unknown or missing id means the default.                                                                                                                             |
| `DILUTION`           | `DilutionTable`                                                                                                                                          | The dilution table of data/dilution.json: water added per method as a fraction of the pre-dilution volume (low, default, high) with its evidence.                                                             |
| `VARIANT_TEMPLATES`  | `readonly Template[]`                                                                                                                                    | Variants of root templates for the alcohol classes none and low; offered by `matchSpec` only when asked for that class. All ratios are assumptions.                                                           |
| `ROOT_TEMPLATES`     | `readonly Template[]`                                                                                                                                    | The six root templates (Old-Fashioned, Martini, Daiquiri, Sidecar, Highball, Flip) as data, with slots in parts and usual ranges in percent and g per 100 ml; all ratios are assumptions (docs/templates.md). |
| `checkRange`         | `(template: Template, after: RangeInput \| undefined): RangeCheck[]`                                                                                     | Compares figures after dilution with a template's usual ranges.                                                                                                                                               |
| `chooseDilution`     | `(method: string \| undefined, options?: DilutionOptions): DilutionChoice`                                                                               | The dilution fraction for a method, or why there is none.                                                                                                                                                     |
| `classifyAlcohol`    | `(figures: BalanceFigures, tree: IngredientTree, thresholds?: AlcoholThresholds): AlcoholClassResult`                                                    | Sorts the calculated ABV after dilution into `none`, `low`, `standard` or `unknown` (with the reason and ids) against thresholds passed in as data.                                                           |
| `computeBalance`     | `(tree: IngredientTree, spec: BalanceSpec, options?: BalanceOptions): BalanceResult`                                                                     | Computes the figures of a spec: volume, ABV, sugar, acid and ratios before and after dilution (docs/balance.md).                                                                                              |
| `prediluted`         | `(tree: IngredientTree, spec: BalanceSpec, servings: number, options?: BatchOptions): BatchResult`                                                       | Builds a pre-diluted batch of a spec with the dilution water added.                                                                                                                                           |
| `roundCount`         | `(value: number): { value: number; step: number }`                                                                                                       | Rounds a scaled count up to whole units, never below 1 (0 stays 0); used by batches and by the servings stepper.                                                                                              |
| `scaleLine`          | `(line: BalanceLine, factor: number, options?: ScaleOptions): { ok: true; value: BalanceLine; } \| { ok: false; error: BatchError; }`                    | Scales one line.                                                                                                                                                                                              |
| `scaleLines`         | `(lines: readonly BalanceLine[], servings: number, options?: ScaleOptions): { ok: true; value: BalanceLine[]; } \| { ok: false; errors: BatchError[]; }` | Scales all lines to a number of servings.                                                                                                                                                                     |
| `shelfLife`          | `(tree: IngredientTree, ids: readonly string[]): ShelfLife`                                                                                              | The shelf life of a batch: the shortest of its parts.                                                                                                                                                         |

## Counted lines and lines not counted

No new exported name; fields and result values the app can read:

- Spec line `topMl` (ml, only with `unit: top`) and ingredient
  `unitVolumes` (`{ [unitId]: { ml, evidence, source? } }`) are stored
  fields ([data model](data-model.md)); `BalanceLine`, `MatchLine` and
  `lineMl(line, options, tree)` read them.
- `computeBalance(...).value.excluded` lists every line the figures do not
  count: `{ ingredientId, reason: 'top-without-volume' | 'counted-without-volume', unit }`.
  An app shows each as "not counted in the figures" and, when the list is
  not empty, says that the figures exclude it. `estimated` and
  `estimatedIds` also name a counted line that has a volume.
- `prediluted(...).value.lines[].roundingError` is `null` for a counted
  line whose volume is not known; counted amounts round up to whole units.
- Counted unit ids are the units of kind `count` in `UNITS`
  ([units](units.md#counted-units)).

## Stock

Part of the general model (`src/stock/`, [what the stock allows](makeable.md)).
The input types are structural: a seed spec, a stored spec and a stock record
fit without conversion.

- `StockEntry`: `{ ingredientId, present }` of the stock entity; no quantities.
- `StockSpec`: `{ id, status?, templateId?, lines }`, a line is
  `{ ingredientId, optional?, substitutes? }`.
- `StockOptions`: `mode` (`strict` default, or `with-substitutes`) and
  `excludeStatuses` (default `['retired']`).
- `buildStockIndex` is built when the tree or the specs change and reused on
  every stock change; it is derived and never stored.
- Results: `MakeableReport` (`mode`, `specs: SpecResult[]` ordered by id,
  `ignoredStock`), `SpecResult` (`status`, `lines`, `missing`, `unknown`),
  `UnlockResult` (`ranking`, `needsMore`, `unknown`). Rules, fields,
  tie-breaks and measured times are in [makeable](makeable.md).
- Time: on the seed (635 specs, 296 ingredients) `makeableSpecs` takes
  about 5 ms and `unlockRanking` 20 to 30 ms per stock change; with 2000
  specs and 501 ingredients about 6 ms and 30 ms (first call 44 ms). The
  tests assert limits of 0.5 to 6 s. No inverted index is needed: the
  ranking intersects, per open spec, the ingredients that would satisfy its
  open lines instead of recomputing every spec per candidate.

# Examples

Each block runs as a test (`test/doc-examples.test.ts`): it imports from the
public entry, builds `result` and ends with the value it must have, so the
document cannot disagree with the code.

## Amounts

```ts example amounts
import { convert, formatAmount, parseAmount } from '@mixtura/engine';

const parsed = parseAmount('1 1/2 oz');
if (!parsed.ok) throw new Error(parsed.error.message);
const ml = convert(parsed.value, 'ml');
const shown = formatAmount(parsed.value, { system: 'metric' });
const result = {
  parsed: parsed.value,
  ml: ml.ok ? Math.round(ml.value.value * 1000) / 1000 : null,
  shown: shown.ok ? shown.value : null,
};
// result = {
//   "parsed": {
//     "value": 1.5,
//     "unit": "oz_us"
//   },
//   "ml": 44.36,
//   "shown": "45 ml"
// }
```

## Ingredients

```ts example ingredients
import { buildTree, resolveProperty } from '@mixtura/engine';

const built = buildTree([
  { id: 'spirits', name: 'Spirits', level: 'category', role: 'base', abv: 40 },
  { id: 'gin', name: 'Gin', level: 'product', parentId: 'spirits' },
]);
if (!built.ok) throw new Error(built.errors[0]?.message);
const result = {
  abv: resolveProperty(built.tree, 'gin', 'abv'),
  acid: resolveProperty(built.tree, 'gin', 'acid').value ?? 'unknown',
};
// result = {
//   "abv": {
//     "value": 40,
//     "from": "spirits"
//   },
//   "acid": "unknown"
// }
```

## Templates

```ts example templates
import { buildTree, matchSpec, ROOT_TEMPLATES } from '@mixtura/engine';

const built = buildTree([
  { id: 'gin', name: 'Gin', level: 'product', role: 'base' },
  { id: 'dry-vermouth', name: 'Dry Vermouth', level: 'product', role: 'modifier' },
]);
if (!built.ok) throw new Error('invalid tree');
const match = matchSpec(built.tree, ROOT_TEMPLATES, {
  lines: [
    { ingredientId: 'gin', amount: 60, unit: 'ml' },
    { ingredientId: 'dry-vermouth', amount: 1, unit: 'oz_us' },
  ],
});
const result = { chosen: match.chosen?.templateId, basis: match.chosen?.basis };
// result = {
//   "chosen": "martini",
//   "basis": "suggested"
// }
```

## Balance

```ts example balance
import { buildTree, computeBalance } from '@mixtura/engine';

const built = buildTree([
  { id: 'rum', name: 'Rum', level: 'product', abv: 40, sugar: 0, acid: 0 },
  { id: 'lime', name: 'Lime Juice', level: 'product', abv: 0, sugar: 1.5, acid: 6 },
  { id: 'syrup', name: 'Syrup', level: 'product', abv: 0, sugar: 61.48, acid: 0 },
]);
if (!built.ok) throw new Error('invalid tree');
const balance = computeBalance(built.tree, {
  method: 'shake',
  lines: [
    { ingredientId: 'rum', amount: 60, unit: 'ml' },
    { ingredientId: 'lime', amount: 22.5, unit: 'ml' },
    { ingredientId: 'syrup', amount: 22.5, unit: 'ml' },
  ],
});
if (!balance.ok || !balance.value.after) throw new Error('no figures');
const after = balance.value.after;
const round = (f: { known: boolean; value?: number }) =>
  f.known && f.value !== undefined ? Math.round(f.value * 1000) / 1000 : 'unknown';
const result = {
  volumeMl: after.volumeMl,
  abvPct: round(after.abvPct),
  sugarPer100Ml: round(after.sugarPer100Ml),
  acidPct: round(after.acidPct),
};
// result = {
//   "volumeMl": 131.25,
//   "abvPct": 18.286,
//   "sugarPer100Ml": 10.797,
//   "acidPct": 1.029
// }
```

## Dilution and the range check

```ts example range
import { checkRange, chooseDilution, ROOT_TEMPLATES } from '@mixtura/engine';

const daiquiri = ROOT_TEMPLATES.find((t) => t.id === 'daiquiri');
if (!daiquiri) throw new Error('no daiquiri');
const choice = chooseDilution('shake');
const checks = checkRange(daiquiri, {
  abvPct: { known: true, value: 18.286 },
  sugarPer100Ml: { known: true, value: 10.8 },
  acidPct: { known: false, missingIds: ['lime'], reason: 'no acid' },
});
const result = {
  fraction: choice.ok ? choice.value.fraction : null,
  statuses: checks.map((c) => c.figure + ':' + c.status),
};
// result = {
//   "fraction": 0.25,
//   "statuses": [
//     "abv:within",
//     "sugar:within",
//     "acid:unknown"
//   ]
// }
```

## Alcohol class

`classifyAlcohol(figures, tree, thresholds?)` reads `figures.after.abvPct`
of a balance result and the thresholds from data (`ALCOHOL_THRESHOLDS`
by default: below 0.5 % `none`, up to 10 % `low`, above `standard`;
`withoutBound: 'upTo'` includes the line, so 0 means exactly 0). The class
is `unknown`, with `reason` and `ids`, when there are no figures after
dilution, an ABV is unknown, a line balance did not count may hold
ethanol, or the thresholds are invalid. Pass the class to
`matchSpec(..., { alcohol })` to get the variant templates
([templates](templates.md#variants-by-alcohol-class)). The presets and
their evidence are in `data/alcohol-thresholds.json`
([non-alcoholic](non-alcoholic.md#as-built-36)).

```ts example alcohol
import { buildTree, classifyAlcohol, computeBalance } from '@mixtura/engine';

const built = buildTree([
  { id: 'tea', name: 'Tea', level: 'product', abv: 0 },
  { id: 'bitters', name: 'Bitters', level: 'product', abv: 44.7 },
]);
if (!built.ok) throw new Error('invalid tree');
const balance = computeBalance(built.tree, {
  method: 'stir',
  lines: [
    { ingredientId: 'tea', amount: 60, unit: 'ml' },
    { ingredientId: 'bitters', amount: 2, unit: 'dash' },
  ],
});
if (!balance.ok) throw new Error('no figures');
const strict = { withoutPct: 0.05, withoutBound: 'upTo' as const, lowPct: 1.2 };
const result = {
  default: classifyAlcohol(balance.value, built.tree).class,
  strict: classifyAlcohol(balance.value, built.tree, strict).class,
  abvPct: Math.round((classifyAlcohol(balance.value, built.tree).abvPct ?? 0) * 100) / 100,
};
// result = {
//   "default": "low",
//   "strict": "low",
//   "abvPct": 1.11
// }
```

## Batch

```ts example batch
import { buildTree, prediluted, shelfLife } from '@mixtura/engine';

const built = buildTree([
  { id: 'gin', name: 'Gin', level: 'product', abv: 40, sugar: 0, acid: 0, shelfLifeDays: 3650 },
  {
    id: 'vermouth',
    name: 'Vermouth',
    level: 'product',
    abv: 16,
    sugar: 3,
    acid: 0,
    shelfLifeDays: 60,
  },
]);
if (!built.ok) throw new Error('invalid tree');
const batch = prediluted(
  built.tree,
  {
    method: 'stir',
    lines: [
      { ingredientId: 'gin', amount: 60, unit: 'ml' },
      { ingredientId: 'vermouth', amount: 30, unit: 'ml' },
    ],
  },
  10,
);
if (!batch.ok) throw new Error(batch.errors[0]?.message);
const life = shelfLife(built.tree, ['gin', 'vermouth']);
const result = {
  waterMl: Math.round(batch.value.water.exactMl * 100) / 100,
  totalMl: Math.round(batch.value.totalVolumeMl * 100) / 100,
  shelfLifeDays: life.known ? life.days : null,
};
// result = {
//   "waterMl": 180,
//   "totalMl": 1080,
//   "shelfLifeDays": 60
// }
```

# Vectors

Every rule and formula has a JSON vector in `packages/engine/vectors/`,
run by vitest through the public entry only (`test/public-api.test.ts`
scans the vector tests for deep imports):

| Folder                   | Rule                                                 | Schema                                           | Test                                 |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `vectors/` (5 files)     | First balance and syrup vectors                      | `vector.schema.json`                             | `vectors.test.ts`, `balance.test.ts` |
| `vectors/amounts/`       | Parse, convert, scale, format                        | `amounts/amounts.schema.json`                    | `amounts.test.ts`                    |
| `vectors/balance/`       | Balance figures, dilution, unknowns                  | `balance/balance-vector.schema.json`             | `balance.test.ts`                    |
| `vectors/ingredients/`   | Tree, inheritance, prepared, substitution            | `ingredients/ingredient-vector.schema.json`      | `ingredients-vectors.test.ts`        |
| `vectors/batch/`         | Scaling, pre-diluted batches, shelf life             | `batch/batch-vector.schema.json`                 | `batch.test.ts`                      |
| `vectors/templates/`     | Matching and the range check                         | `templates/templates-vector.schema.json`         | `templates.test.ts`                  |
| `vectors/classics/`      | 20 checked drinks, template and figures              | `classics/classics-vector.schema.json`           | `classics.test.ts`                   |
| `vectors/non-alcoholic/` | Alcohol class, variant templates offered for a class | `non-alcoholic/non-alcoholic-vector.schema.json` | `non-alcoholic-vectors.test.ts`      |
| `vectors/stock/`         | Makeable, missing one, unlock ranking                | `stock/stock-vector.schema.json`                 | `stock-vectors.test.ts`              |

A vector file has an `id` equal to its file name, the inputs, the expected
values worked out by hand with their `tolerance`, and a `source` that says
where the numbers come from; assumptions are marked as such. Each schema
describes the shape of its folder.

## Adding a rule

1. Write the rule in the document that owns it ([balance](balance.md),
   [templates](templates.md), ...), with its source or the word
   "assumption".
2. Work the expected values out by hand (a calculator, not the engine) and
   write the vector file in the matching folder with a unique id and a
   `source`.
3. Implement the rule in `src/<module>/`, one job per file, data in
   `data/` when it is a number someone may change.
4. Run `npm test`; if the rule needs a new exported name, add it to
   `src/model.ts` or `src/drink.ts` (general or drink-specific), give it a
   TSDoc with units, add it to the table above and to the list in
   `test/index.test.ts`.

# Build

`npm run build -w @mixtura/engine` runs `build.mjs`: esbuild bundles
`src/index.ts` to `dist/engine.mjs` (ES module, no dependency, platform
neutral), `tsc` writes the declarations to `dist/` (`dist/index.d.ts` and one
file per module), and `check-dist.mjs` fails the build when the bundle has an
import, a `process`, `window`, `document`, `navigator`, `fetch`, `require`,
`__dirname` or a `node:` reference. The bundle is about 67 kB
(unminified, with the six templates and the unit and dilution tables); the
test compares it with this figure (within 25 %). The app resolves `@mixtura/engine` to
this build, so the root commands build the engine first; see
[development](development.md).
