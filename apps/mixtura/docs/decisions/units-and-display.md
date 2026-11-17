---
type: Decision Record
title: Stored unit versus display unit
description: Amounts are stored as entered (value and unit id), computed in ml and g, and displayed in a metric or US system chosen by a setting; the proposed default is metric.
tags: [decision, units, display]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Stored unit versus display unit

Status: **needs decision** on the default system (proposal below);
everything else is decided here and can be implemented now.

## Context

Bartenders mix oz, ml, cl, dashes and bar spoons; the app is used on
phones in several countries, and a spec may be copied from an American
book and used by someone who measures in ml. Converting on entry and
storing millilitres would lose what the user typed (`3/4 oz` becomes
22.1 ml) and show them numbers they never wrote. See
[units](../units.md) for the table and the rounding rules.

## Decision

1. **Store what was entered:** each line keeps `value` (exact, as a
   decimal or fraction) and `unit` (an id such as `oz_us`, `dash`). The
   engine converts to ml or g with the table when it computes. Nothing
   stored is ever rewritten by a display setting.
2. **Display system is a setting**, `metric | us | imperial`, applied on
   screen only. A line whose unit already belongs to the display system
   is shown as entered; other volume units are converted and rounded by
   the display rules of [units](../units.md#display-and-rounding).
   Convention units (dash, drop, splash, bar spoon, tsp) are shown as
   entered in every system.
3. **Rounding is display only.** Sums and balance use unrounded
   millilitres.
4. **Convention overrides** (the dash in ml, for example) are settings,
   not stored in specs; specs keep the unit id.
5. **Proposed default: metric (ml).** The owner and the first users write
   metric, ml is exact to enter on a phone, and oz entry is always
   accepted. Owner to confirm or choose US ounces as default.

## Display precision (amended 2026-11-17)

The first rounding rule (whole ml from 5 ml) showed 22.5 ml, three
quarters of an ounce, as "23 ml", and a user's exact `22.5` as another
number. Bar pours are in steps of 2.5 ml. The rule now:

- An **unconverted** ml, cl or g amount on the pour grid (0.5 ml, 0.05 cl,
  0.5 g) is shown exactly; nothing that was stored is shown as a
  different number unless it was converted between systems.
- A **converted** value rounds to 2.5 ml (5 to under 100 ml), 5 ml (from
  100 ml) or 0.5 ml (below 5 ml): 22.5, 30, 45, 60 ml for 3/4, 1, 1½, 2 oz.
- US display keeps ¼ and ⅛ oz fractions.

Why: 2.5 ml is the smallest step bar tools and recipes use; finer steps
would show false precision for converted values, coarser ones (whole
ml) lose the exact quarter-ounce values. The grid is an assumption (no
source read); it is one table in `rounding.ts` and a vector file. Full
rule: [units](../units.md#display-and-rounding).

## Consequences

- Specs from either system round-trip without loss; a "1 1/2 oz" stays
  that.
- The engine needs a unit table, a parser and a formatter; all three are
  pure functions with vectors.
- Scaling a spec multiplies the stored value and keeps its unit; the
  display layer converts.
- Changing the dash volume changes balance for existing specs; that is
  intended and shown as "estimated".
