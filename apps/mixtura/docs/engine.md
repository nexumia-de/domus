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

| File           | Content                                                                                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/model.ts` | General model: amounts and units, ingredient tree, prepared-ingredient specs, substitution, assigning spec lines to template slots                                                                                                                                                            |
| `src/drink.ts` | Drink-specific: the drink ingredient (ABV, sugar, acid, drink roles) and its inherited properties, prepared-ingredient figures, balance figures, dilution, matching and variants of drink templates, comparing drink versions, usual-range check, the six root templates, batching with water |

Since 2026-11-18 the general model, except amounts and the export
exchange, is not in this repository: `model.ts` re-exports it from
[materia](https://github.com/nexumia-de/materia), the package shared with Culina, which the engine installs from an
exact git tag ([shared model](shared-model.md#extraction-order),
[decision](decisions/shared-model.md)). `drink.ts` and the drink folders
import the generic functions from `@nexumia-de/materia` and pass the
drink lists. The build bundles materia into `dist/engine.mjs`, so the
app sees one engine as before. A bug in a general function is fixed in
materia, followed by a new tag and a bump here.

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

| Name                   | Signature                                                                                                                                        | Job                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNITS`                | `readonly UnitRow[]`                                                                                                                             | The unit table of data/units.json: id, symbols, kind, size in ml or g, status and evidence of each unit.                                                                                                                                                                           |
| `ancestors`            | `(tree: IngredientTree, id: string): string[] \| undefined`                                                                                      | The ancestors of an ingredient.                                                                                                                                                                                                                                                    |
| `assignSlots`          | `(tree: IngredientTree, template: Template, lines: readonly MatchLine[], options?: MatchOptions): SlotAssignment`                                | Assigns spec lines to the slots of a template by role.                                                                                                                                                                                                                             |
| `buildFamily`          | `(specs: readonly FamilySpec[], lineageId: string): Family`                                                                                      | The family of a drink: ancestors, riffs and siblings as lineage ids (docs/screens-specs.md#riff-and-family).                                                                                                                                                                       |
| `buildStockIndex`      | `(tree: IngredientTree, specs: readonly StockSpec[]): StockIndex`                                                                                | Builds the stock index of a tree and specs: what does not depend on the stock, kept for reuse.                                                                                                                                                                                     |
| `buildTree`            | `(list: readonly Ingredient[]): TreeResult`                                                                                                      | Validates the list and builds the ingredient tree.                                                                                                                                                                                                                                 |
| `convert`              | `(amount: Amount, to: UnitId, overrides?: UnitOverrides): Result<Amount>`                                                                        | Converts between two units of the same kind (volume to volume, mass to mass).                                                                                                                                                                                                      |
| `descendants`          | `(tree: IngredientTree, id: string): string[] \| undefined`                                                                                      | The descendants of an ingredient.                                                                                                                                                                                                                                                  |
| `displayUnit`          | `(unit: UnitId, system: DisplaySystem): UnitId`                                                                                                  | The unit an amount is shown in: its own if it belongs to the system or is a convention.                                                                                                                                                                                            |
| `distance`             | `(tree: IngredientTree, a: string, b: string): number \| undefined`                                                                              | The distance of two ingredients in the tree.                                                                                                                                                                                                                                       |
| `findFamilyCycles`     | `(specs: readonly FamilySpec[]): string[][]`                                                                                                     | Finds every loop of riffs in imported data, one list of lineage ids per loop.                                                                                                                                                                                                      |
| `formatAmount`         | `(amount: Amount, options?: FormatOptions): Result<string>`                                                                                      | Formats an amount for display (rounded for reading, never stored).                                                                                                                                                                                                                 |
| `formatAmountDetailed` | `(amount: Amount, options?: FormatOptions): Result<Formatted>`                                                                                   | Like `formatAmount`, with the shown amount and the rounding step.                                                                                                                                                                                                                  |
| `fromBase`             | `(base: number, unit: UnitId, overrides?: UnitOverrides): Result<Amount>`                                                                        | An amount of the base unit (ml or g) expressed in `unit`.                                                                                                                                                                                                                          |
| `getIngredient`        | `(tree: IngredientTree, id: string): Ingredient \| undefined`                                                                                    | An ingredient by id.                                                                                                                                                                                                                                                               |
| `isA`                  | `(tree: IngredientTree, child: string, ancestor: string): boolean`                                                                               | Whether one ingredient is the other or below it.                                                                                                                                                                                                                                   |
| `isEstimatedUnit`      | `(id: UnitId): boolean`                                                                                                                          | True when balance must flag the figure as estimated: a convention volume.                                                                                                                                                                                                          |
| `lineMl`               | `(line: MatchLine, options?: MatchOptions, tree?: IngredientTree): { ml: number; } \| { reason: UnmeasuredReason; }`                             | The volume of a line.                                                                                                                                                                                                                                                              |
| `lineRole`             | `(tree: IngredientTree, line: MatchLine): { role: Role; } \| { reason: UnassignedReason; }`                                                      | The role a line has: its own, else the ingredient's resolved role.                                                                                                                                                                                                                 |
| `makeableSpecs`        | `(index: StockIndex, stock: readonly StockEntry[], options?: StockOptions): MakeableReport`                                                      | Which specs the stock allows, per line how it is satisfied or why not (docs/makeable.md).                                                                                                                                                                                          |
| `missingOne`           | `(index: StockIndex, report: MakeableReport): MissingOne[]`                                                                                      | Specs that miss exactly one ingredient, with its substitutes.                                                                                                                                                                                                                      |
| `pairRanking`          | `(index: StockIndex, stock: readonly StockEntry[], options?: PairOptions): PairResult`                                                           | Ranks pairs of ingredients not in stock by the specs they make makeable together: per pair what each unlocks alone and what only both do.                                                                                                                                          |
| `parseAmount`          | `(text: string, options?: ParseOptions): Result<Amount>`                                                                                         | Parses text such as `1 1/2 oz` into an exact amount; never throws for user input.                                                                                                                                                                                                  |
| `resolveCost`          | `(tree: IngredientTree, id: string): Resolved<Cost>`                                                                                             | The price record of the ingredient itself: cost is never inherited.                                                                                                                                                                                                                |
| `sameClass`            | `(tree: IngredientTree, a: string, b: string): boolean`                                                                                          | Whether two ingredients can stand in for each other by class.                                                                                                                                                                                                                      |
| `scale`                | `(amount: Amount, factor: number): Result<Amount>`                                                                                               | Multiplies an amount; the unit stays.                                                                                                                                                                                                                                              |
| `substitutesFor`       | `(tree: IngredientTree, id: string): Substitutes`                                                                                                | Ingredients of the same class and role as `id`, nearest first.                                                                                                                                                                                                                     |
| `summariseRiff`        | `(diff: SpecDiff): RiffChange`                                                                                                                   | Turns the difference between a riff and its parent into a counted list of changes.                                                                                                                                                                                                 |
| `swapCandidates`       | `(tree: IngredientTree, id: string, options?: SwapOptions): SwapCandidates`                                                                      | Swap candidates for a line in groups (class, role, near), nearest first.                                                                                                                                                                                                           |
| `toBase`               | `(amount: Amount, overrides?: UnitOverrides): Result<{ value: number; kind: "mass" \| "volume"; }>`                                              | The amount in the base unit of its kind: ml for volume, g for mass.                                                                                                                                                                                                                |
| `toGrams`              | `(amount: Amount, overrides?: UnitOverrides): Result<number>`                                                                                    | The mass of an amount.                                                                                                                                                                                                                                                             |
| `toMl`                 | `(amount: Amount, overrides?: UnitOverrides): Result<number>`                                                                                    | The volume of an amount.                                                                                                                                                                                                                                                           |
| `unitValue`            | `(id: UnitId, overrides?: UnitOverrides): number \| null`                                                                                        | The size of one unit.                                                                                                                                                                                                                                                              |
| `unlockRanking`        | `(index: StockIndex, stock: readonly StockEntry[], options?: StockOptions): UnlockResult`                                                        | Ranks the ingredients not in stock by the specs each would make makeable on its own.                                                                                                                                                                                               |
| `addDays`              | `(text: string, days: number): string \| undefined`                                                                                              | The calendar date `days` after a `YYYY-MM-DD` date; undefined for an invalid date or a non-integer count.                                                                                                                                                                          |
| `dayNumber`            | `(text: string): number \| undefined`                                                                                                            | Days since 1970-01-01 of a real `YYYY-MM-DD` date, else undefined.                                                                                                                                                                                                                 |
| `daysBetween`          | `(from: string, to: string): number \| undefined`                                                                                                | Whole days from one date to another (negative when `to` is earlier).                                                                                                                                                                                                               |
| `expiry`               | `(input: ExpiryInput): Expiry`                                                                                                                   | Where a made batch stands against the user's shelf life: `fresh`, `use-soon`, `past` or `unknown`, with the use-by date and the days left; dates and today are arguments.                                                                                                          |
| `limitingShelfLife`    | `(tree: IngredientTree, specs: SpecLookup, id: string): LimitingShelfLife`                                                                       | The shortest shelf life among a prepared ingredient and the prepared ingredients inside it, with the ingredient that sets it.                                                                                                                                                      |
| `USE_SOON_DAYS`        | `2`                                                                                                                                              | The window of `use-soon` in days; an assumption, unverified.                                                                                                                                                                                                                       |
| `buildDocument`        | `(doc: PlaceDocument): string`                                                                                                                   | The stable text of a place document: fixed key order, records and entities sorted by key.                                                                                                                                                                                          |
| `buildEnvelope`        | `(envelope: Envelope): string`                                                                                                                   | The stable text of an encrypted sync file, fields in a fixed order.                                                                                                                                                                                                                |
| `combinePlaces`        | `<V>(byPlace: Record<string, readonly SyncRecord<V>[]>, ticked: readonly string[]): CombinedEntry<V>[]`                                          | The union of the ticked places: one entry per key with its holders; tombstones and unticked places do not count.                                                                                                                                                                   |
| `DOCUMENT_FORMAT`      | `'materia-place'`                                                                                                                                | The format name of a place document.                                                                                                                                                                                                                                               |
| `DOCUMENT_VERSION`     | `1`                                                                                                                                              | The version of the place document format.                                                                                                                                                                                                                                          |
| `ENVELOPE_FORMAT`      | `'materia-sync'`                                                                                                                                 | The format name of an encrypted sync file.                                                                                                                                                                                                                                         |
| `ENVELOPE_VERSION`     | `1`                                                                                                                                              | The version of the sync envelope format.                                                                                                                                                                                                                                           |
| `envelopeAad`          | `(envelope: Pick<Envelope, 'format'                                                                                                              | 'version'>): string`                                                                                                                                                                                                                                                               | The additional data the cipher binds to the ciphertext: `materia-sync/1`. |
| `mergePlace`           | `(local: Place, remote: Place): { place: Place; changedLocal: boolean; changedRemote: boolean }`                                                 | Merges two copies of one place; the newest name wins.                                                                                                                                                                                                                              |
| `mergeRecords`         | `<V>(local: readonly SyncRecord<V>[], remote: readonly SyncRecord<V>[]): MergeResult<V>`                                                         | Merges local and remote records; the same result when swapped, tombstones are never removed.                                                                                                                                                                                       |
| `parseDocument`        | `(json: string): { ok: true; document: PlaceDocument } \| { ok: false; error: DocumentError }`                                                   | Parses and validates the plain text of a place document.                                                                                                                                                                                                                           |
| `parseEnvelope`        | `(json: string): { ok: true; envelope: Envelope } \| { ok: false; error: EnvelopeError }`                                                        | Parses and validates the stored text of an encrypted sync file.                                                                                                                                                                                                                    |
| `planSync`             | `<V, E>(local: LocalPlaceState<V, E>, remote: PlaceDocument<V, E> \| undefined): SyncPlan<V, E> \| { error: 'other-place' }`                     | Merges the local state with the remote document and says what to write.                                                                                                                                                                                                            |
| `buildExport`          | `(snapshot: Snapshot, meta: { exportedAt: string; seedVersion?: string }): ExportFile`                                                           | The export object for the user's records, sorted by key; the instant comes from the host.                                                                                                                                                                                          |
| `buildShareFile`       | `(snapshot: Snapshot, specId: string, exportedAt: string): ShareResult`                                                                          | The small export file for one drink of the user's own: the version, its own parent versions, its own template, the user ingredients its lines name (prepared ones with what they need); `{ ok: false, failure: { kind: 'unknown-spec', specId } }` for an id that is no user spec. |
| `countsOf`             | `(snapshot: Snapshot): Counts`                                                                                                                   | How many records of each kind a snapshot holds.                                                                                                                                                                                                                                    |
| `exportFileName`       | `(exportedAt: string): string`                                                                                                                   | `mixtura-backup-<date>.json` from the exported instant.                                                                                                                                                                                                                            |
| `formatMigrations`     | `readonly FormatMigration[]`                                                                                                                     | The pure steps from export format n to n + 1; the first moves the stock of a version 1 file into one place.                                                                                                                                                                        |
| `FORMAT_VERSION`       | `number`                                                                                                                                         | The export format version this build writes and reads.                                                                                                                                                                                                                             |
| `isNoOp`               | `(plan: Plan): boolean`                                                                                                                          | True when a plan adds, replaces and removes nothing.                                                                                                                                                                                                                               |
| `isUserId`             | `(id: string): boolean`                                                                                                                          | True for `u-` and a lower-case UUID; seed ids never match.                                                                                                                                                                                                                         |
| `KINDS`                | `readonly ['ingredients', 'templates', 'specs', 'places', 'stock', 'affinities']`                                                                | The six kinds of records in an export, in file order.                                                                                                                                                                                                                              |
| `MAX_FILE_BYTES`       | `number`                                                                                                                                         | Largest export file the importer reads (10 MiB).                                                                                                                                                                                                                                   |
| `migrateFile`          | `(file: Record<string, unknown>, from: number, to?: number, list?: readonly FormatMigration[], input?: MigrationInput): Record<string, unknown>` | Upgrades an older export file step by step; throws when a step is missing.                                                                                                                                                                                                         |
| `parseExportFile`      | `(text: string, bytes: number, schemaProblems: SchemaCheck, options?: ExportParseOptions): ParseResult`                                          | Reads an export file: size, forbidden keys, version, migration, the host's schema check, user ids, repeats, riff loops.                                                                                                                                                            |
| `planImport`           | `(current: Snapshot, incoming: Snapshot, mode: ImportMode): Plan`                                                                                | What a merge or replace would do: counts per kind, records to write and to delete.                                                                                                                                                                                                 |
| `stockKey`             | `(record: { placeId: string; ingredientId: string }): string`                                                                                    | The key of a stock record: place and ingredient.                                                                                                                                                                                                                                   |
| `totalCount`           | `(counts: Counts): number`                                                                                                                       | The sum of a counts object over all kinds.                                                                                                                                                                                                                                         |

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
| `computePrepared`    | `(tree: IngredientTree, specs: SpecLookup, id: string): PreparedResult`                                                                                  | Computes ABV, sugar, acid and volume of a prepared ingredient from its spec.                                                                                                                                  |
| `diffSpecs`          | `(before: DiffSpec, after: DiffSpec, options?: DiffOptions): SpecDiff`                                                                                   | Compares two versions of a drink: lines added, removed and changed, then name, template, method, glass, garnish, notes.                                                                                       |
| `variantSuggestions` | `(tree: IngredientTree, templates: readonly Template[], spec: MatchSpec, options?: MatchOptions): VariantsResult`                                        | The non-alcoholic or low-ABV variants of the template a spec follows: lines replaced and carried over, slots left to fill; empty with a reason.                                                               |
| `matchSpec`          | `(tree: IngredientTree, templates: readonly Template[], spec: MatchSpec, options?: MatchOptions): MatchResult`                                           | Matches a spec to templates by roles and ratios and ranks every candidate.                                                                                                                                    |
| `resolveProperty`    | `(tree: IngredientTree, id: string, property: P): Resolved<NonNullable<Ingredient[P]>>`                                                                  | Reads a property from the ingredient or its nearest ancestor that has it.                                                                                                                                     |
| `resolveAll`         | `(tree: IngredientTree, id: string): ResolvedProperties`                                                                                                 | All inherited properties of one ingredient with their sources.                                                                                                                                                |
| `INHERITED`          | `readonly InheritedProperty[]`                                                                                                                           | The names of the properties a child inherits from its ancestors.                                                                                                                                              |
| `prediluted`         | `(tree: IngredientTree, spec: BalanceSpec, servings: number, options?: BatchOptions): BatchResult`                                                       | Builds a pre-diluted batch of a spec with the dilution water added.                                                                                                                                           |
| `roundCount`         | `(value: number): { value: number; step: number }`                                                                                                       | Rounds a scaled count up to whole units, never below 1 (0 stays 0); used by batches and by the servings stepper.                                                                                              |
| `scaleLine`          | `(line: BalanceLine, factor: number, options?: ScaleOptions): { ok: true; value: BalanceLine; } \| { ok: false; error: BatchError; }`                    | Scales one line.                                                                                                                                                                                              |
| `scaleLines`         | `(lines: readonly BalanceLine[], servings: number, options?: ScaleOptions): { ok: true; value: BalanceLine[]; } \| { ok: false; errors: BatchError[]; }` | Scales all lines to a number of servings.                                                                                                                                                                     |
| `shelfLife`          | `(tree: IngredientTree, ids: readonly string[]): ShelfLife`                                                                                              | The shelf life of a batch: the shortest of its parts.                                                                                                                                                         |

### Sync names re-exported from materia

`buildDocument`, `parseDocument`, `buildEnvelope`, `parseEnvelope`,
`envelopeAad`, `mergeRecords`, `mergePlace`, `combinePlaces` and `planSync`
with the format constants are the general parts of stock sync
([decision](decisions/stock-sync.md)); their types are re-exported by
name, including the adapter port's `StorageAdapter`, `ReadResult`,
`WriteResult` and `AdapterFailure`. The app reaches them only through `@mixtura/engine`; the Web Crypto
cipher that fills materia's `Cipher` port is app code
([sync encryption](sync-encryption.md)).

## Export and import

Part of the general model (`src/exchange/`, [export format](export-format.md)).
The file's shape, building the export object, reading and validating a
file, format migrations and the merge or replace plan are pure and live
here; reading the database, applying a plan in one transaction, the
backup, Undo and file handling stay in the app ([store](store.md#exchange)).

- `parseExportFile` takes the schema check as an argument
  (`SchemaCheck`: the parsed file in, one problem line per violation out).
  The engine carries no schema library, so `dist/engine.mjs` stays free of
  dependencies; the app passes its Ajv check, the tests use Ajv from the
  development dependencies. Everything else (size limit, forbidden keys,
  version, migration, user ids, repeated records and version slots, riff
  loops) is the engine's.
- Refusals are values: `too-large`, `unreadable`, `not-mixtura`, `newer`,
  `needs-place` (a version 1 file and no `migrationInput.placeForOldStock`),
  `invalid`; nothing throws for a bad file.
- `planImport` compares records by id (stock by `placeId` and
  `ingredientId`) and records as equal up to key order. A merge replaces
  a spec, place or stock record only by one with a newer `updatedAt`. The order of two `updatedAt` instants
  is worked out from the fixed UTC form of the schema, without a `Date`.
- `buildShareFile` builds the file behind a share link from the user's own
  records only (the `u-` id test of `isUserId`; seed parents, templates
  and ingredients are the receiver's own); see
  [share file](export-format.md#share-file).
- Vectors: `vectors/exchange/` (`plan` and `parse` kinds) and
  `vectors/exchange/share/` (`buildShareFile`).

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

Part of the general model (materia `src/stock/`, [what the stock allows](makeable.md)).
The input types are structural: a seed spec, a stored spec and a stock record
fit without conversion.

- `StockEntry`: `{ ingredientId, present }` of the stock entity; no quantities.
- `StockSpec`: `{ id, status?, templateId?, lines }`, a line is
  `{ ingredientId, optional?, substitutes? }`.
- `StockOptions`: `mode` (`strict` default, or `with-substitutes`) and
  `excludeStatuses` (default `['retired']`); `PairOptions` adds `limit`.
- `buildStockIndex` is built when the tree or the specs change and reused on
  every stock change; it is derived and never stored.
- Results: `MakeableReport` (`mode`, `specs: SpecResult[]` ordered by id,
  `ignoredStock`), `SpecResult` (`status`, `lines`, `missing`, `unknown`),
  `UnlockResult` (`ranking`, `needsMore`, `unknown`), `PairResult` (`total`,
  `ranking` of pairs with what each unlocks alone and what only both do).
  Rules, fields,
  tie-breaks and measured times are in [makeable](makeable.md).
- Time: on the seed (635 specs, 296 ingredients) `makeableSpecs` takes
  about 5 ms, `unlockRanking` 20 to 30 ms and `pairRanking` 10 to 75 ms per stock
  change; with 2000
  specs and 501 ingredients about 6 ms and 30 ms (first call 44 ms). The
  tests assert limits of 0.5 to 6 s. No inverted index is needed: the
  ranking intersects, per open spec, the ingredients that would satisfy its
  open lines instead of recomputing every spec per candidate.

## Shelf

Part of the general model (materia `src/shelf/`, [non-alcoholic](non-alcoholic.md#shelf-life-with-entered-dates)).
Dates are `YYYY-MM-DD` strings; the engine has no clock, so today and the
day a batch was made are arguments. The shelf life is the user's own value
(`shelfLifeDays` on a prepared ingredient): no number is proposed. `expiry`
says `fresh`, `use-soon` (the use-by date is within `soonDays`, default
`USE_SOON_DAYS` = 2, today included) or `past` (from the day after the
use-by date), with the use-by date (made on plus the shelf life) and the days
left (negative once past); invalid dates or a shelf life that is not whole
days give `unknown` with the reason. `limitingShelfLife` takes the shortest
of the user's own values on a prepared ingredient and on the prepared
ingredients inside it (raw parts carry none and say nothing).

## Variant suggestions

`variantSuggestions` (`src/drink-templates/match.ts`, on the general
materia `src/templates/variants.ts`) finds the template a spec
follows (an explicit id or the engine's match), then the variants of that
template (`alcohol` `none` or `low`, [templates](templates.md#variants-by-alcohol-class)).
For each: the lines with role `base` (replaced), the other lines (carried
over unchanged) and the slots left to fill (the base slot and the variant's
required slots no carried line fills), with the template's own notes, the
evidence of its slots and its source. Empty with a reason: `no-template`,
`is-variant` (the spec names a variant already), `no-variant` (the template
has none: Old-Fashioned and Sidecar). Nothing is said about taste or balance.

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

## Shelf

```ts example shelf
import { expiry } from '@mixtura/engine';

const days = (today: string) => {
  const e = expiry({ madeOn: '2026-11-01', today, shelfLifeDays: 14 });
  return `${e.status} ${e.daysLeft}`;
};
const result = [days('2026-11-05'), days('2026-11-14'), days('2026-11-16')];
// result = [
//   "fresh 10",
//   "use-soon 1",
//   "past -1"
// ]
```

## Variants

```ts example variants
import { buildTree, ROOT_TEMPLATES, variantSuggestions, VARIANT_TEMPLATES } from '@mixtura/engine';

const built = buildTree([
  { id: 'rum', name: 'Rum', level: 'product', role: 'base', abv: 40 },
  { id: 'lime', name: 'Lime juice', level: 'product', role: 'sour', abv: 0 },
  { id: 'syrup', name: 'Syrup', level: 'product', role: 'sweet', abv: 0 },
]);
if (!built.ok) throw new Error('invalid tree');
const out = variantSuggestions(built.tree, [...ROOT_TEMPLATES, ...VARIANT_TEMPLATES], {
  lines: [
    { ingredientId: 'rum', amount: 60, unit: 'ml' },
    { ingredientId: 'lime', amount: 22.5, unit: 'ml' },
    { ingredientId: 'syrup', amount: 22.5, unit: 'ml' },
  ],
});
const result = out.suggestions.map((s) => [s.templateId, s.replacedLines, s.keptLines]);
// result = [
//   [
//     "na-sour",
//     [
//       0
//     ],
//     [
//       1,
//       2
//     ]
//   ]
// ]
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
| `vectors/shelf/`         | Expiry of a made batch, limiting shelf life          | `shelf/shelf-vector.schema.json`                 | `shelf-vectors.test.ts`              |
| `vectors/variants/`      | Variant suggestions per template                     | `variants/variants-vector.schema.json`           | `shelf-vectors.test.ts`              |
| `vectors/stock/`         | Makeable, missing one, unlock, pairs                 | `stock/stock-vector.schema.json`                 | `stock-vectors.test.ts`              |
| `vectors/specs/`         | Version diff, family, riff loops, riff changes       | none (shape checked by the test)                 | `specs-vectors.test.ts`              |
| `vectors/exchange/`      | Merge and replace plans, refusals of an export file  | none (shape checked by the test)                 | `exchange-vectors.test.ts`           |

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
`__dirname` or a `node:` reference (`document` as an object key or inside a hyphenated word, as in materia's place document, does not count). The bundle is about 122 kB
(unminified, with the six templates and the unit and dilution tables); the
test compares it with this figure (within 25 %). The app resolves `@mixtura/engine` to
this build, so the root commands build the engine first; see
[development](development.md).
