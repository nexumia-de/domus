---
type: Decision Record
title: Triage of every open issue, 2026-11-22
description: Decided by an agent on the owner's instruction that no issue stays open and nothing is asked. The rules used, and for each of the 64 open issues of suitably/domus and of the old repositories nexumia-de/culina, emptio and mixtura what was decided and why - done with its commit, built now, left to the owner with a checklist, or not planned.
tags: [decision, issues, triage, planning, culina, emptio, mixtura]
generated: { by: claude-code, at: 2026-11-22 }
sources:
  - id: one-repository
    title: 'Decision: one repository'
    url: one-repository.md
  - id: spaces
    title: 'Decision: one address, spaces, storages'
    url: one-origin-spaces-storages.md
  - id: native
    title: 'Decision: native Linux apps in GJS'
    url: native-linux-gjs.md
  - id: owner-checks
    title: What only the owner can do
    url: ../owner-checks.md
---

# Triage of every open issue, 2026-11-22

## Context

The owner asked on 2026-11-22 that every open issue be dealt with so
that none stays open, without questions: decide by best practice and
write down why. Open were 3 issues in suitably/domus and 61 in the
three repositories that held the apps before 2026-11-19
(nexumia-de/culina 12, nexumia-de/emptio 13, nexumia-de/mixtura 36).

