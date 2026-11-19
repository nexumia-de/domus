---
type: Research
title: Name check
description: What was found on 2026-11-18 for the names Emptio, Domus, hospes and cibus in package registries, GitHub, Flathub and by web search; a family organiser app named Domus exists; the German trademark register counts about 3 marks for Emptio and about 498 for Domus, whose entries were not read.
tags: [research, names, trademarks]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: npm
    title: npm registry, exact-name lookups (emptio, domus, hospes, cibus)
    url: https://registry.npmjs.org/
  - id: emptio-app
    title: gutomz/Emptio_APP on GitHub
    url: https://github.com/gutomz/Emptio_APP
  - id: emptio-company
    title: Bayern International, company database, EMPTIO Purchasing Services
    url: https://www.bayern-international.de/en/company-database/company-details/emptio-purchasing-services-1032557
  - id: domus-app
    title: Domus, family organizer app, on Product Hunt
    url: https://www.producthunt.com/products/domus-family-organizer-app
  - id: cibus-app
    title: Cibus Pluxee in the Apple App Store
    url: https://apps.apple.com/de/app/cibus-pluxee/id1356766203
---

# Name check

Done on 2026-11-18 by registry lookups, GitHub and Flathub searches and
web search. It is not a full trademark search: only counts were read
from the register. Mixtura's check ([there](../../mixtura/docs/name-check.md))
used the same method.

# Short result

- **Emptio**: no collision found in software. One small project of the
  same kind exists on GitHub. The trademark register counts about 3
  marks under the name, not yet read.
- **Domus**: **a family organiser app of that name exists** for iOS
  and Android (grocery lists, calendar, recipes, household documents),
  close to what the umbrella is. The owner should decide before the
  name is used in public.
- **hospes**, **cibus**: free on npm; they are package names under the
  scope `@nexumia-de`, not product names. Cibus is a common name of
  food companies.
- **Shopping List**, **Household**: purely descriptive; very many apps
  carry these titles.

# Results

| Name   | npm (exact name)[^npm]           | GitHub                                                                                                           | Flathub      | Other                                                                                                                                                     |
| ------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emptio | free                             | 38 repositories with the name, all tiny; one is a shopping list app with prices (gutomz/Emptio_APP)[^emptio-app] | none         | EMPTIO Purchasing Services, a small purchasing service for the car industry in Bavaria[^emptio-company]                                                   |
| Domus  | taken (`domus` 0.0.1, unrelated) | about 1,800 repositories; the largest is a Home Assistant dashboard (60 stars)                                   | none         | "Domus", a family organiser app for iOS and Android[^domus-app]; "DOMUS: Condo App" and a developer "DOMUS Software AG" in Google Play (not read further) |
| hospes | free                             | 26 repositories, none about sync                                                                                 | not searched | none found                                                                                                                                                |
| cibus  | free                             | 274 repositories, the top ones around an Israeli meal voucher                                                    | none         | Cibus Pluxee (meal vouchers, Israel)[^cibus-app]; Cibus Nordic Real Estate; CibusCell (Speyer, energy software); the food fair Cibus in Parma             |

The Latin meanings (emptio: purchase; domus: house, household; hospes:
host, guest; cibus: food) are from general knowledge, not read at a
source.

# Trademark register

After the owner allowed the hosts, the simple search of DPMAregister
(national, European Union and international marks) was run in a
headless browser on 2026-11-18:

| Name   | Marks found | Read                                                                                                                                                          |
| ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emptio | about 3     | No. The list of the entries could not be opened by the script, so whether they are for software, and whether the name is the mark or its owner, is not known. |
| Domus  | about 498   | No                                                                                                                                                            |

hospes and cibus were not searched; they are package names.

# Not checked

- The entries behind the counts above, and the EUIPO search itself
  (`euipo.europa.eu` answers, its search did not load without a full
  browser session).
- Searches inside Google Play, the Apple App Store and F-Droid; the
  store results above come from web search and are incomplete.
- Company registers, domains, social media names.

Hosts still blocked (tested with `curl`):

```
play.google.com
apps.apple.com
en.wiktionary.org
www.npmjs.com
```

The first two are the app stores, then the dictionary for the
meanings; `www.npmjs.com` answers 403 to the proxy, the registry itself
was used.

# What the owner can do

Open <https://register.dpma.de/DPMAregister/marke/einsteiger>, search
"Emptio" and read the three entries (classes 9 and 42 are software),
and decide on Domus: keep it as a repository name
only, with "Household" as the visible name, or choose another name.

[^npm]: npm registry, https://registry.npmjs.org/

[^emptio-app]: gutomz/Emptio_APP, https://github.com/gutomz/Emptio_APP

[^emptio-company]: Bayern International, https://www.bayern-international.de/en/company-database/company-details/emptio-purchasing-services-1032557

[^domus-app]: Domus, family organizer app, https://www.producthunt.com/products/domus-family-organizer-app

[^cibus-app]: Cibus Pluxee, https://apps.apple.com/de/app/cibus-pluxee/id1356766203
