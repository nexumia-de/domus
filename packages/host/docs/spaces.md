---
type: Specification
title: Spaces on the host
description: The host side of sync on spaces - the secret and the HKDF derivation of id, content key and access token, the sealed file, the invite link, the Store port and the shared IndexedDB database, a space on this device only, one sync cycle step by step with its guarantees, the sync loop, and the limits.
tags: [spaces, sync, hkdf, aes-gcm, indexeddb, invite, cycle]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Decision: one address, spaces, and the storages on offer'
    url: ../../../docs/decisions/one-origin-spaces-storages.md
  - id: materia
    title: 'materia, sync: Spaces (the pure rules this builds on)'
    url: ../../model/docs/sync.md#spaces
  - id: hkdf
    title: 'RFC 5869: HMAC-based Extract-and-Expand Key Derivation Function'
    url: https://www.rfc-editor.org/rfc/rfc5869
---

# Spaces on the host

Roadmap goal 3, host side: from a space's secret to a finished sync
cycle for one collection against any `StorageAdapter`, with local data in
one IndexedDB database shared by all apps on the address. The pure rules
(stamp, pruning, collection document, plan, sealed file, invite) are in
[materia](../../model/docs/sync.md#spaces); this part does what touches
the browser. There are no screens here; the storage adapters are
[WebDAV](webdav.md) and [GitHub](github.md), and the sync server is a
later goal. Every
external effect is a function the caller can replace: the clock, the
randomness, the timers.

## The secret and what is derived (`space.ts`)

`newSecret(random?)` gives 32 random bytes as base64url without padding
(43 characters), the form the invite carries.

`deriveSpace(secret)` runs HKDF-SHA-256 with an empty salt over the 32
bytes, once per label:

| Label                   | Output                                         | Becomes                                 |
| ----------------------- | ---------------------------------------------- | --------------------------------------- |
| `domus/space/id/1`      | 16 bytes, lowercase hex (32 characters)        | `id`: the folder name in a storage      |
| `domus/space/content/1` | AES-256-GCM key, non-extractable `CryptoKey`   | `key`: encrypts and decrypts the files  |
| `domus/space/access/1`  | 32 bytes, base64url without padding (43 chars) | `access`: what a sync server will check |

A secret that is not 43 base64url characters throws `BadSecret`. The
last character of 43 carries two unused bits; they are ignored, so two
spellings of one secret give one space (harmless). The server sees id
and access token, never the secret or the key; they cannot be turned
back into each other.

Fixed vector (secret = bytes 0 to 31, `AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8`):
id `cfa6a5e7daf2bdd14b468c61b095f608`, access token
`AByoHAamt55eSMz4zBip8hfzUNKn62X_FjoT3lQdwRk`. The test checks both
against Node's `hkdfSync` and checks that the content key decrypts with
`node:crypto` using `hkdfSync(..., 'domus/space/content/1', 32)`.

## The sealed file (`seal.ts`)

`sealCollection(space, document, random?)` builds the collection text
(`buildCollection`), encrypts it with AES-256-GCM under `space.key`, a
fresh random 12-byte nonce and the additional data
`sealedAad(space.id, collection)` (`materia-sync/2/<space>/<collection>`),
and returns `buildSealed` text with `cipher.name` `AES-256-GCM`.

`openCollection(space, collection, text)` never throws for a bad file; it
returns `{ ok: true, document }` or `{ ok: false, error, detail? }`:

| Error              | Meaning                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not-sealed`       | not a version 2 file: not JSON, another format, version 1, a broken frame, another cipher name, a nonce that is not 12 bytes; `detail` says which |
| `newer-version`    | the sealed file or the document inside is of a newer version than this build reads                                                                |
| `wrong-key`        | authentication failed: a wrong secret, a changed file, or a file of another collection or space put in its place. These cannot be told apart.     |
| `bad-document`     | decrypted, but not a collection document; `detail` is the parse error (or `not text`)                                                             |
| `other-space`      | a valid document of another space (sealed with the right key and data, so only a bug or a copy by a key holder gives it)                          |
| `other-collection` | likewise for the collection                                                                                                                       |

## The invite as a link (`invite-link.ts`)

`inviteToFragment(invite)` is `buildInvite`, compact JSON, UTF-8,
base64url: `#/join/<data>`. `inviteFromFragment(fragment)` reverses it
(with or without the `#`) through `parseInvite` and returns the invite or
one of the parse errors, or `not-a-link` (another fragment, or data that
is not base64url) or `not-json`. `inviteUrl(base, invite)` is a full link
under a base address; a fragment on the base is replaced. The secret is
in the fragment because a browser never sends the fragment in a request
line, so the server that serves the page does not see it.

## Local data (`store.ts`, `memory-store.ts`, `idb-store.ts`)

The `Store` port is small and async:

- `listSpaces`, `getSpace(id)`, `putSpace({ id, secret, name?, storage })`,
  `removeSpace(id)`; `storage` is `{ type, address, access? }` as in the
  invite.
- `readCollection(space, name)` gives `{ records, syncedAt?, etag? }`
  (empty records when unknown); `writeCollection` replaces that state
  atomically.
- `changeRecords(space, name, fn)` is an atomic read-modify-write: `fn`
  takes the current state and returns the new one, synchronously. It is
  what keeps a change made by the user while a cycle runs.

`createMemoryStore()` is in memory, copies what it takes and gives, and
is for tests (also the apps').

`createIdbStore({ factory?, name? })` is IndexedDB: database `domus`,
version 1, shared by all apps on the address (an app keeps what only it
knows in a database of its own). Object stores: `spaces` (key path `id`)
and `collections` (key path `[space, name]`, rows
`{ space, name, records, syncedAt?, etag? }`). Every method is one
transaction; `changeRecords` and `writeCollection` are readwrite
transactions, and a `fn` that throws aborts it and its error reaches the
caller. `removeSpace` deletes the space and all its collection rows in
one transaction. A database that cannot be opened rejects with
`StoreOpenError` (the next call tries again), one blocked by another tab
with `StoreBlocked`; there is no fallback to memory. When another tab
asks for a newer version the store closes its connection and reopens on
the next call. `close()` closes it.

`createFileStore(files)` (`file-store.ts`) is the same port on plain
files, for a host without IndexedDB (a native app): `spaces.json` and
one file `<space id>.<collection>.json` per collection, each written
whole. `files` is a small synchronous port (`read`, `write`, `remove`,
`list`) the caller fills; `write` must replace a file atomically. Names
are encoded, so nothing leaves the folder. A file that cannot be read
rejects with `StoreFileError` and is never written over. One process
owns the folder. `createMemoryFiles()` is for tests.

One test suite runs against all three implementations.

## A space on this device only

`device.ts`. An app that keeps a shared collection needs a space to put
it in before the household has set up sync. Such a space is like every
other (a random secret, the id derived from it, a row in the `spaces`
store), but its storage has the type `device` (`DEVICE_ONLY`) and an
empty address: nothing is sent anywhere.

- `deviceOnlyStorage()` gives that storage, `{ type: 'device', address: '' }`.
- `isDeviceOnly(space)` tells whether a space has it. No cycle can run
  for such a space and no invite can be made from it.
- `ensureSpace(store, name, random?)` returns every space of the device
  and never an empty list: when there is none it makes a device-only one
  with that name (the app's word for "Home"), stores it and returns it.

`ensureSpace` is single-flight per store: while one call runs, a second
call on the same `Store` object gets the same promise, so two callers in
one page do not both find "no space" and make two. The guard does not
reach across tabs: two apps that start at the same moment in two tabs
can each make one. The person then sees two spaces and can remove one.

`adapterFor` does not know the type and throws `UnknownStorage` for it,
so a caller checks `isDeviceOnly` first and neither builds an adapter nor
starts `syncCollection` or a loop for such a space.

Connecting a storage later (the Household app, `connectStorage` in
`apps/domus`) replaces only the `storage` of the stored space: id and
secret stay, and so do the rows of its collections; each app sends what
it keeps in the space with its next cycle. An app keeps its shared collections in
such a space from the first start, for example Mixtura its `stock`, so
setting up sync moves no data.

## Making a space

`space-setup.ts`, shared by the Household app (`apps/domus`, which wraps
it with its own failure words) and the native apps (`createFromForm` of
`packages/gjs`). Moved here from the Household app on 2026-11-22, when
the native apps became the second user.

- `createSpace({ name, storage }, { store, now, adapter, random? })`: a
  new secret and the id derived from it, the space stored with its
  storage and access, the record `name` written in the collection
  `space` (`SPACE_COLLECTION`, `SPACE_NAME_KEY`), and one cycle on it,
  which writes the space's first file. A failed cycle takes the space off
  the device again and returns the failure; anything thrown (a storage
  the host cannot use, a store that fails) is thrown on after the space
  was taken off again. A bad name is `bad-name` and stores nothing.
- `cleanSpaceName(text)`: trimmed, inner spaces folded, 1 to 60
  characters (`SPACE_NAME_MAX`), or undefined.
- `isRepository(text)`: `owner/name` without `.` or `..` segments.
  `isWebdavAddress(text)`: https, a host, no user name or password in it,
  read without `URL` (GJS has none).
- `githubVerdict(testGithub result)`: `ok`, `public` (works, but anyone
  sees the files exist), `readonly` (the token cannot write) or `failed`
  with the failure.

Leaving a space is the store's `removeSpace`; there is no function of
its own.

## One cycle (`cycle.ts`)

`syncCollection({ space, collection, adapter, store, now, horizonDays = 90, attempts = 3 })`:

1. Read the local state; remember its records as the base.
2. `adapter.read('<space id>/<collection>.json')`. Missing: no remote. A
   failure is returned as it came (`failure`, `detail`).
3. `openCollection`. An error is returned and nothing is written: a file
   that cannot be read (wrong key, damaged, newer version) is never
   overwritten.
4. `planCollectionSync` with `now()` and the horizon (the stale device
   rule, merge, pruning are materia's).
5. If the plan has a document to write: seal it and
   `adapter.write(path, text, etag)`, with the etag that was read, or
   `null` when the file was missing. `conflict`: start again at step 1,
   at most `attempts` times, then return `conflict`. Other failures are
   returned. Nothing local is stored before a needed write succeeded;
   a cycle that needs no write stores at once.
6. Store the plan's records, `syncedAt` and the etag through
   `changeRecords`. A record the user changed or added since step 1 (it
   differs from the base) is merged over the plan's result with
   `mergeRecords`, so the newer stamp wins and the change is not lost;
   `syncedAt` and etag are stored all the same and the result says
   `pending: true`: the remote file does not have that change yet, run
   another cycle soon.
7. The result is `{ ok: true, changed, wrote, expired, pruned, rejected,
pending }` or `{ ok: false, failure, detail? }`; `failure` is an adapter
   failure (`conflict`, `unauthorised`, `not-found`, `unreachable`,
   `blocked`, `server`), an open error, or `bad-now`.

`localChange(store, space id, collection, now, edit)` is what an app calls
for a change by the user. Inside `changeRecords` it takes the stamp
`nextStamp(now(), latestStamp(records))`, so it is later than everything
in the collection even with a clock set to the past, and lets
`edit(records)` return `{ put: [{ key, value }], remove: [key] }`.
Removals become tombstones (a key that is absent or already removed is
skipped; a key in both lists is put). It returns the stamp, and throws
`BadClock` when `now()` is not a timestamp.

Guarantees: a failed cycle leaves local data as it was; a concurrent
change by the user is never lost; two devices that both cycle converge on
the same records; a second cycle with nothing new writes nothing.

## The loop (`watch.ts`)

`createSyncLoop({ run, adapter?, path?, intervalMs = 20000, setTimer?, clearTimer?, isVisible?, isOnline? })`
decides when `run()` (one cycle, typically `syncCollection`) is called; it
has no screen and no framework in it.

- `start()` runs a cycle now, then one every `intervalMs`.
- With `adapter.watch` (and a `path`) a change signal runs a cycle, and
  the interval becomes a safety net of 5 minutes.
- Never two cycles at once: a request during a run (a tick, a signal,
  `syncNow()`) is remembered and runs once after it.
- `poke()` asks for a cycle in 2 seconds; more pokes inside that time
  push it back, so several changes make one write (a GitHub storage makes
  a commit per write). A result with `pending: true` pokes by itself.
- A failed run (`ok: false` or a throw) backs the interval off, doubling
  up to 5 minutes; a success resets it. After a failure a remembered
  request does not run at once; the back-off decides.
- `isOnline() === false`: nothing runs, the interval tries again.
  `isVisible() === false`: interval and watch signals are skipped, while
  `start`, `poke` and `syncNow` still run.
- `stop()` cancels timers and the watch; a run in flight finishes and
  nothing follows.

## The loops of an app (`collection-sync.ts`)

`createCollectionSync({ store, collections, adapter, now, onChange, intervalMs?, manual?, isVisible?, isOnline? })`
is what an app starts once. It reads the spaces of the device and keeps
one loop per shared space; a run of the loop is one cycle for each of
the app's `collections` (Mixtura and Culina `stock`, Emptio `list` and
`list-categories`), each in its own file. It came from Mixtura on
2026-11-20, when Emptio needed the same.

- `refresh()` reads the spaces again and makes the loops match: a space
  that got a storage gets a loop, one that left loses it, a changed
  storage or access makes a new one. One look at a time; never rejects.
- `changed(spaceId)` after a change by the user (a cycle in 2 s),
  `syncNow()` when the page comes to the front or the connection is
  back, `stop()` at the end.
- `status(spaceId)`: `device-only`, `never`, `syncing`, `in-step` (with
  the time) or `failed` (with the failure; `storage` when this build
  does not know the storage type).
- `onChange('records')` when a cycle changed local records or the set of
  spaces changed: the screens read again. `onChange('status')` otherwise.
- A collection whose cycle fails does not hold back the others; the run
  fails with the first failure and the records a good cycle changed are
  still told.
- `intervalMs` is the app's choice inside the decided 15 to 30 seconds
  (default 20 s).
- `manual: true`: the loops run a cycle only when the app asks
  (`changed`, `syncNow`, `syncSpace`): none at the start, no interval, no
  watch. For an app that decides itself when to sync and in which order
  with other work; Emptio since 2026-11-22, which runs its storage around
  each KitchenOwl cycle and syncs only when opened, after a change or
  when asked, by its owner's decision ([Emptio's sync](../../../apps/emptio/docs/behaviour.md#sync)).
- `syncSpace(spaceId)` runs one cycle of that space and waits for it:
  `synced`, `failed`, `device-only`, or `unknown` before `refresh` saw
  the space. It uses the loop's `runNow()`, so it never runs beside
  another cycle of the same space: a cycle in flight finishes, then one
  more runs, and the answer is that last cycle's (or the failure of the
  one in flight).

## Which space an app shows (`space-choice.ts`)

For an app that shows one space at a time. `viewOf(space, unnamed)`
gives `{ id, name, deviceOnly }`. `pickSpace(spaces, choice, counts)`:
the chosen space while it exists; otherwise the first shared space,
unless only a space on this device holds the app's records; otherwise
the first. Mixtura counts several spaces at once and has its own rules.

## The status of a space in words (`status-text.ts`)

`statusText(words, status, now, online)` turns a `SyncStatus` into one
line and `ago(words, at, now)` into "just now", minutes, hours, then the
date. The words are the app's (`StatusWords`: one text per kind, the
failure texts by code with `other` for an unknown code); the file only
picks and joins them, and offline hides a failure or "not synced yet"
behind "Offline". Used by Emptio (web and native) and Mixtura's native
app; tested in `test/status-text.test.ts`.

## Limits

- **The secret is stored in clear on the device** (the `spaces` store).
  Whoever can read the browser's data of
  this address can read every space and its files.
- **Whoever has an invite reads and writes everything** in the space,
  and the invite may carry the storage access (a token). Removing a
  person means a new space with a new secret.
- A **conflict storm** (another device writing again and again) can end
  in `conflict` after the attempts; nothing is lost, the next cycle tries
  again.
- `syncedAt` and the removal horizon use the **device clock**. A clock
  far in the future prunes markers early; stamps of records are protected
  by `nextStamp`, `syncedAt` is not.
- The record data is not validated beyond materia's rules; one collection
  is one file, read and written whole.
- The loop's visibility and online rules are options; wiring them to
  `document.visibilityState` and `navigator.onLine` is the app's.
- **Not tested**: a real browser's IndexedDB (only `fake-indexeddb`, which
  cannot produce a real blocked upgrade; that case is tested with a
  factory that fires the event), another tab's `versionchange`, a real
  WebDAV server or GitHub with this cycle, a push `watch` adapter (a fake
  one is used), and timing on a real device.
