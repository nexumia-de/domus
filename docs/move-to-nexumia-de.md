---
type: Plan
title: Move of the repository to nexumia-de/domus
description: Asked by the owner on 2026-11-22 - the repository moves from suitably/domus to the existing, empty nexumia-de/domus; credentials follow. What exists on both sides, the two ways to move (transfer or copy) with what each keeps, the mapping of every address in this and the other nexumia-de repositories that names the old place, the owner's steps, and what the agent does once it may push. Nothing is moved yet.
tags: [plan, repository, migration, github, owner]
generated: { by: claude-code/2.1.326, at: 2026-11-22 }
sources:
  - '[^owner]: the owner in the session of 2026-11-22, in German, translated here'
  - '[^survey]: shallow clones of every repository of nexumia-de that the session can read (19 public, 3 private, nexumia-de/vectura empty), searched with grep on 2026-11-22; GitHub code search returned nothing for this organisation from the session'
  - '[^cirro]: nexumia-de/phosh-apps, docs/log.md: "`apps.txt` lists `nexumia-de/cirro` (the current owner; `suitably/cirro` only worked through GitHub''s redirect)"'
---

# Move of the repository to nexumia-de/domus

The owner on 2026-11-22: "Migrate to the nexumia-de repository too. I
deliver the credentials tomorrow. Prepare everything. The repository
exists already."[^owner] And: "search all repositories, so that we can
correct the mapping."[^owner] **Nothing is moved yet**; this page is the
preparation.

# What there is

| Side             | State on 2026-11-22                                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| suitably/domus   | public; 432 commits on `main`; 25 branches; 5 tags (`emptio-v0.1.0`, `emptio-v0.2.0`, `emptio-v0.2.1`, `mixtura-v0.1.0`, `culina-v0.1.0`), each a release with 4 to 8 files (Flatpak bundles, screenshots); open: issues 33, 34, 38, 39, 40, 41, 44, 50 and pull request 52 |
| nexumia-de/domus | public, **empty**: no commit, no branch (cloned 2026-11-22)                                                                                                                                                                                                                 |
| Secrets used     | `PUBLISH_TOKEN` (ci.yml: tells phosh-apps about a release), `RELEASE_TOKEN` (release.yml), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (ci.yml: the deploy of domus.nexumia.de)                                                                                         |

# Two ways to move

**Agent's recommendation: A, the transfer.** It is a judgement: GitHub's
own documentation (docs.github.com) is blocked in the session and was
not read. That the transfer worked for this owner before, with a
redirect from the old name, is recorded for Cirro (`suitably/cirro` to
`nexumia-de/cirro`)[^cirro].

| Way                                                  | What the owner does                                                                                                                                                                                       | What it keeps                                                                                                                                                                                                 | What it loses                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Transfer** suitably/domus to the nexumia-de org | Delete (or rename) the empty nexumia-de/domus, since an organisation cannot hold two repositories named `domus`; then Settings, Transfer ownership, to `nexumia-de`. Enter the four secrets again (below) | Everything the repository holds as GitHub keeps it: history, branches, tags, releases with their files, issues, pull requests, numbers; old addresses redirect (as for Cirro, unverified for this repository) | Nothing of the content. Whether the secrets move along was not read (documentation blocked); they are entered again either way                                                                                                                                             |
| **B. Copy** into the existing nexumia-de/domus       | Give the session push access to nexumia-de/domus (the Claude GitHub App on that repository); enter the four secrets                                                                                       | History, branches and tags (`git push` of all refs). The agent recreates the 5 releases with their files and the 9 open issues and pull request descriptions, each with a link to the original                | Issue and pull request numbers (they start at 1; every "pull request 30" in the documents keeps pointing at suitably/domus); closed issues, reviews and comments stay in suitably/domus, which must then stay readable; pull request 52 must be opened again by its author |

# Mapping: every address that names the old place

Found by searching every repository of nexumia-de the session can read
and this one[^survey]. **"suitably" as a name stays**: it is the
developer name in every metainfo and About dialog, the copyright holder
in `REUSE.toml`, and the Liberapay account (`liberapay.com/suitably`, in
`FUNDING.yml` and the support links). Only addresses of repositories
change.

## In this repository, changed by the agent in one commit after the move

