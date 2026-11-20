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

## 2026-11-20: Emptio on spaces, its native app, Culina's stock on spaces

Roadmap goals 7, 8 and the first part of 11
([roadmap](roadmap.md)). The lead used a larger model; the agents were
given smaller ones, as the owner asked.

| Part                                                                                                                                  | Done by              | Checked by                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host package (loops of an app, space choice, file store, service worker, moved test helpers), Emptio's engine, web app and unit tests | lead                 | Emptio's browser checks (agent 1) and the checks below; nobody read the code a second time                                                                                                                                  |
| Emptio's browser checks (`apps/emptio/packages/app/e2e/`, 183 checks)                                                                 | agent 1, small model | lead ran them after fixing what they found; lead did not read the scenarios line by line                                                                                                                                    |
| Native Emptio: platform pieces, pages, joining, smoke check                                                                           | lead                 | the smoke check in real GJS, screenshots at 360 × 720 read by the lead, the interaction check (agent 3)                                                                                                                     |
| Native packaging: desktop file, metainfo, icons, Flatpak manifest, CI jobs                                                            | agent 2, small model | `desktop-file-validate` and `appstreamcli validate` run by the agent; the lead read its report and did **not** read the manifest or the CI jobs line by line; no Flatpak was built                                          |
| Native interaction check (`scripts/interact*.mjs`, 17 checks)                                                                         | agent 3, small model | lead ran it, moved its click positions after a layout change, and looked at one of its screenshots                                                                                                                          |
| Culina's stock on spaces (`apps/culina`, design by the lead)                                                                          | agent 4, mid model   | lead read `shared-stock/value.ts`, `edits.ts` and `legacy.ts` in full, ran `npm run check` and Culina's browser checks; lead did not read `space.ts`, the screens, the engine's export change or the adapted browser checks |
| The documents of the root, the host package, Emptio; this entry                                                                       | lead                 | nobody                                                                                                                                                                                                                      |

**What the checks found, and where it was fixed.**

- Emptio's browser checks: the tick box took taps on 22 px only (a
  scaled check box), the page was 15 px too wide at 360 px (a hidden
  legend with a width), the link to the Household app was 20 px high.
  Fixed in `components.css` and `settings.ts`; the checks were not
  changed and pass.
- The agent fixed three faults of its own checks (a race with the first
  empty write, Playwright's `check()` on a list that redraws, a heading
  uppercased by CSS) and says so.
- The native interaction check: a GTK markup warning for a name with an
  ampersand, and controls of 26 to 42 px. Fixed in the pages; the
  check's coordinates then had to move with the layout. Its reading of
  the add button's height is taken at a stale position.
- The lead's own smoke script blocked Node while GJS waited for the fake
  storage in the same process; the script was fixed, not the app.
- The Household app's test of untranslated German texts listed the home
  page's links; the third app's link was added to its list.
- CI's `mixtura-e2e-slow` failed on the first push in `e2e/swap.mjs`: the
  check's snapshot was taken before the first start had finished its
  writes. The fault was in the check (its wait did not wait) and is fixed
  there; it also failed on main in 1 of 3 runs. The lead had run only
  three of Mixtura's browser checks before pushing, which is why CI found
  it first.
- Culina's agent found no defect in existing code and rewrote
  `test/stock-notebook.test.ts`, whose subject (stock rows in Culina's
  own database and in the export) no longer exists.

**Counts** after the change, all passing: model 638, host 221, Mixtura
1677 and 490, Culina 1094 and 506, Emptio 26, 36 and 9, Household 72;
browser checks: Emptio 183, Culina's run "e2e passed", Household and the
site "e2e passed", Mixtura's `spaces`, `stock` and `two-tabs` at
360 × 720 (the rest of Mixtura's browser checks were not run).

**What nobody verified.**

- The real GitHub or a WebDAV server, in any app.
- A Flatpak build, an install, a phone: the native app ran on a headless
  display only.
- Culina with a shared space in a browser (its checks use a space on
  this device only); two tabs at Culina's first start after the update,
  where the move of old items could run twice at once.
- The choices Culina's agent made beyond the brief (the ids of batches
  that shift when an earlier batch is removed, an untick that also
  clears `openedOn`, `bestBefore` and `note`, which Mixtura keeps). They
  are in its [decision record](../apps/culina/docs/decisions/stock-in-spaces.md)
  for the owner.
- That the Flatpak job's pinned `actions/download-artifact` commit is
  the release its comment names.

## 2026-11-20: the steps of Culina's shipped dishes on the kit

Every step of the 48 shipped dishes names what is done, by a technique
or a plain action ([classic format](../apps/culina/docs/classic-format.md)).

| Part                                                                                                                      | Done by                | Checked by                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A word for 324 steps (24 techniques, 300 plain actions), `uses` for 5 steps, 12 new plain actions                         | agent, general purpose | lead: a script compared every dish file with the one before and found no change but `action`, `technique` and `uses`, and no existing technique changed; lead read 81 of the 324 words against their step (below) |
| The word lists (`step-words.json`), the tool `propose-steps.mjs`, `validateClassic` refusing an unknown action, the tests | agent, general purpose | lead ran `npm run check:culina` and the browser checks on the agent's commits brought onto the current main; lead did not read the tool or the changed word lists line by line                                    |
| The brief, bringing the commits over (one overlap in the log), this entry                                                 | lead                   | nobody                                                                                                                                                                                                            |

