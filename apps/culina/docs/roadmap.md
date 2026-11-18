---
type: Plan
title: Roadmap
description: Goals and their order for Culina; the shared model comes from materia; work items are GitHub issues.
tags: [plan, roadmap]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# How the plan is tracked

This file keeps the goals and their order; work items are
[issues](https://github.com/nexumia-de/culina/issues). The reasons are
in [how chefs work](chef-practice.md) and
[existing tools](existing-tools.md).

# Goals

0. **Wait for Mixtura's engine** ([decision](decisions/after-mixtura.md)).
   Done: the engine exists and its general model is the package
   materia ([decision](decisions/shared-model.md)).
1. **Foundations.** The general model moves into shared code; Culina's
   data model as a document; the numbers in
   [how chefs work](chef-practice.md) checked against their sources;
   the decision on Cooklang as recipe format.
2. **Ratios and components.** Ratio cards with their variations,
   baker's percentages, components with yields, scaling by weight.
3. **Notebook.** Own recipes and components with versions and tasting
   notes, export and import.
4. **Stock.** What is there with state and use-by date; what it allows,
   ranked by urgency and role.
5. **Helper.** Culina teaches until it is no longer needed
   ([decision](decisions/mentor.md)): skills with scripted questions
   and cautions from research and textbooks, a learned skill no longer
   taught; the correction checklist and suggestions from a tasting
   check; known dishes shipped as a source of ideas, matched to the
   catalogue by role.
6. **Sync.** The same mechanism as Mixtura in three units (place,
   library, profile), encrypted, over storage the user configured
   ([decision](decisions/sync.md)).
7. **Later.** Curated affinities with sources, cost, prep lists,
   allergens.
