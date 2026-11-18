---
type: Plan
title: Roadmap
description: Goals of Emptio and their order - foundations, the list with priority, sharing by sync, stores with routes, hand-over with Culina and Mixtura, Domus; work items become issues in milestones once the owner agreed to the plan.
tags: [plan, roadmap, goals]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Roadmap

# How the plan is tracked

This file keeps the goals and their order. Work items become issues in
milestones `M<n> – <goal>` once the owner agreed to the plan and the
[open decisions](architecture.md#open-decisions-for-the-owner) are
made. How the app is built: [architecture](architecture.md).

# Goals

0. **Foundations.** Repository set up like Culina (rules for agents,
   licence, check, CI); the open decisions made; the data model and the
   engine rules as documents with their first vectors.
1. **The list.** Entries with priority and category, adding by search
   from the catalogue and by free name, ticking, the home order; the
   local store; installable and offline; deployed. Usable by one person
   on one device.
2. **Shared.** The list in the household's place, encrypted, over
   storage the user configured. From here it can replace KitchenOwl in
   the household, which is why it comes before stores.
3. **Stores.** Stores with the default route of their chain (Rewe,
   Aldi, Rossmann, a general one), "I am at", hiding what a store does
   not carry, "not here", moving categories, the route proposal from
   ticking.
4. **Hand-over.** Culina puts what a recipe lacks on the list; bought
   entries are offered to stock; then the same with Mixtura.
5. **Domus.** The landing page for all apps, and the compose file with
   a sync storage the apps can use as it is.
6. **Later.** Staples that return, proposals from history, offers and
   prices through a connector the household hosts (Rewe), barcodes.

# Depends on others

- Goal 2 needs the sync parts that exist in Mixtura today
  ([shared host code](architecture.md#shared-host-code)).
- Goal 4 needs Culina's stock and finder (its goal 4) and a common
  ingredient catalogue.
