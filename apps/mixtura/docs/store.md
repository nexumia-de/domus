---
type: Specification
title: Local store
description: The app's IndexedDB store (schema version 6) - object stores and indexes, schema versions and migrations, stock as the collection `stock` of a space in the shared database of the host package, the sync loop per shared space, seed data kept read-only beside user data with one catalog view, persistent-storage request, failure states and how it is tested.
tags: [store, indexeddb, migrations, seed, persistence, stock, spaces, sync]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: model
    title: Data model
    url: data-model.md
  - id: pwa
    title: PWA with own local data
    url: decisions/pwa-own-data.md
  - id: spaces
    title: 'Decision: stock in spaces'
    url: decisions/stock-in-spaces.md
  - id: host
    title: 'Spaces on the host: the store, the cycle, the loop'
    url: ../../../packages/host/docs/spaces.md
---

# Local store

`packages/app/src/store/` keeps what the user entered in IndexedDB
([PWA decision](decisions/pwa-own-data.md)); nothing derived is stored
([data model](data-model.md)). Seed data is shipped with the app and
never written into the database. Built by issue #24. Stock is not in this
database: it is a collection of a space in the database the apps share
([below](#stock-in-a-space)).

## Object stores (schema version 6)

Defined as data in `store/schema.ts`; a test compares a freshly migrated
database with that table. The database is named `mixtura`.

| Store         | Key   | Indexes                                                                                 | Holds                                                                                                                                                                                                    |
| ------------- | ----- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specs`       | `id`  | `lineageId`, `lineage-version` (unique, `[lineageId, version]`), `templateId`, `status` | Every version of every user spec, one record each                                                                                                                                                        |
| `ingredients` | `id`  | `parentId`, `level`                                                                     | User ingredients, prepared ones included                                                                                                                                                                 |
| `templates`   | `id`  | `parentId`                                                                              | User templates                                                                                                                                                                                           |
| `affinities`  | `id`  | none                                                                                    | User affinities                                                                                                                                                                                          |
| `settings`    | `key` | none                                                                                    | Device settings: `theme`, `units`, `alcoholWithout`, `alcoholLow` (preset ids of the alcohol filters), `buyNextMode`, `buyNextDrafts`, `buyNextRetired`, `backup`, `spaces` ([below](#stock-in-a-space)) |
| `meta`        | `key` | none                                                                                    | Bookkeeping: `persist` (whether the browser was asked)                                                                                                                                                   |
| `drafts`      | `key` | none                                                                                    | Unsaved editor state, `draft/<id>`; never exported                                                                                                                                                       |

Until version 5 the database also had the stores `places`, `stock`,
`storages` and `bindings`. Migration 6 dropped them on 2026-11-20
([stock in spaces](decisions/stock-in-spaces.md)).

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
| 4       | Stock per place: made the stores `places` and `stock` with a default place. History; migration 6 drops both.                      |
| 5       | Created `storages` and `bindings`, empty. History; migration 6 drops both.                                                        |
| 6       | Drops `places`, `stock`, `storages` and `bindings` and the setting `places` ([below](#migration-6-stock-leaves-the-database)).    |

After opening, `data.ts` removes the old key. A copy of theme and units
stays in `localStorage` (`mixtura.prefs-copy`, `prefs.ts`) only so the
theme is set before first paint; the store is the source of truth and
replaces it when open.

Rules: a change of the layout raises `SCHEMA_VERSION`, adds a migration
and a test that opens a database of the previous version with data in it
(`test/store-migrations.test.ts`). A migration that throws aborts the
upgrade; the old database stays as it was (error `migration`). A stored
version above the app's is refused untouched (`too-new`).

### Migration 6: stock leaves the database

Stock is a collection of a space now and sync is set up in the Household
app, so the migration deletes the stores `places`, `stock`, `storages` and
`bindings` and the settings record `places`. Nothing is carried over: the
stock, the places, the storages with their credentials and the bindings
with their passphrases are gone after the upgrade (owner's decision, no
existing data mattered; [stock in spaces](decisions/stock-in-spaces.md)).
The other stores and settings stay as they were.

Migration 4 makes two of these stores inside the callback of a read, so
migration 6 queues its work behind a read of its own (`settings`) and
deletes only the stores that exist. A failure aborts the upgrade and
leaves the earlier version. Migrations 4 and 5 are kept unchanged, as
every released migration is: a fresh install runs the whole chain and
ends without the four stores. The migration context still carries `clock`,
`newId` and `placeName` for migration 4.

## Stock in a space

Stock is the collection `stock` of a **space**, kept in the database
`domus` of the host package (`@nexumia-de/hospes`, `createIdbStore`), which
all apps on the address share
([data model](data-model.md#stock),
[spaces on the host](../../../packages/host/docs/spaces.md)). `data.ts`
opens that store once as `AppData.shared`. It is opened apart from
Mixtura's own database: when Mixtura's database cannot be used, the stock
is shown empty and cannot be changed.

`stock/source.ts` is the only file that knows the shape of the collection:

- `loadStock` calls the host's `ensureSpace`: a device without a space
  gets one that is on this device only (storage type `device`), named
  `Home` (`strings.spaces.home`). It then reads the collection of every
  space. A space without a name is shown as `Space`
  (`strings.spaces.unnamed`).
- `rowsOf` turns the records of a collection into rows
  `{ spaceId, ingredientId, updatedAt, ... }`. The key of a record is the
  ingredient id. A removed record stays as a removal marker (a row with
  `deleted: true`), so a merge can tell "removed" from "never entered".
- **Values read are not trusted.** The collection is shared with other
  apps and other devices. A record whose value does not pass
  `stock.schema.json` (`isStockValue` in `store/validate.ts`, the
  validator compiled at build time) is not shown and stays in the
  collection untouched. The schema allows further properties, so a field
  another app added passes and is kept: Mixtura changes a copy of the
  stored value (`valueOf` takes only `spaceId`, `ingredientId` and
  `updatedAt` off a row).
- `writeStock` writes the changed rows with the host's `localChange`, one
  atomic change per space: a live row is put, a removal removes the
  record. **The stamp is the host's**: `localChange` gives the records a
  time later than every record in the collection, even when the device
  clock is behind. The `updatedAt` a row carries in memory before the
  write is the app's clock (`today.ts`, `nowInstant`).

`stock/state.ts` keeps the records of every space in memory and gives the
screens the **combined view of the ticked spaces**, one record per
ingredient and without removal markers (`stock/combine.ts`): present when
any ticked space has it present, taken from the first ticked space that
has it present (the one with the newest batch date when several do), else
the first with a record. A change shows at once and is written behind, in
order; a write that fails puts the old records back and says so. A change
goes to the entry space unless it names its space.

The device setting `spaces` (store `settings`, never exported) is
`{ ticked: string[], entry: string, known: string[] }`: `ticked` are the
spaces that count for derived views, `entry` is the space new stock
entries go to, `known` are the spaces this device has seen.
`resolveSelection` in `stock/spaces-rules.ts` makes it consistent with the
spaces of the device every time the stock is read, and the result is
stored when it differs:

- ids of spaces that are gone drop out;
- a space that is not in `known` counts at once, so the stock of a
  household joined in the Household app shows without a further step;
- when such a new space is a shared one and the entry space is on this
  device only and holds no live stock record, the new space becomes the
  entry space and the empty one stops counting;
- without an entry space the first shared space that counts is taken,
  else the first space.

The spaces are kept sorted by name and the entry space always counts. The
Spaces sheet changes `ticked` and `entry`
([spaces](screens-stock-settings.md#spaces)). Making, naming, sharing and
removing a space is the Household app's; Mixtura does not write a space
except the first one on a device without any.

## Sync

Mixtura has no sync code of its own. `createCollectionSync` of the host package (until 2026-11-20 Mixtura's own `stock/sync.ts`)
starts one loop of the host package (`createSyncLoop`) per shared space;
each run is the host's cycle `syncCollection` on the collection `stock`
([the cycle and the loop](../../../packages/host/docs/spaces.md#one-cycle-cyclets)).
A space on this device only gets no loop and causes no request.

- `refresh()` reads the spaces of the device. It starts a loop for a
  shared space it does not run yet, stops the loop of a space that is
  gone, and makes a new loop when the secret or the storage of a space
  changed. It is called after the stock was read and when the page comes
  to the front.
- The triggers (`stock/sync-triggers.ts`, started in `main.ts`): the
  start of a loop, the loop's own timer while the app is in front
  (20 seconds, the host's default), a change of stock in a space
  (`stock/written.ts`; the loop waits 2 seconds), the browser event
  `online`, and the page coming to the front, which also reads the spaces
  again. After failures the loop backs off (the host's rule, at most
  5 minutes).
- When a cycle changed local records, the stock is read again and every
  screen redraws. A change that arrived by sync does not start another
  cycle.
- The adapter comes from the host's `adapterFor`. A storage type this
  build does not know gives the failure `storage` and no loop runs.
- The status per space, for the Spaces sheet: `device-only`, `never`,
  `syncing`, `in-step` (with the time of the last good cycle) or `failed`
  (with the host's failure word and the last good time, if any). The time
  of the last good cycle is read from the collection (`syncedAt`) at the
  start. The words are in
  [spaces](screens-stock-settings.md#spaces).

**The GitHub API address is compiled in.** `src/env.ts` exports
`GITHUB_API`, which is `https://api.github.com` in every build but a test
build; `data.ts` passes it to `adapterFor`. No URL parameter, stored
setting or invite can send a token to another host. `build.mjs` sets
another address only when the environment variable `MIXTURA_GITHUB_API`
is given; that is for the browser checks, which talk to a fake.

Not verified: a cycle against the real GitHub or a real WebDAV server, two
real devices, the timing of the loop on a phone
([decision](decisions/stock-in-spaces.md#not-verified)).

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
[export and import](export-format.md) (`exchange` on the store; the pure rules of the file and the merge plan are in the engine, [engine](engine.md#export-and-import)). A stock mark is not such a write: it goes to the shared database through `stock/source.ts`, not through these repositories, so it does not add to the backup change counter. The export file holds no stock.

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
write of an entity (specs, ingredients, templates, affinities), never at
first load and not for a setting; the behaviour document names no other
moment. The first stock mark asks too (`stock/state.ts`, after the write
into the space): stock is in the shared database, which the browser keeps
or drops together with Mixtura's own. A stock mark does not count for the
backup reminder, because the export holds no stock. The answer is kept in `meta`. Settings shows it under
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
- `test/store-migrations.test.ts`: version 1 database with data upgraded
  without losing the user's own data, legacy preferences moved once,
  migration 4 on a version 3 database (history, still run on the way up)
  and its rollback, migration 6 (the four stores and the setting `places`
  leave, the rest stays), a fresh install that ends without them, a
  failing migration rolled back, newer database refused, no IndexedDB,
  blocked upgrade.
- `test/stock-state.test.ts`: the `Home` space on a device without one, a
  change stored in the space, removal markers, fields of another app
  kept, a value that is no stock value left alone, the stamp with a clock
  that is behind, no stock in the export.
- `test/stock-spaces.test.ts` and `test/stock-spaces-rules.test.ts`: the
  combined view, the entry space, `resolveSelection` and the rules of
  ticking.
- `packages/host/test/collection-sync.test.ts`: two devices converge on a shared space over
  a fake adapter, no request for a space on this device only, a failed
  cycle, an unknown storage, a space that got a storage or left, the
  status in words.
- `test/store-persist.test.ts`, `test/store-seed.test.ts`,
  `test/store-references.test.ts` (references and drafts).
- `e2e/store.mjs` in a real browser: settings survive a reload, a
  hand-built database of an earlier version is migrated and keeps the
  user's entities, no IndexedDB and a too-new database show the banner.
  The tests use `fake-indexeddb` ([dependencies](dependencies.md)).
