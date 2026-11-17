---
okf_version: '0.2'
---

# Mixtura knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle. One file per concept, YAML frontmatter, plain markdown
links. Change history is in [log.md](log.md).

# Plan

- [Roadmap](roadmap.md) - Goals and their order from the engine to the installed app; work items are GitHub issues.

# Research

- [Existing tools and data](existing-tools.md) - Survey of FOSS cocktail software and data sources with licences, what Bar Assistant already does and the gap Mixtura fills.
- [How bartenders work](bartender-practice.md) - Templates and ratios, balance as numbers, how drinks are developed, pairing, non-alcoholic drinks, operations; what a tool should do and the data model that follows.
- [Non-alcoholic and low-ABV drinks](non-alcoholic.md) - What ethanol does and what replaces it, ingredient classes with data-model properties, template carry-over, low-ABV bases, shelf life and food safety, legal terms in the EU, Germany, UK and US, proposed filter thresholds; every number with its evidence status.

# Specifications

- [Balance](balance.md) - Formulas, the balance engine module and its figures with unknowns, scaling and pre-diluted batches with shelf life, adjustable dilution model, computed usual ranges per root template, vector file format, worked examples and the evidence table (nothing verified yet; owner tasks listed).
- [Ingredients](ingredients.md) - The ingredient module of the engine: tree validation, property inheritance with sources, prepared ingredients computed from their spec, substitution classes, and the vectors that pin them.
- [Units](units.md) - Every unit with exact value or convention, behaviour in balance, parsing grammar, display and rounding; table also in `packages/engine/data/units.json`.
- [Templates](templates.md) - The six root templates as data, matching a spec to a template by roles and ratios with distance and a tie rule, the range check (within, below, above, unknown) and the evidence of every number (all assumptions).
- [Engine](engine.md) - The one public entry point of the engine package: purity, every exported function with signature and units, general model apart from drink-specific rules, vector folders, how to add a rule, executed examples, the build and its size.
- [Engine amounts module](engine-amounts.md) - Parse, convert, scale and format amounts: files, error codes, options and the vector files.

# Decisions

- [App name](decisions/app-name.md) - Code name Mixtura, visible name Drink Builder.
- [Two apps, one engine](decisions/two-apps-one-engine.md) - Bar and kitchen are separate apps; shared code moves out when the second app needs it; the bar app comes first.
- [Stored unit versus display unit](decisions/units-and-display.md) - Amounts stored as entered, computed in ml and g, display system a setting; default metric proposed, needs owner decision.
- [PWA with own local data](decisions/pwa-own-data.md) - One web build installed on Android and Linux; data stays on the device, seeded from open data, no server.

# Reference

- [Data model](data-model.md) - Entities, fields, required and stored-versus-derived, ids, inheritance, units of measure and the JSON export format; the JSON Schemas are in `packages/engine/schemas/`.
- [Seed data](seed-data.md) - Bar Assistant's dataset: format, counts, licence, field mapping, gaps, problems, attribution; the converter, its rules and deviations, results, file layout, regenerating, thresholds and the 20 checked classics.

- [Export and import](export-format.md) - The export file, how files are checked and migrated, merge and replace rules, import backup and Undo, change counter and the backup reminder.
- [Local store](store.md) - IndexedDB stores and indexes, schema versions and migrations, seed data beside user data with one catalog view, the persistence request and failure states.

# Behaviour and design

- [Behaviour](behaviour.md) - Navigation, deep links, state across reloads, interaction rules, flows and the screen index with issue numbers and mock-ups.
- [Screens: browse and read](screens-browse.md) - Templates, drinks list, filters, spec with balance panel, swap mode.
- [Screens: own specs](screens-specs.md) - Spec editor, ingredient picker, prepared ingredients, save with note, versions and diff, riffs and family.
- [Screens: stock and settings](screens-stock-settings.md) - Stock, Buy Next, settings, export and import, About.
- [Design](design.md) - Layout rules, colour tokens with computed contrast and the proposed accent, type scale, how balance is drawn, copy rules, open questions and the review checklist.
- [UI strings](ui-strings.md) - Every fixed text of the app, including empty, error and offline states.

# Development

- [Development](development.md) - Setup, commands, layout, the app shell and how to add a screen, service worker and update flow, e2e test, the engine's purity rule, the CI jobs and the hosts the research needed.
- [Install](install.md) - Public address, how to install on Android, Linux desktop and a Phosh phone (browser support from MDN, device steps marked as unchecked), updates, offline use, where the data lives, removal, and the owner's steps to switch on GitHub Pages.
- [Dependencies](dependencies.md) - Every dependency with exact version, licence and use.
