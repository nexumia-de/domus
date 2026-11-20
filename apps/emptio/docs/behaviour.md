---
type: Specification
title: Behaviour as built
description: What the shopping list does since 2026-11-20 - the list at home with the add field, suggestions, ticking and clearing with Undo, the entry screen, categories, settings, which space's list is shown, how a shared list is kept in step (15 seconds, two seconds after a change), offline, what the tests and browser checks prove and what they do not, and what is not built.
tags: [behaviour, screens, list, sync, spaces, offline, tests]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: host
    title: 'Spaces on the host: the store, the cycle, the loops of an app'
    url: ../../../packages/host/docs/spaces.md
  - id: decision
    title: 'Decision: one address, spaces, and the storages on offer (Freshness: 15 to 30 seconds)'
    url: ../../../docs/decisions/one-origin-spaces-storages.md
---

# Behaviour as built

Goals 1 and 2 of the [roadmap](roadmap.md), built on 2026-11-20 as goal 7
of the [repository](../../../docs/roadmap.md). The rules are in
[engine rules](engine-rules.md), the records in the
[data model](data-model.md). The web app is `packages/app`; the native
Linux app shows the same list ([native Linux app](native-linux.md)).

# The list

- **Add field** at the top: a name, Enter or the button adds it. Under
  it how pressing (Now, Soon, Sometime; Soon unless chosen) and an
  optional amount as free text. After adding, the field is empty again
  and keeps the focus.
- **Suggestions** appear while typing: the household's earlier entries
  whose name matches ([rule](engine-rules.md#what-the-add-field-offers)),
  at most six; one that is open says "on the list". A tap adds it.
- **Twice the same** ([rule 5](engine-rules.md#5-twice-the-same)): adding
  what is already open raises that entry and says so.
- **Category** of a new entry: the one the household last gave the same
  thing, otherwise Other ([rule 4](engine-rules.md#4-category-of-a-new-entry)).
  There is no catalogue yet, so nothing else proposes one.
- **Open entries** by priority, under each priority by category, then by
  name ([rule 1](engine-rules.md#1-order-at-home)). A tick box of 44 px
  marks an entry as bought; the rest of the row opens it.
- **Bought** entries stand below, the latest first, with their count.
  "Clear bought" removes them and offers Undo for ten seconds.
- What was done last is said in a line at the bottom (a live region).

# An entry

Name, amount, note, how pressing and category; Save returns to the
list. An entry whose category was removed reads as Other and keeps its
category until another is chosen. "Remove from the list" acts at once
and offers Undo. Below the form: why the entry is on the list and when
it was bought. A change that arrives by sync while the form is open does
not replace what is typed; an entry that went away is said.

# Categories

The starting categories ([categories](categories.md)) in their order,
the household's own before Other, hidden ones last. A starting category
can be renamed and hidden (Other cannot be hidden), an own one renamed
and removed. A starting category that is as shipped again has no record.
Entries of a hidden or removed category are listed under Other.

# Settings

Which space's list is shown, with the sync status of each space and a
link to it in the Household app; language (device, English, German; a
change reloads the page); appearance (device, light, dark); what the app
is. A choice that cannot be kept (no storage in the browser) is said.

# Spaces

The list belongs to a **space** ([data model](data-model.md#records)).
A device without a space gets one on this device only, named Home, at
the first start; nothing is sent for it. Connecting a storage in the
Household app keeps its id and data, so setting up sync moves nothing.

A person can be in several spaces; each has its own list and one is
shown. Which one (`pickSpace` of the host package): the one chosen in
Settings or in the select above the list while it still exists;
otherwise the first shared space, unless only a space on this device
holds entries (a list begun before the household was joined is not
hidden behind an empty one); otherwise the first. The choice is a device
setting (`emptio.space` in localStorage).

# Sync

The app has no sync code of its own. `createCollectionSync` of the host
package[^host] runs one loop per shared space on the collections `list`
and `list-categories`:

- at the start, **every 15 seconds** while the page is in front (the
  short end of the decided 15 to 30 seconds[^decision], because a list is
  read while shopping together), two seconds after a change, when the
  page comes to the front and when the connection is back; a back-off
  after failures;
- reading uses the storage's cheap polling (GitHub: `If-None-Match`);
- the status of the shown space stands above the list in a few words;
  fixing a failure (a new token, another storage) is the Household
  app's.

Every action works out its change inside one atomic step from the
records as stored at that moment (`localChange`), never from what a
screen read earlier, and changes a copy of the stored value: a sync
cycle or another tab in between is not overwritten and fields this app
does not know are kept. The orderings are in
[list orderings](list-orderings.md).

# Offline and installing

A manifest and a service worker (the host package's
[service worker](../../../packages/host/docs/service-worker.md), cache
prefix `emptio-`) make the app installable from `/emptio/` and start it
without a connection. The page's policy loads only its own files and
connects to itself, to GitHub's API and to `https:` hosts (a WebDAV
storage is a server of the household's choosing); without a space that
has a storage no request leaves the address.

# What is checked

- **Engine**: 10 vectors for rules 1, 4, 5, the order of categories and
  the suggestions, run through the public entry
  (`packages/engine/test/vectors.test.ts`).
- **App logic** (`packages/app/test/`): the actions, the first start, a
  database that cannot be opened, a write that fails, and two devices
  sharing a list through a storage in memory. These use the memory
  store, an injected clock that only moves forward and a fake storage:
  they prove the logic, not IndexedDB, a real storage or real clocks.
- **Browser** (`npm run e2e -w @emptio/app`, 183 checks on 2026-11-20):
  every screen at 360 × 720 in English and German and at 1200 × 800,
  tap targets of 44 px, no horizontal overflow, Tab reaches every
  control, real IndexedDB across a reload, offline with the service
  worker, and two browser contexts sharing a space against a fake of
  GitHub's API (sealed files, a tick arriving without a reload within
  the polling time, the token going to that host only).
  Not proven: the real GitHub, two real devices, another browser than
  Chromium, contrast, a screen reader, real touch.

# Not built

- **Adding from the food catalogue**: there is no shared catalogue yet
  (decision 2 of [how Emptio is built](architecture.md#decisions)); every
  entry is a free name.
- **History**: clearing removes the records ([data model](data-model.md#entry)),
  so what was cleared is no longer suggested and no longer gives its
  category. Staples and proposals from history are goal 7.
- **Joining two entries** that two people added offline for the same
  thing: both stand on the list.
- **Export and import**; a backup of a space is the Household app's and
  not built.
- Stores (goal 3), hand-over (goal 4), offers (goal 6).
