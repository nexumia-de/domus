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
[html](mockups/editor.html), [360](screenshots/mockups/editor-360x720.png),
[1200](screenshots/mockups/editor-1200x800.png).

- **Purpose.** Write or change a spec quickly with units as typed, and
  see the balance while typing.
- **Content.** Top bar: back, "Edit {name}" or "New Drink", a "Draft
  kept" tag once something is typed. Fields in this order: Name,
  Template (a picker, optional; choosing one adds its required slots as
  empty lines with their role, never optional slots, never overwrites typed lines), **Ingredients**
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

## As built (#25)

Code: `packages/app/src/screens/editor/` (pure modules `amount-entry`,
`draft`, `check`, `build-spec`, `ingredient-form`, `picker-vm`,
`view-model`, `save`; the session and its actions `session`, `actions`,
`sheet-actions`, `commit`; the page `page`, `page-fields`, `index`) and the
components `line-row`, `amount-input`, `reorder`, `ingredient-picker`,
`ingredient-form-sheet`. Screenshots: [new drink](screenshots/editor-daiquiri-360x720.png),
[error](screenshots/editor-error-360x720.png),
[restored draft](screenshots/editor-restored-360x720.png),
[ingredient form](screenshots/editor-ingredient-form-360x720.png),
[prepared](screenshots/editor-prepared-360x720.png),
[copy of a built-in drink](screenshots/editor-copy-360x720.png) and the same
at 1200 x 800.

What differs from the text above, and why:

