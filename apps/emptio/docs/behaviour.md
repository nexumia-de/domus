---
type: Specification
title: Behaviour as built
description: What the shopping list does since 2026-11-20 - the list at home with the add field, suggestions, ticking and clearing with Undo, the entry screen, categories, settings, which space's list is shown, how a shared list is kept in step (at the start, at the front, two seconds after a change, by pulling or Sync now; a switch), offline, what the tests and browser checks prove and what they do not, and what is not built.
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

# The frame

The app fills the window and is fixed to its edges
(`styles/frame.css`). Principle: **header = place and actions, body =
the list, bottom = the input.**

- **Header** (the shared one of the host package,
  [frame](../../../packages/host/docs/frame.md)): the title of the page
  (Shopping list, Categories, Settings, the name of an entry), a back
  arrow on the left of every subpage, and on the right the small sync
  icon, and on the list the icons for Categories and Settings. There is
  no bottom navigation. The body starts with content and never repeats
  the title. With several spaces (or a shared one) the list's header says
  which space it shows, under the title; several can be switched there.
- **Sync icon**: one icon for the state (on this device only, not
  synced yet, syncing, synced, error, offline) with the status in words
  as its accessible name and tooltip; a tap says the details in a toast
  ("Synced 2 min ago"). Only on an error a slim banner under the header
  says "Sync failed." with Retry. Offline is not an error.
- **Toast**: what was done last is a short message at the lower edge of
  the content, above the add field, in the theme's tokens (`--surface-2`,
  `--text`, accent for Undo), gone after 5 s (8 s with Undo, held while focus is on it). Adding an
  entry offers Undo (removes it); raising one that was there, clearing
  and removing offer Undo as before. A toast is a live region.
- **Dock**: the add field is the only permanent element at the bottom.

Only the content scrolls, so header and add field are always there; the
page itself never scrolls and no height in viewport units is used, which
is not the visible height in every browser and installed app. From 720 px
the content stays centred and header and add field span the window.

# The list

- **Add field** in the dock at the bottom, in reach of the thumb: a
  name, Enter or the button adds it. Once there is a name, how pressing
  (Now, Soon, Sometime; Soon unless chosen) and an optional amount as
  free text show above it. After adding, the field is empty again and
  keeps the focus.
