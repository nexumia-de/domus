---
type: Decision Record
title: Stock in spaces
description: Decided by the owner on 2026-11-20 with roadmap goal 8 of the repository - Culina's stock is the collection `stock` of a space in the database all apps share, the same collection as Mixtura's, to which Culina adds optional fields; a device without a space gets one on this device only; what the agent chose (the record, field names, batches, unticking, the space used, sync, the one move of old items, the export without stock, how the two catalogues will meet), what is lost and what was not verified.
tags: [decision, stock, sync, spaces, export, mixtura]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: spaces
    title: 'Decision: one address, spaces, and the storages on offer'
    url: ../../../../docs/decisions/one-origin-spaces-storages.md
  - id: host
    title: 'Spaces on the host: the store, the cycle, the loop, a space on this device only'
    url: ../../../../packages/host/docs/spaces.md
  - id: mixtura
    title: 'Mixtura: stock in spaces (roadmap goal 6, the model Culina follows)'
    url: ../../../mixtura/docs/decisions/stock-in-spaces.md
  - id: before
    title: 'Culina: sync in three units (places for stock, the model this replaces for stock)'
    url: sync.md
  - id: cibus
    title: 'Emptio architecture, decision 2: the shared ingredient catalogue package cibus'
    url: ../../../emptio/docs/architecture.md
---

# Stock in spaces