- **Bottom bar: Discard and Save**, not Cancel and Save Version. The back
  button is Cancel (it keeps the draft, no confirm). **Discard** returns to
  the saved drink at once and offers Undo for the session. The button reads
  **Save**; the sheet it opens is titled Save Version
  ([as built #26](#as-built-26)).
- **One save function.** Everything goes through `saveDraft` and a
  `SpecSaver` (`save.ts`). #25 replaced the stored spec in place; since #26
  the saver appends a version and rewrites `prepared.specId`
  ([as built #26](#as-built-26)).
- **Edit on a built-in drink** opens the user's own copy (not stored until
  Save): new user ids, version 1, `parentId` the built-in spec's id (what #27
  shows as the family), the built-in `source` kept. The built-in drink is never
  written. The spec screen has an **Edit** button.
- **Amount field.** The text keeps what was typed; the unit selector is the
  fallback for a bare number and follows a unit typed in the text. A stored
  line that was not touched keeps its stored number and unit exactly (a
  line stored as 22.5 ml is never rewritten through a display unit). A
  range (`1-2 dashes`) gives `amountMax`. The "= 22.5 ml" line says "about"
  for convention units (dashes) and "counted, no volume of its own" for
  counted units. A `top` line has a volume field (`topMl`) instead of an amount.
  Errors appear after the field is left, in words, with the grammar.
- **Template.** Choosing one adds empty lines with the roles no line has yet
  and fills an empty method and glass from the template; typed lines are
  never changed. Without a choice the engine's suggestion is offered live
  ("Use Daiquiri"); ignoring it changes nothing.
- **Role per line** defaults from the ingredient; the line menu has Role
  (from the ingredient or one of the eight).
- **Reorder** by a drag handle (44 px, pointer events, touch included), by the
  arrow keys on the handle and by Move Up and Move Down in the line menu.
- **Draft.** Kept in the local store (store `drafts`, key `draft/<address
id>` or `draft/new`, written 300 ms after the last change and when the page
  is hidden), restored on return with the notice "Your unsaved changes were
  restored" and **Discard Draft**. A draft is not an entity: not exported, not
  counted for the backup reminder. The "Draft kept" tag shows while the draft
  differs from the saved drink. **Save order**: Save first writes the draft
  (awaited), then the version (and for a prepared ingredient its record), and
  deletes the draft last; while a save runs no late debounce write touches
  the draft. A save cut off anywhere (reload, a killed app) therefore leaves
  the saved version or the draft, offered with the restore notice; a draft
  left by a save that did commit is offered once more and Discard Draft
  removes it. Test: `e2e/save-interrupt.mjs`.
- **Sheets** (`?sheet=pick`, `?sheet=ingredient`) are history entries on a
  phone and a replace on a wide screen, like the batch sheet. The ingredient
  form replaces the picker (one entry), so Back from the form returns to the
  editor.
- **Picker.** Search over seed and user ingredients (the swap sheet's search,
  shared in `spec/ingredient-search.ts`), rows with path and the tags
  Prepared and User, Enter picks the first row, browse by category with a
  chevron, recently used (from the user's drinks), a Create row. A user
  ingredient has an Edit button.
- **Ingredient form.** Name, where it belongs (categories and types, a
  select), role, ABV, sugar, acid; empty is stored as absent; numbers are
  checked (ABV and acid 0 to 100, sugar 0 or more, decimal comma accepted);
  names that exist are refused. Level is `product`. Edit shows how many
  drinks use it and **Delete Ingredient**.
- **Prepared ingredient.** The toggle on the editor adds Yield (a volume;
  a mass yield is refused), Shelf life in days, where it belongs and its role,
  and the computed ABV, sugar and acid from the engine (`computePrepared`,
  worked out live; the figures match the engine's vector
  `prepared-syrup-1-1`). Saving writes the spec first and the ingredient
  record second (no shared transaction across stores). Every drink that uses
  it is computed from the spec each time (the browse model now passes the
  prepared specs to the balance), so editing it updates them all. The recipe
  of a prepared ingredient is not listed as a drink; it opens from the line
  link "Prepared: ..." on the spec screen.
- **Deletes** (**Delete Drink** at the end of the editor, **Delete Ingredient**
  in the form) act at once with Undo, and are **refused** when something
  uses them, in a calm message naming the users ("Limed Syrup is still used by
  Syrup Test. Remove it there first, then delete it.").
- **Keyboard.** The editor has room for `--kb-inset` below its last field and the
  sheets stay above it; nothing is focused when the screen opens except
  after Add Ingredient, which opens the picker with its search focused.

Built after as [#89](https://github.com/nexumia-de/mixtura/issues/89): see
[as built #89](#as-built-89). The Save sheet and versions are built in #26.

## As built (#89)

- **Add Substitute** in the line menu opens the ingredient picker titled
  "Substitute for {name}" (Create works as for a line). The chosen
  ingredient is listed under the line as "or {name}" with an optional own
  amount field (the amount grammar; a number needs a unit, a range is
  refused, empty means no amount) and **Remove** (acts at once, Undo in the
  toast). The same ingredient twice, or the line's own ingredient, is
  refused in a toast. A substitute whose amount is not understood marks the
  line and keeps Save disabled with the reason in words. Substitutes already
  stored are read into the draft and written back unchanged while untouched
  (number and unit exactly as stored). They are what the engine reads as
  `listed-substitute` ([what the stock allows](makeable.md)); the stock panel
  on the spec screen shows "Substitute: Bourbon Whiskey for Light Rum".
- **Picker.** A row of an ingredient with a stock record that says it is at
  hand shows a check before its name and the words "In stock" for screen
  readers; derived from the stock records, nothing is stored.
- **Prepared ingredient.** Next to the shelf life in days a free text
  **How to keep it** (`storage` on the ingredient record, optional, not
  inherited, never read by the engine; the app proposes no text and no time).
  The ingredient schema gained the optional field without a format bump, as
  for `note` and `statusLog` in #26.
- **Code.** `screens/editor/` (`check.ts` substitutes, `actions.ts`,
  `sheet-actions.ts`), `components/line-row.ts`, `components/ingredient-picker.ts`;
  tests `test/editor-substitutes.test.ts`, `e2e/substitutes.mjs` (screenshots
  `substitutes-*`).

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
  **Shelf life** (days, a number the user enters, and a storage text in the user's words) and the
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

Built by [#26](https://github.com/nexumia-de/mixtura/issues/26); see
[as built](#as-built-26). A small sheet over the editor.

- **Purpose.** Record why a version exists in one line.
- **Content.** A **Note** field ("What changed and why", one line, not
  required), **Save Version** and **Save Without Note** (as near as the
  other), close. The sheet says which version number this becomes.
- **Actions.** Escape or the backdrop closes it and saves nothing.
- **States.** _First save, a riff, a change of status alone_: no sheet.
  _Nothing changed_: no write, the toast "Nothing has changed, so nothing was
  saved." _Error, offline_: as the editor.
- **Data.** Stored: a new spec record with `version` + 1, `parentId` the
  previous version, `note`. Derived: the newest version of the lineage.

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
- **Batch for a volume and for many drinks**
  ([#80](https://github.com/nexumia-de/mixtura/issues/80)). The sheet
  starts with **Make a batch for**: **Drinks** or **Volume** (two-way
  switch) and one field with **Set** (Enter sets too). _Drinks_: a whole
  number from 1 to 200 (`servings=n`; the stepper on the spec still stops at
  12, its minus works from any number). _Volume_: ml, or a unit (`1 l`,
  `1,5 l`, `32 oz`; litres are read by the app because the engine's unit
  table has none), above 0 and up to 100 l, `volume=<ml>` in the address
  beside `sheet=batch` (dropped when the sheet closes). The servings are the
  volume divided by the pour of one drink (the engine's `prediluted` for one
  serving), a fraction, and go to `prediluted` as such. The sheet is titled
  "Batch of 1000 ml" and has a **Servings** row ("7.6 of 131 ml"); the
  other rows are those of the batch as made, so Total volume is near the
  target, not equal ("999 ml"). Switching to Volume starts from today's
  batch (drinks times one pour, to 10 ml); switching back keeps the number of
  drinks. Less than one pour says "That is less than one serving. One drink
  is 131 ml; enter at least that." (half a millilitre of slack, so the shown
  pour is accepted). A wrong entry is said under the field, the typed text
  stays and the address does not change. Nothing is stored. Unit-tested in
  `test/spec-batch-target.test.ts`; `e2e/browse.mjs` walks it.
- **Swap mode** already worked before #80 (the stepper and the sheet
  take the swapped lines, `e2e/swap.mjs`); the sheet's volume mode works
  there the same way ([test](../packages/app/test/spec-batch-target.test.ts)).

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
`#/drinks/<id>/versions`, pushed from the **Versions (n)** button under the
spec's lines.

- **Purpose.** See how a drink developed and compare any two versions.
- **Content.** A list, newest first: version number, date, status, the
  note, a short summary against the version before ("1 change") and the
  three balance figures as plain numbers with their position words, then the
  status log with dates. Choosing two (check boxes, at most two) enables
  **Compare** in the bottom bar. The **diff** shows line by line: added,
  removed, changed (amount before and after in the display unit, another
  ingredient named on both sides), with the words Added, Removed, Changed
  and a shape (`+`, `−`, `~`), then name, template, method, glass, garnish
  and notes changes, then the balance panel of the newer version with Try a
  Swap's "Was ... now ... (+1.4 points)" on every figure.
- **Actions.** Tap a version: that version's spec (`#/drinks/<id>/v/<n>`,
  read-only, own figures, with **Restore as New Version**, which copies it
  forward as the next version with the note "Restored from vN" and keeps the
  history; on the newest version the button is Edit).
- **States.** _Only one version_: "This is the first version." _Identical
  versions_: "No differences." _Error, offline_: as the editor.
- **Data.** Stored: the versions. Derived: the diff and the figures.

## As built (#26)

Code: engine `packages/engine/src/drink-specs/` (`diffSpecs`, on materia's `diffVersions`), store
`store/versions.ts` (`appendVersion`, `setStatus`, `restoreVersion`), the
editor's `save.ts` (`versionSaver`), `commit.ts` and `components/save-sheet.ts`,
`screens/versions/` (`diff-vm`, `list-vm`, `list-view`, `diff-view`,
`version-view`, `restore`, `strings`), the status filter in `browse/filters.ts`.
Screenshots: [list](screenshots/versions-list-360x720.png),
[diff](screenshots/versions-diff-360x720.png),
[one version](screenshots/versions-version-360x720.png),
[save sheet](screenshots/versions-save-sheet-360x720.png),
[status filter](screenshots/versions-status-filter-360x720.png) and the same at 1200 x 800.

What differs from the issue and the text above, and why:

- **Versions are records in the specs store**, one per version with its own
  id, as the [data model](data-model.md#spec) already said; there is no
  `spec-versions` store (the same decision as in [store](store.md)), so there
  is no schema migration: existing specs already are version 1.
  `note` and `statusLog` are new optional fields.
- **Diff in the engine, figures in the app.** `diffSpecs` is pure and has
  vectors in `vectors/specs/`; the change of the figures reuses the app's
  `swapDelta` and `balanceVM`, so Try a Swap and the diff read alike.
- **Matching.** Lines are matched (identical, then same ingredient, then same
  role), so a different order is no difference and a replaced ingredient in
  the same role is one changed line.
- **Save.** Saving a changed drink opens the note sheet; a first save does
  not. A save with nothing changed writes nothing. The sheet is not a history
  entry (Back leaves the editor and keeps the draft). There is no "Replace
  version" and no deleting a single version: versions are only added.
- **Status** is set in the editor's Status field. A change of status alone
  sets it on the newest record and appends `{status, at}` to its `statusLog`;
  it is not a new version. A save that changes the content carries the status
  and the log forward. The drinks list gains a **Status** filter
  (`?status=draft|on-menu|retired`); retired drinks are hidden unless the
  filter asks for them, and stay out of "makeable". Part of
  [#75](https://github.com/nexumia-de/mixtura/issues/75); the rest of it stays open.
- **Routes** are `#/drinks/<id>/versions` (`?pick=1,3` the chosen versions,
  `?a=1&b=3` the diff) and `#/drinks/<id>/v/<n>`, not `/history`.
- **`prepared.specId`** is rewritten to the new id on every save and restore,
  for every prepared ingredient made from any version of the lineage.
- **Backup counter.** Each written record counts, so a version save is one
  change (plus one per prepared ingredient rewritten) and a status change one.

# Riff and family

Built by [#27](https://github.com/nexumia-de/mixtura/issues/27). Riff is
the action **Riff** on the spec screen, **Save as Riff** in swap mode and in
the family view; the family view is `#/drinks/<id>/family`, from the
**Family** button under the spec's lines.

- **Purpose.** Make a variation of any drink while keeping the link to
  the parent, and see a drink's relatives.
- **Content (riff).** Riff opens the editor (`#/drinks/<id>/riff`) with a copy
  of the spec, named "{name} riff", status Draft, as a new lineage whose
  first version has `parentId` the source spec and the note "Riff on {name}
  v{n}". The spec screen shows the tag "Riff of {name}". A built-in drink can
  be riffed like any other and is never written. With a swap in the address
  (`riff?swap=...`) the riff starts from the swapped lines.
- **Content (family).** The parent chain upward (up to the built-in
  drink), the drink ("This drink"), its riffs below, then the other riffs of
  its parent. Each entry has name, template and ABV, and, when it has a
  parent, one line with what differs from the parent version it was made
  from ("One change: Simple Syrup, 22.5 ml to 15 ml") and the figures moved
  ("ABV +1.4 points, Sugar −2.9 g/100 ml"), and its first note.
- **Actions.** Tap an entry: that drink. Bottom bar: Riff.
- **States.** _No parent, no riffs_: "No related drinks yet." with Riff.
  _No riffs_: "No riffs yet." _Parent not in the data_: "Parent not
  available", the riff keeps its note. _Loop_ (imported data only): a banner
  names the drinks and the chain stops. _Error, offline_: as the editor.
- **Data.** Stored: `parentId` of the first version, `lineageId`. Derived:
  the tree, the difference lines and all figures.

## As built (#27)

Code: materia `specs/family.ts` (`buildFamily`, `findFamilyCycles`) and
`specs/riff-change.ts` (`summariseRiff`), `screens/family/`,
`riffDraft` in `editor/draft.ts`, the riff route in `editor/index.ts`.
Screenshots: [family](screenshots/versions-family-360x720.png),
[chain](screenshots/versions-family-chain-360x720.png),
[spec with Riff](screenshots/versions-spec-links-360x720.png) and the same at 1200 x 800.

- **The parent link** is the first version's `parentId`, a spec id (so it
  names the parent's version); a later version's `parentId` is the version
  before it, as the data model says. The family is per lineage.
- **Built-in riffs.** The seed already links some drinks to a parent, so a
  built-in drink's family lists those as its riffs and siblings.
- **A different name is not a change** of a riff (every riff has one).
- **No riff sheet for the name**: the name is the editor's first field.
- **Deleting** a drink with riffs is refused by the `referenced` rule
  already built (message names the riffs); an imported riff whose parent is
  absent shows "Parent not available". Import refuses a file in which drinks
  are riffs of each other, naming them (`cycleProblems` in `exchange/parse.ts`);
  the editor cannot create a loop.

## As built (#142)

Share one drink by link. Code: `screens/spec/share.ts`,
`components/share-sheet.ts`, `share/` (`link.ts`, `send.ts`, `open.ts`,
`watch.ts`, `strings.ts`), `screens/share/`, `components/import-preview.ts`;
file and link format in [export format](export-format.md#share-file).

- **Share on the spec screen.** A header icon button (tooltip and accessible
  name "Share {name} by link") for a drink of the user's own. A built-in drink
  has nothing to send, so it has no button, and a hand-typed `?sheet=share`
  opens nothing (the simpler of the two options).
- **The sheet** (`?sheet=share`, so Back closes it like the batch sheet): the
  drink's name, a line saying the drink is inside the link and nothing is
  uploaded, the link in a read-only field that is always there (select-all
  on focus; the fallback when the clipboard is blocked), **Copy Link** with the
  visible note "Link copied" (or the instruction to copy by hand), and
  **Send...** where `navigator.share` exists. The link is made again each
  time the sheet opens. Too big: "This drink is too big for a link" with a
  link to Data. No QR code (comes with #136).
- **Opening a link** shows the import preview component, titled "Somebody sent
  you {name}", with Add Drink and Not Now; no Replace. A link whose records
  are all in already says so and disables Add Drink. After Add Drink the
  drink opens; the toast offers Undo as for a file import.
- **The preview component** moved from `settings/data.ts` into
  `components/import-preview.ts`; the Data screen uses it unchanged.
- **Not done:** the name of the drink is found as the one version no other
  version in the file is made from (none shown when that is ambiguous).
