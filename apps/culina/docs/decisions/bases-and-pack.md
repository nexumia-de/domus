---
type: Decision Record
title: What marks a base, and how the import pack of classics works
description: Decided by the lead on 2026-11-22 under the owner's recipe app decision (issue 39, step 1). A shipped file is a base when it says kind base; a base has a slot filled by a component, and a component of a slot's role that no slot reaches is an alternative for it, by the notebook's own rule, so no list of alternatives is stored. The classics that are no base move into an import pack, dish files in their own folder built into their own file, offered and not shown until the user takes them, as shipped dishes and never copied into the store. Whether the pack is taken at first start is the owner's.
tags: [decision, bases, classics, pack, format]
generated: { by: claude-code/2.1.326, at: 2026-11-22 }
sources:
  - id: scope
    title: 'Decision: Culina is a recipe app with history, ideas and bases to build on'
    url: scope-recipe-app.md
  - id: list
    title: 'Decision: one list of dishes, whatever their origin'
    url: one-dish-list.md
  - id: issue
    title: 'Issue 39 of suitably/domus: bases to build on, classics to bases or import pack'
    url: https://github.com/suitably/domus/issues/39
---

# What marks a base, and how the import pack of classics works

**Status: decided by the lead agent on 2026-11-22**, as step 1 of issue
39[^issue], within the owner's [recipe app decision](scope-recipe-app.md)[^scope].
The owner decided _that_ bases ship and the other classics become an
import pack; this record decides _how the data says so_. Point 6 is the
owner's and is left open.

## Context

The recipe app decision says: "A base is components with slots and
alternatives, so a creation swaps a component instead of rewriting a
recipe", and the shipped classics that are no base "leave the shipped
list and are offered as an optional import pack, so their work is
kept". Until now every shipped file was a dish of one source in
`packages/app/data/classics/<country>/`, and the validator refused a
component that no slot reaches (`unused-component`). The notebook already
has alternatives: the components whose `role` is the slot's role
(`src/dishes/alternatives.ts`, [behaviour](../behaviour.md#dishes)),
with Swap and the random pick reading them and storing no list.

## Decision

1. **A base says so.** A shipped file has an optional `kind`: `base` or
   `dish`; without it a file is a dish (`isBase`,
   `packages/engine/src/classics/base.ts`). Unlike the origin, which
   follows from where a dish lives ([one dish list](one-dish-list.md),
   point 6), being a base is a property of the content: it is shown and
   filtered, it travels with the file, and it is what keeps a base out of
   the pack (point 5).
2. **What a base is.** A base has at least one slot filled by a
   component of its file (`base-without-component` otherwise). Its
   components are of two kinds:
   - **in the dish**: reached from a slot, directly or through the lines
     of another component (`componentsInDish`);
   - **alternatives**: reached from no slot, with the `role` of a slot
     that a component fills (`slotAlternatives`), together with the
     components their lines name. A component that is neither is unused,
     as in a dish.
3. **No list of alternatives is stored.** The rule is the notebook's own:
   the same role, another component. So a base kept in the notebook
   behaves like a dish built there, and a file states a variant once, as
   a component, not a second time in a list.
4. **What follows in the engine.**
   - **Keep** (`copyClassic`) copies every component with its role,
     alternatives too, so Swap offers them in the notebook at once; the
     user's own components of that role join them there.
   - **The finder** asks only for what the dish uses: the lines of an
     alternative are not counted as lacking or as "not in the catalogue".
   - **Sources stay one.** A base follows one named source, as every
     shipped file ([classic format](../classic-format.md)); an
     alternative is a component of the same source. A variant only
     another source gives is not added to a base; it may become its own
     base.
5. **The import pack is a folder of dish files.** The classics that are
   no base move to `packages/app/data/pack/<country>/<id>.json`, in the
   same format and under the same tests as a shipped file (schema, the
   engine's rules, the wording, texts in English and German). A base never
   lies there, and an id lies in one of the two folders, never in both
   (`test/classics.test.ts`). The build writes the pack into its own file,
   `dist/classics-pack.json` (format `culina-classics-pack`), precached
   like the rest so that taking it works offline, and not fetched at
   start (`fetchPack`, `src/classics/content.ts`).
6. **Taking the pack.** When the user takes the pack, its dishes join the
   one list as shipped dishes: read-only, with their source, their
   original units and both languages, replaced by the next release like
   every shipped file, and copied into the notebook only by Keep, one at
   a time. The choice is kept on the device. **Not built yet**: the
   switch in Settings and on the import screen, and the native app's
   share of it; they come with the move of the classics (issue 39,
   part 2). **Open, for the owner:** whether the pack is taken at first
   start. Nothing built so far decides it.

## Rejected

- **A list of alternatives on each slot** (`alternatives: [...]`). It
  would be a second way to say what the role already says, and a base
  kept in the notebook would lose it, since the notebook's dishes have
  no such list. Swapping one ingredient for another (olive oil for
  sunflower oil) is the work of the substitutes ("Instead",
  [helper](mentor.md)), not of a base.
- **The folder alone marks a base.** It would mean a third folder beside
  `classics` and `pack`, and a file moved by mistake would change its
  kind unseen; the stored `kind` makes the test "no base in the pack"
  possible.
- **Taking the pack copies its dishes into the store.** Rejected for the
  reasons the [one dish list](one-dish-list.md#rejected) gives for the
  classics: updates would meet the user's data, export and sync would
  carry dishes the user did not write, and the stored shape loses the
  source units and the second language.

## Consequences

- [Classic format](../classic-format.md#a-base), the
  [data model](../data-model.md#classic) and the
  [engine rules](../engine-rules.md) describe `kind`, the alternatives
  and the pack folder.
- Issue 39, part 1: the classics that are bases get `kind: "base"` and,
  where their source gives variants, components as alternatives. Part 2:
  the others move to `data/pack/`, with the switch of point 6.
- The dish screen still shows every component of a file; showing the
  alternatives of a base apart (as Swap does for an own dish) comes with
  the first base that has one.

[^issue]: [Issue 39](https://github.com/suitably/domus/issues/39), "Order", step 1.

[^scope]: [Decision: Culina is a recipe app](scope-recipe-app.md), points 2 and 3.