**Status: decided by the owner on 2026-11-20** in the task for roadmap
goal 8 of the repository ("Culina's stock moves into the shared
collection `stock` of a space"). The two numbered points under
"Decision" are the owner's. Everything under "Agent's choices" was
chosen by the agent within the task and can be changed by the owner.
For stock it replaces the places, passphrases and sync file of the
[sync decision](sync.md)[^before]; libraries and the profile of that
decision are not touched.

## Context

Mixtura moved its stock into the collection `stock` of a space with
goal 6[^mixtura]: one record per ingredient, `{ present, openedOn?,
moreBatches?, bestBefore?, note? }`, in the database `domus` all apps on
the address share, synced by the host package's cycle[^host]. Culina
kept its stock items in its own database, each with an id, a reference
and optional detail (amount, state, dates, storage, always there). Two
places for one kitchen's stock would drift apart.

## Decision

1. **One place for stock.** Culina's stock is the collection `stock` of a
   space in the shared database `domus`. Culina's own database keeps no
   stock. A device without a space gets one on this device only (the
   host's `ensureSpace`, named "Home", "Zuhause" in German).
2. **The same collection as Mixtura; Culina may add optional fields.**

## Agent's choices

### The record

- The key is the id of the thing: an ingredient's id, or for a prepared
  component the id of its family (the first version), whichever version
  was ticked. The value is `{ present: boolean, ... }`.
- Culina shows a record when its key is an ingredient of the notebook,
  else the family of a component of the notebook; any other record is
  not shown and left untouched. A value without a boolean `present` is
  not shown and left untouched. `present: false` reads as "not there"
  everywhere in Culina.
- **Field names are the shared ones where the meaning is the same.** In
  memory an item keeps `preparedOn` and `useBy`; the record stores them
  as Mixtura's `openedOn` (for a prepared thing: the day the batch was
  made) and `bestBefore`. `note` is `note`. Culina's own optional fields
  keep their names: `amount`, `state`, `always`, `storage`. The one file
  that translates is `packages/app/src/shared-stock/value.ts`.
- A stored field that does not fit (a malformed date, an unknown state)
  is not shown; it stays stored until Culina writes that item.

### Several items of one thing

- Culina keeps batches apart. The first item is the record's top-level
  fields; further items are objects in `batches: [...]` with the same
  optional fields. Mixtura's `moreBatches` (a list of dates) is a field
  of Mixtura's and is left alone and kept.
- In memory an item's id is the key, and `key~n` for the n-th object in
  `batches`. Ids shift when an earlier batch is removed; a screen draws
  again after every change. A batch's own foreign fields stay with it;
  when it becomes the first item they are added to the top level where
  no field of that name is.

### Ticking, unticking, Undo

- A tick writes `present: true` and nothing else of Culina's
  (`always: true` when asked); a record that already says present is
  left as it is.
- Unticking writes `present: false` and removes Culina's fields
  (`amount`, `state`, `always`, `storage`, `openedOn`, `bestBefore`,
  `note`, `batches`), keeping every field Culina does not know. The
  record is not removed. Removing the last item of a thing does the
  same. Mixtura's second tap keeps `openedOn`, `bestBefore` and `note`;
  Culina removes them, so that a later tick starts from nothing.
- Undo puts Culina's fields back as they were and keeps the other
  fields as they are now. Undo of a tick unticks.

### Foreign fields

- Every write is worked out from the value as stored at that moment,
  inside the host's `localChange` (one transaction), replacing only the
  fields Culina owns: `present`, `amount`, `state`, `always`, `storage`,
  `openedOn`, `bestBefore`, `note`, `batches`
  (`packages/app/src/shared-stock/edits.ts`).

### Which space

- One space at a time: the host's `pickSpace` with the number of
  records Culina shows per space. The choice is a device setting,
  localStorage `culina.space`. With more than one space the stock screen
  offers the choice. Making, sharing and removing spaces is the
  Household app's; the stock screen links to the used space there
  (`../#/spaces/<id>`).

### Sync

- `createCollectionSync` of the host package on the collection `stock`,
  with `adapterFor(storage, { apiBase: GITHUB_API })`. It is refreshed
  after the first read, told after every write, refreshed and run when
  the page comes to the front, and run when the connection comes back.
  The stock screen says in a few words how the used space is kept
  (on this device only, not synced yet, syncing, in step, not in step
  and why).
- The GitHub API address is a build constant (`__GITHUB_API__`,
  `src/env.ts`; `CULINA_GITHUB_API` for test builds only). The page's
  `connect-src` became `'self' https://api.github.com https:`: a WebDAV
  storage is a server of the household's choosing. Without a space that
  has a storage no request leaves the origin.

### The one move of old items

- At the first start after the update, Culina's own stock items are
  moved into the used space: one record per thing as above, never over a
  record that already has a boolean `present`; then the kind `stock` of
  Culina's own database is cleared, tombstones included. A failed write
  leaves the items where they are and the next start tries again; a
  second run moves nothing (`packages/app/src/shared-stock/legacy.ts`).
- The store keeps the kind `stock` (and its object store) only as the
  source of this move; nothing writes it. Dropping it is a later layout
  change, once every device has started once.

### Export and import

- The export file is format version 2 without `stock`
  ([data model](../data-model.md#export-file),
  [exchange](../exchange.md#the-export-file)). Stock is not Culina's
  data: a replace import would delete what another app or person put
  into the space. A version 1 file is still read; its stock is left out
  and the import preview says how many items.

### How the two catalogues meet

- Culina's ids (`fdc-…`, `fdc-group-…`, `u-…`, seed slugs) and
  Mixtura's do not overlap, so today each app shows the records whose
  key it knows: Culina's lemon and Mixtura's lemon are two records.
- They will meet by a table of equal things that lives with the shared
  ingredient catalogue package `cibus`[^cibus], not in either app and not
  in the pure model. That table is not built here.

## What is lost

- **Stock in a backup file.** The export no longer carries stock. A
  space with a storage has its stock there; a space on this device only
  has no backup of its stock until the Household app exports a space.
- **Items another device knows and this one does not.** A record whose
  key is an own ingredient (`u-…`) or a catalogue ingredient that was not
  taken into this device's notebook is kept and not shown here. Own
  ingredients do not travel with the stock.
- **`x-` fields of an old item** move with it into the record; nothing
  else of Culina's own record shape (its own `id`) survives the move.
- **Mixtura's dates on unticking.** A Culina untick removes `openedOn`,
  `bestBefore` and `note`, which Mixtura's second tap keeps.

## Not verified

- Nothing ran against the real GitHub or a real WebDAV server; the
  unit tests use a storage in memory with etags and the host's memory
  store, with an injected clock.
- Two real devices, the timing of the loop on a phone, and two tabs
  (Culina and Mixtura, or two Culina tabs) at the first start, which may
  each make a "Home" space ([orderings](../stock-orderings.md)).
- The browser checks run on one device in Chromium with a space on this
  device only; the sync status of a shared space and the choice between
  spaces were not seen in a browser.
- The German texts of the stock screen were not seen in a browser.
