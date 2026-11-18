---
type: Specification
title: Sync cycle of a place
description: How one place is synced against an adapter and a cipher - one attempt step by step, the checking read after a write, the outcomes and failure reasons, applying the result in one transaction, the fields a binding keeps, moving a place, what is and is not guaranteed, and the known limit that custom ingredients have no change time yet.
tags: [sync, cycle, merge, etag, conflict, move, outcome]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: decision
    title: 'Decision: stock sync, items 5 to 9'
    url: decisions/stock-sync.md#decision
  - id: spike
    title: 'WebDAV spike: Nextcloud keeps the ETag on writes within one second'
    url: webdav-spike.md
  - id: materia
    title: 'materia, sync: planSync, the document and the adapter port'
    url: https://github.com/nexumia-de/materia/blob/main/docs/sync.md
---

# Sync cycle of a place

Code: `packages/app/src/sync/` (`records.ts`, `file.ts`, `cycle.ts`,
`move.ts`, `apply.ts`, `state.ts`, `outcome.ts`); tests
`packages/app/test/sync-{records,cycle,move,apply,state}.test.ts` with a fake
storage in `test/helpers/`. Everything takes its adapter, cipher, path,
passphrase and local state as parameters. The cycle reads no clock and touches
no store; only `applyOutcome` writes. When a cycle runs (start, after a
change, back online) and what the user sees per place is issue #135.

## Records

Stock rows of one place become sync records (`records.ts`): the key is the
ingredient id, a tombstone stays a tombstone (`deleted: true`), the other
fields (`present`, `openedOn`, `moreBatches`, `bestBefore`, `note`) are the
value. Coming back, every record gets the place id of the local place, so a
file can never write into another place's rows.

