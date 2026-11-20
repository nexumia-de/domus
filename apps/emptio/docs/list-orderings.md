---
type: Reference
title: List orderings
description: What the shopping list does when things happen in an unlucky order - a change while a sync cycle runs or after a screen read the list, two people offline, a tick against an edit, clearing against un-ticking, Undo against a newer change, two tabs, a database that fails - each with the test that pins it, and the orderings no test pins.
tags: [orderings, races, sync, list, tests]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: host
    title: 'Sync orderings of the host package (the cycle and the loops under this table)'
    url: ../../../packages/host/docs/sync-orderings.md
---

# List orderings

One document for one class of defect ([rule](../../../AGENTS.md)): the
order of events around the list. The orderings of the cycle and the
loops themselves are in the host package's table[^host]; this page is
what Emptio adds. Tests are named as `file` › 'name'; they are in
`packages/app/test/` unless said otherwise. All of them use the memory
store, an injected clock and a storage in memory.

| Ordering                                                                                       | Intended behaviour                                                                                                                 | Pinned by                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The same thing reaches the list (sync, another tab) after the screen read it, then it is added | The stored entry is raised; no second one                                                                                          | `actions.test.ts` › 'the join is worked out from what is stored at that moment, not from an earlier read'                 |
| Another app or version wrote a field into an entry, then it is ticked, raised, un-ticked       | The field is kept through every change                                                                                             | `actions.test.ts` › 'fields this app does not know are kept through every change'                                         |
| Two people add offline, one of them the same thing in another spelling                         | Both keep everything; the same thing stands twice (merging is per record)                                                          | `app.test.ts` › 'two people adding offline both keep their entries; the same thing stands twice'                          |
| One ticks while the other changes the same entry offline                                       | The later write wins whole; the earlier one (here the tick) is lost. Accepted ([data model](data-model.md#merging-and-its-limits)) | `app.test.ts` › 'one ticks while the other edits the same entry offline: the later write wins whole'                      |
| An entry is ticked on another device a moment before "Clear bought" here                       | Clearing takes what is bought as stored at that moment                                                                             | `actions.test.ts` › 'clearing removes the bought entries as stored now and Undo puts them back' (one device only: partly) |
| Undo of a removal after the entry is live again and changed                                    | Undo does not overwrite it                                                                                                         | `actions.test.ts` › 'Undo does not overwrite an entry that is live again'                                                 |
| A cleared entry, then a cycle on another device                                                | The removal marker travels; the entry goes there too                                                                               | `app.test.ts` › 'two devices share a list: an entry, a tick, a clearing and a category travel'                            |
| A write fails (quota, the database closes)                                                     | The action reports it, the list is read again and stays as it was                                                                  | `app.test.ts` › 'a write that fails gives undefined and leaves the list as it was'                                        |
| The shared database cannot be opened at the start, later it can                                | The app says so and a later try succeeds                                                                                           | `app.test.ts` › 'a shared database that cannot be opened is said, and a later try can succeed'                            |
| A slow read finishes after a later one                                                         | The later state stays (reads are numbered in `app.ts`)                                                                             | **not pinned**                                                                                                            |
| The list is open in two tabs and one changes it                                                | The other tab shows it when it comes to the front (`wake`), not before                                                             | **not pinned** (no test with two tabs; the browser check uses one tab per device)                                         |
| Two apps start at the same moment on a new device                                              | Each may make a `Home` space; the person sees two and removes one (host package)                                                   | **not handled**, see the host's table                                                                                     |
| A change arrives by sync while the entry screen is open                                        | What is typed stays; Save writes the form over the newer entry (the later write wins whole)                                        | **not pinned**                                                                                                            |
| A cycle brings records while a tick box has the focus                                          | The list is redrawn and the focus returns to the same entry's box                                                                  | **not pinned** (the browser check clicks, it does not hold the focus across a cycle)                                      |
