---
type: Reference
title: Engine amounts module
description: The pure module packages/engine/src/amounts: parse, convert, scale and format amounts with the unit table, its error codes, options and the vector files that pin it.
tags: [engine, units, parsing, display, vectors]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: units
    title: 'Units (docs/units.md) and the unit table packages/engine/data/units.json'
---

# Engine amounts module

Implements [units](units.md) and the
[decision](decisions/units-and-display.md); nothing here is a new rule.
An amount is `{ value, unit }` with a unit id from `units.json`. The
functions return `{ ok: true, value }` or `{ ok: false, error: { code, message } }`
and never throw for user input.

| File             | Job                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ |
| `types.ts`       | `Amount`, `UnitId`, `Result`, error codes                                            |
| `table.ts`       | reads `units.json`; `unitValue` with overrides, `isEstimatedUnit` for balance        |
| `number.ts`      | the number grammar: decimal, fraction, mixed, glyph                                  |
| `parse.ts`       | `parseAmount(text, { ounce, solid })`                                                |
| `convert.ts`     | `toBase` (ml or g), `toMl`, `toGrams`, `fromBase`, `convert`                         |
| `scale.ts`       | `scale(amount, factor)`, factor above zero, unit kept                                |
| `rounding.ts`    | display steps per unit and refinement so a value never shows as 0                    |
| `number-text.ts` | decimals and mixed numbers with glyphs                                               |
| `format.ts`      | `formatAmount`, `formatAmountDetailed`, `displayUnit` for `metric`, `us`, `imperial` |

Format options: `system` (`metric`, `us`, `imperial`), `overrides`, `entered` (the user's text, kept if it still says the amount) and `precision`: `pour` (default, [pour rule](units.md#display-and-rounding)) or `batch` (whole millilitres, no exact pour amounts; the precision whose error batches report as `roundingError`).

Behaviour worth knowing:

- `top` has no volume: `toBase` returns `not_measurable`. A "top 90 ml"
  line is a line-level concept (a `top` flag plus an ml amount) for the
  spec model, not something `parseAmount` reads.
- Overrides replace the table value only for units marked overridable and
  only when positive; anything else is ignored.
- Rounding is half up. Metric and US display of one amount differ only in
  text; the stored amount is not touched.
- Error codes: `empty`, `no_number`, `zero_denominator`, `negative`,
  `range`, `exponent`, `separators`, `ambiguous_separator`, `no_unit`,
  `unknown_unit`, `space_required`, `not_a_volume`, `not_a_mass`,
  `not_measurable`, `incompatible_units`, `invalid_factor`, `invalid_value`.

# Vectors

`packages/engine/vectors/amounts/*.json`, schema `amounts.schema.json`
(the envelope of the [balance](balance.md#worked-examples) format, with a
`cases` array because one rule has many examples). `test/amounts.test.ts`
runs every file, checks that each unit of the table has a conversion
vector, and checks the round trip format then parse within the rounding
step over all accepted parse inputs.
