---
type: Research
title: Existing tools and their gaps
description: Survey of free and open-source shopping list apps, list and to-do tools, household suites and shared-expense tools read at their repositories on 2026-11-18, what each lacks against what Emptio is meant to be, and the gap that remains.
tags: [research, tools, shopping-list, household, licences]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: kitchenowl
    title: KitchenOwl, repository, releases and F-Droid page
    url: https://github.com/TomBursch/kitchenowl
  - id: ko533
    title: 'KitchenOwl issue 533, Designated priority of items (open)'
    url: https://github.com/TomBursch/kitchenowl/issues/533
  - id: ko51
    title: KitchenOwl issue 51, manual ordering of items (open, wontfix)
    url: https://github.com/TomBursch/kitchenowl/issues/51
  - id: ko659
    title: KitchenOwl issue 659, order by store aisle and section (open)
    url: https://github.com/TomBursch/kitchenowl/issues/659
  - id: ko331
    title: KitchenOwl issue 331, categories and sort order per list (open)
    url: https://github.com/TomBursch/kitchenowl/issues/331
  - id: ko-offline
    title: KitchenOwl issues on offline use (394 add while offline, 1130 iOS always offline)
    url: https://github.com/TomBursch/kitchenowl/issues?q=is%3Aissue+offline
  - id: clementines
    title: Specifically Clementines, repository, licence and issues
    url: https://github.com/davideshay/groceries
  - id: clem-docs
    title: Specifically Clementines, documentation (user guide and installation key concepts)
    url: https://davideshay.github.io/groceries/
  - id: ha-shopping
    title: Home Assistant, shopping list integration
    url: https://www.home-assistant.io/integrations/shopping_list/
  - id: koffan
    title: Koffan, repository
    url: https://github.com/PanSalut/Koffan
  - id: osl
    title: Our Shopping List, repository on Codeberg
    url: https://codeberg.org/nanawel/our-shopping-list
  - id: grocy
    title: Grocy, repository and home page
    url: https://github.com/grocy/grocy
  - id: grocy-android
    title: Grocy Android, repository
    url: https://github.com/patzly/grocy-android
  - id: mealie
    title: Mealie, feature page and shopping list issues
    url: https://mealie.io/documentation/getting-started/features/
  - id: tandoor
    title: Tandoor Recipes, shopping documentation and issue 4939
    url: https://docs.tandoor.dev/features/shopping/
  - id: aisleron
    title: Aisleron on F-Droid
    url: https://f-droid.org/en/packages/com.aisleron/
  - id: groce
    title: Groce on F-Droid
    url: https://f-droid.org/en/packages/com.groce.app/
  - id: wbpxre
    title: ShoppingList (com.wbpxre150) on F-Droid
    url: https://f-droid.org/en/packages/com.wbpxre150.shoppinglist/
  - id: karoto
    title: Karoto, repository on Codeberg and Flathub entry
    url: https://codeberg.org/DrRac27/karoto
  - id: gtklist
    title: Shopping List (ro.hume.cosmin.ShoppingList) on Flathub
    url: https://flathub.org/api/v2/appstream/ro.hume.cosmin.ShoppingList
  - id: tasks
    title: Tasks.org on F-Droid
    url: https://f-droid.org/en/packages/org.tasks/
  - id: superprod
    title: Super Productivity, repository
    url: https://github.com/super-productivity/super-productivity
  - id: cookcli
    title: CookCLI, repository
    url: https://github.com/cooklang/cookcli
  - id: yuvomi
    title: Yuvomi (formerly Oikos), repository
    url: https://github.com/ulsklyc/yuvomi
  - id: homehub
    title: HomeHub, repository
    url: https://github.com/surajverma/homehub
  - id: donetick
    title: Donetick, repository
    url: https://github.com/donetick/donetick
  - id: hearth
    title: Hearth, repository
    url: https://github.com/ralphbarac/hearth
  - id: cospend
    title: Nextcloud Cospend, repository and README
    url: https://github.com/julien-nc/cospend-nc
  - id: nccookbook
    title: Nextcloud Cookbook, repository
    url: https://github.com/nextcloud/cookbook
  - id: moneybuster
    title: MoneyBuster on F-Droid and its repository on GitLab
    url: https://f-droid.org/packages/net.eneiluj.moneybuster/
  - id: ihatemoney
    title: IHateMoney, repository
    url: https://github.com/spiral-project/ihatemoney
  - id: spliit
    title: Spliit, repository
    url: https://github.com/spliit-app/spliit
  - id: rapidsplit
    title: RapidSplit on F-Droid
    url: https://f-droid.org/packages/app.rapidsplit/
