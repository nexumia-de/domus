---
type: Specification
title: Ingredients
description: How the engine validates the ingredient tree, resolves inherited properties with their source, computes the properties of prepared ingredients and finds substitutes; module layout, rules, error codes and vectors.
tags: [ingredients, inheritance, prepared, substitution, engine]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: data-model
    title: 'Data model, sections Ingredient and Prepared ingredient'
    url: data-model.md
  - id: balance
    title: 'Balance, section Formulas'
    url: balance.md
---

# Ingredients

Engine side of the Ingredient entity of the [data model](data-model.md).
Code: `packages/engine/src/ingredients/`, one job per file. Every figure
in the vectors is either synthetic (stated in the vector) or an
assumption of [balance](balance.md); no drink data is claimed.

| File              | Job                                                                   |
| ----------------- | --------------------------------------------------------------------- |
| `types.ts`        | `Ingredient`, `PreparedIngredient`, `SubstitutionClass`, result types |
| `tree.ts`         | `buildTree`, `ancestors`, `descendants`, `isA`, `distance`            |
| `properties.ts`   | `resolveProperty`, `resolveAll`, `resolveCost`                        |
| `mixture.ts`      | the mixing formulas of balance (before dilution), in ml and g         |
| `prepared.ts`     | `computePrepared`: ABV, sugar, acid, volume of a prepared ingredient  |
| `substitution.ts` | `sameClass`, `substitutesFor`                                         |

## Tree

`buildTree(list)` returns the tree or all errors, each naming its ids:

| Code             | Ids                                                   |
| ---------------- | ----------------------------------------------------- |
| `duplicate-id`   | the id                                                |
| `missing-parent` | child, missing parent                                 |
| `level-order`    | child, parent (child must be below parent's level)    |
| `cycle`          | around the cycle, from its smallest id, closing on it |

`isA(child, ancestor)` is true for the ingredient itself. `distance` counts
steps through the nearest common ancestor; separate roots meet in a
virtual root, so two roots are 2 apart. Unknown ids give `undefined`
(`false` for `isA`).

## Properties

`role`, `abv`, `sugar`, `acid`, `shelfLifeDays` and `substitutionClass`
come from the nearest ancestor that has them, the ingredient first. The
result is `{ value, from }` or `{ value: undefined, reason }`; nothing is
guessed. Exceptions that follow the data model:

- `cost` is **not** inherited (the issue lists it among the inherited
  properties; the data model says a price belongs to one bottle).
  `resolveCost` returns the ingredient's own cost or a reason.
- `abv`, `sugar` and `acid` of a prepared ingredient are computed, so they
  are not read from its ancestors either; the reason says so.

## Prepared ingredients

`computePrepared(tree, specs, id)` mixes the lines of the spec named by
`prepared.specId` with the formulas of [balance](balance.md#formulas):
`ABV = 100 * sum(v_i a_i / 100) / V`, sugar `= 100 * sum(v_i s_i / 100 + m_i) / V`,
acid `= 100 * sum(v_i c_i / 100) / V`. Lines are in ml (grams of solid
sugar in `sugarG`, volume 0); unit conversion is the amounts module's job
and is wired in with the balance work. Added water has no ethanol, sugar
or acid.

`V` is the sum of the lines and the added water, or the spec's `yieldMl`
if given: solid sugar dissolves into less volume than it has, so the
measured yield is the honest volume, and the totals are conserved
(vector `prepared-syrup-1-1`). A line that is itself prepared resolves
recursively. A property that a part with volume lacks is `undefined` with
a reason naming the ids; the other properties are still computed.

Errors, naming the ids: `prepared-cycle` (ids around the cycle, from the
queried ingredient), `unknown-ingredient`, `unknown-spec`, `not-prepared`.

## Substitution

`sameClass(a, b)` is true when both have a resolved class and it is the
same. `substitutesFor(id)` lists ingredients with the same resolved class
and the same resolved role, ordered by tree distance, then id. The
ingredient itself and its ancestors are left out. If the class or the role
of `id` is unknown the list is empty and carries the reason.

## Vectors

`packages/engine/vectors/ingredients/` (format:
`ingredient-vector.schema.json`), run by `test/ingredients-vectors.test.ts`:
inheritance, the four tree errors, tree queries, substitution ordering,
five prepared cases (syrup 1:1 and 2:1, batched with added water, nested,
unknown property) and a prepared cycle.