**The old repositories are superseded.** Their `main` branches were
imported with history on 2026-11-19 (one repository[^one-repository],
[development](../development.md#how-the-histories-were-imported)); all
work since then is here. Their issues describe plans of separate
repositories: sync in three units with a passphrase, one address per
app, packaging studies. No code was changed there.

## The rules used

1. **Done on `main` here**: closed as completed, with the commit.
2. **Replaced by a later decision of the owner**: closed as not
   planned, naming the decision. The goal, where one remains, is in a
   roadmap, which is where goals live.
3. **A goal that has not started, or a "later" extra**: closed as not
   planned. Nothing is built in advance; `docs/roadmap.md` of the part
   keeps the goal, and an issue is written when the work starts, with
   the facts of that day. This is why a not-planned issue here does
   not mean "never".
4. **Small, concrete and still wrong in today's code**: fixed in this
   pull request.
5. **Needs a device, an account, a book or a legal check**: what works
   without it is done; the rest is one line in the
   owner's list[^owner-checks]. No device check is claimed.
6. **An open question**: decided here, with the reason, in the tables
   below.

One agent did this triage and the changes. Three subagents were started
to read the old issues and stopped at a usage limit before reporting;
nothing of theirs was used, so [reviews](../reviews.md) has no entry.
Nobody reviewed the decisions; they are the owner's to overturn.

## suitably/domus

| Issue                                           | Decision  | Why                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26 character filter in Cook and the random pick | completed | On `main` since pull request 30: the finder (566a68b) and the random pick (3b9d11e) read the one filter with the character among its choices.                                                                                                                                         |
| 27 the user's correction of a character         | built now | A wrong character must be correctable ([analysis](../../apps/culina/docs/dish-characters.md#sense)); stored as a difference, not the set ([behaviour](../../apps/culina/docs/behaviour.md#characters)).                                                                               |
| 28 cuisine and course on own dishes             | completed | On `main` since pull request 30 (8f16305). Its open question was decided there: cuisine is one of the four countries the app names, not free text, because a free code shows as a bare `jp` and widening later is additive ([data model](../../apps/culina/docs/data-model.md#dish)). |

## nexumia-de/culina

| Issue                               | Decision                              | Why                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Goal 1 foundations                | completed                             | Shared model, tooling, data model, ratios and the Cooklang decision came with the import (433aedd).                                                                                                           |
| 14 Goal 3 notebook                  | completed                             | Store, editor, versions, export and import with the backup reminder, Cooklang (433aedd, c4996ee).                                                                                                             |
| 19 Goal 4 stock                     | completed                             | Stock screens (47aa33a), the finder and "use up first" (d8d0f9d); stock is a collection of a space since 1ad7dd0.                                                                                             |
| 28 publish and install              | completed, device checks to the owner | Published under the one address ([deployment](../deployment.md), 37514e9); a native Linux app exists. The install checks on a phone are on the owner's list. Rule 5.                                          |
| 29 name and trademark check         | done as far as the network allows     | [Name check](../../apps/culina/docs/name-check.md): npm and Flathub read; app stores and trademark registers unreachable, on the owner's list. Rule 5.                                                        |
| 52 Goal 5 sync in three units       | not planned                           | Replaced by spaces (decision[^spaces]). Stock syncs (1ad7dd0); recipes as collections of a space is a goal of the [roadmap](../roadmap.md). Rule 2.                                                           |
| 25 correction checklist             | not planned now, source to the owner  | Every rule must be read in its source (Nosrat); the book is not reachable from a session and no rule is written from memory. On the owner's list; the goal stays in Culina's roadmap (goal 5). Rules 3 and 5. |
| 66 suggestions from a tasting check | not planned                           | Needs 25 and 24, neither exists. Rule 3.                                                                                                                                                                      |
| 24 affinities                       | not planned                           | A "later" data set with a licence question per source; nothing reads it today. Rule 3.                                                                                                                        |
| 26 cost and prep lists              | not planned                           | "Later"; prices and par levels are kitchen-operation features no screen needs today. Rule 3.                                                                                                                  |
| 27 allergens                        | not planned                           | "Later"; a derived allergen mark is only safe when every ingredient is marked, which the shipped dishes are not. The schema keeps the reserved field. Rule 3.                                                 |
| 23 Goal 6 later                     | not planned                           | Epic of 24 to 29, each handled above; the roadmap keeps "Later".                                                                                                                                              |

## nexumia-de/emptio

| Issue                                                                                                     | Decision                            | Why                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 Goal 1 the list; 12 engine; 13 PWA shell; 14 local store; 15 list screen; 16 adding and the entry sheet | completed                           | Built on 2026-11-20 (8e3221a; foundations 7ef1c94), as [behaviour](../../apps/emptio/docs/behaviour.md) describes: priority and amount at the add field, an entry with name, amount, note, priority and category, the shared database of the host package as the store. Adding from a food catalogue waits for a shared catalogue and is in "Not built" there. |
| 3 Goal 2 shared in the household                                                                          | completed                           | The list is two collections of a space (8e3221a). Not run against a real storage: owner's list.                                                                                                                                                                                                                                                                |
| 6 Goal 5 Domus                                                                                            | completed in part, rest not planned | The Household app and the page at the root exist (37514e9, `apps/domus`). The compose file with a sync storage is goals 9 and 10 of the [roadmap](../roadmap.md). Rule 3.                                                                                                                                                                                      |
| 18 deploy to emptio.nexumia.de                                                                            | not planned                         | Replaced by the one address: Emptio is served under `/emptio/` ([deployment](../deployment.md)). Rule 2.                                                                                                                                                                                                                                                       |
| 17 export and import of the list                                                                          | not planned                         | Its reason was "no data locked in before sync exists"; sync exists. A backup is the export of a space in the Household app, one for all apps, a goal of the roadmap (5, "not done"). Building a second export in Emptio would be the copy the rules forbid. Rule 2.                                                                                            |
| 4 Goal 3 stores; 5 Goal 4 hand-over; 19 Goal 6 offers                                                     | not planned                         | Goals that have not started and have no work items; they stay in [Emptio's roadmap](../../apps/emptio/docs/roadmap.md). Offers also rest on an unofficial API and a client certificate taken out of another app. Rule 3.                                                                                                                                       |

## nexumia-de/mixtura

| Issue                                                                                | Decision                            | Why                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1, 7, 15, 23, 29, 34 (goals 1 to 6)                                                  | completed                           | Engine, app, own specs, stock, non-alcoholic came with the import (e1d3517). "Installs on Android and Linux" was not seen on a device: owner's list.                                                                                                                                                                                                                                       |
| 43 shared model                                                                      | completed                           | materia is `packages/model` (7b47a4a, 61ffc35); pinning by tag was replaced by the one workspace.                                                                                                                                                                                                                                                                                          |
| 44 name check                                                                        | completed                           | [Name check](../../apps/mixtura/docs/name-check.md) (e1d3517).                                                                                                                                                                                                                                                                                                                             |
| 130 stock sync                                                                       | completed, then replaced            | Built on WebDAV on 2026-11-18, replaced by stock in spaces (8fea785).                                                                                                                                                                                                                                                                                                                      |
| 143 libraries and profile; 153 neutral names; 141 backend guides; 138 later for sync | not planned                         | Replaced by spaces: one secret, one invite format and file names of the host package (decision[^spaces]). Own drinks as collections of a space, WebDAV against a real server and further storages are goals of the roadmaps. Rules 2 and 3.                                                                                                                                                |
| 122 after Cloudflare                                                                 | not planned                         | Replaced by the one address and its one deploy job ([deployment](../deployment.md)); there is no Pages workflow here. The token check is the owner's first deploy. Rule 2.                                                                                                                                                                                                                 |
| 93 Capacitor, 94 signed APK, 95 F-Droid, 96 WebKitGTK shell                          | not planned                         | Android stays the installed web app; Linux got native apps in GJS instead of a web view (decision[^native]). Rule 2.                                                                                                                                                                                                                                                                       |
| 57 install guide on devices                                                          | to the owner                        | Six marks "to be checked on a device" in `apps/mixtura/docs/install.md`; owner's list. Rule 5.                                                                                                                                                                                                                                                                                             |
| 48 dilution model; 116 primary sources; 70 and 115 templates                         | to the owner                        | Each waits for a book or a blocked host (Liquid Intelligence, Cocktail Codex, Embury, IBA). No band or equation is changed without the source. Owner's list. Rule 5.                                                                                                                                                                                                                       |
| 121 label in name, reload, headers                                                   | first point fixed now, rest closed  | The variant link's name (fixed, with the audit as its test). Headers are sent since the one address ([deployment](../deployment.md)). An axe run over composite rows and the order of reload and update are not planned: no defect is known, only a suspicion. Rules 4 and 3.                                                                                                              |
| 119 litre, limits, shortcut help                                                     | not planned                         | **Litre, decided**: it stays read in the app (`volume-text.ts`) and is no unit of the table, because a new unit id in a stored drink is refused by every older version that reads the export, for no gain to the one field that takes litres. The shortcut overlay is marked "not built" in the document, which was the cheaper of the issue's two options. The rest are cosmetic. Rule 6. |
| 120 toasts                                                                           | completed in part, rest not planned | One toast module: the shared shell's (`packages/host/src/frame/toaster.ts`). A clearer message for a newer export needs no decision any more: the format version was raised to 3 with spaces. Nominal figures for variants: rule 3.                                                                                                                                                        |
| 111 Intl helper                                                                      | not planned                         | The web app's texts are English only; German number formats inside English sentences would mix two languages. It belongs to the translation of the web app, which the owner has not asked for. Rule 3.                                                                                                                                                                                     |
| 108 cold LCP                                                                         | not planned                         | The measurement is of 2026-11-17, before the shared shell and the one address; optimising against an old number is guessing. Measured again when a first load is reported slow. Rule 3.                                                                                                                                                                                                    |
| 112 property-based tests                                                             | not planned                         | A test technique, not a defect: vectors and seeded random worlds cover the engine; a new dependency for it was "considered", not asked for. Rule 3.                                                                                                                                                                                                                                        |
| 105 seed source per property; 88 infused spirits; 101 batches near their date        | not planned                         | Changes of the seed's data model that are useful only together with the sourced values and templates that wait for the owner's books (above), or a "later" list. Written again when that work starts. Rule 3.                                                                                                                                                                              |
| 38 later; 39 cost; 40 menus; 41 affinities                                           | not planned                         | "Later" in [Mixtura's roadmap](../../apps/mixtura/docs/roadmap.md), goal 9. Rule 3.                                                                                                                                                                                                                                                                                                        |

## Consequences

- No issue is open. A goal's next step becomes an issue of
  suitably/domus when the owner starts it.
- What needs the owner is in one place: owner checks[^owner-checks].
- An issue closed by rule 3 lost no knowledge: its text stays readable
  in the old repository, and the roadmaps name the goals.

[^one-repository]: [One repository](one-repository.md).

[^spaces]: [One address, spaces, storages](one-origin-spaces-storages.md).

[^native]: [Native Linux apps in GJS](native-linux-gjs.md).

[^owner-checks]: [What only the owner can do](../owner-checks.md).
