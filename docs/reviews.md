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

## 2026-11-23: one Cook page in Culina's native app (issue 44)

One agent built it in its own worktree on top of pull request 55; a
different agent (mid model) reviewed it; the writer added what the
review found untested; the lead looked at the 360 x 720 screenshot of
the page with "Use up first", merged, ran the checks and committed.

| Part                                                                                               | Done by | Checked by                                                                                               |
| -------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| The Cook page (`cook-list-page.ts`), the session's `cookView`, the exports from `@culina/app/core` | writer  | reviewer (no defect; five mutations of `session.ts`, four caught by the tests, the fifth now pinned too) |
| The day guard test, two doc corrections                                                            | writer  | nobody but the writer and the lead's runs                                                                |
| This entry                                                                                         | lead    | nobody                                                                                                   |

**What the checks found.** The cache of the finder's answers is kept
per stock list and day; dropping the day from it passed every test. A
test now moves the injected day and fails without the guard. The page
does not redraw by itself at midnight, only on its next event: written
down in native-linux.md, not changed.

**Test counts** (lead's runs): `npm run check:culina` (engine 1195, app
837, native 19); `npm run check` passed; native build, smoke and
interaction in GJS 60 ok, none failed; web browser checks 1877 ok.

**What nobody verified.** Use-by dates written by the web app on another
device reaching the native app through a real synced space. A phone,
swipe back, a screen reader on the switch and the order.

## 2026-11-23: native apps: scrolling over text fields, creating and leaving a space

The owner reported three defects of the native Linux apps: lists with
editable rows (Emptio for example) do not scroll on Phosh; a space can
be neither left nor created. One agent built the fixes in its own
worktree; a different agent (mid model) reviewed them; the writer fixed
the findings; the lead merged main (pull request 52, Report a Problem,
had changed the same files), ran the checks and committed.

| Part                                                                                                 | Done by | Checked by                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `editOnTap` (packages/gjs/src/rows.ts): a field takes the focus on the release of a tap, touch only  | writer  | reviewer (one defect in the check, see below); the touch-only change after the review by nobody but the writer |
| Create a space (host `createSpace` moved from the Household app to packages/host/src/space-setup.ts) | writer  | reviewer (behaviour of the Household app unchanged, its 72 tests pass)                                         |
| Leave a space; the file store drops writes for a space it removed                                    | writer  | reviewer read leaving; the store guard after the review by nobody but the writer                               |
| Merging main, the three native `main.ts` imports, this entry                                         | lead    | nobody                                                                                                         |

**What the checks found, and where it was fixed.**

