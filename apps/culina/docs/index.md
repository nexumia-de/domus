---
okf_version: '0.2'
---

# Culina knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle. One file per concept, YAML frontmatter, plain markdown
links. Change history is in [log.md](log.md).

# Plan

- [Roadmap](roadmap.md) - Goals and their order; the helper (skills, checklist, known dishes) comes before sync.
- [Helper build plan](helper-plan.md) - The owner's answers, the four stages, the data that is added, the work packages with order and model, the checks and the end: classics of four countries with their techniques, cookable step by step.
- [Deployment](deployment.md) - Deployed from main to culina.nexumia.de on Cloudflare Workers static assets by the CI job deploy; the host is an adapter, and how to serve the same folder elsewhere.

# Research

- [Existing tools and data](existing-tools.md) - Survey of FOSS cooking software and data sets with licences, and the gap Culina fills.
- [Evaluation of nutrition values and food tracking](nutrition-evaluation.md) - Nutrient databases and licences read at the source, per-portion figures by weight and their precision, hand-over to trackers, EU rules, and the recommendation: derived per-portion figures from bundled USDA data, dishes handed to an existing tracker, no diary, no backend.
- [How chefs work](chef-practice.md) - Ratios, components, seasoning, pairing, cooking from stock, operations; what a tool should do and the data model that follows.
- [Classic dishes by country](classic-dishes.md) - Survey for Germany, Italy, France and Spain: the public-domain cookbooks that open in full, 25 dishes per country with their place in the source and how far each was read, and the gap for dishes younger than the books.
- [Ratios and salt percentages checked against sources](ratios.md) - Every ratio, baker's percentage and salt percentage with basis, status (confirmed, corrected, unverified) and source; NCHFP fermentation data.

# Specifications

- [Test vector format](vectors.md) - JSON shape of the engine's worked examples for ratio checks, baker's percentages, scaling by weight and salt, with five vectors computed by hand and the kinds the engine now runs, now including ratio templates, salt, components and cross-record validation.

- [Engine rules](engine-rules.md) - Unit table with exact factors (US customary cup, tablespoon, teaspoon), conversion and its errors, the explicit rounding step, scaling by weight with time and salt cautions, baker's percentages and hydration, ratio templates with derivatives, family queries, the range check (numbers, no verdicts) and the seed templates, salt by basis, and components with nesting, yield and loss, edible portion and portions, and cross-record validation of the model (references, cycles, anchors, ranges), versions with head, variations and the diff of two versions, stock (days left, use-by suggestions, using up); vectors in `packages/engine/vectors/`.

- [Data model](data-model.md) - Every stored entity (tasting notes are records of their own) with fields, ids, units, stored versus derived, general versus kitchen-specific, export envelope, Cooklang compatibility and open questions; JSON Schemas in `packages/engine/schemas/`; storage and migrations of the local store (IndexedDB database, sync-ready rows with `updatedAt` and tombstones, the clock rule, migration procedure and failure behaviour, persistence, logging, the drafts store).

- [Behaviour](behaviour.md) - Screens, navigation (one back stack, phone first), the ratio list and cards with the calculator, number entry, cautions and the neutral range display, the component and dish screens (lines, yield, scaling, role slots, portions, the open-slot rule, example data) and the editor for components and dishes (weight or percent through the engine, picker, cycles, ratio card to recipe, drafts, delete with undo), stock (tick, list, detail), Cook (what can I cook, use up first, start from one ingredient, filters, empty states), versions with history, diff, restore, tasting notes and variations, interaction rules, empty, error and offline states, the service worker and the installability check of the PWA, the local store's Settings line and error texts, export, import (merge, replace, Undo, Cooklang step) and the backup reminder, each rule with the test that checks it.
- [Ingredient catalogue](ingredient-catalogue.md) - The basic ingredients shipped with the app, generated from USDA FoodData Central SR Legacy (CC0): why that dataset, the selection rule, how density and unit weight are derived from portion text, the file, and what it does not have.

- [Design](design.md) - Light and dark with a user override, the Beet accent, colour, type and spacing tokens with computed contrast ratios, the ratio, component, dish and editor screens, icon rules, the 720 px breakpoint and screenshots.

- [Export, import, matching and Cooklang](exchange.md) - The engine's pure rules of the export file, merging by id with conflicts, remapping ingredient ids, matching names to ingredients, and the Cooklang reader and writer written from the specification, with what is supported and what is lost; vectors in `packages/engine/vectors/`.

# Decisions

- [App name](decisions/app-name.md) - Code name Culina, visible name Cook's Notebook.
- [After Mixtura](decisions/after-mixtura.md) - Culina is the second app on the engine Mixtura builds first, as a PWA with own local data.
- [Shared model](decisions/shared-model.md) - Accepted: the general model comes from nexumia-de/materia at an exact version tag; Culina's engine adds the kitchen rules.
- [Cooklang](decisions/cooklang.md) - Decided: own JSON as the lossless format; Cooklang export and import, where on import the user supplies what the file cannot carry.
- [Recipe book](decisions/recipe-book.md) - Decided: the user's own recipe book with versions and a finder; no scraping, meal plans or shopping list (planned sister app emptio); stock ticked by default; English canonical, German supported, language follows the device.
- [Helper](decisions/mentor.md) - Decided: a scripted helper without a language model that teaches from research and textbooks until it is no longer needed; a learned skill is not taught again; known dishes ship by country as full recipes with their techniques, first Germany, Italy, France and Spain.
- [Hosting](decisions/hosting.md) - Decided: the app is a static folder any host or own server can serve; Cloudflare is the first host and only an adapter in this repository, no shared deploy code.
- [Sync](decisions/sync.md) - Decided: three units as Mixtura (place, library, profile), a library shareable by invite, places shared with Mixtura, tasting notes as own records, built after stock.

# Development

- [Development](development.md) - Setup, commands, layout, the engine's purity rule, the app build, generated validators, tests and service worker, CI (jobs `check` and `e2e`) and the network hosts.
- [Dependencies](dependencies.md) - Every dependency with exact version, licence and use.
