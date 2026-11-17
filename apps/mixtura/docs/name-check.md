---
type: Study
title: Name check
description: Research summary on the code name Mixtura and the visible name Drink Builder - app stores and registries searched on 2026-11-17 with query and hits, trademark and domain checks that could not be done because the hosts are blocked, and a plain risk assessment. Not legal advice.
tags: [name, trademark, research, release]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: fdroiddata
    title: 'F-Droid metadata repository, gitlab.com/fdroid/fdroiddata at commit 6a317cbb3 (2026-11-17), searched locally'
    url: https://gitlab.com/fdroid/fdroiddata
  - id: flathub-api
    title: 'Flathub search API, POST https://flathub.org/api/v2/search, queried 2026-11-17'
    url: https://flathub.org/api/v2/search
  - id: npm-api
    title: 'npm registry, https://registry.npmjs.org/, queried 2026-11-17'
    url: https://registry.npmjs.org/
  - id: github-search
    title: 'GitHub search API (repositories and users), queried 2026-11-17'
    url: https://api.github.com/search/repositories
---

# Name check

Research for [issue 44](https://github.com/nexumia-de/mixtura/issues/44) on
the names chosen in the [name decision](decisions/app-name.md): code name
**Mixtura**, visible name **Drink Builder**. **This is a research summary,
not legal advice.** The trademark registers could not be searched, so the
most important check is not done. Date of all queries: 2026-11-17. Agents
do not tag the first release; this file is the basis for the owner's
decision.

## Short result

- **No serious collision found in the sources that could be reached.** No
  app named Mixtura or Drink Builder on Flathub or in F-Droid's metadata;
  npm and PyPI names are free; `de.nexumia.Mixtura` is unused on Flathub.
- **Not checked, and decisive for a trademark question:** EUIPO, DPMA,
  USPTO, WIPO, Google Play, Apple App Store, domain names. Hosts blocked.
- **Mixtura** is a distinctive name for apps but also an ordinary word
  (Latin and Spanish for mixture, **unverified** general knowledge) and
  used by many small unrelated software projects, one of them in the same
  class (a package-manager wrapper). Risk: unknown until the registers are
  searched; recommend a professional check before store listings.
- **Drink Builder** is descriptive for a drink-building tool. Low risk of
  a conflict claim, but also no exclusive right; many projects use it.

## Method

Network access was tested per host (`curl -sS -m 15 -o /dev/null -w '%{http_code}' https://<host>/`),
blocked hosts were not retried. Reachable hosts were queried through
their public APIs or, for F-Droid, a local clone of its metadata
repository. Search terms: `mixtura`, `drink builder`, `drinkbuilder`,
`drink-builder`. Hits are summarised; only what a hit shows is stated.

## Results: registries and stores

| Source                                          | Query                                                        | Result                                                                                                                                                                                                                                                                                                                                                             | Link                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Flathub search API                              | `mixtura`                                                    | 2 fuzzy hits (Mixin Messenger, Mingle), no app of that name                                                                                                                                                                                                                                                                                                        | [api](https://flathub.org/api/v2/search)                                                 |
| Flathub search API                              | `drink builder`, `drinkbuilder`                              | Recipe Scribe, Newelle; no app of that name                                                                                                                                                                                                                                                                                                                        | same                                                                                     |
| Flathub appstream                               | `de.nexumia.Mixtura`                                         | HTTP 404, id unused (the control `de.nexumia.Pensum` is also 404 because the organisation uses its own repository)                                                                                                                                                                                                                                                 | `https://flathub.org/api/v2/appstream/de.nexumia.Mixtura`                                |
| F-Droid metadata (fdroiddata, commit 6a317cbb3) | grep `mixtura`, `drink builder`, `drinkbuilder` in all files | 0 files. Limit: names often live in the app's own repository, not in the metadata. Nearest: "Drinks" (`fr.masciulli.drinks`, Apache-2.0, "Search and display cocktail recipes")                                                                                                                                                                                    | [repo](https://gitlab.com/fdroid/fdroiddata)                                             |
| npm                                             | exact packages `mixtura`, `drink-builder`, `drinkbuilder`    | all 404 (free); search `mixtura` 0 results                                                                                                                                                                                                                                                                                                                         | [registry](https://registry.npmjs.org/)                                                  |
| PyPI                                            | `mixtura`, `drinkbuilder`, `drink-builder`                   | all 404 (free)                                                                                                                                                                                                                                                                                                                                                     | [pypi](https://pypi.org/)                                                                |
| Docker Hub                                      | search `mixtura`                                             | 1 repository, `dmelackov/mixtura-tournament-balancer`, unrelated                                                                                                                                                                                                                                                                                                   | [hub](https://hub.docker.com/)                                                           |
| Alpine packages (edge, x86_64)                  | name `*mixtura*`                                             | no rows (control `*ripgrep*` returns rows)                                                                                                                                                                                                                                                                                                                         | [pkgs.alpinelinux.org](https://pkgs.alpinelinux.org/packages?name=*mixtura*&branch=edge) |
| GitHub repositories                             | `mixtura in:name`                                            | 73 repositories. Same class: `miguel-b-p/mixtura` (Go, Apache-2.0, "a unified wrapper designed to simplify the management of pa[ckages]", created 2026-01-18, 4 stars) and `mixtura-dev/mixtura` (no description, 4 stars). Others unrelated or empty (a beer-water tool, a school project, a news aggregator). None in the cocktail field among the first results | [search](https://github.com/search?q=mixtura+in%3Aname&type=repositories)                |
| GitHub users                                    | `mixtura in:login`                                           | 17 accounts; the handle `mixtura` exists, so it is not available to the organisation (not needed: the repository is `nexumia-de/mixtura`)                                                                                                                                                                                                                          | [search](https://github.com/search?q=mixtura&type=users)                                 |
| GitHub repositories                             | `"drink builder" in:name,description`                        | 33 repositories, mostly small or student projects; `TF-Minecraft/DrinkBuilder` (7 stars, game server), `timurbatyrkul001/mixcraft` ("Cocktail & drink builder", Flutter, 0 stars)                                                                                                                                                                                  | [search](https://github.com/search?q=%22drink+builder%22&type=repositories)              |

Counts come from GitHub's search API and are approximate.

## Not checked

| Check                                                                                                                                            | Why not                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| EUIPO eSearch plus (`tmsearch.euipo.europa.eu`, `euipo.europa.eu`), TMview (`www.tmdn.org`, `tmview.europa.eu`)                                  | host blocked (no resolution)                              |
| DPMA register (`register.dpma.de`, `www.dpma.de`)                                                                                                | host blocked                                              |
| USPTO trademark search (`tmsearch.uspto.gov`, `www.uspto.gov`)                                                                                   | host blocked                                              |
| WIPO Global Brand Database (`branddb.wipo.int`)                                                                                                  | host blocked                                              |
| Google Play, Apple App Store (`play.google.com`, `apps.apple.com`)                                                                               | host blocked                                              |
| Domain availability and RDAP/WHOIS (`rdap.org`, `whois.denic.de`, `rdap.denic.de`; `mixtura.com`, `.de`, `.app` do not resolve from the session) | blocked, and no DNS answer is no evidence of availability |
| Debian, Ubuntu, Arch/AUR, Nix, Snap, Repology package names                                                                                      | hosts blocked; `search.nixos.org` answered 401            |
| Web search engines, Wikipedia                                                                                                                    | hosts blocked                                             |
| `crates.io`                                                                                                                                      | answered 403                                              |
| Classes 9, 41, 42 and 32, 33 in any register                                                                                                     | needs the registers above                                 |

## Assessment

| Name          | Exact matches found                                                                                                                           | Near matches                                                         | Same goods and services                                                                                         | Risk (plain assessment)                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mixtura       | None in cocktail software; one same-name software project (`miguel-b-p/mixtura`, package wrapper) and several empty or unrelated repositories | Mingle, Mixin (fuzzy search, not confusingly similar by itself)      | Software (class 9) overlaps with the package wrapper, a different purpose; drinks (classes 32, 33) not searched | **Unknown, leaning medium.** Distinctive for apps, but a dictionary word in several languages that other makers also use; the registers decide. Recommend a professional search in EU and Germany (classes 9, 41, 42 and, for any drink-related use, 32 and 33) before store listings |
| Drink Builder | None as an installed app in reachable sources                                                                                                 | "Drinks", `DrinkBuilder` repositories (game server, school projects) | Software and drink-related services; descriptive wording                                                        | **Low conflict, no exclusivity.** A descriptive name is hard to protect and others may use it; registration is unlikely, and a claim against its use is also unlikely. Searches of the registers are open                                                                             |

The Android package id `de.nexumia.Mixtura` (or lower case) follows the
organisation's domain and is not a name that others can hold unless the
domain changes (rule `de.nexumia.<AppName>` in the toolkit's agent rules).

No alternative is proposed: no real conflict was found. If the owner wants
a fallback after the registers are checked, the earlier suggestions were
Jigger, Swizzle and Coupe ([name decision](decisions/app-name.md));
those were not searched.

## What the owner can do

1. Search the registers in a browser: EUIPO eSearch plus and DPMAregister for
   `Mixtura` and `Drink Builder` in classes 9, 41, 42 (and 32, 33), and
   check the Play and App Store listings; add the results here.
2. Decide whether to keep both names, with this file as the basis. Status
   of the decision: `needs decision` only if the registers show a hit.
3. Ask for a professional check before filing or before a store release.
