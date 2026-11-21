---
type: Specification
title: Test vector format
description: The JSON shape of the worked examples Culina's future engine must reproduce, adapted from Mixtura's vector format to ratio checks, baker's percentages, scaling by weight and salt percentages, with five vectors computed by hand.
tags: [engine, vectors, ratios, bakers-percentage, scaling, salt]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mixtura
    title: 'Mixtura: Balance, vector file format'
    url: ../../mixtura/docs/balance.md#vector-file-format
  - id: ratios
    title: Ratios and salt percentages checked against sources
    url: ratios.md
---

# Test vector format

Culina's vectors (units, scaling, baker's percentages, hydration, ratio templates, salt, components, cross-record validation) are in `packages/engine/vectors/`. This fixes the format of the worked examples its
engine will be tested against, so that rules are written down with their
numbers before code exists. The shape follows Mixtura's vectors[^mixtura]
so both apps can share one runner when the engine moves into shared code.

## Envelope

One JSON file per worked example, file name equal to `id` plus `.json`.

| Field         | Meaning                                                               |
| ------------- | --------------------------------------------------------------------- |
| `id`          | kebab-case, equal to the file name without `.json`                    |
| `description` | what the example is                                                   |
| `inputs`      | `kind` selects the rule; the other fields are that rule's inputs      |
| `expected`    | named numbers the engine must reproduce (`null` where undefined)      |
| `tolerance`   | absolute, applied to every expected number                            |
| `source`      | where the arithmetic is written out and how well the inputs are known |

Inputs are self-contained: a vector carries every number it uses, so it
does not depend on seed data. Masses are in grams, percentages are
numbers out of 100. Expected numbers are rounded to six decimals.

## Kinds

