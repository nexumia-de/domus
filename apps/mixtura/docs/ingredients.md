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
Code: `src/ingredients/` in [materia](../../../packages/model) and the drink side in `packages/engine/src/drink-ingredients/`, one job per file. Every figure
in the vectors is either synthetic (stated in the vector) or an
assumption of [balance](balance.md); no drink data is claimed.

| File                 | Job                                                                   |
| -------------------- | --------------------------------------------------------------------- |
| `types.ts`           | `BaseIngredient` (general fields), `PreparedIngredient`, result types |
| `tree.ts`            | `buildTree`, `ancestors`, `descendants`, `isA`, `distance`            |
| `properties.ts`      | `inheritedValue` (general walk), `resolveCost`                        |
| `prepared.ts`        | the walk over a prepared ingredient's spec: nesting, cycles, errors   |
| `substitution.ts`    | `sameClass`, `substitutesFor`                                         |
| `swap-candidates.ts` | `swapCandidates`: the groups offered when a line is swapped           |

The drink shape is in `packages/engine/src/drink-ingredients/` (exported
through `src/drink.ts`): `types.ts` has `Ingredient` (the general fields
plus `abv`, `sugar`, `acid`), the drink `Role` union, `InheritedProperty`,
`IngredientTree` and the field list; `properties.ts` has
`resolveProperty`, `resolveAll` and `INHERITED`, with ABV, sugar and acid
computed (not inherited) for a prepared ingredient.

## Tree

`buildTree(list)` returns the tree or all errors, each naming its ids:

| Code             | Ids                                                             |
| ---------------- | --------------------------------------------------------------- |
| `duplicate-id`   | the id                                                          |
| `missing-parent` | child, missing parent                                           |
| `level-order`    | child, parent (a category is a root; a product has no children) |
| `cycle`          | around the cycle, from its smallest id, closing on it           |

**Depth is the data's.** The tree has no fixed number of levels
([decision on #68](https://github.com/nexumia-de/mixtura/issues/68)): a
type may be below a type, as deep as the source goes (the seed has five
levels). `category`, `type` and `product` describe the position, not a
limit: a root with children is a category, a node without children a
product, anything between a type. The only level rule left is the one
that keeps those meanings: a category is always a root and a product has
no children. Nothing is re-attached to a higher ancestor, so a line that
names `whiskey` is satisfied by `bourbon-whiskey` and everything below it,
and a line that names `bourbon-whiskey` is not satisfied by `rye-whiskey`.
Nothing else in the engine reads the level except `swapCandidates` (leaves
out categories) and the unlock ranking (`product` or `type` candidate).
Reason against the alternative (keep flattening and curate by hand): the
flattening put nodes under types they are not below in the source and
hid their descendants from recipes; a hand-curated tree would be a second
copy of third-party data that drifts from the pinned commit. Where the
source's own parent is wrong, [Mixtura's corrections](seed-data.md#converter)
override it.

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

The walk over a prepared ingredient (nesting, cycles, unknown ids) is
the general `resolvePrepared` in materia's `ingredients/prepared.ts`, internal to
the engine; it folds a value given by the caller. `computePrepared`
(`balance/prepared.ts`, drink-specific) passes the mixing formulas, and
`limitingShelfLife` passes shelf lives.

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

## Swap candidates

`swapCandidates(id, { role? })` is what the spec screen's Try a Swap
offers for a line ([swap mode](screens-browse.md#swap-mode)). It returns
groups, each ordered by tree distance, then id; empty groups are left
out, and the ingredient itself and its ancestors are never offered.
`role` is the role of the line's slot (a role set on the line wins over
the ingredient's own).

- **With a role:** `class` (same class and same role, the list of
  `substitutesFor`), then `role` (same role, any other class; categories
  such as "Spirits" are left out, they are not an ingredient to pour).
- **Without a role** (13 of the 296 seed ingredients inherit none): `class`
  (same class, any role), then `near` (siblings and children in the tree,
  categories left out). An ingredient without parent has no neighbours.
- No group at all means nothing is known to fit; the screen then offers
  only the search over all ingredients. Nothing is guessed. An unknown id
  gives no groups and a reason.

The seed gives a substitution class to only 69 of 296 ingredients, and
the classes are narrow (`sc-gin`, `sc-brandy`), so for most lines the
`role` group is the useful one.

## Vectors

`packages/engine/vectors/ingredients/` (format:
`ingredient-vector.schema.json`), run by `test/ingredients-vectors.test.ts`:
inheritance, the four tree errors, tree queries, substitution ordering,
swap candidates (`swap-candidates-groups`: groups, a role set by the line,
no role, no neighbours, unknown id),
the tree four levels deep (`tree-deep`), five prepared cases (syrup 1:1 and 2:1, batched with added water, nested,
unknown property) and a prepared cycle.
