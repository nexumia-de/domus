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

Built by issue #28; the pure rules were moved into the engine by #65
(`packages/engine/src/exchange/`, [engine](engine.md#export-and-import)).
The transaction, backup and Undo are in `packages/app/src/store/exchange/`,
the counter in `store/backup.ts`, and the screen in
`packages/app/src/screens/settings/data.ts` (URL `#/settings/data`).
The format itself is in the
[data model](data-model.md#export-file); the screen's behaviour in
[screens](screens-stock-settings.md#export-and-import); texts in
[UI strings](ui-strings.md).

## Where the rules live

| Job                                                                                   | Where                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Shape of the file, building the object, file name, counts                             | engine `exchange/types.ts`, `build.ts`                                    |
| Reading a file: size, forbidden keys, version, migration, ids, repeats, riff loops    | engine `exchange/parse.ts`, `migrate.ts`, `ids.ts`                        |
| The merge and replace plan                                                            | engine `exchange/merge.ts` (order of `updatedAt`: `instantMs` of materia) |
| JSON Schema check (Ajv)                                                               | app `store/validate.ts`, handed to the engine as `schemaProblems`         |
| Reading and writing IndexedDB, one transaction, import backup, Undo, the clock, files | app `store/exchange/` (`snapshot.ts`, `index.ts`), `exchange-actions.ts`  |
| Change counter and reminder                                                           | app `store/backup.ts`, `store/exchange/reminder.ts`                       |

The schema check is the one dependency the engine must not have: Ajv's
compiler is a development tool of the app (it generates the validators at
build time) and would be about 120 kB in a bundle that has no
dependency ([dependencies](dependencies.md)). So `parseExportFile` takes the
check as an argument (`SchemaCheck`), and the app's thin wrapper
(`store/exchange/parse.ts`) passes `exportProblems`. The tests of the
engine pass Ajv from the development dependencies for the real check and a
stub for the rules that do not depend on it (vectors). The schemas stay in
`packages/engine/schemas/` and are the same files for both. The store
re-exports the engine names, so the screens' imports did not change.

## Export

Editor drafts (store `drafts`) are not part of the file: they are unsaved work, not data.

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

`parseExportFile(text, size)` (engine rule, app wrapper) reads a file the user chose. It is untrusted
input and is checked completely before anything is written:

1. Size at most 10 MB (`MAX_FILE_BYTES`), checked against the reported
   size before the file is read into memory.
2. JSON; any key named `__proto__`, `constructor` or `prototype` anywhere
   refuses the file (no prototype pollution).
3. `app` is `mixtura` ("not a Mixtura export" otherwise).
4. `formatVersion` is a whole number from 1. Above the app's version:
   refused with both numbers ("It is format 3; this app reads up to 2.").
   Below: migrated by the pure functions of the engine's `exchange/migrate.ts`
   ([migration rule](data-model.md#export-file),
   [version 2](#version-2-stock-per-place)); the app passes what a step
   needs besides the file (`migrationInput`).
5. The current JSON Schema `export.schema.json` with all entity schemas
   (`additionalProperties: false`), at most 20 problems reported.
6. Ids: ingredients, templates, affinities, specs and `lineageId` must be
   user ids (`u-<uuid>`), and so are place ids and the `placeId` of stock;
   the `ingredientId` of a stock record may be a seed id. Repeated ids,
   repeated stock keys (place and ingredient together) and repeated
   (`lineageId`, `version`) slots are refused, and so is a stock record
   whose `placeId` names no place of the file.

Any problem refuses the whole file and nothing changes; there is no
partial import. A valid file shows a summary and, for both modes, what
would happen (computed without writing): added, replaced, skipped and, for
replace, removed.

### Modes

| Mode               | Same id                                                                                                               | Not in the file                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Merge              | The existing record stays; a spec, place or stock record with a newer `updatedAt` in the file replaces its older one. | Stays.                              |
| Replace Everything | The file's record is written; an identical record is left alone (skipped).                                            | Deleted (the six user stores only). |

A merge never drops a spec version: a file record that would take the
(`lineageId`, `version`) slot of a different existing record is skipped.
Records without `updatedAt` (ingredients, templates, affinities) are never
replaced by a merge. Settings are never touched by an import.

Keys: `id` for every kind except stock, which has the pair `placeId` and
`ingredientId`: the same ingredient in two places is two records. In a
merge a record whose key is new is added; for an existing key the one with
the newer `updatedAt` wins, an equal or older one is skipped. A tombstone is
a stock record like any other, so a newer removal wins over an older live
record and a newer live record brings a removed one back; the same rule
applies to places (a newer name wins).

### Version 2: stock per place

Format version 2 ([#131](https://github.com/nexumia-de/mixtura/issues/131))
adds `places` to the file (written before `stock`), gives every stock
record `placeId` and `updatedAt`, and allows tombstones
(`deleted: true`, no other field; [stock](data-model.md#stock)). The
migration from version 1 (`formatMigrations[0]`) puts all stock of the
old file into one place and sets `places` to that place alone. The engine
has no ids or clock, so the place comes from the caller:
`parseExportFile(text, bytes, check, { migrationInput: { placeForOldStock } })`,
where the app passes its entry place (`exchange-actions.ts`). Migrated stock
records get `updatedAt` equal to the file's `exportedAt`, or the place's
`updatedAt` if the file has none. A version 1 file parsed without
`placeForOldStock` is refused with the failure `needs-place`; nothing is
guessed. Merging a migrated file into the app that supplied the place
adds the stock to that place, and a migrated record is skipped when the
app has the same record with a newer or equal `updatedAt`.

### One transaction, import backup, Undo

`applyInTransaction` reads the data, computes the plan from it and writes
the result plus the import backup (`meta` key `importBackup`: the data as it
was and the time) in one IndexedDB transaction over the six stores and
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

- Engine `test/exchange.test.ts` (with Ajv): file shape, stability, file
  name, refusals (damaged, other app, newer, invalid, too large, forbidden
  keys, id rule, duplicates), migration mechanism, the version 1 file
  (`schemas/examples/legacy/`) read with and without a place, tombstones.
- Engine `test/exchange-vectors.test.ts` over `vectors/exchange/` (schema
  check stubbed): every merge and replace case of the plan and every
  refusal that does not depend on the schema, among them the version 1
  migration, tombstones, stock and place merge by `updatedAt` (newer, older,
  equal), the same ingredient in two places and an unknown place.
- `test/exchange-format.test.ts` (app): the wrapper uses the real schema
  check; reminder rule.
- `test/exchange-store.test.ts`: round trip into a fresh database, merge and
  replace rules, version-slot rule, Undo, a failing import changing
  nothing, change counter.
- `e2e/exchange.mjs` at 360 x 720 and 1200 x 800: export, wipe (fresh
  context), import, compare, Undo, five kinds of broken file, reminder, no
  request leaving the origin. Screenshots `docs/screenshots/data-*`.

## Open

The pure rules are in the engine, so the kitchen app can reuse them; what
it still needs is its own `APP_TAG` and record kinds, a decision for when
that app starts.
