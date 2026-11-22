---
type: Reference
title: Stock orderings
description: What Culina's stock does when things happen in an unlucky order - a change during a sync cycle, a screen drawn before another device or app wrote, the one move of old items failing or interrupted half way, two tabs, two devices on one record - with the test that pins each ordering, and the ones that no test pins.
tags: [stock, sync, orderings, races, migration, tests]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: decision
    title: 'Decision: stock in spaces'
    url: decisions/stock-in-spaces.md
  - id: host
    title: 'Sync orderings of the host package (the cycle, the loop, spaces)'
    url: ../../../packages/host/docs/sync-orderings.md
---

# Stock orderings

One document for one class of defect in Culina's stock: what happens when
things occur in an unlucky order. Each row is an ordering, the intended
behaviour, and the test that pins it. The orderings of the cycle and the
loop themselves are the host package's
([sync orderings](../../../packages/host/docs/sync-orderings.md)); this page
lists what Culina adds on top ([decision](decisions/stock-in-spaces.md)).

Reading the last column: a test is named as `file` › 'name', all in
`packages/app/test/`. **not pinned**: no test asserts it. **not handled**:
the code does not handle it; the row says what happens instead. What the
tests do not prove, for every row: the shared database is the host's memory
store, Culina's own database is fake-indexeddb, the storage is a memory
stand-in with etags, the clocks are injected, and "two devices" are two
stores in one process.

| Ordering                                                                                                     | Intended behaviour                                                                                                                                                                                      | Test                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A person changes stock while a cycle runs (between the cycle's read and its store)                           | The change is kept, the cycle says `pending`, the next cycle sends it                                                                                                                                   | `stock-sync.test.ts` › 'a change made while a cycle runs is kept and sent with the next cycle'                                                                                                                         |
| A screen read an item; another tab or device adds a batch or changes a field; then the person saves the item | The save is worked out from the record as stored at that moment: the new batch and the foreign field survive, Culina's fields of that item are the form's                                               | `stock-notebook.test.ts` › 'an edit is worked out from what is stored now: a batch written since the read survives'; `stock-value.test.ts` › 'a change is worked out from the records given, not from an earlier read' |
| Another app (Mixtura, Emptio) wrote fields to a record; Culina then ticks, edits or unticks it               | Every field Culina does not own is kept; unticking keeps the record with `present: false`                                                                                                               | `stock-notebook.test.ts` › 'a field of another app survives a tick, an edit and an untick in Culina'                                                                                                                   |
| Culina unticks; another app changes its own field; the person taps Undo                                      | Culina's fields come back as they were, the other app's field stays as it is now                                                                                                                        | `stock-value.test.ts` › 'untick of something not there is missing; Undo restores Culina fields over current others'                                                                                                    |
| Culina unticks; another device changes Culina's fields of that record; the person taps Undo                  | **not handled**: Undo writes Culina's former fields with a newer stamp, so the other device's change of those fields is replaced                                                                        | not pinned                                                                                                                                                                                                             |
| Two devices change the same record before either has synced (a tick here, a batch there)                     | **not handled**: the host merges whole records, the newer stamp wins; the other device's change of that record is lost. Changes of different records meet                                               | different records: `stock-sync.test.ts` › 'a tick on one device and a batch on the other meet in both'; the same record: not pinned                                                                                    |
| An edit screen of batch `key~2` is open; another tab removes batch `key~1`                                   | **not handled**: ids follow the place in `batches`, so the save goes to the batch that moved into that place, or says the item is no longer in stock when there is none                                 | not pinned                                                                                                                                                                                                             |
| The move of old items: the shared write fails                                                                | Nothing is moved and nothing is cleared; the next start moves them                                                                                                                                      | `stock-legacy.test.ts` › 'a shared write that fails leaves the old items where they are; the next start moves them'                                                                                                    |
| The move: the shared write succeeded, the page closes before Culina's database is cleared                    | The next start finds records with a boolean `present`, overwrites none of them, and clears                                                                                                              | `stock-legacy.test.ts` › 'interrupted after the shared write and before the clear: the next start keeps the space and clears'                                                                                          |
| The move runs a second time                                                                                  | Nothing is moved, the collection is unchanged                                                                                                                                                           | `stock-legacy.test.ts` › 'run twice: the second start finds nothing to move and changes nothing'                                                                                                                       |
| The used space already has a record for the key of an old item (Mixtura's, or another device's)              | That record is never overwritten, whether it says present or not                                                                                                                                        | `stock-legacy.test.ts` › 'a record the space already has (present true or false) is never overwritten'                                                                                                                 |
| Two Culina tabs start at the same moment after the update                                                    | Both may run the move; the later write finds the records of the first with a boolean `present` and keeps them; both clear. Believed to hold because the write is one transaction of the shared database | not pinned (the same state as the row "interrupted", but no two real tabs)                                                                                                                                             |
| Two apps (Culina and Mixtura or Emptio) start at the same moment on a device without a space                 | **not handled** (host limit): each may make a space on this device only named Home; the person sees two and can remove one in the Household app                                                         | not pinned                                                                                                                                                                                                             |
| The chosen space is removed in the Household app while Culina is open                                        | The next read (page in front again, or a cycle that saw spaces move) uses another space by the host's `pickSpace`                                                                                       | not pinned in Culina (`pickSpace` is the host's)                                                                                                                                                                       |

## Adding a row

When a defect about the order of events is found in Culina's stock, add
a row here with the intended behaviour and the test that pins it, in the
same change as the fix. An ordering that matters and has no test stays
here as not pinned.
