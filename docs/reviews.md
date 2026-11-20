---
type: Reference
title: Reviews
description: The record of changes that several agents made together - per change who did which part, who checked what, what the checks found and fixed, the test counts, and what nobody verified; the first entry is roadmap goal 6 (Mixtura on spaces) of 2026-11-20; where the rules for this record come from.
tags: [reviews, agents, process, verification]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: rules
    title: 'AGENTS.md: Fixes and reviews'
    url: ../AGENTS.md
  - id: morphcook
    title: 'TheMorpheus407/morphcook-refined (docs/production-issue-reviews.md and the ordering documents; read on 2026-11-20, its tests were not run)'
    url: https://github.com/TheMorpheus407/morphcook-refined
---

# Reviews

One entry per change that more than one agent worked on, newest first.
The rule is in [AGENTS.md](../AGENTS.md). An entry says who did what and
who checked it, so a reader can tell a checked claim from an unchecked
one. "Lead" is the agent that held the task and committed; the others
were given one part each and reported back.

## 2026-11-20: Mixtura on spaces (roadmap goal 6, pull request 6)

| Part                                                                                                                                                                          | Done by                                  | Checked by                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Design ([decision](../apps/mixtura/docs/decisions/stock-in-spaces.md)), host `device.ts`, Mixtura's store, stock state, sync loops, screens, engine export format, unit tests | lead                                     | the browser checks (below); no second agent read this code                                                                               |
| Household: a space on this device only, Connect a storage                                                                                                                     | agent, general purpose                   | lead ran `check:domus`; the agent ran its own browser checks; lead did not read every file                                               |
| Shared packages: the earlier sync model and the passphrase cipher removed                                                                                                     | agent, general purpose                   | lead ran the root check; the removals were not read line by line                                                                         |
| Mixtura's browser checks moved to spaces                                                                                                                                      | agent, general purpose                   | lead ran the whole list once to the end (1839 checks)                                                                                    |
| The ordering table of sync                                                                                                                                                    | agent, general purpose (a smaller model) | a script checked that every cited test name exists (74 citations); the lead reproduced five rows with tests and did not check the others |
| Mixtura's documents brought in line                                                                                                                                           | agent, general purpose                   | a link check by that agent; lead read the parts it touched afterwards only where it changed them                                         |

**Found by the checks and fixed**

- Reading the spaces at the start rejected without a handler when
  IndexedDB is not available (`stock/sync.ts`, `refresh`). Found by
  `e2e/store.mjs`, scenario "No IndexedDB"; fixed in the app, and
  `test/stock-sync.test.ts` ("a shared database that cannot be opened is
  no error: nothing runs") pins it. Run on the code of commit `8fea785`,
  before the fix: that test fails and the six others of the file pass.
- The first stock mark no longer asked the browser to keep the storage,
  because stock is not written through Mixtura's repositories any more.
  Found by the documents agent reading the code; fixed in
  `stock/state.ts`. No test pins it.
- A blanket rename of "place" to "space" changed prose that meant a
  location ("in one place", "its place in the tree"). Found by the lead
  and by the browser-check agent; corrected by hand, not searched to the
  end in the browser checks' comments.

**Found by writing the ordering table and fixed**

[Sync orderings](../packages/host/docs/sync-orderings.md) was drafted by
an agent that read the code and the tests and tried the suspect
orderings with throw-away tests. The lead fixed the five that are
Mixtura's and wrote a test for each first. On the code before the fixes
(commit `525a6e1`) those five tests fail and the sixteen others of
`test/stock-sync.test.ts` and `test/stock-state.test.ts` pass; after the
fixes all pass.

- Two looks at the spaces at once started two loops for one space, and
  one of them could not be stopped.
- A stop while the spaces were being read left a loop running.
- A space joined or removed in the Household app in another tab did not
  show in Mixtura until a reload.
- A mark overwrote a field another app had written since the stock was
  read.
- A read asked for while a mark was being written could show the stock
  without the mark.

Left as rows marked "not handled" or "not pinned" in the table, among
them: a collection row written for a space that was just removed; an
edit made with the clock set behind the last sync that the stale device
rule drops; a failed connect seen by another tab; a poke during back-off.
These are the host package's and the model's and were not changed here.

**Counts** on the head of the pull request: model 638 tests, host 185,
Mixtura engine 1677 and app 499, Household 72, Culina and Emptio
unchanged; Mixtura browser checks 1839; Household browser checks 756.

**Open at the time of writing**

- The slow browser check `swap` failed once on the CI runner ("IndexedDB
  and local storage are untouched by swaps") and passes locally, also
  throttled. The cause is not known. The check now prints both
  snapshots.

**Not verified by anyone**

- Anything against the real GitHub or a real WebDAV server.
- Two real devices; the loop's timing on a phone.
- The removed code of the shared packages against uses outside this
  repository (there are none known).
- The German texts of the Household app's new screens by a reader.

## Where these rules come from

On 2026-11-20 the owner asked what to learn from
`TheMorpheus407/morphcook-refined`, a Flutter app built with agents. It
has no rule files for agents and no CI, but three habits this repository
lacked: a document per class of defect with a table of event orderings
and the test for each row; fixes that name the commit on which their
test fails and the cases that passed as controls; and a review record
that says which agent contributed what. Its tests were not run here, so
whether its documents are true was not checked; the habits are taken,
not its claims.