| `kind`           | Inputs                                                                    | Expected                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bakers_percent` | `lines`: `name`, `g`, `is_flour`                                          | `flour_g`, `dough_g`, `pct` per line (by name), `total_pct`, `hydration_pct`                                                                        |
| `scale_bakers`   | `formula`: `name`, `pct` (flour lines sum to 100); `target_dough_g`       | `flour_g`, `g` per line, `dough_g`                                                                                                                  |
| `ratio_check`    | `template`: `name`, `parts`; `lines`: `name`, `g`; `anchor` (a line name) | `parts` per line normalised so the anchor has its template parts; `share_pct` per line; `template_share_pct`; `delta_parts` (actual minus template) |
| `scale_anchor`   | `template`: `name`, `parts`; `anchor`: `name`, `g`                        | `g` per line                                                                                                                                        |
| `salt_percent`   | `food_g` or `water_g`, `pct`, `basis` (`food`, `water` or `brine`)        | `salt_g`, `total_g`                                                                                                                                 |

`ratio_check` returns numbers only. Whether a figure lies in a usual
range is shown by the app against the template's range; a vector never
says that a dough is wrong. Line names in `expected` are object keys.

Basis of `salt_percent`:

- `food`: salt = food × pct / 100 (sauerkraut on cabbage, soup on soup).
- `water`: salt = water × pct / 100 (pasta water).
- `brine`: pct is salt per 100 of salt plus water, so
  salt = water × pct / (100 − pct).

## Kinds of the engine's amounts and scaling (issue 8)

Folders: `packages/engine/vectors/units/` and
`packages/engine/vectors/percentages/`. Rules: [engine rules](engine-rules.md).
Field names are snake_case in the vectors and camelCase in the code; the
runners map them. Error vectors carry `error_code` (and `error_line_id`
where the error names a line) instead of `expected`.

| `kind`              | Inputs                                                                                   | Expected                                                        |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `convert`           | `amount` (`value`, `unit`), `to`, optional `facts` (`densityGPerMl`, `unitWeightG`)      | `value` in unit `to`                                            |
| `round`             | `g`, optional `step_g` (absent: the default display step)                                | `g`                                                             |
| `round_pieces`      | `count`                                                                                  | `value` (to a half, at least a half), `exact`                   |
| `round_measure`     | `ml`, `measure` (`tsp`, `tbsp`, `cup`)                                                   | `value` (measures to a quarter, at least a quarter), `exact`    |
| `household_measure` | `ml` (the size of one unit of a word)                                                    | `measure` (`tsp`, `tbsp`, `cup` or `null`)                      |
| `scale_factor`      | `lines` (`id`, optional `amount`, `role`), `factor`, optional `salt_roles`               | `factor`, `values` (amount per line id), `unscaled`, `cautions` |
| `scale_total`       | `lines`, `target_g`, optional `facts_by_id`, optional `salt_roles`                       | as `scale_factor`                                               |
| `scale_line`        | `lines`, `line_id`, `have` (an amount), optional `facts_by_id`, optional `salt_roles`    | as `scale_factor`                                               |
| `hydration`         | `lines` (`id`, `g`, `role`, optional `composition`, `component`), optional `water_roles` | `hydration_pct`, `flour_g`, `water_g`, `not_counted`            |

`bakers_percent` and `scale_bakers` keep the fields above, with one
mapping in the runner: `is_flour` true gives the role `flour`; in a
formula without `is_flour` a line named `flour` is flour; `scale_bakers`
also accepts `target_flour_g` instead of `target_dough_g`; in
`bakers_percent` the line named `water` is the water for `hydration_pct`.
The tolerance is absolute. Densities and unit weights inside vectors are
synthetic, chosen for the arithmetic, and every vector says so.

## Kinds of ratio templates and salt (issue 9)

Folders: `packages/engine/vectors/ratios/templates/` and
`packages/engine/vectors/ratios/salt/`. Rules: [engine rules](engine-rules.md#ratio-templates).
Vectors carry their templates inline, never the seed. Examples 3, 4 and 5
below are in these folders unchanged. Error vectors carry `error_code`
and, where the error names more than the code, `error_detail`: fields the
error must contain (`templateId`, `parentId`, `role`, `path`).

| `kind`             | Inputs                                                                                                          | Expected                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `resolve_template` | `templates` in the stored shape of `template.schema.json` (changes `add`, `set`, `remove`, `swap`); `id`        | `roles` (in order), `parts`, `lineage`, `anchor`, optional `ranges`, `ingredient_classes`       |
| `template_family`  | `templates`; `id`; `query` (`children`, `ancestors`, `siblings`)                                                | `ids` in the order the query defines                                                            |
| `ratio_check`      | as above; `template` may also have `ranges` (role to `min`, `max`) and `anchor`; the `anchor` input is optional | as above, plus `position` and `distance` by role (only roles with a range), `not_used`, `extra` |
| `scale_anchor`     | as above                                                                                                        | as above                                                                                        |
| `template_percent` | `template`: `name`, `anchor`, `parts`                                                                           | `pct` by role, the anchor 100                                                                   |
| `salt_percent`     | as above                                                                                                        | as above                                                                                        |

`position` is `below`, `within` or `above` and `distance` the parts
outside the range (0 within; the bounds are inside). A template without
a range gives neither; the vector `ratio-check-no-range-reports-deviation`
shows that. Ranges and parts in vectors are synthetic where the vector
says so; vectors that use parts of a row of [ratios](ratios.md) name it.

## Kind of the classics in the finder

Run by `test/classics-makeable-vectors.test.ts` from
`packages/engine/vectors/classics-makeable/`; `expected` is a subset of the
result as for the finder, `urgency: null` asserts none.

| `kind`              | `inputs`                                                                                                                     | `expected`                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `classics_makeable` | `today`, `ingredients`, `classics` (invented, in the stored shape), `stock`, optional `lang`, `portions`, `facts`, `options` | `candidates` (ranked): `id`, `kind`, `complete`, `lacking`, `country`, `vegetarian`, `notInCatalogue`, `roles`, `urgency`, ... |

Errors: `error_code` is a `makeable` code or a `deriveClassic` one, and
`error_detail.classic` names the classic. Covered: complete with water and a
`wanted` line apart, one line lacking, beyond the threshold (not listed),
German names with a sibling substitute, the ranking by urgency, a classic that
does not derive.

## Kinds of components, yield and portions (issue 10)

Folder: `packages/engine/vectors/components/`. Rules:
[engine rules](engine-rules.md#components). Each vector carries its
components inline in the stored shape (`id`, `percentBase`, `lines` with
`ref`, `amount`, `role`, `state`, and `yield` with `amount` and `source`);
top-level fields are snake_case. Yield figures in vectors are synthetic
and say so in `source`. Error vectors carry `error_code` and
`error_detail` (`componentId`, `index`, `path`, `cause`, `state`, `field`).

| `kind`             | Inputs                                                                                                                   | Expected                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expand_component` | `components`, `id`, optional `output_g`, optional `facts_by_ingredient`, optional `without_yield` (`input`)              | `raw` (`ingredient_id`, optional `state`, `role`, `g`, in order), `raw_g`, `factor`, `unmeasured` (`path`, `index`, `ref_id`); optional `unconverted` (the same and `cause`, the conversion code) and `unweighed` (component ids), both empty when absent |
| `component_yield`  | `component`, optional `facts_by_ingredient`                                                                              | `input_g`, `known`, and when known `output_g`, `loss_g`, `yield_pct`; optional `unmeasured` and `unconverted` (indexes)                                                                                                                                   |
| `edible_portion`   | `operation` (`to_edible`, `to_purchased`, `round_trip`, `lookup`), `yields` (`state`, `percent`, `source`), `state`, `g` | `g`; `edible_g` and `purchased_g` for `round_trip`; `known` and `percent` for `lookup`                                                                                                                                                                    |
| `portions`         | `operation` `portions_from_yield` with `yield_g`, `portion_g`; or `portion_weight` with `yield_g`, `count`               | `portions`, `whole_portions`, `remainder_g`; or `portion_g`                                                                                                                                                                                               |
| `convert_lines`    | `component`, `to` (`weight` or `percent`), optional `facts_by_ingredient`                                                | `lines`: the new `amount` (`value`, `unit`) per line in order, absent for a line without amount; the grams are checked equal                                                                                                                              |

