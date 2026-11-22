---
type: Specification
title: Sync
description: The pure parts of sync - the record merge and its rules, the storage adapter port, and for spaces the never-backwards stamp, the pruning of removal markers, the collection document, the plan of one cycle, the sealed file (version 2) and the invite, with the stated limits; the earlier model of places, units and the passphrase envelope was removed on 2026-11-20.
tags: [sync, merge, format, api]
generated: { by: claude-code/2.1.327, at: 2026-11-19 }
---

# Sync

The general part of sync for the apps: people share a _space_; each
collection of a space (for example the stock) is one file in storage the
space's people chose, merged per record; the host package encrypts the
file. This package holds only the pure parts: no cryptography, no base64
coding, no requests, no clock. Code is in `src/sync/`, vectors in
`vectors/sync/` (run by `test/sync-vectors.test.ts`).

## Record merge

`mergeRecords(local, remote)` merges two lists of
`SyncRecord { key, updatedAt, deleted?: true, value? }`. `updatedAt` is a
UTC timestamp `YYYY-MM-DDThh:mm:ss[.fff]Z`, compared as time by
`instantMs` (not as text). A tombstone (`deleted: true`) has no value.

1. Per key the record with the later `updatedAt` wins, value or tombstone.
2. A key on one side only is kept.
3. Equal `updatedAt` (as time): a tombstone beats a value; two values:
   the greater canonical JSON (keys sorted, `undefined` dropped) as a
   string wins; if those are equal too, the greater `updatedAt` text
   wins (the same instant may be spelled with and without fractions).
   Identical records are no change. The result does not depend on which
   side is local.
4. Invalid records are rejected and take no part: bad `updatedAt`, empty
   or non-string key, a tombstone with a value, a non-tombstone without
   a value, `deleted` other than `true`. A `null` value is a value.
   Duplicates of a key within one side: the later one by rules 1 and 3.
5. The value is opaque: unknown fields in it are kept as they are.
   Unknown fields of the record itself are dropped.
6. Idempotent: merging the result with either input changes nothing.

The result lists `records` (sorted by plain string order of the key),
`changedLocal` (the app must store these), `changedRemote` (the file must
be written) and `rejected` (`local:<key>` or `remote:<key>`; the index
when there is no usable key). Tombstones are never removed by the merge.

## Storage adapter

Types only (`src/sync/adapter.ts`). `read(path)` gives
`{ ok: true, missing: false, body, etag }`, `{ ok: true, missing: true }`
or `{ ok: false, failure, detail? }`; narrow on `ok`, then on `missing`.
`write(path, body, ifMatch?)`: `ifMatch` is an etag the file must still
have, `null` means the file must not exist, omitted means unconditional;
it gives `{ ok: true, etag? }` or a failure. Failures: `conflict`,
`unauthorised`, `not-found`, `unreachable`, `blocked` (no answer the
page may read, for a browser CORS or a content policy), `server`.

`watch?(path, changed)` is optional: a storage that can tell when a file
changed calls `changed` (more often than needed is fine, less often is
not) and returns a function that stops it. A storage without `watch` is
polled by the app.

## Spaces

A space is a group of people and their things; it has one random secret,
and each collection of the space is one encrypted file
`<space id>/<collection>.json`
([decision](../../../docs/decisions/one-origin-spaces-storages.md)). The
merge stays per record, newest wins. Deriving keys and ids from the
secret and sealing are not part of this package (the host package does
them); here are the pure rules and the formats.

### A stamp that never goes backwards

`nextStamp(now, latest)` gives the `updatedAt` for a record the user
changes now. `now` is the device's clock; `latest` is the newest
`updatedAt` the device has seen in that collection, local or remote
(`latestStamp(records)` finds it in a list: the greatest readable
`updatedAt` as text, or undefined). The result is `now` when it is later
than `latest`, otherwise `latest` plus one millisecond, always written
with exactly three fraction digits (more digits are cut to
milliseconds, as `instantMs` reads them). An unreadable `now` gives
undefined; an unreadable or absent `latest` counts as absent; so does
the result for `9999-12-31T23:59:59.999Z`, which has no successor.