---

# Existing tools and their gaps

Surveyed on 2026-11-18 for a household that wants one place for
shopping, cooking, drinks and money, free software and offline first.
Facts were read from the linked repositories, release feeds and store
pages; what could not be read there is marked _unverified_ or `?`. No
app was installed or tried.

# What Emptio is meant to be

The owner's requirements, against which the tools are measured:

1. A shopping list shared in a household.
2. A **priority** on items: what is needed now and what can wait.
3. Items carry a **category**, assigned without work for known foods.
4. **Offline first**: adding and ticking work with no network.
5. **No server of ours**, no account, no telemetry; sharing through
   storage the user chose, as the stock sync of Mixtura and Culina.
6. The foods Culina knows are available on the list, next to free items
   (household goods).
7. Hand-over with the sister apps: Culina offers to put what a recipe
   lacks on the list; a bought item is offered to stock, which Culina
   and Mixtura read.
8. A web app (PWA) installed on Android and Linux, usable on its own
   and under the umbrella Domus.

Visible names: **Shopping List** (Emptio), **Household** (Domus).

# Shared shopping lists

| Tool                     | Licence, state                                                           | Offline                                                                       | Server | Priority, order                                                     | Categories                                                                                                   | Stock and recipes                                                       |
| ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| KitchenOwl               | AGPL-3.0, v0.8.1 of 2026-11-08, web, Android (F-Droid), iOS[^kitchenowl] | Partial: the list can be read; adding offline is an open request[^ko-offline] | Yes    | No priority, request open[^ko533]; manual order is `wontfix`[^ko51] | Editable; one order for all stores, per-store order requested[^ko659][^ko331]                                | Recipe ingredients to the list; expenses; no stock named                |
| Specifically Clementines | MIT, v1.1.9[^clementines]                                                | Yes, syncs later, conflicts resolved and shown                                | Yes    | None named; custom category sorting is an open request              | By category (aisle) per store, pre-loaded and own categories; one list group over several stores[^clem-docs] | Recipes add items (an open bug says they do not); Tandoor import        |
| Koffan                   | MIT with Commons Clause, v2.17.0, PWA[^koffan]                           | Yes for lists, sections and products                                          | Yes    | None named                                                          | Sections                                                                                                     | None named                                                              |
| Our Shopping List        | AGPL-3.0, moved to Codeberg[^osl]                                        | No full offline mode                                                          | Yes    | None named                                                          | None named                                                                                                   | None                                                                    |
| Grocy                    | MIT, v4.7.1 of 2026-09-04[^grocy]; Android app GPL-3.0[^grocy-android]   | Web: none; Android app: lists with offline support                            | Yes    | `?`                                                                 | Grouped by store assortment                                                                                  | Stock, due dates, list from minimum stock, barcode with Open Food Facts |
| Mealie                   | AGPL-3.0, v3.31.0[^mealie]                                               | Several closed offline bugs; state today `?`                                  | Yes    | Labels can be reordered; no priority named                          | Labels                                                                                                       | Recipe to list with servings                                            |
| Tandoor                  | AGPL-3.0 with a clause against selling, 2.7.4[^tandoor]                  | No; offline support is an open request                                        | Yes    | `?`                                                                 | Supermarkets with their own category order; a food dragged into a category is remembered                     | Recipe and meal plan to list                                            |

