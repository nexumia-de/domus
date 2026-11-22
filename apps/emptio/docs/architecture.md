---
type: Plan
title: How Emptio is built
description: Plan of 2026-11-18 for the shopping list app - same shape as Culina (pure engine with vectors, PWA shell, materia pinned), what is stored and what is derived, the engine's rules, the list as collections inside the household's place, hand-over with Culina and Mixtura by link and by sync, the screens, and the owner's decisions.
tags: [plan, architecture, data-model, engine, sync, screens]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: materia-sync
    title: materia, docs/sync.md (record merge, unit documents, unknown collections are kept), version 0.3.0
    url: ../../../packages/model/docs/sync.md
  - id: culina-sync
    title: Culina, decision "Sync in three units, after stock" (a place is the same place in Mixtura and Culina)
    url: ../../culina/docs/decisions/sync.md
  - id: mixtura-backends
    title: "Host package: the WebDAV adapter (Mixtura's own sync, where it came from, was removed on 2026-11-20)"
    url: ../../../packages/host/docs/webdav.md
---

# How Emptio is built

A plan of 2026-11-18. Since 2026-11-20 goals 1 and 2 are built, and
where they differ from this plan the [behaviour](behaviour.md) and the
[data model](data-model.md) say what holds: places are spaces, the list
is two collections of a space and not a file of its own, storage and
invites are the Household app's, and the app is served from
`domus.nexumia.de/emptio/`. Why the app
exists is in [existing tools](existing-tools.md); the route through a
store is in [store layouts](store-layouts.md); the order of work is in
the [roadmap](roadmap.md).

# Shape

The same as Culina, so that one who knows one repository knows the
other:

- npm workspaces: `packages/engine` (pure, every rule with a test
  vector) and `packages/app` (the PWA: build with esbuild, hash router,
  IndexedDB, service worker).
- materia pinned to an exact tag for the ingredient tree, stock and the
  pure parts of sync.
- `npm run check` (format, lint, typecheck, tests), CI, deploy of the
  static folder to `emptio.nexumia.de`.
- AGPL-3.0, as the sister apps. No server of ours, no account, no
  telemetry. English and German, following the device.
- Screens work at 360 × 720 with touch and at desktop size.

# What is stored

Only what a person entered.

| Entity   | Fields                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry    | id; an ingredient id of the catalogue or a free name; category; optional amount and note; priority; added at; bought at and in which store; where it came from |
| Category | id, name; the catalogue brings the usual ones, the household adds its own                                                                                      |
| Store    | id, name, chain; the route (ordered categories); the categories it carries; entries marked "not here"                                                          |

**Priority** has three steps: _now_, _soon_ (the default), _sometime_.
Three, because a number invites sorting by hand, which KitchenOwl's
maintainer declined as "annoying to manage".

**Where an entry came from**: typed, handed over by Culina for a named
recipe, or a staple that returned. It is shown, so one sees why the
cream is on the list.

Derived every time, never stored: the order of the list, what is hidden
in a store, counts, proposals for the route.

# Rules of the engine

Each is a pure function with vectors; the exact statements are in the
[engine rules](engine-rules.md):

1. **Order at home**: by priority, then category, then name.
2. **Order in a store**: by the store's route; within a category _now_
   first. A filter shows only _now_.
3. **Hidden in a store**: entries of categories the store does not
   carry, and entries marked "not here" for it; their count stays
   visible.
4. **Category of a new entry**: the category the household last gave
   the same thing; otherwise the one the catalogue gives the
   ingredient; otherwise "Other".
5. **Twice the same**: adding what is already open raises the existing
   entry (amounts added when the units match) and keeps the higher
   priority.
6. **Route proposal**: from the order in which entries were ticked in
   one store, the pairs of categories that contradict the route; a
   route changed by hand is only ever proposed to, never changed.
7. **Hand-over in**: missing ingredients of a recipe become entries
   with their origin. **Hand-over out**: bought entries with an
   ingredient id become proposed stock records.

8. **Raised by an offer**: where the household switched this on, an
   entry at _soon_ or _sometime_ that is on offer in the store one is
   in is shown as _now_ there, marked as an offer with its price. The
   stored priority does not change; the offers come in as input.

Ticking needs the time; it comes in as input, as in materia.

# Catalogue

Foods come from Culina's ingredient catalogue, so both apps speak the
same ingredient ids. That catalogue is generated in Culina today; with
a second app needing it, the data moves to a place both install from
(decision 2). Household goods (cleaning, drugstore) are in no
catalogue: a short curated list of categories and usual items, with its
source named, and free names beyond that.

State of Culina's catalogue on 2026-11-18, from its build session:

- 539 foods and 116 parents, generated from USDA FoodData Central SR
  Legacy (CC0) by `tools/catalogue/build.mjs`. Food ids are
  `fdc-<FDC id>` and stable for one data release; parent ids depend on
  the grouping rule and can change with it.
- **It has no shopping category.** The tree groups by name ("Butter",
  "Oil"), not by aisle. The generator reads USDA's food category
  ("Dairy and Egg Products", "Baked Products", ...) but does not write
  it. Writing it out is small; the table from USDA categories to shop
  categories has to be decided (issue 11).
