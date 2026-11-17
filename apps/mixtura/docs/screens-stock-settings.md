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
[360](screenshots/stock-360x720.png),
[1200](screenshots/stock-1200x800.png).

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
[360](screenshots/buy-next-360x720.png),
[1200](screenshots/buy-next-1200x800.png).

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
  (Follow System, Light, Dark; sets `data-theme`); **Data** (Export
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
  `mixtura-2026-11-17.json` (date from the host). A toast "Exported 34
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
