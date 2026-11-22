---
type: Research
title: Name check
description: What was found on 2026-11-22 for the names Culina and Cook's Notebook in the npm registry and on Flathub; no package or app of either name there; F-Droid's search, Google Play and the trademark registers could not be reached and are the owner's to check before a release under these names.
tags: [research, names, trademarks]
generated: { by: claude-code, at: 2026-11-22 }
sources:
  - id: npm
    title: npm registry, exact-name lookups (culina, cooks-notebook, cooksnotebook)
    url: https://registry.npmjs.org/
  - id: flathub
    title: Flathub search (API v2), queries "culina" and "cook's notebook"
    url: https://flathub.org/api/v2/search
---

# Name check

Asked for by issue 29 of the old repository nexumia-de/culina
([decision on the name](decisions/app-name.md)). Done on 2026-11-22 from
an agent session with a restricted network. It is **not** a trademark
search and not legal advice: no trademark register could be read.

# What was looked up

| Where                                                 | Query                                       | Result on 2026-11-22                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| npm registry[^npm]                                    | `culina`, `cooks-notebook`, `cooksnotebook` | no package of any of the three names (HTTP 404 each)                                                                                    |
| Flathub[^flathub]                                     | `culina`                                    | 1 hit, by description only: Recipe Scribe (`com.cerebralnomad.recipescribe`); no app named Culina                                       |
| Flathub[^flathub]                                     | `cook's notebook`                           | 3 hits, by description only: Recipe Scribe, Cookbook (`de.flose.Kochbuch`), Recipes (`org.gnome.Recipes`); no app named Cook's Notebook |
| GitHub repository search                              | `culina in:name`                            | not usable: the search matches word stems ("culinary", "culinaire"; 5785 repositories), so it says nothing about the exact name         |
| F-Droid search (`search.f-droid.org`)                 | both names                                  | **not checked**: the host is blocked from the session (proxy 403)                                                                       |
| Google Play (`play.google.com`)                       | both names                                  | **not checked**: the host does not answer from the session                                                                              |
| EUIPO TMview (`www.tmdn.org`)                         | both names                                  | **not checked**: the host does not answer from the session                                                                              |
| USPTO (`tmsearch.uspto.gov`)                          | both names                                  | **not checked**: the host does not answer from the session                                                                              |
| DPMA register (`register.dpma.de`), Apple's App Store | both names                                  | **not checked**: the DPMA host answers, but its search needs a session in a browser and was not run; the App Store was not tried        |

# Short result

- **Culina** and **Cook's Notebook**: no package on npm and no app on
  Flathub carries either name. Three recipe apps of a similar purpose
  are on Flathub under other names.
- "Culina" is the Latin word for kitchen and is likely to be in use as
  a name of restaurants, kitchen makers and food products; whether a
  registered mark covers software (classes 9 and 42) is **not known**.
- Nothing found speaks against the names; nothing was found that
  clears them. The check of the app stores and the trademark registers
  is on the [owner's list](../../../docs/owner-checks.md).

[^npm]: `https://registry.npmjs.org/<name>`, read on 2026-11-22.

[^flathub]: `POST https://flathub.org/api/v2/search` with the query, read on 2026-11-22.
