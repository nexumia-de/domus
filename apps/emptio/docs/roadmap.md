---
type: Plan
title: Roadmap
description: Goals of Emptio and their order - foundations, the list with priority, sharing by sync, stores with routes, hand-over with Culina and Mixtura, Domus; each goal is an issue with sub-issues.
tags: [plan, roadmap, goals]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Roadmap

# How the plan is tracked

This file keeps the goals and their order. Each goal is an
[issue](https://github.com/nexumia-de/emptio/issues) and its work items
are sub-issues of it; there are no milestones
([decision 8](architecture.md#decisions)). How the app is built:
[architecture](architecture.md).

# Goals

0. **Foundations.** Repository set up like Culina (rules for agents,
   licence, check, CI); the data model and the
   engine rules as documents with their first vectors.
1. **The list.** Built on 2026-11-20 ([behaviour](behaviour.md)):
   entries with priority and category, adding by free name with
   suggestions from earlier entries, ticking, the home order; kept in
   the database the apps share; installable and offline; in the site
   build under `/emptio/`. Adding from the catalogue waits for the
   shared catalogue.
2. **Shared.** Built on 2026-11-20: the list is two collections of a
   space, sealed, over storage the household configured in the
   Household app, read again every 15 seconds. Not run against a real
   storage yet. From here it can replace KitchenOwl in the household,
   which is why it comes before stores.

   Beside the goals: a **native Linux app** in GJS since 2026-11-20
   ([native Linux app](native-linux.md)), and since 2026-11-22 **sync
   with KitchenOwl**, both ways, so the household can use both apps
   side by side ([KitchenOwl sync](kitchenowl.md)).

3. **Stores.** Stores with the default route of their chain (Rewe,
   Aldi, Rossmann, a general one), "I am at", hiding what a store does
   not carry, "not here", moving categories, the route proposal from
   ticking.
4. **Hand-over.** Culina puts what a recipe lacks on the list; bought
   entries are offered to stock; then the same with Mixtura.
5. **Domus.** The landing page for all apps, and the compose file with
   a sync storage the apps can use as it is.
6. **Offers.** A connector the household hosts (Rewe first) brings the
   offers of a market; entries on offer are raised to _now_ in that
   store, where the household switched this on.
7. **Later.** Staples that return, proposals from history, barcodes.

# Depends on others

- Goal 2 uses the shared package hospes for everything about sync
  ([behaviour](behaviour.md#sync)).
- Goal 4 needs Culina's stock and finder (its goal 4) and a common
  ingredient catalogue.
