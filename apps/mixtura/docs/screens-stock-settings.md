---
type: Specification
title: Screens - stock and settings
description: Stock, Buy Next, the spaces that count for stock (chosen in the Spaces sheet, set up in the Household app), settings with unit system, theme and the Household row, export and import, and About with attribution for Mixtura, each with purpose, content, actions, empty, error and offline states and what is stored versus derived.
tags: [behaviour, screens, stock, spaces, settings, export]
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
- **Content.** A segmented control **Stock / Buy Next**; a line with the names of the spaces that count and a **Spaces** button ([spaces](#spaces)); a summary card
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
  all in group, Clear all (acts at once with Undo, no question). (The
  first design also listed Export stock; stock is not exported, see
  [export format](export-format.md).)
- **States.** _Empty_: "Nothing in stock yet. Add what you have to see
  what you can make." with the Add by name field focused only after the
  user taps it; the tree is still shown. _No hit in search_: "No
  ingredient matches" with Create. _Error_: store unreadable,
  [general](behaviour.md#failure-and-offline-in-general). _Offline_:
  unchanged.
- **Data.** Stored: one stock record per ingredient the user touched
  (`present`, `openedOn`, `bestBefore`, `note`), in the collection `stock`
  of a space, not in Mixtura's own database
  ([data model](data-model.md#stock)). Derived: counts,
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

- **Records.** Stock is kept per space, in the collection `stock` of the space in the database the apps share ([stock in spaces](decisions/stock-in-spaces.md), [store](store.md#stock-in-a-space)); the screens show the combined stock of the ticked spaces and marks go to the entry space, and with one space (`Home`, made on a device that has none) the Stock screen has one quiet line for it ([spaces](#spaces)). The stock is read once into memory, and again when a sync cycle changed it; a mark shows at once and is written behind it, in order. A failed write puts the old record back and says so in a toast. A tap writes `present: true`; a tap on a marked row writes `present: false` ("Out"); Undo restores the record as it was (also "no record"; a removal is kept as a removal marker). Bulk actions and Undo are one change. An import and its Undo do not change stock; the records are read again afterwards. In read-only mode (store failed) the rows are disabled.
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
- **Tests.** Unit: tree view model, derived states and filter, ranking against "add it and count" on a fixture, records and Undo, that stock is not in the export, the common ids against the seed. End to end at both sizes: `e2e/stock.mjs` (mark by search and Enter, tap, Undo, show and bulk, the drinks filter and tags, the filters sheet, Buy Next, the count shown equals the rise of "Makeable now" in strict mode and of makeable plus substitute with substitutes, reload and offline reload keep the stock, no horizontal scroll, targets).

## Batches near their date, and more than one batch (#101)

[#101](https://github.com/nexumia-de/mixtura/issues/101). Pure rules in `packages/app/src/stock/batches.ts`; screens in `screens/stock/` (`near-date.ts`, `batches-sheet.ts`, `batch-text.ts`, `batch-strings.ts`, `sheet-address.ts`).

- **The decision.** Several batches are kept on the stock record, not in a new store: `openedOn` is the made-on date of the newest batch at hand (what the spec screen's batch card shows), the new optional field `moreBatches` holds the dates of the others, newest first, no date twice (`stock.schema.json`). A new `batches` store would have needed a schema version and a migration for one date per batch; an optional field needs neither. Records written before have no `moreBatches` and read as one batch. (Since 2026-11-20 the record is a value of the shared collection `stock` and is not in the export file any more; the sentences on the export format that stood here no longer apply.) Dates only; the user's shelf life is still the only number, and the app proposes none.
- **Derived, not stored.** Where a batch stands (within its shelf life, use soon, past, no shelf life, not a date) comes from its date, the shelf life of the prepared ingredient (and what is inside it, `limitingShelfLife`) and today's date, passed in from `today.ts` (`stock/batches.ts`, the engine's `expiry`). A batch of an ingredient that is not at hand is not counted.
- **Near their date.** A card "Batches Near Their Date" under the summary lists the prepared ingredients at hand with a batch that is use soon or past, the most urgent first: name, then per such batch "Made on ... · use by ...", the state in words with a shape (dot for use soon, dash for past, never colour alone and nothing red), and "and 1 more batch at hand" for the others. The whole row opens the batches of that ingredient. No card when none is near. No notifications.
- **Batches sheet.** A prepared ingredient's tree row says "2 batches" and has a **Batches** button; the card rows open the same sheet (`?sheet=batches&ing=<id>`, one history entry on a phone). It lists the batches with dates and state and a **Used up** button each, and adds a batch with a date field (not in the future, not twice) or **Made Today**. Every change acts at once with an Undo toast; the last batch used up leaves the record as "Out" with no date. Focus goes into the sheet and returns to the button that opened it; Escape and Back close it; the sheet is a modal dialog (`role="dialog"`, `aria-modal`, the page behind is inert). The toast now has a higher stacking order than the sheets, so its Undo is seen over one.
- **Spec screen.** Its batch card shows the newest batch (`openedOn`) and, when there are more, says "N more batches at hand, see Stock. This card shows the newest." **I made this** and **Made on another day** add a batch (`madeBatch`): the previous batches stay, and a day that is already recorded is said ("A batch made on that day is already recorded.") and not recorded twice. **Used up** uses up the batch the card shows, the newest (`usedUpNewest`); the card then shows the next one, and the last batch used up leaves the record as "Out" with no date and no `moreBatches`, so no old date comes back after a later "I made this". Each is one change with Undo, and a note or best-before date on the record is kept. All transitions go through `addBatch`, `removeBatch` and `withBatchDates` in `stock/batches.ts`, so `openedOn` is always the newest and `moreBatches` holds no stale or repeated date.
- **Tests.** Unit: `test/stock-batches.test.ts` (dates, add and remove, states with today passed in, the near-date list and how it moves with the date), the valid example `stock-batches.json` against `stock.schema.json`, which allows no date twice (the vector `parse-stock-batches-ok` and the import tests for batches left with the stock in the export file). End to end: `e2e/stock.mjs` (the card, the sheet, add, repeated and future day, Used up with Undo, Escape and focus, row count, Back on a phone, last batch used up). Screenshots: `app-stock-near-date-*`, `app-stock-batches-*`.
- **Not done.** The nominal figures of variant suggestions (third item of #101) are left for a follow-up.

## Spaces

Since 2026-11-20 ([stock in spaces](decisions/stock-in-spaces.md)). What Mixtura called a place is a **space**: a household, or this device alone. The model is in [store](store.md#stock-in-a-space) and [data model](data-model.md#stock). Code: pure rules in `stock/spaces-rules.ts` and `stock/spaces-view.ts`, changes in `stock/spaces-actions.ts`, the sync status in `stock/sync.ts`, screens in `screens/stock/spaces-line.ts`, `spaces-sheet.ts`, `sync-text.ts` and `batches-block.ts`.

History: the section was "Places (#131)". Until 2026-11-20 the sheet also added, renamed and removed places, and Mixtura had a Sync page of its own. Both are gone; a space is made, named, shared and removed in the Household app.

- **Line.** Above the summary: the names of the spaces that count joined with " · " (sorted by name) and a **Spaces** button. With one space it is one quiet line ("Home"). The button opens the sheet (`?sheet=spaces`, one history entry on a phone, Escape and Back close it); the sheet itself takes the focus on open, not a field, so no on-screen keyboard appears, and focus returns to the button on close.
- **Sheet.** A line of introduction ("Stock is kept in a space: your household, or this device alone. The spaces that count decide what you can make."), then one row per space of the device: a check box "{name} counts" with the name, one line of status, and a radio "New entries go here". Both choices act at once and are kept as the device setting `spaces`. The sheet only chooses: it has no field and no Add, Rename or Remove.
- **Refusals** are said in words under the list, never silently: the last counting space and the entry space cannot be unticked ("At least one space has to count.", "New entries go to {name}, so it has to count. Choose another space for new entries first."). Choosing the entry space ticks it, so the entry space always counts and a mark is never written to a space the screen does not show. In read-only mode the controls are disabled and the sheet says "Spaces cannot be changed while your data cannot be saved."
- **Status line.** How the stock of the space is kept in step with its storage (`screens/stock/sync-text.ts`):

  | Text                       | When                                                                                                                            |
  | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
  | On this device only        | The space has no storage. Nothing is sent.                                                                                      |
  | Not synced yet             | A shared space before its first good cycle, with a connection.                                                                  |
  | Syncing                    | A cycle is running.                                                                                                             |
  | In step · {when}           | The last cycle was good. `{when}` is "just now", "5 min ago", "3 h ago", and after a day the date.                              |
  | Last sync failed: {reason} | The last cycle failed and the browser says it is online. The reasons are a few words each ([UI strings](ui-strings.md#spaces)). |
  | Offline                    | The browser says it is offline and the last cycle failed or none was good yet.                                                  |

  The time is worked out when the sheet is drawn; it does not count up while the sheet stays open without a redraw. A failure is only told here. Fixing it (a new token, another storage) happens in the Household app.

- **Household.** Under the list: "Spaces are made, named, shared and removed in the Household app, where sync is set up too." and the link **Open Household**. It goes to `../`, the app at the root of the address (`src/household.ts`). What moved there: adding a space, renaming it, removing it, connecting a storage, inviting a device and joining.
- **New spaces.** A device without a space gets one named `Home` that is on this device only, when the stock is first read. A space the device has not seen before (made or joined in the Household app) counts at once. When it is a shared space and the entry space is on this device only and holds no stock, the new space becomes the entry space and the empty one stops counting. A space that is gone drops out of the choice; when it was the entry space, the first shared space that counts takes over, else the first space. The page reads the spaces again when it comes to the front, so a change made in the Household app shows on return. Rules: `resolveSelection` ([store](store.md#stock-in-a-space)).
- **Rows.** With more than one space counting, a row that is in stock somewhere has a second line under its name: the names of the counting spaces that have it present, joined with " · " (text only). The line is a button (at least 44 px high, accessible name "Spaces for {name}") that opens the per-space sheet (Detail, below). With one counting space no name and no button is shown.
- **Marks.** The check box of a row shows the combined state and always acts on the entry space's own record (`entryRecords`, so a mark starts from that space's own record and copies nothing from another). The entry space has it present: it is unmarked there, and when another counting space still has it the check mark stays and a toast says "Still in stock at {names}". The entry space does not have it present: it is marked there, also when another space already has it; the check mark then does not change, so a toast says "Added at {space}", with Undo. Quick entry, Mark All Visible (rows not in stock anywhere), Clear Visible (rows the entry space has), Buy Next "Have it", Create and the spec screen's mark and batch actions use the entry space.
- **Detail.** With more than one space counting, every ingredient with a names line has a sheet (`?sheet=batches&ing=<id>`, titled "Spaces for {name}") with one block per counting space: its name, its own in-stock toggle (in stock, out, not tracked as words), its note and, for an ingredient with dates, "Opened" and "Best before"; a prepared ingredient's block also has its batches with Used up and its own date field. Edits go to that space; this is the only way to change another space's record. Focus returns to the names line. With one counting space the sheet exists for prepared ingredients only and writes to that space.
- **Derived views** (Makeable, Buy Next, shelf life, near-date card, the spec screen's stock panel) read the combined view. The combined record is the one of the first counting space that has it present, or the one with the newest batch date when several do, so a fresh batch is never hidden behind an older one (`stock/combine.ts`). The near-date card and the spec screen's batch card therefore show that record's batches only; the other spaces' batches are in the Batches sheet.
- **State.** Ticking and the entry space change the in-memory state and redraw every screen (`stockRev`), and are written behind in order after the stock writes; a failed write reads the store again and says so. Stock that another device changed arrives with a sync cycle and the screens redraw. A second window on the same device does not see changes until it reloads or a cycle brings them.
- **Tests.** Unit: `test/stock-spaces-rules.test.ts` (sorting, ticking and its refusals, the entry space, names, row space names, blocks, newest batch), `test/stock-spaces.test.ts` (combined view, `resolveSelection`), `test/stock-sync.test.ts` (the loop and the status in words). End to end at both sizes: `e2e/spaces.mjs`; the Spaces sheet is in `e2e/a11y.mjs`.
- **Screenshots.** The files `app-stock-places-*` show the sheet of before 2026-11-20 (with Add, Rename and Remove and the word "Places"); they are obsolete ([screenshots](screenshots.md)).
- **Not built.** Clear Visible does not reach ingredients only another space has (use the per-space sheet). No button "sync now". No space-specific colours.
- **Not verified.** A sync against a real storage; two real devices.

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
  (Follow System, Light, Dark; sets `data-theme`); **Keyboard shortcuts** (Yes, No; the single keys `/` and `n` of the drinks list, kept in this browser only, [#75](screens-browse.md#as-built-75)); **Without alcohol
  (calculated) means** and **Low ABV means** (the lines of the alcohol
  filters of the drinks list, [as built](screens-browse.md#as-built-37-alcohol-filters));
  **Data** (Export
  and Import, last export date); **Household** ("Spaces, sync and
  sharing, for all apps"; a link to the Household app at `../`, where
  spaces and their storages are set up; until 2026-11-20 this row was
  "Sync" and opened Mixtura's own Sync page); **About** (version,
  attribution). No account, no sync settings of Mixtura's own, no
  analytics switch (there is no telemetry, [AGENTS.md](../AGENTS.md)).
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

- **Purpose.** Move or back up everything the user entered that is
  Mixtura's own, in one file ([export format](export-format.md)). Stock
  is not in the file: it belongs to a space. The examples below that
  count "stock entries" are from the first design; the file and the
  texts name ingredients, templates, specs and pairings only.
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
  (4). This app reads up to 3.") and nothing is imported. A file of an
  older format is converted, and the preview says that its stock is not
  imported. A valid file
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
- **Data.** Reads and writes the user's ingredients, templates, specs
  and pairings; nothing derived is in the file, and stock is neither
  read nor written.

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
