---
type: Decision Record
title: Sync in three units, after stock
description: Decided by the owner on 2026-11-18. Culina syncs the same way as Mixtura, in three units (place for stock, library for recipes, profile for a person's own devices), encrypted, over storage the user configured; a library can be shared by invite; a place is the same place in Mixtura and Culina; tasting notes are records of their own; sync is built as its own goal after stock.
tags: [decision, sync, places, library, profile, materia, mixtura]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: mixsync
    title: 'Mixtura: Stock sync over storage the user configured (three units, encryption, invites, bring your own backend)'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/decisions/stock-sync.md
  - id: shared
    title: 'Decision: the shared model comes from materia'
    url: shared-model.md
  - id: store
    title: 'Data model: storage rows with updatedAt and removal markers (issue 15)'
    url: ../data-model.md
---

# Sync in three units, after stock

**Status: decided by the owner on 2026-11-18**, in answers to the
agent's questions in the session. Points the agent chose are marked
"agent".

## Context

Culina has no server and no account. Mixtura syncs over storage the
user already has, encrypted in the browser, in three
units[^mixsync]; the general parts (record merge, places, document
and envelope formats, adapter and cipher interfaces) are in
materia[^shared]. The variants weighed for Culina: three units as
Mixtura, two units (stock, and notebook with settings), one unit for
everything, and no sync (file export only).

## Decision

1. **Three units, as Mixtura.** A **place** holds stock; a **library**
   holds components, dishes, own ratio templates, own ingredients and
   tasting notes; a **profile** holds one person's settings across
   their own devices. Each unit is one encrypted document with its own
   passphrase, on storage the user configured; sync is off by default.
2. **A library can be shared by invite**, like a place: a link or QR
   code that carries storage type, address, folder, unit and
   passphrase, never the storage user name or password. A person can
   have several libraries (their own, a shared one).
3. **A place is the same place in Mixtura and Culina.** One place id
   and one storage folder; each app writes its own file there, and one
   invite covers both. Storage credentials are entered once per app,
   because the apps run on different origins and cannot read each
   other's browser storage. The file names and the invite format that
   make this work are settled with Mixtura when Culina's sync is built
   (agent).
4. **Tasting notes are records of their own**, each pointing at the
   version it was made on, instead of a list inside the component or
   dish. Two devices or two people adding a note at the same time then
   never lose one, because the merge is per record. In a shared library
   a tasting note is visible to its members (agent; a personal note
   would be a later addition to the profile).
5. **Records stay small and versions immutable.** A version of a
   component or dish is not changed after it is saved; a change is a
   new version. Rows carry `updatedAt` and removals stay as markers
   from the first version of the store[^store].
6. **When.** Sync is its own goal after stock (roadmap goal 5). The
   WebDAV adapter, the Web Crypto cipher and the sync screens live in
   Mixtura today; what Culina needs of them moves to shared code by a
   pull request there before Culina uses it. Nothing is copied.
7. **Not synced:** photos (none exist), derived values, seed data.

## Consequences

- The data model gets a tasting-note entity and loses `tastings` on
  component and dish (issue 50), before the editor and the versions
  screen are built.
- The rule "no server, no account, no telemetry" stays. When sync is
  built, the only requests to another host go to storage the user
  configured, as in Mixtura.
- Export and import (issue 18) stay the way to move data without sync.
