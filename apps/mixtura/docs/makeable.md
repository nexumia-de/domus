---
type: Specification
title: What the stock allows
description: Which specs the stock makes makeable (exact, hierarchy, prepared, substitutes), the specs missing one ingredient, and the unlock ranking of ingredients and of pairs of ingredients not in stock; rules, result shapes, tie-breaks, performance numbers and the vectors that pin them.
tags: [stock, makeable, unlock, pairs, substitution, prepared, engine]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: data-model
    title: 'Data model, sections Ingredient, Spec and Stock'
    url: data-model.md
  - id: ingredients
    title: 'Ingredients, sections Prepared ingredients and Substitution'
    url: ingredients.md
  - id: practice
    title: 'How bartenders work, section Operations'
    url: bartender-practice.md
---

# What the stock allows

Engine side of [stock](screens-stock-settings.md): pure functions in
`packages/engine/src/stock/`, exported through the entry point
([engine](engine.md#stock)). Nothing is stored; every result is derived
from the ingredient tree, the specs and the stock
([data model](data-model.md#stored-versus-derived)). No number about drinks
is involved, so no evidence table: the rules are definitions, each pinned by
a vector.

| File             | Job                                                                |
| ---------------- | ------------------------------------------------------------------ |
| `types.ts`       | Inputs, result types                                               |
| `stock-index.ts` | `buildStockIndex`: families and class substitutes, kept per index  |
| `evaluation.ts`  | One stock read against an index                                    |
| `satisfies.ts`   | Does the stock satisfy a line, by which rule                       |
| `prepared.ts`    | Is a prepared ingredient available from its parts (cycle-safe)     |
| `makeable.ts`    | `makeableSpecs`, `missingOne`                                      |
| `fixers.ts`      | Which single ingredient would satisfy a line (used by the ranking) |
| `unlock.ts`      | `unlockRanking`                                                    |
| `pair-fixers.ts` | Which sets of ingredients would satisfy a line together            |
| `pairs.ts`       | `pairRanking`                                                      |

## Inputs

- **Stock**: records of the [stock entity](data-model.md#stock); only
  `ingredientId` and `present` are read. Stock has **no quantities**: an
  ingredient is at hand or not (the data model has no amount field, and
  quantities are out of scope here). `present: false` and no record both
  mean "not at hand". `bestBefore` is not read: the engine has no clock, so
  an app that wants to treat an expired bottle as absent filters the stock
  before the call. A record for an ingredient that is not in the tree is
  ignored and listed in `ignoredStock`. For a repeated ingredient the last
  record counts.
- **Index**: `buildStockIndex(tree, specs)`. It holds what does not depend
  on the stock (an ingredient with its descendants, class substitutes) and
  fills it on first use. Build it when the tree or the specs change, reuse
  it on every stock change. The specs include the recipes of prepared
  ingredients.
- **Options**: `mode` is `strict` (default) or `with-substitutes`;
  `excludeStatuses` (default `['retired']`) leaves out specs by status. All
  seed specs are `draft`. The recipe of a prepared ingredient is used even
  when its own status is excluded.

## Rules

A line is _required_ unless `optional: true`. A spec is makeable when every
required line is satisfied. A line asking for `W` is satisfied by the first
of these that holds, in this order, so a satisfier that needs no
substitute always wins over one that does:

| #   | Rule                                                                                                                              | `rule` in the result      | Mode               | Vector                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------ | ----------------------------------------------- |
| 1   | `W` itself is in stock                                                                                                            | `exact`                   | both               | `makeable-exact-and-hierarchy`                  |
| 2   | A descendant of `W` is in stock (a category or type line is satisfied by any stocked product below it; nearest first, then by id) | `hierarchy`               | both               | `makeable-exact-and-hierarchy`                  |
| 3   | `W` or a descendant is a prepared ingredient whose required parts are all available                                               | `prepared`                | both               | `makeable-prepared`, `makeable-prepared-nested` |
| 4   | As 3, but a part needs a substitute                                                                                               | `prepared`, `substituted` | `with-substitutes` | `makeable-prepared-substitute`                  |
| 5   | An ingredient the spec lists on the line (`substitutes`), or one of its descendants, is in stock or prepared                      | `listed-substitute`       | `with-substitutes` | `makeable-listed-substitute`                    |
| 6   | An ingredient of the same substitution class and role ([ingredients](ingredients.md#substitution)) is in stock or prepared        | `class-substitute`        | `with-substitutes` | `makeable-class-substitute`                     |

Consequences, each with a vector:

- **A stocked ancestor does not satisfy a more specific line.** Stock
  `gin` (a type) satisfies a line for `spirit` and for `gin`, not for
  `gin-a`: the stock does not say which product it is. Class substitutes
  never include an ancestor either (`substitutesFor`).
  `makeable-ancestor-in-stock`.
- **Substitutes only in their mode.** In `strict` a line for `gin-a` with
  only `gin-b` in stock is missing `gin-a`; in `with-substitutes` the spec
  is `makeable-with-substitution` and the line names the stocked
  ingredient (`by`) and the one it replaces (`via`). Nothing is applied
  silently: the result states `mode`, and `makeable-with-substitution`
  appears only in that mode. A listed substitute is tried before a class
  substitute. `makeable-class-substitute`, `makeable-listed-substitute`.
- **Optional lines never block.** An optional line that is not in stock, or
  names an unknown ingredient, is reported (`satisfied: false`,
  `optional: true`) and ignored for the status.
  `makeable-optional-lines`. This also holds in a prepared ingredient's
  recipe.
- **Counted and open amounts follow the same rule.** A line in `whole`,
  `slice` or `top` ([counted units](decisions/counted-units.md)) is
  decided by its ingredient alone; amounts, `topMl` and `unitVolumes` are
  not read. `makeable-counted-and-open-amounts`.
- **A prepared ingredient is available** when stocked itself or when every
  required line of its recipe is satisfied, recursively, in the same mode.
  A cycle makes it unavailable from its parts (stocking either breaks it);
  a missing or unknown recipe likewise. `makeable-prepared`,
  `makeable-prepared-nested`, `makeable-prepared-cycle`.
- **Unknown ingredients block and are named.** A required line whose
  ingredient is not in the tree gives status `unknown-ingredient` and the
  id in `unknown`; it is never part of `missing`, which only lists what can
  be bought. `makeable-unknown-ingredient`.

## Result

`makeableSpecs(index, stock, options)` returns `{ mode, specs, ignoredStock }`
with one entry per spec ordered by spec id:

| Field     | Meaning                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `status`  | `makeable`, `makeable-with-substitution`, `missing` or `unknown-ingredient`                            |
| `mode`    | The mode used                                                                                          |
| `lines`   | Per line, in spec order: `satisfied`, `rule`, `by`, `via`, `substituted`, `parts`, `reason`, `missing` |
| `missing` | Ingredients to acquire for the required lines, distinct and sorted; the count of missing is its length |
| `unknown` | Required ingredients not in the tree                                                                   |

`by` is the stocked ingredient (or the prepared ingredient made from its
parts) that satisfies the line; for a prepared ingredient `parts` lists its
recipe lines the same way, so an app can show the whole chain. An unsatisfied
line has `reason` `not-in-stock` or `unknown-ingredient`, and `missing`
holds what to acquire: the ingredient asked for, or for a prepared
ingredient its missing raw parts (the ingredient itself if a part is
unknown, the recipe is missing or there is a cycle).

**Missing one.** `missingOne(index, report)` returns the specs with status
`missing` and exactly one entry in `missing`, ordered by spec id, as
`{ specId, missing, substitutes }`. `substitutes` lists the substitutes the
spec's lines name for it, then class substitutes nearest first; it is empty
when the ingredient has no class. With `with-substitutes` a substitute that is
in stock has already made the spec makeable, so the list shows what to look
for in the other mode. `makeable-missing-one`.

## Unlock ranking

`unlockRanking(index, stock, options)` answers "which bottle unlocks the
most". It returns `{ mode, ranking, needsMore, unknown }`.

**What a candidate is.** Any ingredient that is not in stock and whose
addition alone makes at least one spec makeable in the chosen mode. It is
computed exactly as "add the ingredient to the stock, recompute, count the
specs that were not makeable and now are"; the tests compare it with that
brute force on every vector, on seeded random worlds and on the seed. The
method does not try every ingredient: for each spec that is not makeable it
finds the single ingredients that would satisfy every open line (the
intersection over the lines, `fixers.ts`) and counts from there.

**Adding a node.** A product satisfies lines that ask for it or one of its
ancestors; a type or category satisfies those that ask for it or its
ancestors, not those that ask for a product below it. So a type never
unlocks more than its products do. In `with-substitutes` a candidate also
satisfies lines through the class and the lists of substitutes. A missing raw
part of a prepared ingredient unlocks the specs that use it only if it is the
sole missing part (or one ingredient covers all missing parts); with several
parts missing the prepared ingredient itself is the candidate.
`unlock-prepared`. The recipe of a prepared ingredient is an ordinary spec and
is counted.

**Product or type: what one buys.** `kind` is `product` for a product and
`type` for a type or category: "any one product of it will do", and its
`unlocks` are what every brand gives. A product that unlocks exactly what its
nearest candidate ancestor unlocks (same strict, same only-with-substitution
sets) is not ranked: it is listed in the ancestor's `alsoBy`. So "Dry
vermouth" is offered once, with its brands, unless a brand is needed by more
specs, then that brand is ranked on its own with the larger count. A product
that also works as a class substitute for something else keeps its own row.
`unlock-type-versus-product`.

**Fields of a candidate:** `ingredientId`, `kind`, `unlocks` (spec ids, sorted;
what the chosen mode makes makeable), `count`, `strict` (specs that become
makeable in strict mode), `withSubstitution` (specs that become makeable only
when substitutes are allowed: not makeable now, even with substitutes, and not
strict afterwards), `templates`, `stockDistance`, `alsoBy`. In `strict` mode
`unlocks` equals `strict` and candidates that help only through substitution
are not ranked, but `withSubstitution` still shows what they would add; in
`with-substitutes` mode `unlocks` is the set that becomes makeable when
substitutes are allowed. `unlock-substitute-modes`.

**Order.** By these keys, each deciding only when the earlier ones tie:

1. `count`, more first: the point of the ranking.
2. `templates`, the number of distinct templates among the unlocked specs
   (specs without a template do not count), more first: a bottle that opens
   several kinds of drink beats one that opens many variants of one.
3. `stockDistance`, the tree distance to the nearest ingredient in stock,
   nearer first; no stock counts as farthest: a bottle close to what one
   has is more likely to be used with it.
4. The ingredient id: a total order, so the result never depends on the
   order of the inputs.

`unlock-tie-templates`, `unlock-tie-distance`, `unlock-tie-id`.

**Needs more.** Specs that are not makeable in the chosen mode and that no
single ingredient completes are listed in `needsMore` as
`{ specId, missing, count }`, fewest missing first, then by id: material for
a later "plan" view. Specs blocked by unknown ingredients are in `unknown`
and never unlocked. `unlock-single-winner`, `unlock-unknown-ingredient`.

**Filter.** `excludeStatuses` as above; the app decides whether drafts count
(`unlock-retired-and-draft`). Pairs of bottles are in the next section.

## Pairs

`pairRanking(index, stock, options)` answers "which two bottles to buy
next". It returns `{ mode, total, ranking }`. Options are those of
`unlockRanking` and `limit` (default 20): `ranking` holds the best `limit`
pairs, `total` counts every qualifying pair.

**What a pair is.** Two different ingredients not in stock, each a `product`
or a `type` as in the single ranking, such that adding both makes the
specs in `unlocks` makeable in the chosen mode. A pair is listed when each
member adds something to the other: `count` is larger than both single
counts. A pair of two bottles that never help each other is therefore not
listed (buy the best single first); the best two independent bottles are
listed, with an empty `together`.

**Fields of a pair:** `first` and `second` (ids, `first` before `second`),
`firstKind`, `secondKind`, `unlocks` (all specs the pair makes makeable,
sorted), `count`, `byFirst` and `bySecond` (what that ingredient makes
makeable alone: the same set the single ranking gives it), `together` (the
specs only the pair makes makeable), `templates`, `stockDistance`,
`alsoByFirst`, `alsoBySecond`. `byFirst` and `bySecond` may overlap (a spec
either one completes); `count` = |`byFirst` ∪ `bySecond`| + |`together`|.
Specs the stock already makes makeable are in none of them.

**Rule and method.** Only specs that are not makeable matter, and a spec
can only gain from a pair if its open lines can be satisfied by two
ingredients. Per such spec the engine takes the pool of ingredients that
could take part (`pair-fixers.ts`: the family and substitutes of each open
line, and the parts of incomplete prepared ingredients among them,
recursively), finds the singles that finish it alone (the same set as in the
single ranking) and the pairs that finish it only together: it chooses the
open line with the smallest pool, takes `a` from that pool and `b` from the
pool of the whole spec, and checks every open line against the set `{a, b}`
(`lineFixedBy`, which mirrors the rules of `satisfies.ts`, including a
prepared ingredient whose missing parts are covered by `a` and `b` together).
The pairs of all other candidates are then scored from bitsets of the
per-ingredient unlocks, so the specs they unlock alone cost one bit
operation per 32 specs, not a recomputation. The result is exactly "add both,
recompute, count"; the tests compare it with that brute force.

**Complexity.** With S the specs that are not makeable, P the largest pool
of a spec, L its open lines: the spec pass is O(S·P²·L) in the worst case and
in practice far less, because the first member comes from the smallest pool
and most specs have one or two open lines. The scoring is O(C²·S/32) for C
candidates (ingredients that unlock something alone or belong to a
together-pair). Memory is O(C·S/32 + pairs that finish a spec together).

**Twins.** A descendant that has the same single unlocks and the same
partners with the same together-specs as its nearest ancestor among the
candidates is not ranked: it is in the ancestor's `alsoByFirst` or
`alsoBySecond`, as `alsoBy` of the single ranking.
`pairs-twins-and-limit`.

**Order.** Each key decides only when the earlier ones tie: `count`, more
first; `templates`, more first; `stockDistance`, the sum of the two tree
distances to the nearest ingredient in stock, smaller first, no stock counts
as farthest; `first` id, then `second` id (a total order, so the result does
not depend on the order of the inputs). `pairs-together-only`,
`pairs-tie-templates`, `pairs-tie-distance`.

Vectors: `pairs-together-only`, `pairs-split` (what each member unlocks
alone, and what only the two do), `pairs-prepared`,
`pairs-substitute-modes`, `pairs-retired-and-nothing-left`.

## Performance

Measured on the build machine of this work (vitest, one run, milliseconds;
the tests assert generous limits of 0.5 to 6 s). The seed has 635 specs and
296 ingredients; the large case is a seeded random world with 2000 specs and
501 ingredients, 53 prepared ingredients in the sample worlds.

| Case                                          | Seed  | 2000 specs, 501 ingredients |
| --------------------------------------------- | ----- | --------------------------- |
| `buildStockIndex`                             | 0.4   | 0.5                         |
| `makeableSpecs`, first call (fills the index) | 8     | 44                          |
| `makeableSpecs`, stock changed, index warm    | 4-7   | 6                           |
| `unlockRanking`, stock changed, index warm    | 18-30 | 28-32                       |
| `pairRanking`, stock changed, index warm      | 9-43  | 21-25                       |

`pairRanking` on the seed: 9 to 17 ms strict and 16 to 43 ms with
substitutes for stocks of about a tenth of the ingredients, 25 to 38 ms
strict and 45 to 75 ms with substitutes for the empty stock (the worst case:
every spec is open); the target was well under 200 ms.

A stock change recomputes both in well under a frame budget even on a phone
a few times slower; no stored index is needed. The index is derived and
never persisted.

## Ranking off the main thread (#84)

The unlock ranking is the one heavy computation of the app on a phone. It
ran on the main thread, once per stock change and only while Buy Next is
open. Measured with `node e2e/rank-perf.mjs 4` (CPU slowed 4 times, 360x720,
gin and light rum in stock, eight taps on "Have it" in a row, three runs per
build, headless Chromium on the cloud host):

| Case, 4x throttle                          | On the main thread | In a worker   |
| ------------------------------------------ | ------------------ | ------------- |
| Tap on "Have it" to the next frame, median | 79 to 101 ms       | 65 to 80 ms   |
| Longest task during the taps               | 99 to 115 ms       | 51 to 58 ms   |
| Cold load of Buy Next, longest task        | 117 to 147 ms      | none to 72 ms |
| Cold load of Buy Next, first candidates    | 351 to 415 ms      | 253 to 373 ms |

The remaining 50 ms is drawing the page (the redraw of the whole app costs
about 45 ms at 4x with the ranking already known). Chosen: a worker. The
cheaper remedies were weighed first: ranking only while Buy Next is open and
memoising per stock set and mode were already in place and do not shorten a
single computation (55 to 98 ms at 4x, the cold first one the longest);
yielding before the redraw splits one task into two but adds a second
redraw and delays the answer by the whole computation; a worker takes it
off the thread that draws, costs one structured copy of the tree and specs
per browse model (they are sent once, not per stock change) and gives the
same numbers (a test compares them).

How it works: `rank-worker.ts` is a second script built next to `main.js`
(`build.mjs`), requested as `rank-worker.js` relative to the page, so it
works at `/` and under `/mixtura/`; it is in the service worker's precache
list and `e2e/subpath.mjs` checks that it is precached and fetched and that
Buy Next ranks offline with it. The worker holds the index of the latest
model and answers one ranking per request; nothing is stored in it. The
page keeps results per model, records object and mode like before and
draws the previous result of that mode while a new one is on its way (a
first ranking shows the loading line); the answer bumps `rankRev`, which
redraws. If a worker cannot be created or fails, the engine runs on the main
thread. Derived data stays derived: nothing about the ranking is persisted.

## Vectors

`packages/engine/vectors/stock/` (format `stock-vector.schema.json`: a small
fixture of ingredients and specs, and `runs` with a stock, options and the
expected result as a subset), run by `test/stock-vectors.test.ts`: 13
makeable files (every rule above in both modes where it matters, empty and
absent stock, ordering, missing one) and 11 unlock files (single winner, each
tie rule, type versus product, both modes, prepared, filter, empty stock,
everything makeable, unknown) and 8 pairs files (kind `pairs`, options may
include `limit`). Every unlock run is also checked against the
brute force; every pairs run is checked against the brute force of adding
both ingredients, for every pair of candidates. `test/stock-random.test.ts` runs 40 seeded random worlds
(`test/helpers/stock-world.ts`; the generator lives in the tests, the engine
has no randomness): the status agrees with an independently written naive
evaluator in both modes, so the engine never claims a drink makeable with a
required line unsatisfied, and the ranking equals the brute force.
`test/stock-pairs.test.ts` runs the same 40 worlds for the pair ranking in
both modes: every listed pair and a seeded sample of all pairs of
candidates equal the brute force, twins included, the result does not depend
on input order and `limit` is a prefix of the full ranking.
`test/stock-seed.test.ts` checks invariants on the real seed: empty stock
makes nothing makeable, every ingredient in stock makes every spec without
unknown ingredients makeable, strict is a subset of with-substitutes,
ranking counts equal the brute force for a sample, and the time budget.
