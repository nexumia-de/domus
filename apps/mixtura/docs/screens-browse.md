---
type: Specification
title: Screens - browse and read
description: Templates overview, template detail, drinks list, filters, spec screen with balance panel and swap mode of Mixtura, each with purpose, content, actions, empty, error and offline states and what is stored versus derived.
tags: [behaviour, screens, browse, spec, swap]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mockups
    title: 'docs/mockups/drinks-list.html, filters.html, spec.html, swap.html'
---

# Screens: browse and read

Part of [behaviour](behaviour.md); look, tokens and copy rules in
[design](design.md); texts in [UI strings](ui-strings.md). Every entry
lists: **Purpose**, **Content**, **Actions**, **States** (empty, error,
offline) and **Data** (stored versus derived,
[data model](data-model.md#stored-versus-derived)). Offline is stated
each time; it is always the same: the app is local, so the screen
works unchanged.

# Templates overview

Built by [#18](https://github.com/nexumia-de/mixtura/issues/18).
Destination **Templates**, URL `#/templates`.

- **Purpose.** Show the drink families and what each requires, as the
  bartender's mental map: six root templates and their variants.
- **Content.** A list grouped by root template (Old-Fashioned, Martini,
  Daiquiri, Sidecar, Highball, Flip), variants indented under their
  parent (`parentId`). Row: name, the required slots as a role line ("Base, Sour,
  Sweet"), a second line "Optional: …" with the roles that only optional slots
  add (none for a template without them), method, number of drinks that follow it, and a tag "User" for
  the user's own templates.
- **Actions.** Tap a row: template detail. Search field at the top
  filters by name. No create or edit in the first versions (user
  templates are goal 4 work and outside these screens; the data model
  allows them).
- **States.** _Empty_: cannot occur (seed templates are part of the app);
  if the seed failed to load: "Templates could not be loaded", Try Again.
  _Search without hit_: "No template matches" with Clear Search.
  _Error_: store unreadable, see [general failure](behaviour.md#failure-and-offline-in-general).
  _Offline_: unchanged.
- **Data.** Templates stored (seed, read-only; the user's own in the
  local store). Count of drinks per template derived.

# Template detail

Built by [#18](https://github.com/nexumia-de/mixtura/issues/18).
URL `#/templates/<id>`; pushed on Templates.

- **Purpose.** Read what a template is: slots with ratio ranges, method,
  usual ranges, and the drinks that follow it.
- **Content.** Title; slots as a table (role, parts as a range, optional
  marked "optional", then the slot's note; the optional slots say that their
  band is chosen here, not from a source); method and glass; the **usual ranges** (ABV, sugar,
  acid after dilution) drawn as bands with the numbers and the source
  line; notes; the list of drinks that follow the template (same rows
  as the drinks list).
- **Actions.** Back; tap a drink row: spec. Bottom bar: **New Drink**
  (opens the editor with this template, [editor](screens-specs.md#spec-editor)).
  Overflow: "How the ranges are computed" (opens
  [balance](balance.md#usual-ranges-per-template) text in About's
  notes).
- **States.** _Template without a verified range_: shows "No usual
  range for this template" instead of the bands (the data model allows
  `usual` to be absent). _No drinks follow it_: "No drinks follow this
  template yet." with the New Drink button. _Not found_ (deep link):
  status page. _Offline_: unchanged.
- **Data.** Template stored; the drinks that follow it derived from
  `templateId`; the ranges are stored with their source.

# Drinks list

Built by [#18](https://github.com/nexumia-de/mixtura/issues/18); makeable
part [#33](https://github.com/nexumia-de/mixtura/issues/33). Destination
**Drinks**, URL `#/drinks`. Mock-up: [html](mockups/drinks-list.html),
[360](screenshots/mockups/drinks-list-360x720.png),
[1200](screenshots/mockups/drinks-list-1200x800.png).

- **Purpose.** Find a drink in a second and see whether it can be made.
- **Content.** Title and New Drink (plus) in the top bar; a search field
  (name, ingredient, tag; as typed, results update on each key) and a
  Filters button with the count of active filters; active filters as
  chips below (each removable with one tap); the list. Row: name,
  template and ABV after dilution on the second line, and at the end a
  tag: **Makeable** with a check, or "Missing X" (one missing
  ingredient named; "Missing 3" when more). Sorted by name; the sort
  can be changed in the overflow menu (Name, Recently changed,
  Template). Retired drinks are hidden unless the status filter says so.
  On desktop the selected drink's spec is the detail pane.
- **Actions.** Tap a row: spec. New Drink: editor with no template.
  Filters: [filters sheet](#filters). Search clears with one tap.
  Keyboard: `/` focuses search, `n` starts a new drink; arrow keys move
  between the rows ([as built](#as-built-75)).
- **States.** _Empty, no drinks at all_: cannot occur with seed data; if
  it does, "No drinks yet" with New Drink. _No hit_: "No drink matches
  the search and filters." with Clear Filters (the chips stay visible).
  _Makeable filter with an empty stock_: "Nothing in stock yet. Mark what
  you have to see what you can make." with a button to Stock.
  _Error_: store unreadable, see
  [general failure](behaviour.md#failure-and-offline-in-general).
  _Offline_: unchanged.
- **Data.** Specs stored (seed read-only, user's own writable). Shown
  ABV, makeable and missing ingredient derived (engine,
  [data model](data-model.md#stored-versus-derived)), never stored. The
  list shows the newest version of each lineage (derived).

# Filters

Built by [#18](https://github.com/nexumia-de/mixtura/issues/18)
(template, status, search), [#33](https://github.com/nexumia-de/mixtura/issues/33)
(availability), [#37](https://github.com/nexumia-de/mixtura/issues/37)
(alcohol). A sheet over the drinks list on a phone, a popover from the
Filters button on desktop. Mock-up: [html](mockups/filters.html),
[360](screenshots/mockups/filters-360x720.png),
[1200](screenshots/mockups/filters-1200x800.png).

- **Purpose.** Narrow the list; the filters are the same ones the
  bartender thinks in.
- **Content.** Groups of chips, wrapping, one tap each (check mark and
  bold when on): **Availability** (Makeable now, Missing one, Any),
  **Alcohol** (Without alcohol (calculated), Low ABV; the lines are
  chosen in Settings, [as built](#as-built-37-alcohol-filters)), **Template** (the root templates
  and their variants), **Status** (Draft, On menu, Retired). Sticky
  bottom bar: Clear Filters and **Show N Drinks** (the count updates
  live).
- **Actions.** Toggle chips; Show N Drinks closes the sheet; back or
  Escape closes it with the filters kept; the filters live in the URL.
- **States.** _Empty_: no filter on, the button reads Show N Drinks with
  the full count. _Zero hits_: the button reads "Show 0 Drinks" and is
  disabled, the sheet suggests Clear Filters. Availability chips are
  disabled with "Mark stock first" while the stock is empty. Alcohol
  chips need no stock. _Error_: none of its own.
  _Offline_: unchanged.
- **Data.** Nothing stored (the active filters are URL state). Counts
  derived.

# Spec

Built by [#19](https://github.com/nexumia-de/mixtura/issues/19);
servings and batch [#52](https://github.com/nexumia-de/mixtura/issues/52).
URL `#/drinks/<id>`, pushed on Drinks. Mock-up: [html](mockups/spec.html),
[360](screenshots/mockups/spec-360x720.png),
[1200](screenshots/mockups/spec-1200x800.png).

- **Purpose.** Read a drink as a bartender reads a spec: lines, method,
  and whether the numbers sit in the usual range; the starting point for
  a swap, an edit or a riff.
- **Content, top to bottom.** Top bar: back, name, overflow (Versions,
  Family, Export spec, Retire, Delete). Tags: template (tappable to the
  template), version and status (a built-in drink shows the tag "Built-in" instead: versions and status belong to the user's own specs), Makeable or "Missing X". **Ingredients**
  card: the lines in order, amount in the display unit
  ([units](units.md#display-and-rounding)) right-aligned in a fixed
  column, ingredient name, role tag; optional lines marked "optional";
  line notes below the name; substitutes as "or Lemon juice" lines in
  muted text; a servings stepper (1 to 12 drinks, [#52](https://github.com/nexumia-de/mixtura/issues/52))
  that scales the amounts for display; below the lines: method, glass,
  garnish. **Balance panel** ([drawn as in design](design.md#drawing-balance)):
  ABV, sugar, acid, each value against the template's usual range (an
  assumed range is drawn dashed as "Assumed range" without a position
  word, [rule](balance.md#how-precise-a-range-is-shown)),
  then "Volume after dilution", a Details link to the notes of the
  formulas, and the unverified-range line. Notes card (free text, with
  the version note of this version). Source line for seed drinks ("From
  Bar Assistant, MIT") linking to About.
  On desktop the ingredients and the balance panel sit side by side.
  On a phone the balance panel starts below the ingredients, so the
  tag row and the meta list stay compact.
- **Actions.** Bottom bar: **Try a Swap**, **Riff**, **Edit**. Stepper.
  Overflow: Versions, Family, Export spec (a JSON file of this spec),
  Retire, Delete (both act at once with Undo). A line is not tappable
  outside swap mode. Seed specs are read-only: Edit on a seed spec
  makes a copy that becomes the user's version 1 with the seed as its
  parent (the toast says "Copied to your drinks").
- **States.** _Empty_: a spec has at least one line, so none. _No
  template_: the balance panel shows values and "No usual range for this
  drink". _Figure missing_: "No figure" with the ingredient named, other
  figures still shown. _Not found_ (deep link, deleted spec):
  status page "This drink is not here" with a button to Drinks. _Error_:
  store unreadable, [general](behaviour.md#failure-and-offline-in-general).
  _Offline_: unchanged.
- **Data.** Spec stored (name, lines with amount and unit as entered,
  method, glass, garnish, notes, status, version). **Derived and never
  stored**: balance figures, position against the range, volume,
  makeable, scaled amounts, display-unit amounts, newest version.

# Swap mode

Built by [#20](https://github.com/nexumia-de/mixtura/issues/20). Not a
separate screen: the spec screen in a mode, URL
`#/drinks/<id>?swap=…`. Mock-up: [html](mockups/swap.html),
[360](screenshots/mockups/swap-360x720.png),
[1200](screenshots/mockups/swap-1200x800.png).

- **Purpose.** Change a slot's ingredient or amount without saving and
  watch the numbers; the bartender's "what if".
- **Content.** The spec screen with a banner "Trying a swap. Nothing is
  saved." (the Reset button is in the bottom bar, see
  [as built](#as-built-20)). Changed lines are marked by a bar at the
  left and the words "Changed, was 22.5 ml" (not by colour alone). The
  balance panel shows each figure with a dotted tick for the saved value
  and "was 18.3 %" in the footer. A compact balance bar above the bottom
  bar keeps the three figures with their position words visible while
  the lines are edited (on a phone the panel is below the fold while the
  lines are on screen). A "Swap a Line" card lists suggestions: the same
  role's substitution class ("Lime juice to Lemon juice") and amount
  changes.
- **Actions.** Tap a line: a small sheet with an amount field and the
  unit (same grammar as the editor) and an ingredient picker limited to
  the substitution class first, then Show All; changing either updates
  the figures at once. Bottom bar: **Reset** (back to saved, instant),
  **Riff** (save the changed spec as a new drink linked to this one,
  asks for a name), **Save** (a new version of this drink, with the
  note field of [save](screens-specs.md#save-version-and-notes)). Back
  leaves swap mode and drops the swap with an Undo toast. A swap is
  shareable as a link.
- **States.** _Nothing changed yet_: the banner reads "Trying a swap.
  Change a line to see the numbers." _A substitute without
  properties_: that figure shows "No figure" naming it. _Seed spec_:
  Save is Save as My Version. _Error and offline_: as the spec screen.
- **Data.** Nothing is stored until Save or Riff; the swap is URL
  state. All figures derived.

# As built (#18, #19)

What the first build does and where it differs from the text above;
the real seed data (296 ingredients, 635 drinks, 107 of them with a
template) forced some of it.

- **Seed honesty.** Acid is unknown for every seed drink, so the acid
  block and the sugar-to-acid line show "No figure" and name the
  ingredients without a value; 528 drinks match no template, so "No
  template" is a normal state: the values are shown, no band, no position
  word, the note "This drink fits none of the templates. That is a normal
  state." Nineteen drinks have no method the model knows (none, layer, muddle, and others):
  no figures after dilution, the ABV before dilution is still shown. Every
  range carries the line "Ranges come from a model and are not yet checked
  against a source." while its evidence is not `verified`, and Details names
  the basis (assumption) and the dilution used. A top without a volume is
  excluded and said so; estimated convention units are named.
- **Template of a drink** is the stored `templateId`; for a drink without
  one the engine's `matchSpec` is asked on the spec screen only (it
  suggests none for any seed drink; a suggestion would be tagged
  "(suggested)"). List rows and the template filter use the stored id only.
- **Drinks list.** Rows show name, template (or "No template") and ABV after
  dilution (whole percent, "No ABV figure" for 36 drinks), sorted by name; the
  newest version of each lineage; retired drinks are hidden. Makeable tag and filter: see [stock screens](screens-stock-settings.md#as-built-30-33); sort menu, status filter, arrow keys and `n`: [#75](#as-built-75). Rows are drawn 60 at a time (the next 60 when the "Show more drinks"
  button comes within 600 px of the view); the count shown is remembered per
  list address so Back restores the scroll position (also after a reload,
  session storage). Balance is computed per row when the row is drawn, and for
  all drinks only when a strength filter or the filters sheet asks.
- **Search** is case- and accent-insensitive over name, ingredient names
  (substitutes too) and tags; every word must be found as a substring.
  Typing is debounced by 200 ms and rewrites the current history entry.
- **Filters** (one value per group, tap again to clear): Template, Method,
  Base (the families of the base-role ingredients, matched with `isA`) and
  Strength. Strength bands are ranges of ABV after dilution chosen
  between the usual ranges of the six templates and are an assumption:
  under 14, 14 to 22, 22 to 30, 30 and over (`screens/browse/strength.ts`);
  drinks without an ABV figure are in no band and the sheet says how many.
  The sheet is a dialog over the list pane; on a phone opening it adds one
  history entry (Back closes it and keeps the filters set inside it), on
  desktop it replaces the entry (Escape closes it).
- **Templates.** The overview is rows (not cards): roots by name, variants
  indented, role line, method, number of drinks. The detail shows slots,
  method, glass, the usual ranges as bands with their basis, and the drinks
  that follow it; its bottom bar is **New Drink**
  (`#/drinks/new?template=<id>`, the editor starts with the template's slots, [#75](#as-built-75)) and **Show in Drinks**
  (`#/drinks?template=<id>`).
- **Spec.** Lines, role tags with their word, fixed rows (method, glass,
  garnish; absent ones omitted), balance panel, notes, source line. Amounts
  follow the display setting and the engine's rounding (22.5 ml shows as
  22.5 ml, [units](units.md#display-and-rounding)). A built-in drink shows
  "Built-in" instead of version and status, and every range is shown as
  "Assumed range" without a position word while its evidence is an
  assumption (#77). A top without a volume has Add Volume (a what-if,
  not saved, [#74](screens-specs.md#what-if-volume-of-a-top)); lines
  the figures leave out are listed in the balance panel. The servings stepper and the batch sheet are built
  ([#52](screens-specs.md#servings-and-batch)). The bottom bar (Try a
  Swap, Riff, Edit) and the overflow menu: the bar shows Try a Swap
  ([#20](#as-built-20)); Riff, Edit and the menu are not shown until #27
  and #25 build them; there is no dead control. On a phone the panel is below the lines; from
  640 px of detail width the two sit side by side.

# As built (#20)

What Try a Swap does and where it differs from the text above.

- **The swap is in the address**, as the documents say
  (`#/drinks/<id>?swap=<line>:<ingredient>:<amount>,...`), not in memory:
  `<line>` is the position of the line in the spec, `<ingredient>` the
  ingredient id (empty = unchanged, percent-encoded), `<amount>` a number and
  a unit id such as `22.5ml`, `0.75oz_us`, `2dash` (empty = unchanged). `swap=`
  with nothing after it is swap mode with nothing changed. A reload, Back and
  a shared link restore it; nothing is written to the store, and a test checks
  IndexedDB and local storage are untouched. (Issue 20 said "the URL does not
  persist it"; the behaviour document wins.) Several lines can be swapped at
  once; each changed line shows the bar and "Changed, was 60 ml Light Rum" (the
  saved amount, and the saved ingredient when that changed).
- **Entering and leaving.** **Try a Swap** in the bottom bar adds one history
  entry; every change replaces the address, so Back leaves swap mode. Leaving
  with at least one change shows the toast "Swap dropped" with **Undo** (opens
  the swap again). The bottom bar in swap mode is **Reset** (disabled while
  nothing is changed): all lines back to the saved spec, toast "Swap reset" with
  Undo. **Riff** and **Save** are not shown until
  [#27](https://github.com/nexumia-de/mixtura/issues/27) and
  [#25](https://github.com/nexumia-de/mixtura/issues/25) build them (no dead
  control); the banner has no Reset button, the bottom bar has it. A line has
  its own **Reset Line** in the sheet instead of a toast, because a toast would
  cover the sheet's buttons.
- **The line sheet** (`?sheet=line-<n>`, a history entry on a phone, a replace on
  a wide screen; Escape or Done closes it, the swap stays). From the top: the
  amount (stepper and typed entry), the ingredient, the offers, the search
  over all ingredients, and Reset Line and Done. The amount is first so that it
  stays visible with the on-screen keyboard: the sheet follows the visual
  viewport (`--kb-inset`, `keyboard-inset.ts`) and scrolls. The stepper moves
  by the pour grid of [units](units.md#display-and-rounding) in the line's unit:
  2.5 ml, a quarter ounce, a quarter cl, a quarter spoon, 1 dash or counted
  unit, 5 g; never below one step. Typed text uses the grammar of the amounts
  parser (`45 ml`, `3/4 oz`, `1½ oz`, `2 dashes`); a bare number takes the line's
  unit; a decimal comma is accepted. A valid entry applies while typing, with
  "= 22.5 ml" under the field; text that is not an amount is said when the field
  is left ("Not understood: blah. ... Try 45 ml, 1½ oz or 2 dashes.") and the last valid amount
  stays. A `top` line takes an ingredient but no amount here (its volume is the
  [what-if](screens-specs.md#what-if-volume-of-a-top)).
- **Offers** come from the engine's
  [`swapCandidates`](ingredients.md#swap-candidates) for the **saved**
  ingredient of the line (so the list does not move while swapping) and the
  line's own role if it sets one: "Same class and role", then "Same role"; for a
  line without a role "Same class", then "Close in the tree". Eight per group,
  "Show N more". The chosen one is marked "Selected" with a check; "Saved: X"
  takes the saved ingredient back. The search covers all ingredients (name, case
  and accents ignored, the nearest 30) and is the fallback: a line nothing is
  known for (for example Crushed Ice, an ingredient without parent) says "Nothing
  is known to fit this line by role or class. Search all ingredients." Seed
  data: only 69 of 296 ingredients have a substitution class and the classes
  are narrow, so for most lines "Same role" is what is offered.
- **Figures.** Each figure keeps its range and word rules and gains a row
  "Was 18.3 % → now 19.7 % (+1.4 points)" (g/100 ml for sugar, a true minus
  sign, "no change", "No figure" where a figure is unknown, no difference then);
  the difference is taken between the numbers as shown, so it always adds up.
  The dotted tick on the track marks the saved value where the saved figure is
  known and a range is drawn. The volume line adds "(was 122 ml)". The
  panel footer is unchanged ("Assumed range 24.2–26.2 %"); the footer text
  "was ..." of the first design is the row above.
- **Template.** The engine's `matchSpec` is asked, without the stored template
  id, for the saved and the swapped lines. A swapped drink that fits a template
  follows it (tag "Sidecar template (suggested)"); one that fits none follows
  none unless the saved drink did not fit its stored template either. When
  the template differs from the saved one the panel says it in one sentence:
  "Now matches the Sidecar template. Before: Daiquiri." or "Now matches no
  template. Before: Daiquiri." No name is shown that the engine did not give.
  No template: no range, no band, the before and after numbers still show.
- **Compact balance bar.** On a phone (detail pane under 640 px) the three
  figures with their difference ("ABV 25.1 % +6.8") stay above the bottom bar
  while the lines are on screen; where the panel is beside the lines it is
  hidden.
- **Servings and batch** work in swap mode (the parameters combine): amounts
  and "was" are multiplied, the batch is made from the swapped lines; the figures
  stay for one drink ([#80](https://github.com/nexumia-de/mixtura/issues/80),
  the swap part).
- **Performance.** One swap step (recompute, redraw the whole screen) takes
  17 ms worst of ten at both sizes in headless Chromium on the cloud host,
  without CPU throttling (`node e2e/swap.mjs`).

# As built (#37, alcohol filters)

Part of [#37](https://github.com/nexumia-de/mixtura/issues/37): the two
filters on the drinks list. Shelf life dates on prepared ingredients and
variant suggestions per template stay open in #37.

- **Filter.** Group **Alcohol** in the filters sheet with two chips,
  **Without alcohol (calculated)** and **Low ABV**; in the address
  `?alcohol=none` or `?alcohol=low`, with the other filters. A drink is in
  a filter when the engine's `classifyAlcohol` (on the drink's balance
  after dilution) gives that class: `none` is the "without" line, `low` is
  above it and up to the low line; a drink without alcohol is not in "Low
  ABV". The label says "calculated" and the app never says "alcohol-free" or
  "non-alcoholic" (a test scans the words). The sheet's note names the lines
  in force and counts the classes of all drinks ("12 without alcohol, 73 low
  ABV, 38 not classified" with the default lines on the 639 drinks).
- **Rows.** While an alcohol filter is on, the second line of a row ends with
  the class in words ("No template · 8 % ABV · Low ABV").
- **What could not be classified.** A drink whose class is `unknown` is in
  neither filter and is not hidden silently: under the count line a button
  "N could not be classified" (N = drinks that match the search and the
  other filters but have no class) opens a list grouped by reason, the
  drinks as links, with the ingredients that have no ABV figure: the method
  gives no dilution figure (19 with the default seed), an ingredient has no
  ABV figure (17), a line is left out of the figures and may hold alcohol
  (2), the balance could not be computed, the lines are invalid. No button
  when N is 0.
- **Lines.** Settings: **Without alcohol (calculated) means** Below 0.5 %
  (default), Up to 0.05 %, 0 %; **Low ABV means** Up to 1.2 %, Up to 10 %
  (default), Up to 15 %. The 15 % line is for drinks built on fortified or
  aromatised wine (around 14 to 15 %); its basis is `assumption,
unverified` in `alcohol-thresholds.json`, and Settings shows the basis of
  the chosen lines. Stored as the device settings `alcoholWithout` and
  `alcoholLow` (preset ids; an unknown id means the default), not in the
  export file.
- **Counts** on the 639 drinks of the app seed (635 converted, 4 nominal
  examples): default lines 12 without alcohol (the 9 converted ones and the
  3 nominal examples), 73 low, 515 standard plus the low-stirred example,
  38 unknown; up to 15 %: 180 low; the strict lines (0.05 %, 1.2 %): 12 and 2. A test checks the filter result against the engine class on every
  drink under all nine preset pairs.
- **Code.** `screens/browse/alcohol.ts` (class per drink, cached per model
  and lines; tally; unknown groups), `screens/drinks/alcohol-unknown.ts`,
  the group in `filters-sheet.ts`, Settings in `screens/settings/index.ts`;
  tests `alcohol-filter.test.ts`, `store-repos.test.ts`, e2e
  `e2e/alcohol.mjs`. Screenshots `app-alcohol-*` in `docs/screenshots/`.

# As built (#82, stock panel on the spec screen)

Closes the follow-up of [#30 and #33](screens-stock-settings.md#as-built-30-33).

- **Tag.** Next to the template and version tags: **Makeable**, **With
  substitute**, **Missing {name}** (**Missing N ingredients** for more than
  one) or "Has an ingredient not in your data". A check, a swap or a dash
  goes with the word. No tag while nothing is in stock, and none in swap mode.
- **Panel "What you have"** (a card under the ingredients; on a wide screen in
  the left column): one row per line. `Have: Light Rum` (exact or a stocked
  descendant, with the asked name in brackets when it differs), `Made from your
stock: {prepared ingredient}`, `Substitute: Sugar for Simple Syrup` (a listed
  or class substitute), `Missing: Simple Syrup`, `Not in stock: X (optional)`.
  With nothing in stock the panel says so and links to Stock.
- **A missing line** with exactly one ingredient to get offers **Mark in
  stock** (writes `present: true` through the same queue as the Stock screen;
  the toast has Undo) and **Buy Next** (`#/stock/buy-next?open=<id>`). A line
  missing several parts of a prepared ingredient names them and offers
  neither button.
- **Derived.** `screens/spec/stock-panel-vm.ts` runs the engine's
  `makeableSpecs` in the mode with substitutes, retired drinks included, once
  per stock records object and browse model, and reads each line's
  `LineResult` (`rule`, `by`, `missing`). Nothing is stored. Texts are in
  `screens/spec/stock-strings.ts`, the view is `components/stock-panel.ts`.
- **Tests.** `test/stock-panel-vm.test.ts`, `e2e/spec-stock.mjs` (screenshots
  `spec-stock-*` at both sizes).

# As built (#75)

Browse follow-ups of [#18](https://github.com/nexumia-de/mixtura/issues/18),
after the WAI-ARIA Authoring Practices.

- **Sort menu.** A menu button (icon of two arrows) beside Filters opens a
  menu of three choices, one marked (`menuitemradio`, check mark and bold):
  **Name** (default), **Recently changed** (newest `updatedAt`, else
  `createdAt`; built-in drinks carry no date and come last, by name) and
  **Template** (template name, drinks without a template last, ties by
  name). The choice is the `sort` parameter of the address (`sort=changed`,
  `sort=template`; Name has none), kept when filters change and carried to
  the spec address, so the list beside a drink keeps its order. A
  non-default order is said in a line under the count ("Sorted by Recently
  changed"), the button's name says it too. Order is
  `screens/browse/sort.ts`; the button is `components/menu-button.ts`. The
  menu is drawn in place: Enter, Space, click or Arrow Down open it (focus on
  the marked choice; Arrow Up opens it at the last), Arrow Up and Down wrap,
  Home and End jump, Escape closes and returns to the button, Tab closes
  and moves on, a tap outside closes, choosing closes and keeps focus on the
  button. Items are 44 px high. Its open state is not in the address, so a
  redraw closes it.
- **Status filter.** Already built with #18 (the Status group of the
  filters sheet, the chip "Status: ...", retired drinks only under it);
  the earlier note that it was missing was wrong. Unit-tested now.
- **Arrow keys.** The rows are links with one tab stop (roving tabindex): the
  open drink, else the first row. Arrow Down and Up move focus between the
  rows, from the search field Arrow Down enters the list, Arrow Up from
  the first row returns to the field, Arrow Down from the last drawn row
  reaches "Show more drinks", Home and End jump to the first and last drawn
  row, Enter opens the drink. Moving does not open a drink: on desktop that
  would push a history entry and redraw the spec on every key press, and
  the open drink is marked with `aria-current` as before. The list is not
  a `listbox`, because its rows are links.
- **`n`** starts a new drink (`#/drinks/new`) and `/` focuses search, both
  only while the drinks list is on screen. They are off while a text
  field, select or editable element has focus, with Ctrl, Cmd or Alt held,
  over a dialog, after another handler took the key, and when turned off in
  Settings (Keyboard shortcuts, Yes by default; kept in `localStorage` of
  this browser, not in the data store). That setting is the mechanism
  WCAG 2.1.4 (Character Key Shortcuts) asks for.
- **Filters sheet.** Tab and Shift+Tab stay inside any open modal dialog
  (`shell/focus-trap.ts`, for the filters sheet and the batch, swap and
  picker sheets alike); everything behind is `inert` as before. When the
  filters sheet closes, by Escape, Back, the close button, the backdrop or
  Show N Drinks, focus returns to the Filters button.
- **Template detail.** The bottom bar has **New Drink** beside Show in
  Drinks: the editor opens with the template's slots, method and glass
  (the editor reads `?template=`).
  A new drink has one draft per starting point (`new` and
  `new?template=<id>`): a blank draft the user began is not shown where a
  template was chosen, it stays under its own key and comes back, announced
  as kept, at New Drink; an untouched start leaves nothing behind. (Before,
  one `new` draft was reused, so New Drink on a template could open an empty
  editor.)
