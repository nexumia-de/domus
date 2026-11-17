---
type: Specification
title: Local store
description: The app's IndexedDB store - object stores and indexes, schema versions and migrations, seed data kept read-only beside user data with one catalog view, persistent-storage request, failure states and how it is tested.
tags: [store, indexeddb, migrations, seed, persistence]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: model
    title: Data model
    url: data-model.md
  - id: pwa
    title: PWA with own local data
    url: decisions/pwa-own-data.md
---

# Local store

`packages/app/src/store/` keeps what the user entered in IndexedDB
([PWA decision](decisions/pwa-own-data.md)); nothing derived is stored
([data model](data-model.md)). Seed data is shipped with the app and
never written into the database. Built by issue #24.

## Object stores (schema version 2)

Defined as data in `store/schema.ts`; a test compares a freshly migrated
database with that table.

| Store         | Key            | Indexes                                                                                 | Holds                                                  |
| ------------- | -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `specs`       | `id`           | `lineageId`, `lineage-version` (unique, `[lineageId, version]`), `templateId`, `status` | Every version of every user spec, one record each      |
| `ingredients` | `id`           | `parentId`, `level`                                                                     | User ingredients, prepared ones included               |
| `templates`   | `id`           | `parentId`                                                                              | User templates                                         |
| `affinities`  | `id`           | none                                                                                    | User affinities                                        |
| `stock`       | `ingredientId` | none                                                                                    | Stock records                                          |
| `settings`    | `key`          | none                                                                                    | Device settings: `theme`, `units`, `backup`            |
| `meta`        | `key`          | none                                                                                    | Bookkeeping: `persist` (whether the browser was asked) |

Differences from the wording of issue #24: there is no `spec-versions`
store (the data model keeps each version as its own record in `specs`,
linked by `lineageId`) and no `prepared` store (a prepared ingredient is
an ingredient with `prepared` set). `templates` and `affinities` are
added because the export file has them. Editor drafts
(`draft/<spec id>`, [behaviour](behaviour.md#state-and-reload)) get their
store with the editor issue, as a new migration.

## Schema versions and migrations

The database version is the schema version. `store/migrations.ts` holds
the ordered list; each migration runs inside the versionchange
transaction, takes everything as arguments (no globals) and is never
edited after release.

| Version | Migration                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Creates the stores above, empty.                                                                                                  |
| 2       | Copies the shell's interim `localStorage` preferences (`mixtura.prefs`) into `settings` once; no old value means nothing written. |

After opening, `data.ts` removes the old key. A copy of theme and units
stays in `localStorage` (`mixtura.prefs-copy`, `prefs.ts`) only so the
theme is set before first paint; the store is the source of truth and
replaces it when open.

Rules: a change of the layout raises `SCHEMA_VERSION`, adds a migration
and a test that opens a database of the previous version with data in it
(`test/store-migrations.test.ts`). A migration that throws aborts the
upgrade; the old database stays as it was (error `migration`). A stored
version above the app's is refused untouched (`too-new`).

## Reading: seed plus user data

`store/catalog.ts` is the one read API for ingredients, templates, specs
and affinities: seed entries first, then the user's, each with
`origin: 'seed' | 'user'`. The data model forbids user entities with a
seed id (user ids are `u-<uuid>`), so nothing is overridden: on a clash
the seed entity wins and the user id is reported by `shadowed()`. Without
a usable store the catalog is the seed alone.

Seed file: `seed/seed.json` (copied to the build, precached by the
service worker), shape in `store/seed.ts`: `seedVersion`, the four lists,
optional `replacedBy`. The file now committed is an empty placeholder;
issue #13 fills it. Tests use `test/fixtures/seed-fixture.json` (five
ingredients, two specs, all valid against the schemas).

## Writing

Repositories (`repo-entities.ts`): `get`, `list`, `listBy(index, key)`,
`put`, `delete`; specs add `versionsOf(lineageId)` for versions (#26).
Every `put` validates against the JSON Schemas of
`packages/engine/schemas/` (Ajv, bundled; the schemas are imported from
the engine folder, which is not edited) and checks that the ids of a
user entity are user ids. A refusal is a `StoreError` of kind `invalid`
with one line per problem; nothing is written. Settings and `meta` are
not entities and use a hand-written parser with defaults.

Every committed write or delete also adds to the backup change counter
(`store/backup.ts`); export and import are in
[export and import](export-format.md) (`exchange` on the store).

Not built yet: refusing to delete a user entity that others reference
([data model](data-model.md#ids), issue #61).

## Persistent storage

`navigator.storage.persist()` is called once, after the first committed
write of an entity (specs, ingredients, templates, affinities, stock),
never at first load and not for a setting; the behaviour document names
no other moment. The answer is kept in `meta`. Settings shows it under
Storage: not requested yet, kept, not guaranteed, or not supported
(browsers without the API); [UI strings](ui-strings.md#settings).

## Failure

`StoreError.kind` and what the app does:

| Kind          | Cause                                           | App                                                        |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `unavailable` | No IndexedDB, private window, blocked site data | Read-only with seed data, banner, Try Again                |
| `blocked`     | Upgrade waits for a tab on the old version      | Same; Try Again after closing the other window             |
| `too-new`     | Stored version above the app's                  | Same; the data is not touched                              |
| `migration`   | A migration threw                               | Same; rolled back                                          |
| `quota`       | Device storage full                             | The write fails; a setting is reverted, banner "Not saved" |
| `invalid`     | Schema or id rule broken                        | The write is refused                                       |
| `seed`        | Built-in data did not load or is malformed      | Banner "Data could not be loaded"; user data is unaffected |

The texts are in [UI strings](ui-strings.md#errors-and-offline). The
behaviour document asks for a full-screen status; the build shows the
same title, text and Try Again as a banner above the working app,
because read-only browsing needs the app itself.

## Tests

Export and import: [export and import](export-format.md#tests).

- `test/store-repos.test.ts`: schema equals `schema.ts`, create, read,
  update and delete for every entity, validation refusals, id rules, seed
  never in user stores, overlay rules, settings.
- `test/store-migrations.test.ts`: version 1 database with data upgraded,
  legacy preferences moved once, failing migration rolled back, newer
  database refused, no IndexedDB, blocked upgrade.
- `test/store-persist.test.ts`, `test/store-seed.test.ts`.
- `e2e/store.mjs` in a real browser: settings survive a reload, a
  hand-built version 1 database with a spec and stock record is migrated
  and keeps them, no IndexedDB and a too-new database show the banner.
  The tests use `fake-indexeddb` ([dependencies](dependencies.md)).