**What the lead read.** All 24 techniques the agent gave to steps,
each against the note it shows: they fit; two sit loosely (chopping
meat, and ham with garlic and parsley, under "cut the pieces to one
size"). All 17 steps given the catch-all "Prepare", and every seventh of
the other plain actions (40 steps): none was out of place. The other 243
words were not read by a second reader.

**Found by the checks**

- The agent's own trial: the word list proposed the word the agent chose
  for about half the sentences (244 of 445 after its changes). It
  changed seven entries of the list and pinned them with tests.
- The agent found that `tools/content/validate-file.mjs` did not
  generate the substitutes index, so it could not bundle the engine in a
  fresh checkout, and fixed it. No test pins that.
- One browser check that the change does not touch failed once on the
  lead's machine and passed on the next run: `e2e/catalogue.mjs`, "the
  grams shown are the engine's from the catalogue rows", where the line
  of three eggs showed no amount. Four builds and browser runs were going
  at the same time. The lead suspected that an amount typed while a
  catalogue entry is still being taken into the notebook is dropped,
  tried exactly that with the store slowed down, and the amount stayed.
  **The cause is not found.** The check does not wait for the picker to
  close at that line, which is the next thing to look at if it returns.

**Counts.** Culina's engine 1093 tests, its app 485, on main with the
agent's commits. Steps: 447, with a technique 145 (before 121), with a
plain action 300 (before 0), with `uses` 359 (before 354), without a
word 2, both named in the test with the reason.

**Not verified.** That each word fits its step, beyond the 81 read. The
German sentences, which the agent read only where the English left a
doubt. Four existing techniques the agent found to fit loosely and left
(`bake` on a meat loaf, `fresh-pasta` on cutting and rolling, `boil` on
a three-hour boil, `saute` on flour): they are for the owner. No browser
check looks at a shipped dish with its new words.

## 2026-11-20: Culina's notes read against three books

The record of the research is
[four books read against the notes](../apps/culina/docs/book-findings.md).

| Part                                                                                              | Done by                | Checked by                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| McGee read against the 64 notes: 105 findings                                                     | agent, general purpose | the lead's script found all 105 quoted sentences under the page named; the lead did not open the passages                                              |
| The Food Lab read against the 64 notes: 78 findings                                               | agent, general purpose | the script found all 78 sentences under the section named; the lead did not open the passages                                                          |
| Der junge Koch read against the 64 notes: 130 findings                                            | agent, general purpose | the script found 129 sentences and refused one, which was dropped; the lead did not open the passages                                                  |
| Texture Over Taste sampled                                                                        | lead                   | nobody                                                                                                                                                 |
| The brief, the script, the decision per note, the texts of 24 changed and 14 new notes, the tests | lead                   | `npm run check`; no second agent read the texts of the notes or the German                                                                             |
| A source may be a book and may carry its own level (schemas, type, note card)                     | lead                   | `test/content.test.ts`, `test/source-licences.test.ts`; one browser check on the shipped pot-au-feu (`e2e/classics.mjs`, "a note that rests on books") |

**Found by the checks and fixed**

- One quoted sentence of Der junge Koch did not stand under the page
  its finding named (the lead's script; the agent's own check had
  passed it). The finding was dropped and nothing rests on it.
- Two new texts said "too much" and "zu viel", which the wording rule
  of the app refuses in a note (`packages/app/test/strings.test.ts`,
  "no text of a technique, a handling rule or a classic judges a
  dish"). The texts were reworded; the rule was not touched.
- A new handling rule rests on a kitchen test alone and has the level
  `tested`, which `test/evidence-levels.test.ts` refused, because it
  held every shipped note to `textbook`. The test now names that one
  note with its level, fails when another note leaves `textbook`
  unnamed, and holds a `tested` note to a source that says so.
- Four page numbers in the hand-written tables of the research document
  differed from the findings; the lead compared the tables with the
  data and corrected them.

**Counts.** Culina's engine 1048 tests, its app 449, before and after
the notes changed (1045 and 449 before the work began; three tests are
new). Culina's browser checks passed once to the end, with the pre-installed Chromium
(`PLAYWRIGHT_CHROMIUM_PATH`); eight of them are new. 312 of 313 quoted sentences found by the script. 157 book entries
in 59 of the 64 earlier notes and in the 14 new ones.

**Not verified.** No printed book was seen: the pages are the scan
pages minus an offset checked on four pages per book. The books were
searched and read around the hits, not read through. The script proves
that a sentence stands where the finding says, not that the statement
of the note follows from it; nobody read a finding against its book a
second time. The agents' own counts of what they did not find were not
checked. The German texts were read by no native speaker. The text
copies came from a shadow library and a lending scan; whether the owner
holds the books was not established.

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
