---
type: Plan
title: Roadmap
description: Goals and their order for Mixtura, from the pure engine to an installed app with stock, versions and non-alcoholic drinks; work items are GitHub issues.
tags: [plan, roadmap]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# How the plan is tracked

This file keeps the goals and their order; work items are
[issues](https://github.com/nexumia-de/mixtura/issues). Work goes from
the top open goal downwards. Every goal ends with something that works.
The reasons are in [how bartenders work](bartender-practice.md) and
[existing tools](existing-tools.md).

# Goals

1. **Foundations.** Tooling, CI and the data model as a document. The
   numbers in [how bartenders work](bartender-practice.md) are checked
   against their sources and become the first test vectors.
   _Done when_: the data model and the balance formulas are documents
   with vectors, and CI runs them.
2. **Engine.** Templates with slots, specs, prepared ingredients,
   balance with dilution by method, scaling and batching, units.
   _Done when_: the six root templates and a set of classics compute
   figures that match the vectors.
3. **First app.** The PWA shell at 360 × 720 and desktop size: browse
   templates and drinks, open a spec, see its balance, change a slot and
   watch the numbers. Seed data from Bar Assistant's dataset.
   _Done when_: it installs on Android and Linux and works offline.
4. **Own specs.** Edit and create specs, versions with notes, riffs
   linked to their parent, export and import.
5. **Stock.** What is there, what it allows with substitution by role,
   and which one bottle unlocks the most.
6. **Without alcohol.** Ingredient classes and templates for
   non-alcoholic and low-ABV drinks, shelf life of prepared ingredients.
7. **Later.** Cost per drink, menus, curated affinities with sources,
   and moving the general model into code shared with Culina
   ([decision](decisions/two-apps-one-engine.md)).