- _Reviewer: a check that did not discriminate._ The interaction step
  "a touch drag scrolls the list" asked for 250 px and failed 2 of 3
  runs on the fix and passed on the old code too: Broadway scrolls over
  a field either way and has no Phosh keyboard. It is now a control
  (at least 100 px, more than one row); the proof of the fix is "the
  drag focused no field", which failed 3 of 3 runs on the old
  `categories-page.ts` and passed 3 of 3 with the fix (reviewer's runs).
- _Reviewer: mouse on the desktop._ The first version deferred the focus
  for every click, so a mouse click no longer placed the cursor and a
  press-drag no longer selected. Focus is now deferred for touch only;
  step 13b (a mouse click two letters into a name, then a key) fails
  when the deferral applies to every input.
- _Reviewer: leaving during a cycle._ A cycle in flight could write the
  left space's file again (sync orderings, not handled). The native file
  store now drops writes for a removed space; two tests fail without the
  guard. The web apps' IndexedDB store still has it (row now "partly").
- _Reviewer: not exercised._ Leaving the last space: now checked in all
  three apps (a new space on this device follows). A check that failed
  once ("Remove marks the record deleted") was not reproduced in 14
  runs; the cause was not found, and the check now says which step
  failed.
- _Found by the writer, not fixed:_ `apps/mixtura/packages/app/test/stock-state.test.ts`,
  first test, waits a fixed 20 ms and failed once in a full run, the
  same kind of wait as the host test fixed on 2026-11-22.

**Test counts** (lead's runs after merging main): `npm run check`
passed (host 257, gjs 17, domus 72, the rest as before); native smoke
and interaction: Emptio 49 ok, Mixtura 47, Culina 47, none failed.

**What nobody verified.** A phone with Phosh and its keyboard: the
defect as the owner saw it was not reproduced, only its cause. A real
GitHub or WebDAV storage for creating. The mouse in the narrow
preferences sheet on a real compositor. The writer's fixes after the
review, beyond its own runs and the lead's.

## 2026-11-22: one Cook screen and shipped components in Culina (issue 44, web app)

The owner decided issue 44; the lead split the web part in two and gave
each to an agent in its own worktree, then had a different agent review
each part. The lead combined the parts, ran the checks and committed.
The writers were the high model, the reviewers the mid model.

| Part                                                                                                                    | Done by                                        | Checked by                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| One Cook screen: the list, "only with what I have", "Use up first", the stock link, nav Cook/Notebook/Ratios, redirects | agent A                                        | reviewer A (no defect; six doubts, see below); A's fixes were checked by nobody but A and the lead's check runs    |
| Shipped components in the Notebook: list, read-only detail, Keep (`copyClassicComponent`)                               | agent B                                        | reviewer B (no defect; three doubts, fixed by B); B's fixes were checked by nobody but B and the lead's check runs |
| Notebook → Dishes as a plain list of own and shipped dishes (owner's point 3; agent A had left shipped dishes out)      | agent B, at the lead's request after combining | nobody but B and the lead's check runs                                                                             |
| The decision record `apps/culina/docs/decisions/cook-screen.md`                                                         | agent A, amended by agent B                    | reviewer A read it against the code                                                                                |
| Combining the parts, this entry                                                                                         | lead                                           | nobody                                                                                                             |

**What the checks found, and where it was fixed.**

- _Reviewer A._ "Use up first" placed a dish that lacks lines above a
  complete one and its row did not say so: the row now says what is
  missing ("· lacks 2"). When the finder fails, the list said "no
  use-by dates": it now says nothing. Two browser checks had gone with
  the old finder although their features remain (the character filter,
  the origin word); re-added on the Cook list, and the second **found a
  defect in the app**: the origin word followed all dishes, not the rows
  shown; fixed in `list-view.ts` with a unit test. The wording check
  was not run over the new rows; it is now. The first-screen check
  toggled the fold; it now asserts the fold is closed. `readyNowKeys`
  had no unit test; it has one.
- _A check that failed once, found to be an app defect._ The catalogue
  picker check ("the grams shown are the engine's") failed in a full
  run. Agent A found that keys typed into the amount field while a pick
  was being stored were lost, so a line was saved without its amount (4
  failures in 22 runs before; the new check "an amount typed while the
  pick lands keeps the focus and every key" fails every time on the old
  code and passed 25 of 25 after). Fixed in the editors
  (`form-bits.ts`), not in the check.
- _Reviewer B._ The write order of Keep was claimed but not pinned (a
  test now records it and fails on the swapped order); a store failure
  half way leaves records behind, as Keep of a dish always did (now said
  in behaviour.md); the search re-implemented `filterByName` (reused);
  the German "cannot be kept yet" text was never rendered in a check (it
  is now).
- _Combining._ Agent B had removed the generic list helper that agent
  A's Notebook Dishes used: typecheck failed; agent B rebuilt that list
  on the shared notebook list.

**Left for the owner** (in the decision record): `#/stock` stays its own
screen, not a redirect; the old `#/cook` sets no filter; the switch
counts only complete dishes; "Use up first" places incomplete dishes
too.

**Test counts** (lead's runs on the combined state): Culina engine 1195,
app 837, native 17; browser checks 1877 ok, none failed; `npm run check`
passed.

**What nobody verified.** The native app (unchanged here; it follows in
its own pull request). The 48 real shipped dishes against the switch and
the order beyond one screenshot. A real phone, a screen reader, the
German by a native speaker. The fixes of A and B after their reviews,
beyond their own tests and the lead's runs.

## 2026-11-22: the move to nexumia-de/domus, prepared

The lead wrote [the plan](move-to-nexumia-de.md) and searched the
repositories itself, in clones of every repository of nexumia-de it can
read. One helper agent was asked to read GitHub's page on transfers and
could not: docs.github.com is blocked, which the lead confirmed with
curl (403 from the proxy). Nobody checked the plan.

**What nobody verified.** What a transfer keeps; branches other than the
default ones of the other repositories; Cloudflare's settings.

## 2026-11-22: what marks a base in Culina, and the import pack (issue 39, step 1)

The owner asked the lead to do this step alone, without other agents.
The lead wrote the decision record, the engine and app code, the tests
and the documents. No other agent took part, so nobody reviewed the
step; this entry exists because the owner asked for one per pull request.

| Part                                                                                                                                                              | Done by | Checked by                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| [Decision: bases and the pack](../apps/culina/docs/decisions/bases-and-pack.md)                                                                                   | lead    | nobody                                                                                         |
| `kind` in the classic schema; `src/classics/base.ts` (in the dish, alternatives, used); the validator's `base-without-component`; the finder ignores alternatives | lead    | nobody; `test/classics-base.test.ts` (8 tests); its finder test fails without the change (run) |
| The pack folder, `dist/classics-pack.json`, `readPack` and `fetchPack`, the pack tests, the validator script                                                      | lead    | nobody                                                                                         |
| The documents                                                                                                                                                     | lead    | nobody                                                                                         |

**What the checks found.** `test/schemas.test.ts` failed until the
data model listed `kind`: the documents had not kept up, and were fixed.

**Test counts** (lead's run of `npm run check:culina`): engine 1191, app
802, native 17; the whole of `npm run check` passed; browser checks 1852 ok, none failed.

**What nobody verified.** No real base exists yet, so the rule was tried
only on invented files; the dish screen still lists an alternative as a
component of the dish, which matters once part 1 gives a base one. The
pack folder is empty, so the build, the reader and the tests ran on no
real pack dish. Nothing is shown to the user yet.

## 2026-11-21: one list of dishes in Culina, and what a tester found

The owner asked for the shipped classics and the notebook's dishes to
become one list with one filter, and for as many agents in parallel as
possible. The lead wrote the base (one entry, one filter, the controls)
and committed it; fifteen agents built one part each in their own
worktree, six reviewed or tested and built nothing; the lead merged and
ran the checks after each merge. All agents were the high model; the
lead changed model once during the work.

| Part                                                                               | Done by                                                                                | Checked by                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The base: `src/browse/entry.ts`, `filter.ts`, `screens/dish-filter.ts`             | lead                                                                                   | reviewer 2 (wrote failing probes; found the meat-free holes and that "complete" kept no shipped dish)                                                       |
| Course and cuisine on a dish of the notebook                                       | agent A                                                                                | reviewer 4 (used the built app, English and German, 360 and 1280 px; no finding)                                                                            |
| The one list on Start and Dishes, the old country addresses                        | agent B                                                                                | reviewer 4 (five findings); B's fixes were checked by nobody but B and the lead's check runs                                                                |
| "What can I cook" as one list under the filter                                     | agent C                                                                                | reviewer 5 (seven findings); C's fixes were checked by nobody but C and the lead's check runs                                                               |
| The random pick under the filter                                                   | agent D                                                                                | reviewer 1 (four findings, the first reproduced in a unit test and in the browser); D's fixes were checked by nobody but D and the lead's check runs        |
| One dish screen and one cook screen                                                | agent E                                                                                | reviewer 5 (ticked the blocks of both old screens off in the browser; found a check that races the catalogue load, no defect of the screens)                |
| The native Linux app under the filter                                              | agent F, who could not run GTK                                                         | reviewer 2 installed gjs 1.80, GTK 4.14 and libadwaita 1.5 and ran smoke and the 21 Broadway checks: all passed, the estimated click coordinates were right |
| The decision record, the roadmap, the plan                                         | agent G                                                                                | reviewer 3 (every claim against the code, every link)                                                                                                       |
| The dish lines linked to the catalogue (one line)                                  | agent H                                                                                | reviewer 3 (recomputed the per-dish table: every cell matched; agreed on 31 of 32 lines left unlinked)                                                      |
| The character rules; "without meat and fish"                                       | agent I                                                                                | nobody but I: the reviewer's seven probes pass now, and I ran them itself                                                                                   |
| Three named foods in the catalogue, six lines linked                               | agent J                                                                                | nobody; J reports that the unchanged generator reproduced the shipped file byte for byte and that none of the 716 earlier rows changed                      |
| The stock covers recipes: group, part and water rules, staples, the picker's order | agent K                                                                                | nobody                                                                                                                                                      |
| The backup: format 3 with what was learned, what the file does not hold, erase     | agent L                                                                                | nobody                                                                                                                                                      |
| Amounts as a cook writes them: a line in pieces, unit names, household measures    | agent M                                                                                | nobody                                                                                                                                                      |
| The German of the interface and of 138 content texts                               | agent N, a language model                                                              | nobody; no native speaker read it                                                                                                                           |
| Nutrition: the usual member of a group, when a figure is shown                     | agent O, who computed the omelette and the crema by hand from the USDA figures         | nobody                                                                                                                                                      |
| A walk through the built app as a cook, German, 360 and 1280 px, real content      | the tester, at commit cc92c34, before the list, the finder and the screens were merged | this was a check                                                                                                                                            |
| The merges, the conflicts, this entry                                              | lead                                                                                   | nobody                                                                                                                                                      |

**What the checks found, and where it was fixed.**

- _Reviewer 2, the base._ A dish of tomato and lard counted as without
  meat (any food category counted as known); meat in a component nested
  in a component disappeared when the slot had an amount; a slot whose
  component was gone counted as nothing. Fixed in the app by agent I
  (`src/characters/meat-free.ts`, `dish.ts`), each with a test that
  fails on the commit before.
- _Reviewers 2 and 3._ No shipped dish was "complete": the base asked an
  amount of the slot that names a component. Fixed by the lead in
  `entryOfClassic`; `test/browse.test.ts` names the three dishes that
  are complete.
- _Reviewer 1, the random pick._ "Roll again" on one role could put a
  component into another role's row, and "Make it a dish" stored it
  there (picks were kept by position); every filter change lost the
  keyboard focus; picks went stale when the filter changed on another
  screen. Fixed by agent D; three unit tests and four browser checks
  fail on the code before.
- _Reviewer 4, the list._ The link back from a shipped dish replaced the
  user's filter and led to another screen; the origin select cut off its
  chosen text at 360 px; "No dish fits" and "Show all" flashed while the
  catalogue loaded; a choice did not reach the finder where storage
  throws. Fixed by agent B; the filter folds behind a summary line.
- _Reviewer 5, the finder._ The carry of an old country or meat choice
  into the shared filter came back after the user cleared it when the
  second write threw, and narrowed more than the old choice had: the
  carry was removed. The empty state had no way out; "What uses" an
  ingredient inherited a filter set elsewhere. Fixed by agent C.
- _A check that was wrong, corrected in the check._ `e2e/classics.mjs`
  counted a handling note before the catalogue had loaded (1 failure in
  20 runs); it waits now. The app drew as before.
- _A defect behind a check that looked flaky, fixed in the app._ "The
  catalogue picker element was not stable": a pick that was saved late
  closed a picker opened meanwhile. Fixed by agent C in the two editors,
  with a check that fails on the old files.
- _The tester._ Twelve everyday foods in stock found no dish (agent K);
  the backup held neither the stock nor what was learned, and nothing
  erased the data (agent L; the stock is still not in the file, and the
  screen says so); one line in pieces blanked a component and showed ids
  for names (agent M); an omelette of 5 kcal (agent O); English and
  clumsy German (agent N).
- _Found by the lead's check runs after merges._ Two checks of the list
  assumed that an example dish states no course, which agent A's example
  data now does: the checks were corrected to ask what they mean. The
  German review named a cuisine "Deutsche Küche", which agent B's new
  check found cut off in the select at 360 px: fixed in the app with a
  short form for the select. One entry of the parts table cited a book
  chapter that its author had quoted from memory: the citation was
  removed and the entry says it is a judgement.
- _Reviewer 3, the documents._ The dated notes in two decision records
  stated as done what was being built; they are true since the merges.
  One clove was linked to ground cloves and another left unlinked; agent
  J linked it. `classic-dishes.md` gave the wrong reason for "0 of 48
  complete" and named catalogue entries that do not exist: a dated
  correction stands there. Still open: the README's "Not a recipe box",
  which contradicts the recipe book decision and is the owner's wording.

**Test counts** (lead's last run of `npm run check` after the last
merge): Culina engine 1172, app 779, native 17; the other parts as
listed in the output of that run. The whole of Culina's browser checks
passed on the merged state after the last merge; agent C ran them three
times in a row on its branch, each passing with 1712 checks.

**What nobody verified.** The parts of agents I, J, K, L, M, N and O
beyond their own tests and the lead's check runs; the fixes of B, C and
D after their reviews. A real phone, a screen reader, a real private
window. The German by a native speaker with kitchen training. The web
app at desktop width beyond the 1000 px runs and two reviewers' walks.
The Linux app on libadwaita 1.9, which the Flatpak targets, and by
hand. The tester's walk was not repeated on the merged state, so that
its findings are gone is shown by the tests of each fix, not by a
second walk. No source of a dish was opened: the order of steps and
the amounts are as they were.

## 2026-11-21: unification of toasts, header titles and native texts; Mixtura's stock write race

| Part                                                                                                                                                                                                                         | Done by            | Checked by                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mixtura's stock writes start at once (pull request 25)                                                                                                                                                                       | agent 1, mid model | lead read the diff of `state.ts` and `source.ts` and checked the ordering claim against `idb-store.ts` (`changeRecords` is one readwrite transaction) and `cycle.ts`, ran `npm run check` |
| One toast timing (5 s, 8 s with Undo, held while focused), one header title rule (four lines, then ellipsis), native Emptio and Mixtura on `@nexumia-de/gjs/texts`, remaining steps in `shared-shell.md` (this pull request) | agent 2, mid model | lead read the agent's report, merged `main` and ran `npm run check`; lead did not read the diffs line by line                                                                             |
| This entry                                                                                                                                                                                                                   | lead               | nobody                                                                                                                                                                                    |

**What the checks found, and where it was fixed.** Holding a toast while a pointer rests on it made a toast cover Mixtura's "Add Batch" for good in `e2e/stock.mjs`; the hold is on focus only. A two- and a three-line header title cut "Daiquiri: versions" at 320 px with 200 % text in `e2e/reflow.mjs`; the rule is four lines.

**Test counts** (lead's run of `npm run check`): model 638, host 226, gjs 11, Mixtura 1677 and 492, Mixtura native 13, Culina 1113 and 539, Culina native 10, Emptio 38 and 41, Emptio native 2, Household 72. Agent 2: Emptio browser checks 267 ok, Mixtura's all pass, native smoke and Broadway checks of Emptio and Mixtura pass in real GJS.

**What nobody verified.** A phone, a screen reader, the German wording by a native speaker, the toast's focus hold beyond one Emptio browser check (the host frame tests have no DOM).

## 2026-11-21: characters of a dish in Culina, and meat and fish in its catalogue

| Part                                                                                                                | Done by            | Checked by                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26 named foods of meat, poultry, fish and shellfish, German names, 8 classic lines linked, `catalogue-meat.test.ts` | agent, mid model   | lead read the report and the diff's file list, put `names-de-own.json` back into its one-line form (the agent had reformatted every entry) and ran the checks; lead did not compare the FDC ids with the dataset or read the German names |
| Engine `dishCharacters`, the character table, chips, the filter, their tests                                        | lead               | nobody but the lead's own tests                                                                                                                                                                                                           |
| Finding the failing line in the CI log of pull request 24                                                           | agent, small model | lead confirmed the cause in the code (both screens have the same heading)                                                                                                                                                                 |
| This entry                                                                                                          | lead               | nobody                                                                                                                                                                                                                                    |

**What the checks found, and where it was fixed.** Running the first table over the 48 classics showed four wrong characters (minestrone cheesy, gazpacho creamy, sauerbraten fried, a boiled dinner light); the rules were narrowed and the engine got a stricter coverage for fat and energy. CI found the swap check "back on the dish the swap is still there" failing: a race in the check (it waited for a heading both screens have), fixed in the check; the app was right. The build test "main.js does not carry the catalogue" failed on the character table naming garlic's id; the test now looks for a row's text, the table stays.

**Test counts** (lead's run of `npm run check:culina`): engine 1113, app 539, linux 10. Culina's browser checks end with "e2e passed".

**What nobody verified.** The 26 FDC ids against the dataset by a second reader, the German names by a native speaker of the trade, the thresholds of the table against any source (there is none), desktop width, a real phone, a screen reader on the chips, a notebook of a real user.

## 2026-11-21: the shared frame, Emptio and Mixtura (pull requests 19 and this one)

| Part                                                                                                      | Done by            | Checked by                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emptio's frame, filter and sort, `packages/host/src/frame` (pull request 19)                              | agent 1, mid model | lead ran `npm run check` and Emptio's browser checks locally (pass) and read `toaster.ts` and `sync-indicator.ts`; lead did not read Emptio's screens line by line            |
| Mixtura on the frame, frame extensions (`worstStatus`, back handler, `[hidden]` fix), new `e2e/frame.mjs` | agent 2, mid model | lead read the agent's report, resolved the merge of `docs/decisions/shared-shell.md` and ran `npm run check`; lead did not read Mixtura's shell or its adapted browser checks |
| This entry                                                                                                | lead               | nobody                                                                                                                                                                        |

**What the checks found, and where it was fixed.** Mixtura's browser checks found the header left `inert` after a sheet closed (fixed in `render.ts`) and a hidden sync banner that showed in an app without a global `[hidden]` rule (fixed in the shared `frame.css`). The swap check "under 50 ms" failed once at 84 and 94 ms while about 13 browser runs went in parallel and passed alone at 18 ms; not changed.

**Test counts** (lead's run of `npm run check`): model 638, host 226, gjs 9, Mixtura 1677 and 490, Culina 1094 and 506, Emptio 38, 41 and 2, Household 72 (the agent's report called the model's 638 Mixtura's). Mixtura's browser suite at 360 x 720 and 1200 x 800 and Emptio's pass in the agent's runs.

**What nobody verified.** A real phone, a screen reader, a real storage failing (the banner check uses a space whose cycle fails before any request), the 4x-throttled `e2e:slow` script.

## 2026-11-21: Culina's native app

| Part                                                                                                                                           | Done by          | Checked by                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/culina/packages/linux`, `@culina/app/core`, `shared-stock/items.ts`, `packages/gjs` (`language`, `texts`, licences moved), CI jobs, docs | agent, mid model | lead read the agent's report only and ran `npm run format:check` after merging `main`; lead did **not** read the code, the manifest or the CI jobs; CI on this pull request builds the Flatpak for the first time |
| Culina job in the release workflow, this entry                                                                                                 | lead             | nobody                                                                                                                                                                                                            |

**Test counts** (agent's run): Culina native 10, engine 1094, web app 506, gjs 11, Mixtura native 13, Emptio native 2; smoke in real GJS 13 checks per app; Culina's interaction check 20.

**Choices to confirm by the owner.** The native ingredient list keeps names in one column (an empty amount cell), unlike the web app. Four classics carry "rights reserved, to be checked by the owner" and the technique notes cite CC BY-NC-SA textbooks; publishing a Flatpak is a distribution to look at before the tag `culina-v0.1.0`.

**What nobody verified.** The Flatpak build before CI, an installed bundle, a phone, a real storage, the German texts by a native speaker, Mixtura's and Emptio's interaction checks after the licence move.

## 2026-11-21: Emptio and Mixtura into the shared Flatpak repository

Roadmap goal 11 (Emptio's releases, pull request 14; Mixtura's native app,
this pull request). The lead used a larger model, the agent a mid model.

| Part                                                                                                                                         | Done by            | Checked by                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emptio's release job, first release, `release.toml`; phosh-apps' per-app tags; the toolkit's `tag-prefix`                                    | lead               | CI of pull request 14 and the tag run of `emptio-v0.1.0` (release created with both bundles); nobody read the code a second time                                                                                                                      |
| Shared package `packages/gjs`, Mixtura's native app, `@mixtura/app/core`, status words in the host package, composite CI actions, their docs | agent 1, mid model | lead read the agent's report, the Mixtura manifest and the composite release action in full, the job graph of `ci.yml`, and ran `npm run check`; lead did **not** read the pages, `session.ts`, the gjs package or the interaction check line by line |
| This entry                                                                                                                                   | lead               | nobody                                                                                                                                                                                                                                                |

**What the checks found, and where it was fixed.**

- The lead's `npm run check` failed on the formatting of
  `apps/mixtura/docs/native-linux.md`, which the agent reported as
  passing; fixed with Prettier, the check then passes (all parts).
- The agent's report says the commit message counts 3 new host tests;
  there are 2 (host 223 tests).

**Test counts** (lead's run): model 638, host 223, gjs 9, the other parts
as on `main`; Mixtura native 13, Emptio native 2 (its other tests moved to
gjs).

**What nobody verified.** The Mixtura Flatpak build (CI on this pull
request builds it), the composite actions before CI runs them, an
installed bundle, a phone, sync against a real storage, libadwaita 1.9 of
the GNOME 51 runtime, the German texts by a native speaker.

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
- An install of the Flatpak bundles (CI built them for x86_64 and
  aarch64 on the first run; nobody started one) and a phone: the native
  app ran on a headless display only.
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

## 2026-11-20: swapping a filling and the random pick in Culina

A slot of a dish can be swapped for another component of its role, and
a dish can be put together at random, one component per role
([behaviour](../apps/culina/docs/behaviour.md#dishes)).

| Part                                                                                                                                                    | Done by                | Checked by                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidates by role, the swap, the pick (pure, random numbers passed in), the session of swaps, the two screens, texts, 14 unit tests, 45 browser checks | agent, general purpose | lead read `alternatives.ts`, `pick.ts`, `session.ts` and the change to the dish editor; ran `npm run check:culina` and the browser checks on the commit brought onto main; looked at both screens at 360 px (below) |
| The dish editor: a slot added there takes the usual role of the component picked for it                                                                 | agent, general purpose | lead read the change and checked that the picker hands out the id the lookup uses; no unit test, the browser check asserts the roles                                                                                |
| The layout fix and the measurement below, this entry                                                                                                    | lead                   | the browser check, run without the fix (fails) and with it (passes); no second reader                                                                                                                               |

**Found by the checks and fixed in the app**

- By the agent's browser check: the dish editor gave a slot added with
  "Add a slot" the first open role whatever was picked for it, so a mash
  picked second was stored as a sauce and had no alternatives. Fixed in
  `dish-editor.ts`.
- By the lead looking at the screen: at 360 px the Swap button stood
  beside the name of the filling, not under it, and widened the first
  column until the amounts beside it broke between number and unit
  ("300" above "g"). No check of the agent saw it: `brokenWords` only
  sees a word that is split. Fixed in `notebook.css` (the button on a
  line of its own; an amount in a table cell does not wrap), and a new
  measurement `wrappedTexts` in `e2e/measure.mjs` is used by
  `e2e/dish-swap.mjs` ("every amount of a slot stays on one line").
  Run without the fix it fails with "300 g | 400 g" at both places it
  is used; with the fix it passes. In the run without the fix a third
  check failed too ("back on the dish the swap is still there") and
  passed with it; why the layout decides that one was not looked into.
- Two things the lead suspected in the agent's code and checked in the
  code, both fine: the candidates take the first record of a component
  family they meet (the notebook answers every version id with the
  current version), and the editor looks the role up by the family id
  (the picker hands out that id).

**Counts.** Culina's engine 1093 tests, its app 499. Browser checks
1587, ended with "e2e passed"; 45 are the agent's, 2 the lead's.

**Not verified.** That picks are even over many rolls: the checks assert
only what holds for any random number. The German texts in a browser,
desktop width, a real phone, a screen reader on the row of
alternatives. The agent's unit tests use a notebook built in memory and
a stock given as a list of ids.

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