The Koffan licence forbids selling and is not a free software licence in
the strict sense. Specifically Clementines keeps a local PouchDB copy on the device, which is
what makes it offline first, but needs a Node.js backend and a CouchDB
database run by the household[^clem-docs]. Its item editor has quantity,
unit and category; items come from a pre-populated list or earlier entries.

# Local list apps and to-do tools

| Tool                | Licence, state                               | Platform                 | Offline and sharing                                                             | Priority, order                             | Categories                                             | Stock and recipes                                              |
| ------------------- | -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Aisleron            | AGPL-3.0-or-later, 2026.6.3[^aisleron]       | Android                  | Sync through a self-managed service; offline `?`                                | None named                                  | Own shops and aisles, items in walking order           | Swipe between "Needed" and "In Stock"                          |
| Groce               | MIT, 1.0.3[^groce]                           | Android                  | CSV files on the device, the F-Droid build has no network access                | None named                                  | Aisles of the user's store                             | Weekly recurring staples                                       |
| ShoppingList        | MIT, 11.0 of 2025-11[^wbpxre]                | Android                  | Local; sharing by exported file                                                 | Drag to order                               | None; several lists instead                            | Quantities and prices with totals                              |
| Karoto              | MIT, Flathub 0.2 of 2023[^karoto]            | Linux, Linux phones      | Local; sharing not named                                                        | None named                                  | Tags                                                   | The list is generated from the stock entered                   |
| Shopping List (GTK) | GPL-3.0-or-later, 0.1.6 of 2026-01[^gtklist] | Linux, Linux phones      | Local                                                                           | None named                                  | None named                                             | None                                                           |
| Tasks.org           | GPL-3.0, 15.13 of 2026-11[^tasks]            | Android                  | Fully offline or synced by CalDAV or EteSync; end-to-end encrypted with EteSync | `?` (the page read does not name the field) | Tags, no grocery categories                            | None                                                           |
| Super Productivity  | MIT[^superprod]                              | Linux, Android, iOS, web | Offline first; sync by its own service, Dropbox or WebDAV                       | No priority field named; Eisenhower board   | Tags, no grocery categories                            | None                                                           |
| CookCLI (Cooklang)  | MIT[^cookcli]                                | Linux, macOS, Windows    | Local files; optional cloud service                                             | None named                                  | Store sections from an `aisle.conf` the user maintains | List built from recipes, pantry items excluded (`pantry.conf`) |

Home Assistant's shopping list, on the home server, adds and removes
items, sorts by name and lets items be reordered; its page names no
categories and no priority[^ha-shopping]. Not read: Nextcloud Tasks,
Vikunja's documentation, the priority field of Tasks.org and jtx Board.

# Household suites

All of them need a server the household runs.

| Tool               | Licence, state                                                                  | Covers                                                                                    | Offline                            | For other apps                                                   |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Grocy              | MIT, 9.7k stars[^grocy]                                                         | Stock, shopping list, meal plan, chores, recipes; no expenses                             | None in the web app                | REST API with OpenAPI file; modules can be hidden                |
| KitchenOwl         | AGPL-3.0, 3.9k stars[^kitchenowl]                                               | Lists, recipes, meal plan, expenses; no stock                                             | Partial                            | Python client, Home Assistant integration                        |
| Yuvomi (was Oikos) | MIT, v2.92.0 of 2026-11-18, 2.4k stars[^yuvomi]                                 | 20 modules, among them tasks, calendar, meals, shopping, budget; inventory off by default | Only the last shopping list opened | API with OpenAPI 3.1 and an MCP endpoint; one SQLite file        |
| HomeHub            | MIT, 1.3k stars[^homehub]                                                       | Notes, shopping list, chores, calendar, expenses, recipe book, expiry tracker             | Not stated                         | JSON API, CSV for expenses; no login, meant for the home network |
| Donetick           | AGPL-3.0, v0.1.87-beta.4[^donetick]                                             | Chores and tasks only                                                                     | "Very limited"                     | REST API, webhooks                                               |
| Hearth             | No licence stated, no release, 8 commits[^hearth]                               | Calendar, budget, grocery, inventory, recipes, chores, documents                          | Not stated                         | None stated                                                      |
| Nextcloud apps     | AGPL-3.0: Cospend v4.3.0, Cookbook v0.11.12, Tasks, Deck[^cospend][^nccookbook] | Expenses, recipes, tasks; none of the four has a shopping list, stock or a meal plan      | Not stated                         | CSV (Cospend), schema.org JSON (Cookbook), CalDAV (Tasks)        |

