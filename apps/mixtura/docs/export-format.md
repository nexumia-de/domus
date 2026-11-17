---
type: Specification
title: Export and import
description: The export file of the app, how it is read (limits, validation, version rules), the two import modes with their merge rules, the import backup and Undo, the change counter and the backup reminder, and how it is tested.
tags: [export, import, backup, format-version, store]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: model
    title: Data model, export file
    url: data-model.md#export-file
  - id: screens
    title: Screens, export and import
    url: screens-stock-settings.md#export-and-import
---

# Export and import

Built by issue #28 in `packages/app/src/store/exchange/` (pure parts and
the transaction), `store/backup.ts` (counter) and
`packages/app/src/screens/settings/data.ts` (screen, URL
`#/settings/data`). The format itself is in the
[data model](data-model.md#export-file); the screen's behaviour in
[screens](screens-stock-settings.md#export-and-import); texts in
[UI strings](ui-strings.md).

## Export

One JSON file: `app`, `formatVersion`, `exportedAt`, `seedVersion` (the
built-in data the references were made against) and the five lists of
user data. Settings, the persistence answer and seed data are not in it.
Records are sorted by id, so the same data gives the same text.

`exportedAt` and the seed version are passed in by the host
(`exchange.exportData({ exportedAt, seedVersion })`); the store reads no
clock for it. The host downloads the text as a Blob through a temporary
link, named `mixtura-backup-YYYY-MM-DD.json` (date of `exportedAt`, UTC).
No network request. After the download the counter restarts and a toast
"Exported {counts}" shows. The browser cannot tell whether the user
finished the save dialog; the app counts the export as made when the
download starts. Share sheet and File System Access API are not used:
the plain download works everywhere.

## Import

`parseExportFile(text, size)` reads a file the user chose. It is untrusted
input and is checked completely before anything is written:

1. Size at most 10 MB (`MAX_FILE_BYTES`), checked against the reported
   size before the file is read into memory.
2. JSON; any key named `__proto__`, `constructor` or `prototype` anywhere
   refuses the file (no prototype pollution).
3. `app` is `mixtura` ("not a Mixtura export" otherwise).
4. `formatVersion` is a whole number from 1. Above the app's version:
   refused with both numbers ("It is format 3; this app reads up to 1.").
   Below: migrated by the pure functions of `exchange/migrate.ts`
   ([migration rule](data-model.md#export-file)); the list is empty while
   version 1 is the only one.
5. The current JSON Schema `export.schema.json` with all entity schemas
   (`additionalProperties: false`), at most 20 problems reported.
6. Ids: ingredients, templates, affinities, specs and `lineageId` must be
   user ids (`u-<uuid>`); a stock record may use a seed id. Repeated ids,
   repeated stock keys and repeated (`lineageId`, `version`) slots are
   refused.

Any problem refuses the whole file and nothing changes; there is no
partial import. A valid file shows a summary and, for both modes, what
would happen (computed without writing): added, replaced, skipped and, for
replace, removed.

### Modes

| Mode               | Same id                                                                                        | Not in the file                      |
| ------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| Merge              | The existing record stays; a spec with a newer `updatedAt` in the file replaces its older one. | Stays.                               |
| Replace Everything | The file's record is written; an identical record is left alone (skipped).                     | Deleted (the five user stores only). |

A merge never drops a spec version: a file record that would take the
(`lineageId`, `version`) slot of a different existing record is skipped.
Records without `updatedAt` (everything but specs) are never replaced by a
merge. Settings are never touched by an import.

### One transaction, import backup, Undo

`applyInTransaction` reads the data, computes the plan from it and writes
the result plus the import backup (`meta` key `importBackup`: the data as it
was and the time) in one IndexedDB transaction over the five stores and
`meta`. A failure (full device, a record the store refuses) aborts it all:
data and backup stay as they were. The toast "Imported {counts}" offers
Undo for 8 seconds; Undo replaces the data with the backup in one transaction
and removes it. Because the backup is in the store, it can also be used
after the toast has gone only by the toast; Settings offers Delete Import
Backup ([screens](screens-stock-settings.md#export-and-import)). The next
import overwrites it.

## Change counter and reminder

The `backup` setting holds `changesSinceExport`, `firstChangeAt`,
`lastExportAt` and `dismissedAt`. Every committed write or delete of an
entity through the repositories adds one (`store/backup.ts`, called from the
same hook as the persistence request); an import or Undo adds the number of
records it changed; a rejected write adds nothing; settings do not count.
Updates are serialised so quick writes do not lose counts. The clock is a
store option (`clock`), fixed in tests. Export sets the count to 0.

The reminder (`reminderDue`, pure) shows when the count is above 0, the last
export (or without one, the first change) is at least 30 days back
(`REMIND_AFTER_DAYS`, the value of the screens document) and it was not
dismissed in the last 30 days. It is a calm banner at the top of Settings
and of the Data screen, never a dialog, never on the Drinks list, never on
start-up beyond that; Dismiss hides it for 30 days. "Never remind me" of the
issue text is not built: the 30-day rule already stays quiet after a
dismissal, and the behaviour document names only a dismissible banner.

Deviations from issue wording, decided by the behaviour document: no engine
module (the engine is not touched; the export schema was already in
`packages/engine/schemas/`), no partial import, Merge and Replace
Everything instead of a confirmation, the import backup kept in the store
rather than only in memory.

## Tests

- `test/exchange-format.test.ts`: file shape, stability, file name,
  refusals (damaged, other app, newer, invalid, too large, forbidden keys,
  id rule, duplicates), migration mechanism, reminder rule.
- `test/exchange-store.test.ts`: round trip into a fresh database, merge and
  replace rules, version-slot rule, Undo, a failing import changing
  nothing, change counter.
- `e2e/exchange.mjs` at 360 x 720 and 1200 x 800: export, wipe (fresh
  context), import, compare, Undo, five kinds of broken file, reminder, no
  request leaving the origin. Screenshots `docs/screenshots/data-*`.

## Open

The schema of the export file is imported from `packages/engine/schemas/`;
reading and merging could move into the engine when the kitchen app needs
the same. Tracked in a follow-up issue.
