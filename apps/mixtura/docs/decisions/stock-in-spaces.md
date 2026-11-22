---
type: Decision Record
title: Stock in spaces
description: Decided by the owner on 2026-11-20 with roadmap goal 6 - Mixtura's stock is the collection `stock` of a space in the database all apps share, synced by the host package's cycle; Mixtura has no places, storages, passphrases, invites or sync screens of its own any more, they are spaces set up in the Household app; a device without sync keeps its stock in a space on this device only; stock stays a matter of taps (at hand or not, no amounts, nothing to book); the export file no longer holds stock; what the agent chose and what is lost.
tags: [decision, stock, sync, spaces, naming, export]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: spaces
    title: 'Decision: one address, spaces, and the storages on offer'
    url: ../../../../docs/decisions/one-origin-spaces-storages.md
  - id: before
    title: 'Decision: stock sync over storage the user configured (the model this replaces)'
    url: stock-sync.md
  - id: host
    title: 'Spaces on the host: the store, the cycle, the loop, a space on this device only'
    url: ../../../../packages/host/docs/spaces.md
  - id: culina-stock
    title: 'Culina: stock item (the other app that will write the collection)'
    url: ../../../culina/docs/data-model.md#stock-item
---

# Stock in spaces

**Status: decided by the owner on 2026-11-20** in the task for roadmap
goal 6 of the repository ("everything uniform: adapt the names in
Mixtura, one place for stock, and stock must not be the upkeep that
Grocy is; WebDAV was never used, nothing has to be kept"). The numbered
points are the owner's; "Agent's choices" are proposals the owner can
change. It replaces the [stock sync decision](stock-sync.md) of
2026-11-18 for everything about places, storages, passphrases, invites
and the sync file.

## Context

Mixtura had its own sync: places with a passphrase each, storages and
bindings kept in its database, a sync file per place, invite links and
about 4,000 lines of sync code and screens[^before]. On 2026-11-19 the
owner decided that all apps live on one address and sync on spaces, set
up once in the Household app[^spaces]. Two words for the same thing
(place, space) and two ways to sync would stay side by side unless
Mixtura moved.

## Decision

1. **The names are the shared ones.** What Mixtura called a place is a
   space, in the code, the screens and the documents. Storage means the
   storage of a space. Mixtura has no passphrase, binding, folder or
   invite of its own.
2. **One place for stock.** Stock is the collection `stock` of a space,
   in the database `domus` that all apps on the address share. Mixtura's
   own database holds no stock. Culina will read and write the same
   collection ([roadmap](../../../../docs/roadmap.md) goal 8).
3. **Stock is not upkeep.** An ingredient is at hand or not. No amounts,
   no units, no booking in or out, no minimum levels, no shopping
   automation inside the stock. A tap says it is there, a second tap says
   it is gone; dates and a note are optional and never asked for.
4. **Nothing is carried over.** The stores for places, stock, storages
   and bindings are dropped without a migration of their content; no
   earlier sync file or invite is read.

## Agent's choices

### The record

- One record per ingredient: the key is the ingredient id, the value is
  `{ present, openedOn?, moreBatches?, bestBefore?, note? }`
  ([data model](../data-model.md#stock)). Removing a record leaves the
  host's removal marker.
- The value is open: fields another app adds are kept, because Mixtura
  changes a copy of the stored value. Culina's stock item has an
  optional amount and state[^culina-stock]; it can add them to the same
  record without Mixtura ever asking for them. A record whose value is
  not a stock value (no boolean `present`, a malformed date) is not
  shown and is left untouched.
- Each app shows the records whose key is an ingredient it knows. How
  Culina's ingredient ids and Mixtura's meet (lemon is lemon) is decided
  with goal 8; until then the two catalogues simply do not overlap.

### A space before sync

- A device that has no space gets one when the stock is first read:
  named `Home`, with the storage type `device`, which means on this
  device only[^host]. It has a secret and an id like every space, so the
  Household app can connect a storage to it later and it becomes a
  shared space with the same data.
- The rule "own local data, offline first" holds: such a space causes no
  request, ever.

### Several spaces

- A person can be in several spaces (a household, the parents' house).
  Each has its own stock. Mixtura keeps what it had for places: the
  spaces that count are ticked, derived views use their union, a mark
  goes to the entry space, rows name the spaces when more than one
  counts. The choice is a device setting (`spaces`: `ticked`, `entry`,
  `known`).
- A space the device has not seen before counts at once, so joining a
  household shows its stock without a further step. When the entry space
  is on this device only and empty, a shared space that arrives becomes
  the entry space and the empty one stops counting.
- Making, naming, sharing and removing a space is the Household app's.
  Mixtura's Spaces sheet chooses among them, shows how each is kept in
  step, and links to the Household app.

### Sync

- One loop of the host package per shared space runs the host's cycle on
  `stock`: at the start, every 20 seconds while the app is in front, two
  seconds after a change, when the connection comes back, with a
  back-off after failures. Mixtura contains no cycle, cipher, adapter or
  merge of its own.
- A failure is shown in a few words on the space's row; fixing it (a new
  token, another storage) happens in the Household app.

### Export

- The export file is format version 3 without `places` and `stock`
  ([export format](../export-format.md)). Stock is not Mixtura's data:
  a replace import would otherwise delete what another app or person put
  into the space. An older file is still read; its stock is left out and
  the preview says so.
- A backup of a space (its stock included) is the Household app's export,
  which is not built yet. Until then the stock of a shared space is in
  its storage, and the stock of a space on this device only has **no
  backup**. Stock is a set of taps; the specs, which are the work, are
  in the export as before.

## What is lost

- **Own ingredients do not travel.** The earlier sync file carried the
  user's own ingredients that the stock referred to. A stock mark for an
  ingredient the other device does not know is kept and not shown.
  Sharing own ingredients and drinks is the next step
  ([roadmap](../roadmap.md) goal 8).
- **Moving a place to another storage**, the passphrase a person could
  write down, entering the four values by hand, and the per-place
  "moved" marker. A space is tied to its secret; changing its storage is
  not built in the Household app.
- **WebDAV tested against a real server.** The Docker server, the CORS
  fronts for nginx and Caddy, the setup guide and the integration test
  left with Mixtura's sync code (they are in the history). The adapter
  stays in the host package and is offered by the Household app, now
  tested against a fake only; it comes back with goal 10 of the
  repository.
- **Adding a place inside Mixtura.** A second space is made in the
  Household app.

## Not verified

- Nothing ran against the real GitHub or a real WebDAV server.
- Two real devices; the timing of the loop on a phone; two apps open in
  two tabs at the first start (both may make a `Home` space).