- **Suggestions** appear above the field while typing, in one row that
  scrolls sideways: the household's earlier entries whose name matches
  ([rule](engine-rules.md#what-the-add-field-offers)), at most six; one
  that is open says "on the list". A tap adds it.
- **Twice the same** ([rule 5](engine-rules.md#5-twice-the-same)): adding
  what is already open raises that entry and says so.
- **Category** of a new entry: the one the household last gave the same
  thing; otherwise the one of the usual item the name means ("Milch",
  "Bio-Tomaten", "Vollkornbrot", "toilet paper"), from a
  [list of the project](categories.md#usual-items); otherwise Other
  ([rule 4](engine-rules.md#4-category-of-a-new-entry)). The guess can
  be wrong; changing the category on the entry is remembered for the
  next time.
- **Open entries** by priority, under each priority by category, then by
  name ([rule 1](engine-rules.md#1-order-at-home)), as chosen under
  [filter and sort](#filter-and-sort). A tick box of 44 px marks an
  entry as bought; the rest of the row opens it.
- **Bought** entries stand below, the latest first, with their count.
  "Clear bought" removes them and offers Undo.
- What was done last is a [toast](#the-frame).

# Filter and sort

One slim row above the list: a chip for each urgency (Now, Soon,
Sometime) with the count of open entries, and a sort button (native
picker). Both are a choice of this device (`emptio.shown`,
`emptio.sort` in its prefs); they only change what is shown, never an
entry, the shared order or any other device.

- **Show by urgency**: by default Now and Soon; Sometime is hidden but
  counted (chip count, and "Show 3 more for Sometime" below the list,
  one tap shows them). Each chip toggles. Nothing selected says so.
  Bought entries are always listed.
- **Sort**: _Store order_ (default, rule 1: urgency, then category with
  its heading, then name); _Urgency_ (sections by urgency, by name, no
  category headings); _Name_ (one flat list A to Z, the urgency on each
  row); _Recently added_ (one flat list, newest first, urgency on each
  row).

The arrangement is `list/view.ts` (pure, `test/view.test.ts`); it is a
display choice and not an engine rule, so it has no vector. A new
entry of a hidden urgency is added all the same and counted.

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

Which space's list is shown (the title of the page is in the header, the back arrow leads to the list), with the sync status of each space and a
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

The app syncs when it is opened and when a person acts, not on a timer
(owner's decision of 2026-11-22, instead of every 15 seconds). One
**run** goes through every space of the device, one after the other:

1. the space with its storage (`syncSpace` of the host package's
   `createCollectionSync`[^host] in manual mode, on the collections
   `list`, `list-categories` and `kitchenowl`);
2. the [KitchenOwl](kitchenowl.md) cycle, if the space is connected; it
   is skipped when step 1 failed, so it never works on an old list;
3. the storage again, if the KitchenOwl cycle changed the space.

One run at a time; a request during a run gives one more run after it.

**Sync automatically** (Settings on the web, Preferences on Linux; on
unless this device turned it off, key `emptio.autoSync`): a run at the
start, when the page or window comes to the front, when the connection
is back, and two seconds after a change (several changes make one run).
Off: nothing is sent until the person asks; changes stay on the device.

Asking for a run, whatever the switch says:

- pull the list down from its top (web: a touch gesture on the list, with
  a hint "Pull to sync"/"Release to sync"; Linux: the list's
  `edge-overshot` at the top, with a toast);
- **Sync now**: in Settings and in the details of the header's sync icon
  (web), in the main menu with Ctrl+R (Linux), and in the KitchenOwl group.

The gesture is for touch only; the buttons serve a mouse, a keyboard and
a screen reader. Reading uses the storage's cheap conditional read (GitHub:
`If-None-Match`). The status of the shown space is the header's sync
icon; fixing a failure (a new token, another storage) is the Household
app's. The decided freshness of 15 to 30 seconds[^decision] does not
hold for Emptio any more: what another device changed is seen when the
app comes to the front or the person pulls.

Every action works out its change inside one atomic step from the
records as stored at that moment (`localChange`), never from what a
screen read earlier, and changes a copy of the stored value: a sync
cycle or another tab in between is not overwritten and fields this app
does not know are kept. The orderings are in
[list orderings](list-orderings.md).

A space connected to KitchenOwl keeps its list in step with the
KitchenOwl list in step 2 of every run ([KitchenOwl sync](kitchenowl.md)).

# Offline and installing

A manifest and a service worker (the host package's
[service worker](../../../packages/host/docs/service-worker.md), cache
prefix `emptio-`) make the app installable from `/emptio/` and start it
without a connection. The page's policy loads only its own files and
connects to itself, to GitHub's API and to `https:` hosts (a WebDAV
storage is a server of the household's choosing); without a space that
has a storage no request leaves the address.

# What is checked

- **Engine**: 18 vectors for rules 1, 4, 5, the order of categories and
  the suggestions, run through the public entry
  (`packages/engine/test/vectors.test.ts`).
- **App logic** (`packages/app/test/`): the actions, the first start, a
  database that cannot be opened, a write that fails, and two devices
  sharing a list through a storage in memory. These use the memory
  store, an injected clock that only moves forward and a fake storage:
  they prove the logic, not IndexedDB, a real storage or real clocks.
- **Browser** (`npm run e2e -w @emptio/app`, 264 checks on 2026-11-21):
  every screen at 360 × 720 in English and German and at 1200 × 800,
  tap targets of 44 px, no horizontal overflow, Tab reaches every
  control, real IndexedDB across a reload, offline with the service
  worker, and two browser contexts sharing a space against a fake of
  GitHub's API (sealed files, no read without a request, a tick arriving
  without a reload after the list is pulled down by dispatched touch
  events, the token going to that host only), and the switch _Sync
  automatically_ (44 px, kept on the device).
  The frame is checked in a low Chromium window only (header and
  add field stay, only the content scrolls). Also checked: the header
  per page with back arrow, the sync icon and its error banner with
  Retry (against the fake storage forced to fail), the toast in both
  colour schemes, above the add field, with Undo and its timing, each
  filter and sort and their survival of a reload.
  Not proven: the real GitHub, a phone with its keyboard up, an
  installed app, two real devices, another browser than
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
