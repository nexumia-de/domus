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

## Object stores (schema version 4)

Defined as data in `store/schema.ts`; a test compares a freshly migrated
database with that table.

| Store         | Key                       | Indexes                                                                                 | Holds                                                                                                                             |
| ------------- | ------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `specs`       | `id`                      | `lineageId`, `lineage-version` (unique, `[lineageId, version]`), `templateId`, `status` | Every version of every user spec, one record each                                                                                 |
| `ingredients` | `id`                      | `parentId`, `level`                                                                     | User ingredients, prepared ones included                                                                                          |
| `templates`   | `id`                      | `parentId`                                                                              | User templates                                                                                                                    |
| `affinities`  | `id`                      | none                                                                                    | User affinities                                                                                                                   |
| `places`      | `id`                      | none                                                                                    | Places where ingredients are kept ([data model](data-model.md#place))                                                             |
| `stock`       | `[placeId, ingredientId]` | `placeId`                                                                               | Stock records per place, tombstones included ([data model](data-model.md#stock))                                                  |
| `settings`    | `key`                     | none                                                                                    | Device settings: `theme`, `units`, `alcoholWithout`, `alcoholLow` (preset ids of the alcohol filters), `backup`, `places` (below) |
| `meta`        | `key`                     | none                                                                                    | Bookkeeping: `persist` (whether the browser was asked)                                                                            |
| `drafts`      | `key`                     | none                                                                                    | Unsaved editor state, `draft/<id>`; never exported                                                                                |

A stock record may carry `moreBatches` (the made-on dates of further batches of a prepared ingredient, [#101](screens-stock-settings.md#batches-near-their-date-and-more-than-one-batch-101)): the store holds whole records, so this needed no migration; the schema check on every put refuses a repeated or malformed date.

### Places

Stock is kept per place ([#131](https://github.com/nexumia-de/mixtura/issues/131), [stock sync](decisions/stock-sync.md)). The `stock` store is keyed by the pair `[placeId, ingredientId]` with an index on `placeId`; `stockRepo` takes that pair as the key. A record the user removes is not deleted but replaced by a tombstone (`{ placeId, ingredientId, updatedAt, deleted: true }`), so a later merge can tell "removed" from "never entered" ([stock](data-model.md#stock)). The `places` store holds `{ id, name, updatedAt }` and is exported; both stores are checked against their JSON Schemas on every put (`place.schema.json`, `stock.schema.json`), and `placeId` and a place's `id` must be user ids.

The device setting `places` (store `settings`, never exported) is `{ ticked: string[], entry: string }`: `ticked` are the places that count for derived views, `entry` the place new stock entries go to. `store/places.ts` (`resolveSelection`, `LocalStore.placeSelection()`) makes it consistent with the places that exist: ids of deleted places drop out, no ticked place means the first place, a missing entry place means the first ticked one. `stock/state.ts` keeps the records per place in memory and gives the screens the **combined view of the ticked places**, one record per ingredient and without tombstones (`stock/combine.ts`): present when any ticked place has it present, taken from the first ticked place that has it present, else the first with a record. Changes go to the entry place, stamped with `updatedAt` from the app's clock (`today.ts`, `nowInstant`). No screen shows places yet; with one place the app behaves as before.

Differences from the wording of issue #24: there is no `spec-versions`
store (the data model keeps each version as its own record in `specs`,
linked by `lineageId`) and no `prepared` store (a prepared ingredient is
an ingredient with `prepared` set). `templates` and `affinities` are
added because the export file has them. Editor drafts
(`draft/<id>`, [behaviour](behaviour.md#state-and-reload)) have the store
`drafts` since version 3 (issue #25, `store/repo-drafts.ts`): a record is
`{ key, value: { version: 1, draft } }`, a write is not an entity write and
does not touch the backup counter.

## Schema versions and migrations

The database version is the schema version. `store/migrations.ts` holds
the ordered list; each migration runs inside the versionchange
transaction, takes everything as arguments (no globals) and is never
edited after release.

| Version | Migration                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Creates the stores above, empty.                                                                                                  |
| 2       | Copies the shell's interim `localStorage` preferences (`mixtura.prefs`) into `settings` once; no old value means nothing written. |
| 3       | Creates `drafts`, empty.                                                                                                          |
| 4       | Stock per place: makes the default place and moves all stock into it ([below](#migration-4-stock-per-place)).                     |

After opening, `data.ts` removes the old key. A copy of theme and units
stays in `localStorage` (`mixtura.prefs-copy`, `prefs.ts`) only so the
theme is set before first paint; the store is the source of truth and
replaces it when open.

Rules: a change of the layout raises `SCHEMA_VERSION`, adds a migration
and a test that opens a database of the previous version with data in it
(`test/store-migrations.test.ts`). A migration that throws aborts the
upgrade; the old database stays as it was (error `migration`). A stored
version above the app's is refused untouched (`too-new`).

### Migration 4: stock per place

IndexedDB cannot change a key path in place, so inside the one upgrade transaction the migration (1) reads all old stock rows with `getAll` (the read completes before anything is deleted), (2) deletes the `stock` store, (3) creates `places` and the new `stock` store with the key `[placeId, ingredientId]` and the index `placeId`, (4) writes one place named `Home` (`strings.places.home`), (5) writes every old row with that `placeId` and `updatedAt` set to the migration's instant, all other fields as they were, and (6) writes the setting `places` with that place as the only ticked and the entry place. A fresh install runs the same chain (version 1 creates the old empty `stock`), so it also gets `Home`. The clock, the id generator and the name come in through the migration context (`OpenOptions.clock`, `newId`, `placeName`); the pure helper `rowsInPlace` stamps the rows. Any failure aborts the upgrade and leaves version 3 with its stock; the test makes the clock throw to show it. A later migration that touches `stock` must queue its work after this one's read callback has run.

## Reading: seed plus user data

`store/catalog.ts` is the one read API for ingredients, templates, specs
and affinities: seed entries first, then the user's, each with
`origin: 'seed' | 'user'`. The data model forbids user entities with a
seed id (user ids are `u-<uuid>`), so nothing is overridden: on a clash
the seed entity wins and the user id is reported by `shadowed()`. Without
a usable store the catalog is the seed alone.

Seed file: `seed/seed.json` (copied to the build, precached by the
service worker), shape in `store/seed.ts`: `seedVersion`, the four lists,
optional `replacedBy`, `vocabulary` (names of methods and glasses) and
`attribution`. The file is not committed: `build.mjs` assembles it from the
engine package (`packages/app/seed-assemble.mjs`: seed ingredients and specs,
vocabulary, the six root templates; `seedVersion` is `bar-assistant-<7 characters
of the commit>`), about 470 kB, precached by the service worker. Tests use `test/fixtures/seed-fixture.json` (five
ingredients, two specs, all valid against the schemas).

## Writing

Repositories (`repo-entities.ts`): `get`, `list`, `listBy(index, key)`,
`put`, `delete`; specs add `versionsOf(lineageId)` for versions (#26); `store/versions.ts` writes them (`appendVersion`, `setStatus`, `restoreVersion`).
Every `put` validates against the JSON Schemas of
`packages/engine/schemas/` (validators compiled at build time by Ajv standalone, `compile-schemas.mjs`,
[policy](development.md#content-security-policy); the engine folder is
only read) and checks that the ids of a
user entity are user ids. A refusal is a `StoreError` of kind `invalid`
with one line per problem; nothing is written. Settings and `meta` are
not entities and use a hand-written parser with defaults.

Every committed write or delete also adds to the backup change counter
(`store/backup.ts`); export and import are in
[export and import](export-format.md) (`exchange` on the store; the pure rules of the file and the merge plan are in the engine, [engine](engine.md#export-and-import)).

## References

`store/references.ts` wraps the delete calls of `ingredients` and `specs`
(issue #61). A user entity that others reference is not deleted: the call
throws a `StoreError` of kind `referenced` whose `details` and `referrers`
(`{ kind, id, name }`) name what uses it, and nothing changes (and nothing is
counted). The references:

- an ingredient is used by drinks (a line or a substitute, any version; named
  by the newest version's name), by ingredients that have it as `parentId` and
  by affinities;
- a spec is used by a prepared ingredient (`prepared.specId`) and by riffs
  (a spec of another lineage whose `parentId` is one of its versions);
- `specs.deleteLineage(id)` deletes every version of one drink after the same
  check, which is how the app deletes a drink.

The order for a prepared ingredient is its record first, then its spec. Seed
entities are never deleted and never referrers. Tests: `test/store-references.test.ts`.

## Persistent storage

`navigator.storage.persist()` is called once, after the first committed
write of an entity (specs, ingredients, templates, affinities, stock),
never at first load and not for a setting; the behaviour document names
no other moment. The answer is kept in `meta`. Settings shows it under
Storage: not requested yet, kept, not guaranteed, or not supported
(browsers without the API); [UI strings](ui-strings.md#settings).

## Failure

`StoreError.kind` and what the app does:

| Kind          | Cause                                                                                | App                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unavailable` | No IndexedDB, private window, blocked site data                                      | Read-only with seed data, banner, Try Again                                                                                                                     |
| `blocked`     | Upgrade waits for a tab on the old version                                           | Same; Try Again after closing the other window                                                                                                                  |
| `stale`       | Another window upgraded the database (`onversionchange`; this connection was closed) | Same, but the banner says "Another window updated the app or its data" and offers Reload, not Try Again; `e2e/two-tabs.mjs`, `test/store-versionchange.test.ts` |
| `too-new`     | Stored version above the app's                                                       | Same; the data is not touched                                                                                                                                   |
| `migration`   | A migration threw                                                                    | Same; rolled back                                                                                                                                               |
| `quota`       | Device storage full                                                                  | The write fails; a setting is reverted, banner "Not saved"                                                                                                      |
| `invalid`     | Schema or id rule broken                                                             | The write is refused                                                                                                                                            |
| `seed`        | Built-in data did not load or is malformed                                           | Banner "Data could not be loaded"; user data is unaffected                                                                                                      |

The texts are in [UI strings](ui-strings.md#errors-and-offline). The
behaviour document asks for a full-screen status; the build shows the
same title, text and Try Again as a banner above the working app,
because read-only browsing needs the app itself.

### Drafts

A draft is written 300 ms after the last change, when the page is hidden,
and, since the save-interrupt fix, awaited before a save writes its version;
the save deletes it only after the version (and a prepared ingredient's
record) has committed. The stores cannot share one transaction here, so the
order is what keeps the edit: see [as built #25](screens-specs.md#as-built-25).

# Tests

Export and import: [export and import](export-format.md#tests).

- `test/store-repos.test.ts`: schema equals `schema.ts`, create, read,
  update and delete for every entity, validation refusals, id rules, seed
  never in user stores, overlay rules, settings.
- `test/store-migrations.test.ts`: version 1 database with data upgraded,
  legacy preferences moved once, version 3 databases (with several stock
  rows including `moreBatches`, and empty) upgraded into the default place
  with nothing lost, a failing migration rolled back (also migration 4),
  fresh install with the default place, newer database refused, no
  IndexedDB, blocked upgrade. `test/stock-places.test.ts`: combined view
  and entry place.
- `test/store-persist.test.ts`, `test/store-seed.test.ts`,
  `test/store-references.test.ts` (references and drafts).
- `e2e/store.mjs` in a real browser: settings survive a reload, a
  hand-built version 1 database with a spec and stock record is migrated
  and keeps them, a version 3 database with stock rows ends with all of
  them in the default place, no IndexedDB and a too-new database show the banner.
  The tests use `fake-indexeddb` ([dependencies](dependencies.md)).
