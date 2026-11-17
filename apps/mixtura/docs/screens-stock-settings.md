---
type: Specification
title: Screens - stock and settings
description: Stock, Buy Next, settings with unit system and theme, export and import, and About with attribution for Mixtura, each with purpose, content, actions, empty, error and offline states and what is stored versus derived.
tags: [behaviour, screens, stock, settings, export]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mockups
    title: 'docs/mockups/stock.html, buy-next.html'
---

# Screens: stock and settings

Part of [behaviour](behaviour.md); look and copy rules in
[design](design.md); texts in [UI strings](ui-strings.md). Format of
each entry as in [browse and read](screens-browse.md).

# Stock

Built by [#30](https://github.com/nexumia-de/mixtura/issues/30), engine
[#31](https://github.com/nexumia-de/mixtura/issues/31), dates
[#37](https://github.com/nexumia-de/mixtura/issues/37). Destination
**Stock**, first view, URL `#/stock`. Mock-up: [html](mockups/stock.html),
[360](screenshots/mockups/stock-360x720.png),
[1200](screenshots/mockups/stock-1200x800.png).

- **Purpose.** Say what is on the shelf in a few taps, and see what it
  allows.
- **Content.** A segmented control **Stock / Buy Next**; a summary card
  ("34 in stock", "12 drinks makeable now, 5 missing one ingredient")
  that links to the Drinks list with Makeable now on; an "Add by name"
  field (quick entry: type, choose, it is marked in stock; a name that
  is not in the tree offers Create); the ingredient tree as groups
  (category, type, product) with a count "11 of 18"; each row: a check
  box (44 × 44 px, a check mark when on), name, a line of detail
  ("Opened 2026-09-02", "Best before 2026-12-01", "Out", "Not
  tracked"), and a tag "In 14 drinks". A type row shows "3 of 5
  products in stock"; marking a type marks it as available for
  substitution by role. Search in the top bar filters the tree.
- **Actions.** Tap the check box: in stock, again: out ("Out" means
  known to be out, no record means "not tracked",
  [data model](data-model.md#stock)); an Undo toast follows. Tap the
  row body: a detail sheet with opened-on and best-before dates and a
  note (dates: #37; a best-before date in the past is shown as text
  "Past best before 2026-12-01", never alone by colour). Overflow: Mark
  all in group, Clear all (acts at once with Undo, no question), Export
  stock.
- **States.** _Empty_: "Nothing in stock yet. Add what you have to see
  what you can make." with the Add by name field focused only after the
  user taps it; the tree is still shown. _No hit in search_: "No
  ingredient matches" with Create. _Error_: store unreadable,
  [general](behaviour.md#failure-and-offline-in-general). _Offline_:
  unchanged.
- **Data.** Stored: one stock record per ingredient the user touched
  (`present`, `openedOn`, `bestBefore`, `note`). Derived: counts,
  makeable and missing-one totals, "In N drinks", past-best-before.

# Buy Next

Built by [#33](https://github.com/nexumia-de/mixtura/issues/33), engine
[#32](https://github.com/nexumia-de/mixtura/issues/32). Second view of
Stock, URL `#/stock/buy-next`. Mock-up: [html](mockups/buy-next.html),
[360](screenshots/mockups/buy-next-360x720.png),
[1200](screenshots/mockups/buy-next-1200x800.png).

- **Purpose.** Answer "which one bottle makes the most drinks possible?"
  ([how bartenders work](bartender-practice.md#what-mixtura-should-do),
  item 5).
- **Content.** The segmented control; a check-box row "Count drinks that
  need only a substitute from the same class" (on by default; the
  substitution by role of goal 5); a one-line explanation of the
  ranking; a ranked list: rank, ingredient name, "Unlocks N drinks"
  (bold), up to three drink names and "and N more", and a **Have It**
  button.
- **Actions.** Have It: marks the ingredient in stock at once, the row
  leaves the list, the ranking is recomputed, toast "Added {name} to
  stock" with Undo. Tap the row body: the list of the drinks it
  unlocks, each opening its spec. Overflow: show the top 10, 25 or all.
- **States.** _Empty stock_: the ranking still works (the whole bar's
  worth is unlocked by every ingredient); a line says "Based on an empty
  stock; mark what you have for a closer answer." _Nothing to
  unlock_: "Everything in your drinks is makeable or needs more than
  one ingredient." _Everything makeable_: "You can make every drink."
  _Error, offline_: as Stock.
- **Data.** Nothing stored but the stock records written by Have It.
  The ranking, counts and drink lists are derived from specs, stock and
  the ingredient tree.

# As built (#30, #33)

Code in `packages/app/src/screens/stock/` (screens, tree view model, Buy Next view model), `packages/app/src/stock/` (records in memory and the engine bridge) and the Makeable parts of `screens/drinks/`. Screenshots: `app-stock-*`, `app-buy-next-*`, `app-drinks-makeable-*`, `app-drinks-missing-one-*`, `app-filters-availability-*` in `docs/screenshots/`.

- **Records.** The stock is read once from the local store into memory; a mark shows at once and is written behind it, in order. A failed write puts the old record back and says so in a toast. A tap writes `present: true`; a tap on a marked row writes `present: false` ("Out"); Undo restores the record as it was (also "no record"). Bulk actions and Undo are one change. Import and Undo of an import read the records again. In read-only mode (store failed) the rows are disabled.
- **Tree.** Roots with children are groups, closed until opened (open groups are kept in memory, not in the address); roots without children are listed in one group "Other ingredients". Every node has a check box: the whole row is the button (at least 56 px high), an open/close button follows for nodes with children. The count at the end of a group is marked leaves of all leaves ("11 of 18"; a marked type is not a leaf). The second line says the state in words (In stock, Out, Not tracked), the level and "In N drinks" (drinks of the list that name it or something below it, derived). Arrow keys move between rows, Right and Left open and close, Home and End jump.
- **What marking a type means.** Marking a type or category (Gin) satisfies lines that name it or an ancestor, not a line that names a product of it ([makeable](makeable.md#rules)). One calm line under the search field says so, and the toast after marking a type repeats it.
- **Search and quick entry.** `?q=` filters the tree to matching names with their groups; everything below a matching name is shown. Enter marks or unmarks the first match (exact name, then a name starting with the text, then the first in order), clears the field and keeps focus. No autofocus. "No ingredient matches." offers **Create “{text}”** when no node matches the text at all ([#83](https://github.com/nexumia-de/mixtura/issues/83)): it opens the editor's ingredient form (`components/ingredient-form-sheet.ts`) as a sheet over Stock (`?sheet=ingredient`, one history entry on a phone), with the name filled in. Saving stores the ingredient, marks it in stock at once and shows "Created {name} and marked it in stock" with Undo, which removes the ingredient and the mark. The form text lives in memory (`screens/stock/create-sheet.ts`); a reload with the parameter alone opens a blank form with the search text. Not offered in read-only mode.
- **Show and bulk.** Chips All, In stock, Not in stock (`?show=in|out`). With a search or a show choice, **Mark All Visible** marks the visible nodes that have no children and are not marked; **Clear Visible** marks every visible marked node out. Both act at once with Undo.
- **Empty state.** "Nothing in stock yet..." with **Mark the 12 Most Used**: the twelve ingredients named on most seed drinks (`screens/stock/common.ts`, counted over the 635 drinks, a test checks the ids exist). Dates, notes and the detail sheet are not built (#37).
- **Summary.** "N in stock" (marked nodes of the tree), "N drinks makeable now, N missing one ingredient" and a link to `#/drinks?makeable=yes`.
- **Drinks list.** Filter `makeable=yes|substitute|one` in the address (the mock-up's `makeable=1` is replaced). The three states are exclusive per drink: **Makeable** (strict mode), **With substitute** (makeable only with substitutes allowed), **Missing X** (strict, exactly one ingredient missing and no substitute helps). A drink missing two or more ingredients (strict) has no state to filter by, but its row says "Missing 3" with the count. Each row of a drink in a state carries a tag with a shape (check, swap arrows, dash) and the words; The filters sheet has an Availability group with live counts; its chips are disabled with "Mark stock first" while nothing is in stock, and the list then says so with an Open Stock button. Not built: the Makeable tag on the spec screen and its stock panel (follow-up issue).
- **Buy Next.** `#/stock/buy-next`: a check box "Count drinks that need only a substitute..." (on = engine mode `with-substitutes`, off = `strict`; `?strict=1`), the ranking as the engine returns it (rank, name, "Unlocks N drinks", up to three drink names, product or type, the products folded into a type, worded "Products that count as {type}: ..."), **Have It** (marks the ingredient, toast with Undo, the row leaves) and a tap on the row lists every unlocked drink as links (`?open=<id>`). Rows are drawn 60 at a time. With substitutes the line adds "N of them with a substitute". Empty stock: "Based on an empty stock: only drinks made from one ingredient can be unlocked..."; nothing to unlock and everything makeable have their own lines. The mode is remembered (setting `buyNextMode`, kept in the local store like the other settings): switching it saves it and leaves no mode in the address, and an address with `?strict=1` or `?strict=0` still wins for that visit. Settings has two choices, "Rank drafts" (default Yes) and "Rank retired drinks" (default No), kept as `buyNextDrafts` and `buyNextRetired` and passed to the ranking as the engine's `excludeStatuses`; they change only Buy Next, not the Makeable filters.
- **Numbers** (`node e2e/stock.mjs`, headless Chromium; the 360 run throttles the CPU 4x): a tap on a row with 70 rows drawn 14 ms (67 ms throttled); switching the Buy Next mode, ranking and redraw 25 ms (110 ms throttled). The ranking runs in a Web Worker (`stock/rank-worker.ts`, started by `stock/rank-async.ts`), once per stock change and only when Buy Next is open; the screen draws the previous ranking of that mode until the new one arrives. Where there is no worker the main thread ranks as before. Measurements and the decision: [makeable](makeable.md#ranking-off-the-main-thread-84).
- **Redraw and typing.** A redraw that arrives while the user types in a search field (a finished write) keeps the typed text and restarts the field's debounce (`shell/render.ts`).
- **Tests.** Unit: tree view model, derived states and filter, ranking against "add it and count" on a fixture, records and Undo, stock in export and import, the common ids against the seed. End to end at both sizes: `e2e/stock.mjs` (mark by search and Enter, tap, Undo, show and bulk, the drinks filter and tags, the filters sheet, Buy Next, the count shown equals the rise of "Makeable now" in strict mode and of makeable plus substitute with substitutes, reload and offline reload keep the stock, no horizontal scroll, targets).

# Settings

Built by [#17](https://github.com/nexumia-de/mixtura/issues/17) (the
shell keeps the settings, theme and unit setting are used by every
screen). Destination **Settings**, URL `#/settings`.

- **Purpose.** The few choices the user makes once.
- **Content.** Groups of rows, each a title and its current value, a
  tap opens a short list: **Amounts shown in** (Metric, US, Imperial;
  default Metric, owner question Q3 in [design](design.md#open-questions);
  explained in one line "Entry accepts any unit; this changes only what
  is shown", [units](units.md#display-and-rounding)); **Appearance**
  (Follow System, Light, Dark; sets `data-theme`); **Without alcohol
  (calculated) means** and **Low ABV means** (the lines of the alcohol
  filters of the drinks list, [as built](screens-browse.md#as-built-37-alcohol-filters));
  **Data** (Export
  and Import, last export date); **About** (version, attribution). No
  account, no sync, no analytics switch (there is no telemetry,
  [AGENTS.md](../AGENTS.md)).
- **Actions.** Choosing a value applies at once, no Save. The theme
  applies without a flash on the next load because it is read before
  first paint.
- **States.** _Empty_: none. _Error_: a setting that cannot be saved
  shows a banner and keeps the old value. _Offline_: unchanged.
- **Data.** Settings stored in the local store (not in the export file,
  they belong to the device).

# Export and import

Built by [#28](https://github.com/nexumia-de/mixtura/issues/28). URL
`#/settings/data`.

- **Purpose.** Move or back up everything the user entered, in one
  file ([export format](data-model.md#export-file)).
- **Content.** Two buttons, **Export Everything** and **Import File**;
  the date of the last export and a count of what changed since
  ("12 changes since the last export"); the backup reminder as one
  line on this screen and as a calm banner in Settings after 30 days
  with changes and no export (dismissible, never a dialog, never on
  the Drinks list). Per-spec export is in the spec's overflow menu.
- **Export.** The browser's save dialog; the file name
  `mixtura-backup-2026-11-17.json` (date from the host). A toast "Exported 34
  stock entries, 18 specs" with the counts.
- **Import.** Choose a file; it is read and checked completely before
  anything is written: wrong app, unsupported higher `formatVersion`,
  invalid JSON, schema errors are each named in a status message ("The
  file is not a Mixtura export." or "The file is from a newer version
  (3). This app reads up to 2.") and nothing is imported. A valid file
  shows a summary ("18 specs, 34 stock entries, 4 ingredients") and
  two choices: **Merge** (add what is new, keep existing records; for
  the same id the newer `updatedAt` wins) and **Replace Everything**.
  Choosing is the action; there is no further question. Before either
  writes, the app keeps a copy of the current data in the local store;
  the result toast ("Imported 18 specs, 34 stock entries") offers
  **Undo**, which restores that copy. The copy stays until the next
  import and can be removed on this screen (Delete Import Backup).
- **States.** _Nothing to export_: "Nothing to export yet. Seed data is
  not part of the file." and the button is disabled. _Error_: as
  described under Import. _Offline_: unchanged, import and export are
  local.
- **Data.** Reads and writes everything stored; nothing derived is in
  the file.

# About

Built by [#17](https://github.com/nexumia-de/mixtura/issues/17); install
guide [#22](https://github.com/nexumia-de/mixtura/issues/22). URL
`#/about`, pushed from Settings.

- **Purpose.** Say what the app is, where the data comes from, and thank
  the sources as their licences require.
- **Content.** App name (Drink Builder) and version, a line on the
  licence (AGPL-3.0-or-later, source link), **Data sources** with the
  attribution text of the seed data ([seed data](seed-data.md),
  Bar Assistant's dataset, MIT) and of every other source in use; **Notes
  on the numbers**: the balance formulas, the dilution model and the
  status of the usual ranges (verified or "model, not yet checked
  against a source", from [balance](balance.md#evidence)); install help
  (Android, Linux); support link; "Updates are checked when you are
  online."
- **Actions.** Open a source link (external, opens in the browser).
  Back.
- **States.** _Offline_: external links are shown with "needs a
  connection" in the accessible name and fail quietly; the page itself is
  unchanged. _Empty, error_: none.
- **Data.** Static text from the build; version and seed version
  derived from the build.
