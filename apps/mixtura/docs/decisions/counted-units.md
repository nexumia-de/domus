---
type: Decision Record
title: Counted units, open amounts and the glass volume
description: A spec line may be a counted amount (whole, slice, leaf, ...) or a top; it is stored and shown exactly, balance counts it only from volume data (unitVolumes per ingredient, topMl on the line) and otherwise lists it as not counted; no glass volume is stored.
tags: [decision, units, balance, seed-data]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Counted units, open amounts and the glass volume

Resolves issues #69 and #54.

## Context

115 of 663 seed recipes were kept out because a line said `whole`,
`leaves`, `slice`, `sprig`, `wedge`, `pinch` and similar: the unit table
had no unit for a counted amount. Every flip was among them. A `top` line
had a unit but no volume, and `topMl` existed only on `BalanceLine`, so a
stored spec could never carry it. The rule of [balance](../balance.md)
stays: a derived number is never a guess presented as a measurement.

## Decision

1. **Counted units are units of kind `count`** (`whole`, `slice`, `leaf`,
   `sprig`, `wedge`, `piece`, `pinch`, `cube`, `peel`, `stalk`, `scoop`,
   `chunk`, `yolk`, `stick`, `bean`, `capsule`) with no value in the table.
   A line in one of them is stored and shown exactly
   ([units](../units.md#counted-units)). The converter keeps recipes with
   them.
2. **Volume only as data.** What one unit holds is `unitVolumes` on the
   ingredient (`ml`, `evidence`, optional `source`), per ingredient and per
   unit, not inherited. Balance counts the line from it and flags the
   figures estimated; without it the line is listed in `excluded` as
   `counted-without-volume` and the figures say they exclude it. The seed
   has no entries: none was read from a source. Any entry added later
   carries its evidence, `assumption` when no source was read.
3. **`top` stores its volume on the line** as `topMl` (ml, only with
   `unit: top`), the same name balance, matching and batching already read.
   Without it the line is `top-without-volume`. No format version bump:
   optional fields ([data model](../data-model.md#export-file)).
4. **No glass volume.** One of 16 source glasses has a volume and none is
   verified; a range "0 ml to the glass volume" would be a guess about the
   drink. It is dropped from [units](../units.md); a user who knows the
   volume enters `topMl`. A glass volume can come back as data with its
   evidence if a source is found.
5. **Batches round a counted amount up** to whole units, never below 1.
6. **Not accepted:** `part` (a ratio, needs a reference), `cup`, `bottle`,
   `shot` (sizes vary, no source), zero amounts, ranges that are not
   ranges, and words that are not quantities (`float`, `rinse`, `strong`,
   `hand-whipped`, `inch`, `1`). 28 recipes stay out.

## Consequences

- 635 of 663 seed specs are in; 105 counted lines and 54 `top` lines are
  not counted in their specs' figures until volume data exists.
- The spec screen must show `excluded` lines as "not counted in the
  figures" and let the user enter `topMl`; tracked as an app issue.
- Per-unit mass (50 g per egg) is not modelled; mass lines count only as
  solid sugar.