# Shared expenses

Outside what Emptio builds, but part of the household and in use today.

| Tool              | Licence, state                                                                                                              | Offline and sync                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| MoneyBuster       | GPL-3.0-or-later; last F-Droid build 0.1.20 of 2024-08-15; the Cospend README calls it unmaintained[^moneybuster][^cospend] | Android client of Cospend and IHateMoney                                                |
| Nextcloud Cospend | AGPL-3.0, v4.3.0 of 2026-10-20[^cospend]                                                                                    | Nextcloud server; Android client Cowspent (IzzyOnDroid); CSV import and export          |
| IHateMoney        | BSD-style beerware licence, 7.2.1 of 2026-08-07[^ihatemoney]                                                                | Own server                                                                              |
| Spliit            | MIT, v1.30.0 of 2026-10-11[^spliit]                                                                                         | Own server or the hosted instance; PWA                                                  |
| RapidSplit        | GPL-3.0, 4.2.2 of 2026-08-23[^rapidsplit]                                                                                   | Fully offline on Android; a shared trip is end-to-end encrypted on the project's server |

# The gaps

What the household asks for and no tool read here offers:

1. **Priority.** No tool names a priority or urgency on a list item.
   KitchenOwl has it as an open request since 2026-04 and declines
   manual ordering[^ko533][^ko51]. The nearest things are dragging
   items (ShoppingList) and a general to-do tool's priority.
2. **Offline first and shared, without a server.** Shared lists need a
   server the household runs (KitchenOwl, Specifically Clementines,
   Koffan, Grocy, Mealie, Tandoor, every suite). The apps that work
   without one keep the list on one device and share by file (Groce,
   ShoppingList, Karoto). Only to-do tools sync a local list through
   storage the user chose (Tasks.org by CalDAV, Super Productivity by
   WebDAV), and they know no grocery categories.
3. **Categories that follow the store.** KitchenOwl has one category
   order for all stores[^ko659]. Tandoor, Specifically Clementines,
   Aisleron and Groce order by store, but each fails point 2 or 4.
4. **A list tied to stock and to recipes on the phone.** Grocy does
   both on a server and without offline use in the web app; CookCLI
   does both on files at a desk; Karoto derives the list from stock but
   had its last release in 2023. KitchenOwl, Mealie and Tandoor send
   recipe ingredients to the list and have no stock named.
5. **Encrypted sharing.** No shared list names end-to-end encryption;
   among everything read only EteSync (Tasks.org), Super Productivity's
   own sync and RapidSplit do.
6. **Linux phones.** Two native apps exist (Karoto, Shopping List),
   neither shares a list. A PWA covers this.
7. **A household in parts.** Every suite is one server application.
   None lets one person use only the list and another everything, each
   offline, with the parts exchanging data in an open format.
8. **Money.** MoneyBuster, in use today, is called unmaintained by the
   project it is a client of[^cospend]. Emptio does not build expenses;
   the owner should know the risk. Cowspent is the client Cospend names
   next to it; RapidSplit is the only offline-first splitter found.

# What to take from them

- Per-store category order, and remembering the category once an item
  was put into one (Tandoor).
- An item stays on the list until it was found in any of the stores of
  a group (Specifically Clementines).
