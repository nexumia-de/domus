---
type: Specification
title: Screens - own specs
description: Spec editor, ingredient picker, prepared ingredients, save with note, versions and diff, riffs and family view of Mixtura, each with purpose, content, actions, empty, error and offline states and what is stored versus derived.
tags: [behaviour, screens, editor, versions, riffs]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mockups
    title: 'docs/mockups/editor.html'
---

# Screens: own specs

Part of [behaviour](behaviour.md); look and copy rules in
[design](design.md); texts in [UI strings](ui-strings.md). Format of
each entry as in [browse and read](screens-browse.md). Goal 4.

# Spec editor

Built by [#25](https://github.com/nexumia-de/mixtura/issues/25). URL
`#/drinks/<id>/edit`, new drink `#/drinks/new`; pushed. Mock-up:
[html](mockups/editor.html), [360](screenshots/editor-360x720.png),
[1200](screenshots/editor-1200x800.png).

- **Purpose.** Write or change a spec quickly with units as typed, and
  see the balance while typing.
- **Content.** Top bar: back, "Edit {name}" or "New Drink", a "Draft
  kept" tag once something is typed. Fields in this order: Name,
  Template (a picker, optional; choosing one adds its slots as empty
  lines with their role, never overwrites typed lines), **Ingredients**
  (one card per line: ingredient field with the role tag, amount field,
  unit picker, a line menu), Add Ingredient, Method, Glass, Garnish,
  Notes, Status (Draft, On menu, Retired). On desktop the ingredients
  are the left column and the rest the right. A **compact balance bar**
  above the bottom bar shows ABV, sugar and acid with their position
  words and updates on each change; tapping it opens the full panel as a
  sheet.
- **Amount field.** Accepts the grammar of
  [units](units.md#parsing-grammar) (`3/4 oz`, `1½`, `45ml`, `2 dashes`,
  `a splash`); the unit picker is optional when the text carries the
  unit. Under the field: "= 22.5 ml" (what was understood), or the
  reason it was not understood. A range ("1-2 dashes") is accepted
  (`amountMax`). The entered text is kept and shown as entered
  ([display rules](units.md#display-and-rounding)).
- **Line menu** (a 44 px button per line): Move up, Move down, Optional
  (toggle), Add substitute, Add note, Change role, Remove. Remove acts
  at once with Undo.
- **Actions.** Bottom bar: **Cancel** and **Save Version**. Cancel keeps
  the draft (banner on next open, Discard Draft in the overflow menu);
  Save Version opens [save and notes](#save-version-and-notes) when the
  drink already has versions, saves directly for a new drink. Escape on
  desktop is Cancel. Nothing is focused on open.
- **States.** _Empty, new drink_: one empty line is not added; the page
  shows the name field, the template picker and Add Ingredient; Save
  Version is disabled until the name and one valid line exist, with the
  reason in text under the button ("Add a name and one ingredient").
  _Invalid line_: the amount field is marked with text, the other lines
  stay valid, the balance preview says which line is not counted.
  _Error_: a failed save keeps everything on screen and shows the
  reason in a banner with Try Again; the draft is intact.
  _Offline_: unchanged.
- **Data.** Stored: the spec (all fields of the
  [data model](data-model.md#spec)) and the draft. Derived: balance
  preview, "= 22.5 ml" text, role suggestions from the ingredient.

# Ingredient picker

Built by [#25](https://github.com/nexumia-de/mixtura/issues/25). A sheet
on a phone, a popover on desktop, opened from an ingredient field.

- **Purpose.** Choose an ingredient from the tree (category, type,
  product) fast, by typing.
- **Content.** A search field (focused on open, the one place where it is,
  because the user tapped for it), results as rows: name, the path in
  the tree as muted text ("Spirits › Rum"), a check if in stock, a tag
  "Prepared" for prepared ingredients and "User" for the user's own.
  Below the results a row "Create {typed text}" (adds a user ingredient
  with just a name, properties can be added later in the ingredient's
  own form: parent in the tree, role, ABV, sugar, acid).
- **Actions.** Tap a row: chosen, sheet closes. Browse the tree by tapping
  a category; back goes up one level. Create runs the quick form
  (name, parent, role; the rest optional).
- **States.** _No hit_: "No ingredient matches" with the Create row.
  _Empty search_: recently used and the tree's top level. _Error_ and
  _offline_: as the editor.
- **Data.** Ingredients stored (seed read-only, user's own writable);
  recently used derived from the specs.

# Prepared ingredient

Built by [#25](https://github.com/nexumia-de/mixtura/issues/25). A
prepared ingredient is a spec whose result is an ingredient
([data model](data-model.md#prepared-ingredient)): the same editor with
two extra fields.

- **Purpose.** Write down a syrup, infusion or batch once and use it in
  other specs with computed properties.
- **Content.** The editor, plus **Yield** (an amount and unit) and
  **Shelf life** (days and storage, a number the user enters) and the
  computed properties (ABV, sugar, acid per 100 ml) as read-only figures
  with their source ("computed from the lines"). Entered by mass or
  volume ([balance](balance.md#prepared-ingredients-by-mass)).
- **Actions.** As the editor; New Prepared Ingredient from the Drinks
  new menu and from the ingredient picker's Create row.
- **States.** _Yield missing_: properties show "No figure" and the
  reason. _Used by specs_: a line under the title lists how many specs
  use it ("Used in 4 drinks"); deleting it with Undo is allowed and the
  using lines show "Unknown ingredient" until restored.
  _Error, offline_: as the editor.
- **Data.** Stored: spec fields, yield, shelf life. Derived:
  properties and the count of uses.

# Save version and notes

Built by [#26](https://github.com/nexumia-de/mixtura/issues/26). A small
sheet over the editor and over swap mode.

- **Purpose.** Record why a version exists in one line.
- **Content.** A **Note** text field ("What changed and why", not
  required), a choice of **Save as a new version** (default) or **Replace
  version 3** (only offered for a draft), status.
- **Actions.** **Save** (bottom bar), Cancel. The new version gets
  `version` + 1 in the same lineage and `parentId` of the previous one;
  older versions stay readable.
- **States.** _First save_: no sheet, version 1. _Error, offline_: as
  the editor.
- **Data.** Stored: the new spec record with the note. Derived: the
  newest version of the lineage.

# Servings and batch

Built by [#52](https://github.com/nexumia-de/mixtura/issues/52) on the
spec screen (`#/drinks/<id>`). Nothing here is stored: the batch is derived
from the spec every time, the number of drinks is in the address.

```
Ingredients                       Batch of 4 drinks            [x]
[-]  4 drinks  [+]     [Batch]    Mix
 240 ml  Light Rum                 240 ml  Light Rum
  90 ml  Lime juice                 90 ml  Lime juice
  90 ml  Simple Syrup               90 ml  Simple Syrup
                                  Water to add      105 ml
                                  Total volume      525 ml
                                  Pour per serving  131 ml
                                  Yield             4 servings
                                  Shelf life        Unknown
                                                    No shelf life stored for ...
                                  Water is the dilution of shaking: 25 % of
                                  the mix (basis). One drink is poured from
                                  the batch as it is.
```

- **Stepper.** 1 to 12 drinks in the ingredients card ("1 drink", "4
  drinks"; buttons "One fewer drink", "One more drink", 44 px). The number
  is `?servings=n` of the address (1 leaves it out), so a reload and Back
  keep it. Every amount, ranges and substitutes included, is multiplied by
  n in its **stored unit** and then shown by the display rules
  ([units](units.md#display-and-rounding)): 3 × 22.5 ml is 67.5 ml. A
  counted amount is rounded **up** to whole units, never below 1 (engine
  `roundCount`, the batch rule); one drink keeps `1½ whole` as entered.
  The figures of the balance panel stay those of one drink and the panel
  says so ("The figures are for one drink.") from 2 drinks. Sums use
  unrounded values.
- **Batch sheet.** The **Batch** button opens a sheet (`?sheet=batch`; a
  history entry on a phone, so Back closes it, a replace on a wide screen)
  with the engine's `prediluted` for the chosen drinks: the amounts to
  mix, **Water to add** (whole ml), **Total volume**, **Pour per
  serving**, **Yield** and **Shelf life**. Shelf life is **Unknown**
  unless every ingredient has `shelfLifeDays` in the user's data (the seed
  has none), and then names the ingredient that sets it; the missing ones
  are named. The sheet states the dilution basis: the method, the water
  fraction and its evidence ("assumption, unverified" while it is one).
- **Lines.** A `top` is not batched: "Poured at the glass, not in the
  batch: Club soda." A counted line without a known volume is in the mix
  (so the bar knows how many to prepare) but marked "not in the totals"
  (`roundingError` is `null`) and listed under "Not in the totals". A
  rounding of 0.5 ml or more is said per line ("rounded by +1.0 ml").
- **States.** A drink with no method the model knows has no batch: "A
  batch needs a method the model knows. This drink has none." Not found,
  error and offline as the spec screen.
- **Swap mode.** Stepper and batch work in
  [swap mode](screens-browse.md#as-built-20): the swap is a parameter of the
  same address and the batch is made from the swapped lines.
- **Not built.** A batch for a **target volume** instead of a number of
  drinks (issue 52 names it) and more than 12 drinks are follow-up work
  ([#80](https://github.com/nexumia-de/mixtura/issues/80)).

# What-if volume of a top

Built by [#74](https://github.com/nexumia-de/mixtura/issues/74) on the
spec screen; the editor for the user's own specs (#25) stores the same
value as `lines[].topMl`.

- **Purpose.** A `top` line (club soda, tonic) has no volume, so the
  figures leave it out and say so. The user can try a volume and see the
  figures with it.
- **Content.** A `top` line without a volume shows **Add Volume**. The
  field takes ml or a unit ("90", "3 oz", decimal comma accepted; above 0
  and up to 2000 ml; a non-volume text is refused with the reason). Set
  counts the volume: the line reads "Top, 90 ml", the note "What-if, not
  saved" and **Change** and **Clear** appear; the balance panel, the
  volume line and the not-counted list follow. A line with a stored
  `topMl` (a user's spec) shows "Top, 90 ml" and no what-if controls.
- **Temporary.** The what-if volume is screen state: not stored, not
  exported, gone on reload or when another drink is opened. A seed drink
  stays read-only.
- **Not counted in the figures.** Every entry of `excluded` is listed in
  the balance panel under "The figures above leave out these lines:" as
  `{amount as entered} {ingredient}: {reason}`, for example "Top Club
  soda: no volume given" and "6 sprigs Mint: no volume known per unit".
  `excluded` empty means every line is counted and nothing is listed.
  Counted units show as entered (`1 whole`, `6 sprigs`).
- **Later.** Entering `unitVolumes` per ingredient is optional future
  work (issue #74, last task); it belongs with the ingredient editor.

# Versions and diff

Versions and status (Draft, On menu, Retired) belong to the user's own
specs. A built-in (seed) drink has neither on screen: its spec screen
shows the tag **Built-in** instead of "Version 1" and "Draft", and the
Versions screen is offered only for the user's own drinks; Edit copies
it into the user's drinks as version 1 ([#77](https://github.com/nexumia-de/mixtura/issues/77)).

Built by [#26](https://github.com/nexumia-de/mixtura/issues/26). URL
`#/drinks/<id>/versions`, pushed from the spec's overflow menu.

- **Purpose.** See how a drink developed and compare any two versions.
- **Content.** A list, newest first: version number, date, status, the
  note, and the three balance figures as plain numbers with their
  position words. Choosing two (check boxes, at most two) enables
  **Compare** in the bottom bar. The **diff** shows line by line:
  added, removed, changed (amount before and after in the display unit),
  with the words Added, Removed, Changed (a symbol and a text, never
  colour alone), then method, glass, garnish and note changes, then the
  balance figures of both versions side by side.
- **Actions.** Tap a version: that version's spec screen
  (`…/v/<n>`, read-only, with **Restore as New Version**, which copies
  it forward and keeps the history). Compare. Delete a version (overflow
  per row, with Undo; the newest version cannot be deleted while it is
  the only one).
- **States.** _Only one version_: "This is the first version." with
  Edit. _Identical versions_: "No differences." _Error, offline_: as the
  editor.
- **Data.** Stored: the versions. Derived: the diff and the figures.

# Riff and family

Built by [#27](https://github.com/nexumia-de/mixtura/issues/27). Riff is
the action Riff on the spec screen and in swap mode; the family view is
`#/drinks/<id>/family`, pushed from the spec's overflow menu.

- **Purpose.** Make a variation of any drink while keeping the link to
  the parent, and see a drink's relatives.
- **Content (riff).** Tapping Riff asks for a name in a small sheet
  (suggested "{name} riff"), then opens the editor with a copy of the
  spec as version 1 of a new lineage, `parentId` the source spec, tag
  "Riff of {name}" on the spec screen. A seed drink can be riffed like
  any other.
- **Content (family).** A tree: the parent chain upward (up to the
  seed), the drink itself in the middle (marked "This drink"), the
  riffs below it, each row as in the drinks list (name, template,
  ABV, makeable) plus the **difference to the parent**: the changed
  lines in one line of text ("Lime juice to Lemon juice; Syrup 22.5
  to 15 ml"). Rows are sorted by creation.
- **Actions.** Tap a row: its spec. Compare with parent: the diff of
  [versions](#versions-and-diff) across lineages. Bottom bar: Riff.
- **States.** _No parent, no riffs_: "No related drinks yet." with Riff.
  _Parent deleted_: the row reads "Parent not available" and the chain
  stops there. _Error, offline_: as the editor.
- **Data.** Stored: `parentId` and `lineageId` on specs. Derived: the
  tree, the difference line and all figures.