- German names are planned only (Culina issue 69). The owner decided
  on 2026-11-18 to pull them forward, so that the search works in
  German from the start.
- Moving the generator into a package of its own is simple; it needs
  one unit table of Culina. Best done after or together with the German
  names.
- Culina's engine gets `matchIngredients` (pull request 72), which maps
  a free name to an ingredient id. Emptio needs the same for rule 4, so
  it is a candidate for the shared code, not for a copy.

# Sync and the household

- The household's **place** is the same place in Mixtura, Culina and
  Emptio: one place id, one folder on the storage, one invite. **Each
  app writes its own file there** and no app writes into another's
  (Culina's sync decision, point 3, by the owner; confirmed for Emptio
  on 2026-11-18). Emptio's file holds its list and stores as
  collections of a `materia-unit` document.
- An earlier version of this plan put the list into the same file as
  Mixtura's stock. That was dropped: Mixtura rebuilds its file from its
  own state and would have lost the list, and stock is per app anyway,
  because the apps' ingredient ids differ.
- For the hand-over an app **reads** another app's file of the same
  place and never writes it.
- Entries are small records merged per key by materia's rules: two
  people adding offline both keep their entries; ticking is a later
  write of the same record.
- Encrypted, over storage the user configured (WebDAV), as Mixtura. A
  place without a binding sends nothing.

State of Mixtura's sync on 2026-11-18, from its sync session (read in
the code, not tested):

- Mixtura writes its place file as a `materia-place` document on
  materia 0.2.0, as `<folder>/<place id>.json`, and rebuilds it from
  its own state on every write. With a file per app this harms no one,
  but the file name does not say which app it belongs to; a name per
  app is part of the neutral names (decision 7).
- The invite link carries `format: "mixtura-invite"` and the default
  folder on the storage is `mixtura`; one file per place,
  `<folder>/<place id>.json`. Both names are of one app, while the
  place is meant for three.
- The host-side sync code is about 1,900 lines in `sync/` and about
  2,000 lines of screens. Nothing in it is about drinks; it is tied to
  Mixtura's store, app state and DOM helper, which is the work of
  taking it out into hospes.
- `tools/webdav-server` in Mixtura is a Docker WebDAV server with CORS
  that the compose file of Domus can reuse.

# Hand-over with the sister apps

Each app has its own origin, so they cannot read each other's data on
the device. Two ways, both needed:

1. **By link, without sync.** Culina opens
   `emptio.nexumia.de/#/add?…` with the missing ingredients; Emptio
   shows them for confirmation and adds them. Bought entries go back to
   Culina's stock the same way. Works offline once both apps are
   installed, and for a household that never sets up sync.
2. **By the shared place, with sync.** Emptio reads Culina's file of
   the place for what is missing, and Culina reads Emptio's for what
   was bought; each offers, the person confirms, and each writes only
   its own file.

The format of the link is a small contract between the apps and is
written down before either side builds it.

# Screens

- **List**: the home view by priority; a switch "I am at …" changes to
  the route of that store. One tap ticks, one gesture sets "not here".
- **Add**: a search field over catalogue and earlier entries; Enter
  adds the first hit; priority and amount are optional on the same
  line.
- **Entry**: priority, amount, note, category.
- **Stores**: the household's stores; a store's route is reordered by
  dragging categories, and "carries" is ticked per category.
- **After shopping**: "put 7 bought entries into stock?" and, if there
  is one, the route proposal.
- **Settings**: language, sync, export and import.

# Shared host code

The WebDAV adapter, the local store and the sync screens exist in
Mixtura, and Culina will need them at its sync goal. materia cannot
take them: it is pure and they use `fetch` and IndexedDB. They move to
a second shared package, **hospes** (decision 1).

# Decisions

By the owner on 2026-11-18:

1. **Shared host code** goes into a second package next to materia,
   named **hospes**, for the parts that touch the host (sync adapter,
   local store, later common screens and design). The name is not yet
   checked for collisions.
2. **The ingredient catalogue** gets a data package of its own that
   Culina and Emptio install; materia holds no food. It is named **cibus**.
3. **The list belongs to the place**, as Emptio's own file in the
   place's folder: one invite, and no app writes another app's file.
4. **Priority has three steps**: _now_, _soon_ (the default),
   _sometime_.
5. **Amounts are free text**; number and unit only where an entry comes
   from a recipe.
6. **A file per app** in the place's folder. The fix of Mixtura first
   decided here (keeping collections of other apps) is no longer
   needed and was withdrawn the same day.
7. **Neutral names**, chosen by the owner in Mixtura's sync session on
   2026-11-18 (reported by that session, built in Mixtura issue 153):
   the invite format is `materia-invite` (version 1, with
   `kind: "place"`), the default folder on the storage is `household`,
   and Emptio's file of a place is `<folder>/<place id>.emptio.json`
   (Culina's `.culina.json`; Mixtura keeps `<place id>.json`). Mixtura
   still reads `mixtura-invite`, and existing bindings keep their
   folder.
8. **Planning without milestones**: each goal of the
   [roadmap](roadmap.md) is an issue and its work items are sub-issues.
   This replaces the milestone rule of the shared agent rules for this
   repository.