- One gesture between "needed" and "in stock" (Aisleron).
- Staples that return on their own (Groce) and a list from minimum
  stock (Grocy).
- What is in stock is left out of a list built from recipes (CookCLI).
- Prefixes such as `0_dm` in category names are what users do when
  per-store order is missing[^ko331]; a sign the need is real.

# Not read

Four of five hosts blocked during the survey were allowed later the
same day and read: KitchenOwl's and Specifically Clementines'
documentation, tasks.org and Home Assistant. Still failing (proxy 502):

```
docs.aisleron.com
```

Still _unverified_ for most tools: automatic assignment of a category to
a new item, conflict handling, telemetry. The owner reports that
KitchenOwl assigns categories; its documentation has a page on
ingredient parsing for self-hosters, which was not read, and its tips
page names only item descriptions.

[^kitchenowl]: KitchenOwl, repository, releases and F-Droid page, https://github.com/TomBursch/kitchenowl

[^ko533]: KitchenOwl issue 533, https://github.com/TomBursch/kitchenowl/issues/533

[^ko51]: KitchenOwl issue 51, https://github.com/TomBursch/kitchenowl/issues/51

[^ko659]: KitchenOwl issue 659, https://github.com/TomBursch/kitchenowl/issues/659

[^ko331]: KitchenOwl issue 331, https://github.com/TomBursch/kitchenowl/issues/331

[^ko-offline]: KitchenOwl issues on offline use, https://github.com/TomBursch/kitchenowl/issues?q=is%3Aissue+offline

[^clementines]: Specifically Clementines, https://github.com/davideshay/groceries

[^clem-docs]: Specifically Clementines, documentation, https://davideshay.github.io/groceries/

[^ha-shopping]: Home Assistant, shopping list integration, https://www.home-assistant.io/integrations/shopping_list/

[^koffan]: Koffan, https://github.com/PanSalut/Koffan

[^osl]: Our Shopping List, https://codeberg.org/nanawel/our-shopping-list

[^grocy]: Grocy, https://github.com/grocy/grocy and https://grocy.info/

[^grocy-android]: Grocy Android, https://github.com/patzly/grocy-android

[^mealie]: Mealie, https://mealie.io/documentation/getting-started/features/

[^tandoor]: Tandoor Recipes, https://docs.tandoor.dev/features/shopping/

[^aisleron]: Aisleron, https://f-droid.org/en/packages/com.aisleron/

[^groce]: Groce, https://f-droid.org/en/packages/com.groce.app/

[^wbpxre]: ShoppingList, https://f-droid.org/en/packages/com.wbpxre150.shoppinglist/

[^karoto]: Karoto, https://codeberg.org/DrRac27/karoto

[^gtklist]: Shopping List, https://flathub.org/api/v2/appstream/ro.hume.cosmin.ShoppingList

[^tasks]: Tasks.org, https://f-droid.org/en/packages/org.tasks/

[^superprod]: Super Productivity, https://github.com/super-productivity/super-productivity

[^cookcli]: CookCLI, https://github.com/cooklang/cookcli

[^yuvomi]: Yuvomi, https://github.com/ulsklyc/yuvomi

[^homehub]: HomeHub, https://github.com/surajverma/homehub

[^donetick]: Donetick, https://github.com/donetick/donetick

[^hearth]: Hearth, https://github.com/ralphbarac/hearth

[^cospend]: Nextcloud Cospend, https://github.com/julien-nc/cospend-nc

[^nccookbook]: Nextcloud Cookbook, https://github.com/nextcloud/cookbook

[^moneybuster]: MoneyBuster, https://f-droid.org/packages/net.eneiluj.moneybuster/ and https://gitlab.com/eneiluj/moneybuster

[^ihatemoney]: IHateMoney, https://github.com/spiral-project/ihatemoney

[^spliit]: Spliit, https://github.com/spliit-app/spliit

[^rapidsplit]: RapidSplit, https://f-droid.org/packages/app.rapidsplit/