## Kind of cross-record validation (issue 36)

Folder: `packages/engine/vectors/validate/`. Rules:
[engine rules](engine-rules.md#cross-record-validation). Each vector carries its
whole model inline (`inputs.model`, the collections of the export file in the
stored shapes) and is self-contained. `expected` is `{ ok, findings }` and is
compared exactly, findings in order; `tolerance` is 0.

| `kind`           | Inputs                                                                                                         | Expected                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `validate_model` | `model`: any of `ingredients`, `templates`, `components`, `dishes`, `stock`, `affinities`, `tastings` (arrays) | `ok`; `findings`: `code`, `kind`, `id`, optional `path`, `ref`, `ids`, `role`, in the engine's order |

## Kinds of versions and variations (issue 17)

Folder: `packages/engine/vectors/versions/`. Rules:
[engine rules](engine-rules.md#versions-and-variations). Records are inline
in the stored shape (only the fields the rule reads). Lines are written as
`kind:id value unit` in `expected`; `tolerance` is 0. Error vectors carry
`error_code`.

| `kind`             | Inputs                                       | Expected                                                                                                 |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `diff_component`   | `before`, `after`: components with `version` | `empty`; `changes`: `{type: line, kind, fields, before, after}` or `{type: field, field, before, after}` |
| `diff_dish`        | `before`, `after`: dishes with `version`     | as `diff_component`                                                                                      |
| `version_family`   | `records` (`id`, `version`), `id`            | `versions` (ids, oldest first), `head`, `number` of `id`                                                 |
| `variation_cycles` | `records`, `id`                              | `cycles` (lists of family ids), `parent` of `id` (`kind`, optional `id`)                                 |
| `variations`       | `records`, `id`                              | `variations` (`family`, `head`), optional `parent` (`kind`, optional `id`)                               |

## Kinds of stock (issue 20)

Folder: `packages/engine/vectors/stock/`, plus four stock vectors in
`vectors/validate/` (presence-only items with known and unknown
references). Rules: [engine rules](engine-rules.md#stock). Items are inline
in the stored shape; dates are `YYYY-MM-DD`; `tolerance` is 0. Error
vectors carry `error_code` and `error_detail`.

| `kind`          | Inputs                                                                         | Expected                                                                           |
| --------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `stock_expiry`  | `item`, `today`, optional `shelfLife` (`state`, `storage`, `days`), `soonDays` | `ok`, `status` (`none`, `fresh`, `use-soon`, `past`), `useBy`, `daysLeft`, `basis` |
| `stock_suggest` | `item`, `shelfLife`                                                            | `ok`, `suggestions` (`storage`, `days`, `useBy`), shortest first                   |
| `stock_use`     | `stock` (amount), `used` (amount), optional `facts`                            | `ok`, then `usedUp` and the remaining `amount` unless used up                      |

The shelf-life values in these vectors are examples written for the rule,
not recommendations.

## Kinds of export, matching, merging and Cooklang (issue 18)

Folders: `packages/engine/vectors/export/`, `match/`, `merge/` and
`cooklang/`. Rules: [exchange](exchange.md). Records are inline in the
stored shape; `tolerance` is 0. Error vectors carry `error_code` (and
`error_detail`, a subset the error must carry). The parser vectors are the
specification's own examples, each naming its section in `source`.

| `kind`               | Inputs                                                                                | Expected                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `export_round_trip`  | `records` (per kind), `exportedAt`                                                    | `kinds`, `counts`, `fileName`; build, text and parse return the same records         |
| `export_parse`       | `file` (object) or `text`, optional `current` and `migrations` (a test chain by name) | `counts`, optional `formatVersion`; or `error_code` and `error_detail`               |
| `match_names`        | `names`, `candidates` (`id`, `name`, `origin`, `parentId`)                            | `matches`: per name `exact` (id or null), `close` and `classes` (ids)                |
| `merge_plan`         | `mine`, `file` (records per kind), `choices` (`kind/id` to `mine` or `theirs`)        | `add`, `same`, `conflicts`, `immutable`, `skippedNotes`, `writes`                    |
| `remap_ingredients`  | `records`, `map` (file id to notebook id)                                             | `ingredients`, `parents`, `lineRefs`, `slotRefs`, `stockRefs`, `affinities`          |
| `cooklang_parse`     | `text`                                                                                | any of `metadata`, `ingredients`, `cookware`, `timers`, `steps`, `notes`, `sections` |
| `cooklang_serialize` | `component`, `names`, `facts`, optional `tasting`, `otherNotes`                       | `text`, `fileName`, `lost`                                                           |
| `cooklang_import`    | `text`, `decisions` (target, amount mode, role), `options`, `facts`                   | `component`, `unmeasured` (line indexes); or `error_code` with the line `index`      |
| `cooklang_modes`     | `text`, `facts` by ingredient name                                                    | `modes`: the amount modes offered per ingredient occurrence                          |

## Kinds of the finder (issue 21)

Run by `test/makeable-vectors.test.ts` from `packages/engine/vectors/makeable/`.
`expected` is a subset of the result: objects by field, arrays by position
and length; `urgency: null` asserts no urgency.

| `kind`            | `inputs`                                                                                                                                                                                          | `expected`                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `makeable`        | `today`, `ingredients`, optional `components`, `dishes`, `templates`, `stock`, `facts`, `substitutes` (declared substitute effects), `options` (`siblingSubstitution`, `maxMissing`, `dishRoles`) | `candidates` (ranked), optional `useUpFirst`              |
| `stock_for_role`  | `today`, `role`, `ingredients`, optional `components`, `stock`                                                                                                                                    | `items` (`itemId`, `ingredientId`, `useBy`)               |
| `uses_ingredient` | `today`, `ingredientId`, `ingredients`, `stock` (may be empty), optional `components`, `dishes`, `options` (`siblingSubstitution`)                                                                | `records` (`kind`, `id`), exactly, in order               |
| `rank_candidates` | `candidates` (`kind`, `id`, `name`, `roles`, optional `urgency.daysLeft`; own and classic kinds mixed)                                                                                            | `order` (`kind:id`), exactly, also for the reversed input |

Errors use `error_code` and `error_detail` as elsewhere (`invalid-tree`,
`invalid-date`, `cycle`, `invalid-template`). Covered: exact match, a
parent line taking a descendant, a generic item not satisfying a specific
line, sibling substitution on, off, earliest use-by and for a class line, a
short substitute keeping the amount, state mismatch (cooked line and raw
item, raw item and prepared component), a prepared component in stock,
presence-only stock, short amounts, batches adding up, conversion by the
engine, partial matches with the threshold, optional lines, a nested
component from stock and made (scaled, short, unscaled), family heads and a
stock item of another version, the ranking (urgency beats roles, roles break
an urgency tie, name then id, no use-by last, a date in the past; own candidates and classics ranked as one list, and the ties by name, id and kind),
always-there items, empty stock, open roles, ratio templates (inherited
roles, threshold, swapped class), use up first, what uses an ingredient (itself, a class above, a sibling, through a component, head versions only, a generic item not standing for a specific line) and the errors. Amounts,
dates and ingredients are synthetic and say so in `source`.

## Kinds of techniques, classics and skills (issue 87)

Folders: `packages/engine/vectors/techniques/`, `classics/` and `skills/`.
Rules: [engine rules](engine-rules.md#techniques-steps-and-classics). Every
vector is self-contained and **invented**: units, amounts, books and
ingredients are labelled as examples, and no real recipe or historical unit
size is in them (a source unit word is defined inline in the classic, as in a
real file). Validation vectors carry `error_code: invalid` and
`error_detail.findings` (compared in order, each a subset of the finding);
derive and copy vectors compare `expected` deeply with the vector's
`tolerance` on numbers.

| `kind`                    | Inputs                                                                                                  | Expected                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `technique_validate`      | `technique`                                                                                             | none (`ok`), or `error_code` and `findings`                                                 |
| `technique_list_validate` | `techniques`                                                                                            | as above                                                                                    |
| `technique_notes`         | `steps`, `techniques`, `learned` (ids)                                                                  | `notes`: `step` index and `technique` id; or `error_code` `unknown-technique`               |
| `classic_validate`        | `classic`, `techniques`, optional `ingredient_ids`                                                      | none (`ok`), or `error_code` and `findings`                                                 |
| `classic_derive`          | `classic`, `lang`, optional `portions`                                                                  | `factor`, `dish`, `components`, `unmeasured`, `ranges`; or an error and `error_detail`      |
| `classic_copy`            | `classic`, `lang`, `date`, `ids` (the ids `newId` gives in turn), optional `portions`, `ingredient_ids` | `dish`, `components`; or `error_code` (`wanted-ingredient` with `wanted`, or a derive code) |
| `classic_wanted`          | `classic`                                                                                               | `wanted`: `path`, `en`, `de`                                                                |

## Kinds of nutrition (issue 94)

Folder: `packages/engine/vectors/nutrition/`, run by
`test/nutrition-vectors.test.ts`. Rules: [engine rules](engine-rules.md#nutrition).
Every vector is invented: the nutrients per 100 g are made up and describe no real
food (the shipped numbers are read from USDA by the generator, never typed);
expected values are computed by hand. `expected` is compared deeply with the
vector's `tolerance`.

| `kind`            | Inputs                                                                                                            | Expected                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `nutrition_dish`  | `derived` (`dish` with `portions` and `slots`, `components`, as `deriveClassic` gives them), `facts`, `nutrition` | `portions`, `perPortion`, `countedGPerPortion`, `coverage`, `notReported`; or `error_code` |
| `nutrition_round` | `figures` (a `PortionNutrients`)                                                                                  | `rounded`; or `error_code` `invalid-value` with `error_detail.field`                       |

## Kinds of substitute effects (issue 93)

Folder: `packages/engine/vectors/substitutes/`, run by
`test/substitutes-vectors.test.ts`; the finder's vectors for declared substitutes
are `declared-substitute-*` in `vectors/makeable/` (kind `makeable` with
`substitutes`). Rules: [engine rules](engine-rules.md#substitute-effects). Every
vector is **invented**: ingredients, factors, books and sentences are labelled
as examples, and no real kitchen figure is in them. Validation vectors carry
`error_code: invalid` and `error_detail.findings` as for techniques.

| `kind`                     | Inputs                                                           | Expected                                    |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `substitute_validate`      | `substitute`, optional `ingredient_ids` (the catalogue)          | none (`ok`), or `error_code` and `findings` |
| `substitute_list_validate` | `substitutes`, optional `ingredient_ids`                         | as above                                    |
| `substitute_lookup`        | `ingredient_id`, `ingredients` (`id`, `parentId`), `substitutes` | `ids`: the substitute ids in order          |
| `skill_record`             | `technique`, `learned`                                           | the record                                  |
| `skill_learned`            | `records`                                                        | `learned`: the ids, sorted                  |

Covered: a sentence of 25 and of 26 words, blank German text, no source,
duplicate ids, the note at the first use only, a learned technique, order of
notes, an unknown technique; every finding code of `validateClassic`; derive
with a scaled mass, a range, a table unit, a count unit word, German names,
slots only, and the three errors; the copy with origin, with an adopted
ingredient and the two refusals; the skill record and the learned set.

## Kinds of handling rules

Folder: `packages/engine/vectors/handling/`. Rules:
[engine rules](engine-rules.md#techniques-steps-and-classics). Invented and
labelled as examples, like the technique vectors.

| `kind`                   | Inputs                                                                           | Expected                                                                            |
| ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `handling_validate`      | `rule`, optional `technique_ids`, `ingredient_ids`                               | none (`ok`), or `error_code` and `findings`                                         |
| `handling_list_validate` | `rules`, optional `technique_ids`, `ingredient_ids`                              | as above                                                                            |
| `handling_show`          | `ingredients`, `rules`, `tree`, `learned` (ids), optional `used` (technique ids) | `rules`: `rule` id and `ingredient` id, in order; or `error_code` `cycle` with `id` |

Covered: the validation findings (blank text, no source, sentences of 25 and
26 words, unknown technique, unknown target, duplicate id, the index in a
list); a rule on an ingredient, on a group two levels up, not on a sibling or
on the group above a child; a learned technique; one showing for two matching
ingredients; the order; the `used` filter (also empty); an ingredient outside
the tree; no ingredients; a loop in the tree.

# Worked examples

All numbers by hand. The input numbers are chosen for the arithmetic;
where they echo a checked figure, [ratios](ratios.md) has its source.

## 1. Baker's percentages from grams

Flour 1000 g, water 760 g, salt 20 g, yeast 12 g.

- flour = 1000 g; water 100 · 760 / 1000 = 76 %; salt 100 · 20 / 1000 =
  2 %; yeast 100 · 12 / 1000 = 1.2 %.
- total 100 + 76 + 2 + 1.2 = 179.2 %; dough 1000 + 760 + 20 + 12 =
  1792 g; hydration = water % = 76 %.

```json
{
  "id": "bakers-percent-from-grams",
  "description": "Lean dough in grams to baker's percentages",
  "inputs": {
    "kind": "bakers_percent",
    "lines": [
      { "name": "flour", "g": 1000, "is_flour": true },
      { "name": "water", "g": 760, "is_flour": false },
      { "name": "salt", "g": 20, "is_flour": false },
      { "name": "yeast", "g": 12, "is_flour": false }
    ]
  },
  "expected": {
    "flour_g": 1000,
    "dough_g": 1792,
    "pct": { "flour": 100, "water": 76, "salt": 2, "yeast": 1.2 },
    "total_pct": 179.2,
    "hydration_pct": 76
  },
  "tolerance": 0.0001,
  "source": "docs/vectors.md#1-bakers-percentages-from-grams; synthetic amounts"
}
```

## 2. Scaling a baker's formula to a dough weight

The formula of example 1, scaled to 900 g of dough.

- flour = 900 / 1.792 = 502.232143 g
- water = 0.76 · 502.232143 = 381.696429 g
- salt = 0.02 · 502.232143 = 10.044643 g
- yeast = 0.012 · 502.232143 = 6.026786 g
- check: 502.232143 + 381.696429 + 10.044643 + 6.026786 = 900.000001,
  equal to 900 within the tolerance.

```json
{
  "id": "scale-bakers-to-dough-weight",
  "description": "Baker's formula 100/76/2/1.2 scaled to 900 g of dough",
  "inputs": {
    "kind": "scale_bakers",
    "formula": [
      { "name": "flour", "pct": 100 },
      { "name": "water", "pct": 76 },
      { "name": "salt", "pct": 2 },
      { "name": "yeast", "pct": 1.2 }
    ],
    "target_dough_g": 900
  },
  "expected": {
    "flour_g": 502.232143,
    "g": { "flour": 502.232143, "water": 381.696429, "salt": 10.044643, "yeast": 6.026786 },
    "dough_g": 900
  },
  "tolerance": 0.000001,
  "source": "docs/vectors.md#2-scaling-a-bakers-formula-to-a-dough-weight; synthetic formula"
}
```

## 3. Ratio check of a pie dough

Template 3 flour : 2 fat : 1 water; made with 300 g flour, 180 g fat,
110 g water; anchor flour.

- scale = 3 / 300 = 0.01 parts per gram; parts: flour 3, fat
  180 · 0.01 = 1.8, water 110 · 0.01 = 1.1.
- delta parts: flour 0, fat 1.8 − 2 = −0.2, water 1.1 − 1 = +0.1.
- total 590 g; shares: flour 100 · 300 / 590 = 50.847458 %, fat
  100 · 180 / 590 = 30.508475 %, water 100 · 110 / 590 = 18.644068 %.
- template shares (6 parts): 50 %, 33.333333 %, 16.666667 %.

```json
{
  "id": "ratio-check-pie-dough",
  "description": "Pie dough 300/180/110 g against 3:2:1, anchored on flour",
  "inputs": {
    "kind": "ratio_check",
    "template": { "name": "pie dough", "parts": { "flour": 3, "fat": 2, "water": 1 } },
    "lines": [
      { "name": "flour", "g": 300 },
      { "name": "fat", "g": 180 },
      { "name": "water", "g": 110 }
    ],
    "anchor": "flour"
  },
  "expected": {
    "parts": { "flour": 3, "fat": 1.8, "water": 1.1 },
    "share_pct": { "flour": 50.847458, "fat": 30.508475, "water": 18.644068 },
    "template_share_pct": { "flour": 50, "fat": 33.333333, "water": 16.666667 },
    "delta_parts": { "flour": 0, "fat": -0.2, "water": 0.1 }
  },
  "tolerance": 0.000001,
  "source": "docs/vectors.md#3-ratio-check-of-a-pie-dough; template 3:2:1 from docs/ratios.md (excerpt only), amounts synthetic"
}
```

## 4. Scaling from an anchor: pasta from the egg

Template 3 flour : 2 egg; 165 g of egg weighed.

- flour = 165 · 3 / 2 = 247.5 g; egg stays 165 g.

```json
{
  "id": "scale-anchor-pasta-egg",
  "description": "Pasta dough 3:2 from 165 g of egg",
  "inputs": {
    "kind": "scale_anchor",
    "template": { "name": "pasta dough", "parts": { "flour": 3, "egg": 2 } },
    "anchor": { "name": "egg", "g": 165 }
  },
  "expected": { "g": { "flour": 247.5, "egg": 165 } },
  "tolerance": 0.000001,
  "source": "docs/vectors.md#4-scaling-from-an-anchor-pasta-from-the-egg; template from docs/ratios.md (excerpt only), egg mass synthetic"
}
```

## 5. Salt by basis: a 6 % brine

2000 g of water, 6 % salt by mass of brine.

- salt = 2000 · 6 / (100 − 6) = 12000 / 94 = 127.659574 g
- total = 2000 + 127.659574 = 2127.659574 g; check 100 · 127.659574 /
  2127.659574 = 6.000000 %.
- On basis `water` the same 6 % gives 120 g: the basis must be stored
  with every salt percentage.

```json
{
  "id": "salt-brine-6-percent",
  "description": "6 % brine by mass of brine from 2000 g of water",
  "inputs": { "kind": "salt_percent", "water_g": 2000, "pct": 6, "basis": "brine" },
  "expected": { "salt_g": 127.659574, "total_g": 2127.659574 },
  "tolerance": 0.000001,
  "source": "docs/vectors.md#5-salt-by-basis-a-6-brine; 6 % lies in the corrected range 5-9 % of docs/ratios.md (excerpt only)"
}
```

# Open

None. Error vectors exist for every kind, with `error_code` instead of
`expected`, as Mixtura's batch vectors do.