| Where                                                                                     | Now                                                                   | After                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/{emptio,mixtura,culina}/packages/linux/src/main.ts` (About: website, issue address) | `https://github.com/suitably/domus`, `.../issues`                     | `https://github.com/nexumia-de/domus`, `.../issues`          |
| `apps/{emptio,mixtura,culina}/packages/linux/data/*.metainfo.xml` (homepage, bugtracker)  | the same                                                              | the same, nexumia-de                                         |
| `apps/emptio/packages/linux/data/de.nexumia.Emptio.metainfo.xml` (two screenshots)        | `https://github.com/suitably/domus/releases/download/emptio-v0.2.1/…` | nexumia-de/domus; under B only once the release is recreated |
| `apps/culina/packages/linux/data/licenses/culina-data-NOTICE.txt`                         | `https://github.com/suitably/domus`                                   | nexumia-de/domus                                             |
| `.github/workflows/ci.yml` (3 comments), `.github/actions/native-release/action.yml`      | `apps.txt: suitably/domus <app>-v*`                                   | `nexumia-de/domus <app>-v*`                                  |
| `docs/decisions/native-linux-gjs.md`, `docs/roadmap.md`, the three `native-linux.md`      | `apps.txt` line `suitably/domus <app>-v*`                             | `nexumia-de/domus <app>-v*`                                  |
| `docs/decisions/one-repository.md`, point 1                                               | "on the owner's account `suitably`"                                   | a dated note: moved to `nexumia-de` on the day of the move   |

Left as they are, because they record what was: the logs, the review
record, the triage of 2026-11-22, and links to issues and pull requests
of suitably/domus (under A they redirect; under B they are the only
place those exist). The schema ids (`nexumia-de.github.io/culina/…`)
and the package scope `@nexumia-de` already name the organisation.

## In other repositories, by the owner or by the agent with access

| Repository                                   | Where                                           | Now                                                                                                | After                                                                         |
| -------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| nexumia-de/phosh-apps                        | `apps.txt`, lines 19 to 21                      | `suitably/domus emptio-v*`, `mixtura-v*`, `culina-v*`                                              | `nexumia-de/domus …` (needed: under B the releases are only in the new place) |
| nexumia-de/phosh-apps                        | `README.md` line 35                             | example `suitably/domus emptio-v*`                                                                 | `nexumia-de/domus emptio-v*`                                                  |
| nexumia-de/phosh-toolkit                     | `docs/releases.md` line 120                     | "A repository that holds several apps (suitably/domus: …)"                                         | nexumia-de/domus                                                              |
| nexumia-de/materia                           | `README.md`, `AGENTS.md`, `docs/development.md` | links to nexumia-de/mixtura and nexumia-de/culina; install from `github:nexumia-de/materia#v0.1.0` | point to `packages/model` of nexumia-de/domus, or archive (below)             |
| nexumia-de/culina, mixtura, emptio (private) | README, AGENTS.md, docs                         | links to each other and to materia                                                                 | archive (below); not changed                                                  |

The other repositories (nauta, pensum, cirro, vestigia, ephyra, pulsus,
tabularium, quest-arc, nuntius, homepage, android_translation_layer,
aports, art_standalone, bionic_translation, super-productivity) name
"suitably" only as developer, copyright holder or Liberapay account, or
name old places of their own in their logs. Nothing in them points at
suitably/domus. nexumia-de/vectura is empty.

## Not done before, found again

The [one repository decision](decisions/one-repository.md), point 6,
says the owner archives the old repositories once this one's checks run.
On 2026-11-22 nexumia-de/culina, mixtura and emptio are **not archived**
(GitHub API: `archived=false`), and materia was not readable through the
API from the session. Archiving them in the same go keeps anyone from
following their stale links into a dead end.

# The owner's steps

1. Choose A or B.
2. A: delete or rename the empty nexumia-de/domus, then transfer
   suitably/domus to `nexumia-de`. B: install the Claude GitHub App on
   nexumia-de/domus with write access, so that the session can push.
3. In nexumia-de/domus, Settings, Secrets and variables, Actions: enter
   `PUBLISH_TOKEN`, `RELEASE_TOKEN`, `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`. Never in the chat.
4. Give the cloud environment of these sessions access to
   nexumia-de/domus, and pick it as the repository of the next session.
5. Archive nexumia-de/culina, mixtura and emptio (and materia, if its
   code lives only in `packages/model` now).

# What the agent does once it may push

1. B only: push every branch and tag to nexumia-de/domus; recreate the 5
   releases with their files and notes (downloaded from suitably/domus);
   open the 8 issues again with their text, labels and a link to the
   original, and leave a comment in each original pointing to the copy.
2. One commit with the mapping of this repository (above), checked with
   `npm run check`; CI runs in the new place, which also shows whether
   the secrets work (the deploy and the release jobs skip without them).
3. Pull requests to phosh-apps (`apps.txt`, README) and phosh-toolkit
   (`docs/releases.md`), and to materia if it is not archived.
4. A release-free check that phosh-apps reads the new place: its next
   scheduled run lists the three apps from nexumia-de/domus.

# What nobody verified

What a transfer keeps, from GitHub's own documentation (blocked: the
proxy answered 403 for docs.github.com). GitHub's code search for the
organisation (it returned nothing from the session, so the survey is
grep over clones of the default branches; other branches were not
searched). Whether the deploy to Cloudflare names the repository
anywhere outside this one (Cloudflare's settings were not read).
