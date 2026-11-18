---
type: Specification
title: Screens - sync
description: The Sync page under Settings (storages, places, Share, Join, Move, Stop Syncing), the state line of a place and where it comes from, what starts a sync cycle, what is stored and derived, how it was built and tested, and what was not verified.
tags: [behaviour, screens, sync, storages, places, share, join, scheduler]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: decision
    title: 'Decision: stock sync'
    url: decisions/stock-sync.md
  - id: backends
    title: 'Sync backends'
    url: sync-backends.md
  - id: cycle
    title: 'Sync cycle of a place'
    url: sync-cycle.md
---

# Screens: sync

Built by [#135](https://github.com/nexumia-de/mixtura/issues/135) (screens
and triggers) and [#137](https://github.com/nexumia-de/mixtura/issues/137)
(the end-to-end test). Part of [behaviour](behaviour.md); look and copy rules in
[design](design.md); texts in [UI strings](ui-strings.md#sync-135). What the
screens use: the [cycle](sync-cycle.md), the [adapter and the device-local
stores](sync-backends.md), the [encryption](sync-encryption.md) and the
[decision](decisions/stock-sync.md). An invite link and a QR code are a later
issue; the four values they would carry are in one module
(`sync/share-values.ts`).

## Purpose

Let a person keep a place's stock in step on their devices, or share the place
with someone else, without a server of ours: add a storage they run or rent,
bind a place to a folder in it, and see at a glance whether each place is in
sync. Nothing is requested until a storage exists and a place is bound.

## Page

Address `#/settings/sync`, a pushed screen under Settings (a row in Settings
and a link in the Places sheet on Stock lead to it). Sheets are the address
parameter `sheet` (`storage`, `join`, `bind`, `move`, `share`, `passphrase`)
with `place=<place id>` (`code=<place id>` for Join Again): one history entry
on a phone, so Back closes a sheet; a replace from 840 px. No password, passphrase
or place secret is ever in an address.

### Storages

A card with the list (label, address, user name) and **Add Storage**. **Add
Storage** is a sheet with name, address, user name and password (Show and Hide
with `aria-pressed`), **Test Connection** and **Add Storage**. The test reads
one probe file and shows one text per state: reachable, unauthorised, blocked,
unreachable, server error; `blocked` names the cause in plain words (the
storage did not answer in a way a browser may read, usually because it does
not allow requests from this app, CORS) and links to
[sync backends](sync-backends.md) on GitHub (`SETUP_URL`, kept in one place);
a storage that answers but hides its `ETag` header has its own sentence. A
result is dropped as soon as a field changes. **Remove** is refused while a
place uses the storage, naming the places; otherwise it acts at once with Undo.
The address, user name and password stay on the device (never exported, never in
a sync file).

### Places

Every place of the device with its **state line** and the actions that fit it:

| Place is                  | Actions                                                    |
| ------------------------- | ---------------------------------------------------------- |
| not bound                 | Sync This Place…                                           |
| bound                     | Sync Now · Share… · Move… · Show Passphrase · Stop Syncing |
| bound and file says moved | Join Again… · Show Passphrase · Stop Syncing               |

Page level: **Sync All** (every bound place) and **Join a Place…**.

- **Sync This Place…** (sheet): a storage, a folder (default `mixtura`) and the
  generated passphrase with Copy. **Start Syncing** stores the binding and runs the
  first cycle. The file is `<folder>/<place id>.json`.
- **Share…** shows what another person enters by hand: the storage address, the
  folder, the **place code** (the place id) and the passphrase, each with Copy, and
  the sentence that whoever has these values and access to the folder can read and
  change this place's stock. Copy may be refused by the browser; the field stays
  selectable and the sheet says so.
- **Show Passphrase** shows the passphrase alone, with Copy.
- **Move…** chooses another storage or folder and uses `movePlace`: the merge goes
  to the new location, the old file gets the moved marker, the binding points at the
  new location and keeps the passphrase. The same location is refused; a failed
  move changes nothing.
- **Stop Syncing** removes the binding at once with Undo. Stock on the device and
  the file in the storage stay, and the toast says so.
- **Join a Place…** (sheet): a storage, folder, place code and passphrase. The file
  is read first without writing (`sync/join.ts`): a wrong passphrase, a missing
  file, a file that moved, a bad code or folder leaves nothing behind and says why.
  Only then the place is created if the device lacks it (named "Joined place" with
  a timestamp older than any name, so the name in the file wins the first merge), it
  counts, the binding is stored and the first cycle runs; should that cycle fail, the
  place, its records, its counting and the binding are taken away again. Joining a
  place the device has binds it (a moved place's old binding is replaced). **Join
  Again…** opens the same sheet with only the place code filled in.

The Places sheet on Stock shows the same state line under each place and the link
**Open Sync**; nothing else there changed.

## States

The state line is derived (`sync/status.ts`, `placeStatus`), never stored. Inputs:
the binding (`lastSyncAt`, `lastError`), the scheduler's bookkeeping (a cycle runs;
a change waits) and `navigator.onLine`.

| State                  | When                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| On this device only    | no binding                                                                                                                                                                                                                                         |
| Syncing…               | a cycle for the place runs                                                                                                                                                                                                                         |
| problem (moved)        | the last cycle found the moved marker                                                                                                                                                                                                              |
| Waiting for connection | offline and a change waits, or the place never synced                                                                                                                                                                                              |
| Changes waiting        | a change is queued for the next cycle (or bound but not yet synced)                                                                                                                                                                                |
| a problem in words     | `lastError`: wrong passphrase, sign-in refused, storage not reachable, blocked (CORS), ETag hidden, folder not found or made, server error, newer version of the app, unreadable file, another place's file, gave up after several tries, internal |
| In sync · {time}       | otherwise; the time is "just now", "n min ago", "n h ago", then the date                                                                                                                                                                           |

A problem is text with a warning sign, never colour alone. Blocked and ETag-hidden
problems carry the **Setup guide** link.

## When sync runs

See [sync cycle, triggers](sync-cycle.md#triggers): Sync Now and Sync All, app
start, a stock change in a bound place (3 seconds after the last change), the
browser coming back online, and the page becoming visible with a last sync older
than 5 minutes. One cycle per place at a time, a request during a cycle is queued
once, nothing is tried offline, an unbound place never causes a request.

## Data

Stored (device-local, [store](store.md#device-local-sync-configuration)): storages
and bindings only. Derived every time: the state line, which places count, what the
share sheet shows (from the binding and the storage), the list of what a storage
is used by. In memory only: what was typed into a sheet (including passwords and
passphrases, forgotten when the sheet reopens), the last test result, the cipher's
key cache, which place has a change waiting. Removing a place also removes its
binding (Undo restores it); the file in the storage is not touched.

## Rules kept

- Opening a sheet focuses the sheet, never a field, so no keyboard comes up; closing
  gives the focus back to the button that opened it.
- Targets are at least 44 x 44 px, nothing scrolls sideways at 360 px, forms scroll
  inside the sheet.
- Passwords and passphrases never appear in an address, a toast, the console or an
  error detail (failures carry the reason only).

## As built

Files: `src/screens/sync/` (page, `storages-block`, `places-block`, one sheet per
file, `drafts`, `sheet-drafts`, `fields`, `copy-row`, `strings`), `src/sync/` (`status`,
`scheduler`, `browser-triggers`, `storages`, `bindings`, `join`, `relocate`,
`share-values`, `location`, `local-state`, `view`), `src/stock/written.ts` (tells
the scheduler that the user changed a place), `src/styles/sync.css`.

Drafts: a sheet starts empty when a button opens it and is forgotten when it closes
(`sheet-drafts.ts`); Sync This Place and Join a Place keep theirs while Add Storage is
open over them. Leaving the page forgets everything (`Screen.leave`, called by the shell
via `shell/leave.ts`). A write or test that throws clears the busy state and says
"This did not work on this device. Try again."

- `AppData` gained `sync` (the scheduler) and `cipher` (one cipher, so a derived key
  is reused for a place's file).
- The sync view (`sync/view.ts`) reads storages, bindings and places when `syncRev`
  or `stockRev` change and keeps the old view on screen while it reads.
- The first cycle of Join and the first cycle of Sync This Place use the same
  scheduler as every other trigger.
- The backup reminder's counter is not touched by anything that arrives by sync
  (`transactPlace` does not count); joining a place counts the one place record the
  user created.
- Weak ETags of Apache are handled in the adapter ([sync backends](sync-backends.md#limits)).
- A place that is removed on a device takes its binding with it.
- Not built: the invite link and QR code, sharing one library or profile, a way to
  rotate a passphrase.

## End-to-end test

`packages/app/e2e/sync.mjs` ([development](development.md)), at 360 x 720 and
1200 x 800, against two Docker servers (`MIXTURA_WEBDAV_URL`,
`MIXTURA_WEBDAV_URL_2`; skipped with a message without them). Two browser contexts
are two people with separate storage and the same built app; every action goes
through the UI. It checks:

1. Before anything is configured, with a local-only place that has stock, no request
   leaves the app's origin (the log of both contexts runs for the whole test).
2. Both add both storages (Test Connection reachable; in a third context a wrong
   password says unauthorised and a dead address says blocked with the plain cause
   and the link). A binds "Flat" to storage 1; B joins with the four values A's
   Share sheet shows.
3. Both go offline and change stock: A marks two ingredients, B two others, both
   change the same ingredient (B later), B removes one A had marked. Both say
   "Waiting for connection". Back online both sync (until equal) and show the same
   stock: nothing lost, the later change won, the removal arrived.
4. B binds "Parents" to storage 2 and marks something; A's Flat is unchanged and A
   never requested storage 2's file.
5. A local-only place gets changes on both sides: no request follows, and every
   request outside the origin went to one of the two storage addresses and to a bound
   place's file or its folder (or the probe of Test Connection).
6. The stored files, fetched directly in Node, are `materia-sync` envelopes and hold
   no place name and no ingredient id in clear.
7. A wrong passphrase on join is refused in words and leaves no place; Stop Syncing
   and then a change cause no request.

It also measures, inside the page in one step, that nothing scrolls sideways and
every target is at least 44 px on the Sync page and on the sheets it opens.
`--docs` writes the screenshots of [screenshots](screenshots.md#sync).

## Verified and not verified

Verified: `npm run check`; the unit tests (state line, scheduler with fake timers,
rules for storages, binding, join and move); `e2e/sync.mjs` at both sizes against
two `httpd` servers in Docker, in headless Chromium; the accessibility pass includes
the Sync page and its Add Storage and Join sheets.

Not verified: Firefox, Safari and any phone browser; a real Nextcloud (it needs the
CORS and `ETag` setup of the [spike](webdav-spike.md) and keeps ETags for a second);
the CI job `webdav` with the second server (written, not run in CI); the Sync This
Place, Share, Move and Show Passphrase sheets in the automated accessibility pass
(they need a place id in the address; their size and overflow are measured by
`e2e/sync.mjs`, their names and focus order are not audited separately); dark mode
of the Sync page beyond the accessibility and dark passes of the page and its Add
Storage sheet; a screen reader.