Why: "newest wins" compares device clocks. With this stamp a change made
after seeing a record is always newer than that record, so a device
whose clock is behind no longer loses every conflict, and a device whose
clock is ahead does not make everyone else's later changes lose: they
are stamped after its records, not before. The milliseconds are turned
back into text without a `Date` object (`dateOfDay` in `src/shelf/dates.ts`
is the inverse of `dayNumber`).

### Dropping old removal markers

`pruneTombstones(records, now, horizonDays)` returns
`{ records, pruned, prunedBefore }`. `records` are the input without the
tombstones (`deleted: true`) whose `updatedAt` is strictly earlier than
`now` minus `horizonDays` whole days (at the cut-off: kept; one
millisecond earlier: removed); the order of the rest is kept. `pruned`
are the removed keys, sorted; `prunedBefore` is the cut-off as text.
Live records are never removed, whatever their age. A record with an
unreadable time is left as it is (the merge rejects it). A `horizonDays`
that is not a positive integer, or an unreadable `now`, prunes nothing
and gives no `prunedBefore`. The price of pruning is answered by the
stale device rule below.

### The collection document

One file of a space, the thing that gets encrypted, as compact JSON
(`buildCollection`, `parseCollection`, `src/sync/collection.ts`):

| Field          | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `format`       | `materia-collection` (`COLLECTION_FORMAT`)                            |
| `version`      | `1` (`COLLECTION_VERSION`)                                            |
| `space`        | the space id, non-empty text                                          |
| `collection`   | the collection name, `/^[a-z][a-z0-9-]*$/`                            |
| `records`      | `SyncRecord[]`, written sorted by key                                 |
| `prunedBefore` | optional timestamp: removal markers older than this were dropped here |

`parseCollection` errors: `not-json`;
`not-a-collection` (not an object or another `format`); `newer-version`
(a `version` number above 1, checked first); `invalid` (any other frame
problem: version not 1, empty or non-string `space`, a bad collection
name, `records` not an array of objects, a `prunedBefore` that is not a
timestamp). Unknown top-level fields are ignored. Single bad records are
not an error here; the merge rejects them. `buildCollection` fixes the
key order, sorts records by key and the keys inside values, and omits
`prunedBefore` when absent.

### The plan of one cycle

`planCollectionSync(local, remote, options)` is the pure step of one
cycle for one collection. `local` is
`{ space, collection, records, syncedAt? }`: `syncedAt` is the `now` of
this device's last successful cycle for this collection (the plan
returns it), or absent when it never synced. `remote` is the parsed
document or `undefined` when there is no file. `options` is
`{ now, horizonDays }`; time is an input. Steps, in this order:

1. A remote of another `space` gives `{ error: 'other-space' }`, of
   another `collection` `{ error: 'other-collection' }`; an unreadable
   `options.now` gives `{ error: 'bad-now' }` (checked after these two).
2. **Stale device rule.** When `remote.prunedBefore` is set and
   `local.syncedAt` is set and earlier than it, the device was away for
   longer than the markers were kept. A local record that the remote
   does not have at all (no record and no tombstone with that key) and
   whose `updatedAt` is not later than `syncedAt` was removed by someone
   while the device was away: it is dropped locally and its key listed in
   `expired`. A record changed after `syncedAt` is kept (the person
   edited it while away). Without `syncedAt` (first cycle, or an
   unreadable one) nothing expires: a device joining with data keeps it.
3. The remaining local records and the remote records are merged by
   `mergeRecords`.
4. The merged list is pruned by `pruneTombstones(merged, now, horizonDays)`.
   The document's `prunedBefore` is the later of the remote's and this
   cut-off when the cycle pruned something, the remote's when it pruned
   nothing, and absent when neither exists (a file that never lost a
   marker carries none).

The result: `local` (what the app stores, with `syncedAt: now`),
`localChanged` (the stored records differ from the input; `syncedAt`
alone does not count), `write?` (the document to write; absent when the
remote already prints the same text, so same records and same
`prunedBefore`; always set without a remote file), `rejected` (as the
merge gives it, `local:<key>`, `remote:<key>`), `expired` and `pruned`
(sorted keys). After writing and storing `local`, a second cycle with
the same `now` finds nothing to do (a property test).

