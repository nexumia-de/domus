---
type: Decision Record
title: Six roots with optional slots, as the book files them
description: Accepted by the owner on 2026-11-18. The templates stay the six roots of Cocktail Codex; what the book files as a variation of a root (Collins, Mule, Margarita, Sazerac, Spritz-like highballs, eggnog) becomes optional slots with bands chosen here, and no seventh root is added. Supersedes the Collins root proposal (#114).
tags: [decision, templates, matching, evidence]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: codex
    title: "Alex Day, Nick Fauchald, David Kaplan: Cocktail Codex (Ten Speed Press, 2018), chapters 1 to 6; quantities read by the lead on 2026-11-18 from the owner's copy, cited as facts"
  - id: templates
    title: 'Templates, sections Evidence and Seed measurement'
    url: ../templates.md#evidence
---

# Six roots with optional slots, as the book files them

## Context

477 of 635 seed drinks fitted no template because a drink had a line
whose role the nearest template had no slot for (lengthener 90, bitters
73, second modifier 69, accent 41). A proposal of 2026-11-17 (#114) added
a seventh root for the Collins family. _Cocktail Codex_[^codex], the book
the six roots come from, has only six families and files Collins, Mule,
Mojito, French 75, Whiskey Sour, Southside and Mai Tai under the
Daiquiri; Margarita, Cosmopolitan and Last Word under the Sidecar;
Negroni and Manhattan under the Martini; Sazerac and Mint Julep under
the Old-Fashioned; Aperol Spritz and Bloody Mary under the Highball; Piña
Colada and Eggnog under the Flip. Five of our nominal ratios agreed with
the book's recipes; the Sidecar (2 : 3/4 : 3/4) did not: the book's is
1 1/2 : 1 : 3/4 oz.

## Decision

1. Keep six roots; add no seventh. #114 is superseded.
2. Each template gets optional slots (`optional: true`) for what the book
   treats as variation; the bands are chosen here and each slot's note
   says so ([templates](../templates.md#ratios) lists them).
3. The Sidecar's nominal ratio is the book's: liqueur 1.33 and acid 1.0
   parts; its band keeps the sourced lower edges (0.25, 0.38) and takes
   twice the nominal as upper edges (2.67, 2.0); its usual ranges are
   recomputed ([balance](../balance.md#usual-ranges-per-template)).
4. The `source` of every template names the book and chapter. Evidence
   stays `assumption`: the schema has one field per template and cannot
   say "nominal read, band chosen"; the note says what was read.
5. The Highball's sour slot ends at 0.37, below the Daiquiri's sour
   minimum 0.38, so a drink with a full sour part and soda goes to the
   Daiquiri, as the book files it.
6. Drinks with no base-role line (Spritz) stay unmatched: matching
   measures against the base slot, which is general code in materia.
7. Beyond the first plan: a Sidecar mixer slot (Cosmopolitan) and a Flip
   accent slot (Eggnog's salt), with bands chosen here, to follow the
   book's filing of those two drinks.

## Consequences

- 315 of 635 seed drinks match a template (158 before); 320 do not, 73 of
  them for lack of a base line. Measured in
  [templates](../templates.md#seed-measurement).
- Where two templates fit (37 specs, Daiquiri and Sidecar), the offset
  decides; the id rule is not used.
- Drinks without a sweet line (Moscow Mule, Paloma, Bloody Mary) still
  fail the Daiquiri's required sweet slot; an optional sweet slot was
  measured (+4 matches) and not adopted, because it moves Bloody Mary to
  the Daiquiri against the book. Open for the owner.
- The editor adds lines for required slots only; the templates list shows
  the optional roles on a second line.
- Every number except the nominal ratios stays an assumption.