The custom ingredients the live rows refer to travel as `entities`. The app
tells a user ingredient from a seed one by its id: `isUserId`
(`packages/app/src/store/ids.ts:6`, the engine's test of `u-<uuid>`), the
rule the store also uses to accept writes. Seed ingredients are never
embedded.

**Known limit.** An ingredient has no `updatedAt` yet, so its entity record
takes the newest `updatedAt` of the live rows that refer to it. Two devices
that edit the same custom ingredient differently converge on the version of
the device whose stock row for it is newer, not the newer edit; and `apply`
only adds ingredients the device lacks and never replaces one it has. Issue
#143 adds change times to ingredients and removes the limit.

## One attempt

`syncPlace` runs up to `maxAttempts` (default 4) cycles:

1. `read` the file. Missing: plan with no remote. Otherwise `parseEnvelope`,
   `cipher.open`, `parseDocument`.
2. `planSync(local, remote)`. The merged state replaces the local state for
   the next cycle. A document of another place, or a remote marked `moved`,
   ends the cycle.
3. If the plan has a `write`: `buildDocument`, `cipher.seal` (reusing the salt
   of the last envelope seen), `buildEnvelope`, `adapter.write(path, body,
etag)`; `null` as the etag when the file was missing.
4. A `conflict` starts over with a fresh read, merging again from the already
   merged state. Any other adapter failure ends the cycle.
5. After a successful write the next cycle is the check: it reads the file back
   and plans again; when that plan has no write (the file equals the merge)
   the cycle ends with `ok`, otherwise it merges and writes once more. A
   write therefore needs two cycles, so `maxAttempts: 1` can never succeed
   after a write.

A wrong passphrase, an unreadable envelope or document, a newer version and a
file of another place end the cycle before any write.

## Outcomes

`SyncOutcome` is a union; nothing is thrown out of the function (an adapter
or cipher that throws becomes `unreachable` or `internal`).

- `ok`: the merged `place`, `rows` and `entities`; `changedLocal`, `wrote`;
  the `etag` and `envelope` of the last read (absent only for a missing file
  nothing was written to).
- `moved`: the file says the place moved to other storage; the merged state is
  returned, nothing is written.
- `failed` with a `reason`: `unauthorised`, `not-found`, `unreachable`,
  `blocked`, `server` (the adapter's kinds), `wrong-passphrase`,
  `unsupported-file` (with `code`: an envelope error, a document error such as
  `newer-version`, or `unsupported-scheme`), `other-place`, `gave-up`
  (attempts exhausted; the caller keeps its local state, a later cycle
  continues), `internal`.

## Applying the result

`applyOutcome(local, app, outcome)` is the one function with side effects. It
runs `LocalStore.transactPlace`: in one IndexedDB transaction over `places`,
`stock` and `ingredients` it reads the place's rows as they are now, merges
them with the outcome's rows by record (`mergeRecords`), and puts only the
records that changed locally, the newer place name (`mergePlace`) and the
ingredients the device lacks. A change made while the cycle was in flight is
therefore kept. The file's data is not trusted: a record that breaks its
schema or names another place, and an ingredient with a bad id or schema, is
skipped and the rest is stored. Afterwards `invalidateStock` redraws every
screen. The backup reminder's change counter does not count synced changes.

## Binding fields

`nextState(previous, outcome, now)` (`state.ts`) gives `{ etag, lastSyncAt,
lastError }`: `ok` takes the etag and the time and clears the error; `moved`
does the same with `lastError: 'moved'`; `failed` keeps etag and time and sets
`lastError` to the reason (`unsupported-file:newer-version` with a code;
`blocked:etag-not-exposed` for a storage that hides its ETag header, which
needs another fix than a missing CORS setup). `withState(binding, next)` puts
those fields into a binding and removes the ones `next` lacks.

## Triggers

`sync/scheduler.ts` (`createScheduler`) is the one place where cycles are
started; `sync/browser-triggers.ts` connects the browser events to it. It uses
`syncPlace`, `applyOutcome` and `nextState` and keeps nothing of its own that
could not be rebuilt: the binding holds the etag, the last sync time and the
last error; what is only in memory is which place has a change waiting and
the last envelope (for its salt).

| Trigger                                   | What happens                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Sync Now, Sync All (Sync page)            | A cycle for the place, or for every bound place                                          |
| App start, once the store is open         | A cycle for every bound place whose file did not say `moved`                             |
| A stock change or rename in a bound place | A cycle 3 seconds after the last change (a burst is one cycle)                           |
| The browser comes back online             | A cycle for every bound place that did not say `moved`                                   |
| The page becomes visible again            | A cycle for every bound place whose last sync is older than 5 minutes (or that has none) |

Rules that hold for all of them:

- **One cycle per place at a time.** A request while a cycle runs is queued
  once: a second and a third request share the queued cycle, so none is lost
  and none is doubled. Different places run side by side.
- **An unbound place never causes a request**, whatever the trigger; the
  binding is read first.
- **Offline (`navigator.onLine === false`) nothing is tried.** The place is
  marked as having a change waiting, its state line says "Waiting for
  connection", and the `online` event runs the cycle.
- A cycle that fails keeps its reason in the binding; the next trigger tries
  again (a place that was `moved` is left alone until it is joined again).
- Changes that arrive by sync are written by `applyOutcome` only, which does
  not tell the scheduler and does not count for the backup reminder, so a
  merge never starts a cycle of its own.
- A change the user makes while a cycle is in flight stays (the apply step
  merges again inside its transaction) and goes out with the next cycle, which
  its own trigger starts.

The clock is `nowInstant` (`today.ts`); tests pass their own and use fake
timers. Tests: `test/sync-scheduler.test.ts`.

## Moving a place

`movePlace` (`move.ts`):

1. Merge with the old file, read only: nothing remote is lost and the old file
   is not touched. Failure: `failed` with `stage: 'old'`. A file already
   marked moved ends as `moved`.
2. Sync the merge with the new location (`syncPlace`): a missing file is
   created with `ifMatch: null`, an existing one is merged, not overwritten.
   Failure: `failed` with `stage: 'new'`, the old file is still untouched.
3. Write the old file with `moved: { at }`, keeping every record, so a member
   who is offline for long still merges before following. If the old file
   gained records since step 1, they are merged and step 2 runs again (within
   `maxAttempts`). A failing marker write leaves the move done: the outcome is
   `ok` with `marked: false`.

A member that syncs the old file gets `moved`, applies the merge, joins the new
location and syncs there.

## What is guaranteed

- **Convergence without loss, given that every device eventually syncs.**
  Every device keeps all its records and tombstones and merges again at each
  cycle, so an overwritten file delays convergence and loses nothing. The
  correctness never rests on `If-Match`: Nextcloud keeps the ETag on a write
  in the same second as the previous one, so two devices can both write with
  the same ETag and the second replaces the first
  ([spike](webdav-spike.md)). The first device's records return at its next
  cycle, when its check or its next read finds them missing.
- A cycle ends in a merged state or a named failure; a wrong passphrase or
  unreadable file never leads to a write.
- The storage sees no place name and no id (the file is encrypted).

## What is not guaranteed

- **Newest wins compares device clocks.** A device whose clock runs ahead wins
  against later changes of others until time catches up.
- **Tombstones are kept forever**; the file only grows.
- A cycle that ends `gave-up` or fails changes nothing locally.
- Custom ingredients: the [known limit](#records) above.
- A device that never syncs again keeps its own state; nothing forces a merge.