### The sealed file, version 2

`buildSealed`, `parseSealed` and `sealedAad` (`src/sync/sealed.ts`).
Spaces derive the key from a random secret outside this package, so the
file needs no salt or iteration count:

| Field               | Meaning                               |
| ------------------- | ------------------------------------- |
| `format`, `version` | `materia-sync` (`SEALED_FORMAT`), `2` |
| `cipher.name`       | non-empty                             |
| `cipher.nonce`      | base64, `/^[A-Za-z0-9+/]+={0,2}$/`    |
| `data`              | ciphertext, base64                    |

Errors of `parseSealed`: `not-json`; `not-an-envelope` (not an object or
another `format`); `newer-version` (a `version` number above 2, checked
before the rest, so the app can tell the user to update); `invalid` (any
other frame problem, which includes version 1, the removed passphrase
envelope). Unknown fields are dropped. `sealedAad(space, collection)` gives
`materia-sync/2/<space>/<collection>`, the additional data the cipher
binds to the ciphertext, so one file cannot be put in place of another;
it is undefined when the space is empty or the collection name breaks
the name rule.

### The invite

What a person gives another to join a space (`buildInvite`,
`parseInvite`, `src/sync/invite.ts`), as an object; how it becomes a
link or a QR code is not this package's business.

| Field     | Meaning                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `format`  | `materia-invite` (`INVITE_FORMAT`)                                                                                            |
| `version` | `2` (`INVITE_VERSION`); version 1 was Mixtura's place invite and is not read                                                  |
| `secret`  | the space's secret, base64url without padding, `/^[A-Za-z0-9_-]{43}$/` (32 bytes)                                             |
| `name`    | optional text: what the inviting person calls the space; display only                                                         |
| `storage` | `{ type, address }`; `type` matches `/^[a-z][a-z0-9-]*$/`, `address` is non-empty text                                        |
| `access`  | optional object of text values the inviting person chose to include (for example a token); keys match `/^[a-z][a-zA-Z0-9]*$/` |

`parseInvite(value)` takes an already parsed JSON value, not text, and
gives the invite or an error: `not-an-invite` (not an object or another
`format`), `older-version` (version 1), `newer-version` (above 2,
checked before `older-version` and the rest), `invalid`. Unknown fields
are ignored, and inside `storage` they are dropped: the result has only
the known fields. An empty `access` object is kept as it is, and `name`
may be any text. `buildInvite` gives the object with a fixed key order
(`format`, `version`, `secret`, `name`, `storage`, `access`), the keys
of `access` sorted, and without absent optional fields.

## Limits of this version

- "Newest wins" compares the clocks of the devices. A device with a
  wrong clock can win or lose wrongly; nothing here detects it. For
  collections of a space `nextStamp` answers the behind clock: a change
  made after seeing a record is newer than it. What remains: a clock far
  ahead still wins every conflict until the others have seen its
  records, and then their changes are stamped after them.
- `pruneTombstones` drops removal markers after the horizon, so a
  collection does not grow forever. What remains: a device that was away
  longer than the horizon and edited a record before leaving, but never
  synced that edit, keeps the record and brings it back (a record
  removed meanwhile by someone else returns with it). `expired` drops by
  the rule above and is not recoverable from the remote: the file no
  longer has the record.

## The earlier model

Removed on 2026-11-20. Before spaces, a user kept records per _place_,
synced as one file encrypted with a key derived from a passphrase:
places and the combined view (`mergePlace`, `combinePlaces`), the place
document (`materia-place`: `parseDocument`, `buildDocument`,
`planSync`), the unit document for a place, library or profile
(`materia-unit`: `parseUnit`, `buildUnit`, `planUnitSync`) and the
version 1 envelope (`parseEnvelope`, `buildEnvelope`, `envelopeAad`, the
`Cipher` port). Only Mixtura's first sync used them; when Mixtura moved
to spaces
([decision](../../../docs/decisions/one-origin-spaces-storages.md)) no
app was left that did, so they were removed with their vectors. A file
of that model is not read any more: `parseSealed` answers `invalid` for
a version 1 envelope, and `parseInvite` answers `older-version` for a
version 1 invite.
