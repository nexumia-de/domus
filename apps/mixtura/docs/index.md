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
- [Non-alcoholic and low-ABV drinks](non-alcoholic.md) - What ethanol does and what replaces it, ingredient classes with data-model properties, template carry-over, low-ABV bases, shelf life and food safety, legal terms in the EU, Germany, UK and US checked against primary texts, proposed filter thresholds, and as built: classes, thresholds, the alcohol class, the seed counts, shelf life with entered dates and variant suggestions; every number with its evidence status.

- [Packaging](packaging.md) - Study of Android (installed PWA, Trusted Web Activity, PWABuilder, Capacitor, Tauri) and Linux/Phosh (installed web apps, WebKitGTK Flatpak shell, Tauri, Electron): needs, licences, storage, signing, store policy, device test plan, risks.
- [Name check](name-check.md) - Search of stores and registries for Mixtura and Drink Builder with queries and dates, the trademark and domain checks that were blocked, and a plain risk assessment (not legal advice).

# Specifications

- [Balance](balance.md) - Formulas, the balance engine module and its figures with unknowns, scaling and pre-diluted batches with shelf life, adjustable dilution model, computed usual ranges per root template, vector file format, worked examples and the evidence table (nothing verified yet; owner tasks listed).
- [Ingredients](ingredients.md) - The ingredient module of the engine: tree validation, property inheritance with sources, prepared ingredients computed from their spec, substitution classes, swap candidates for Try a Swap, the tree with the source's real depth, and the vectors that pin them.
- [What the stock allows](makeable.md) - Which specs the stock makes makeable (exact, hierarchy, prepared, substitutes, optional lines), missing one, and the unlock ranking with its tie-breaks, performance numbers and vectors.
- [Units](units.md) - Every unit with exact value or convention, behaviour in balance, parsing grammar, display and rounding (pour precision for ml); table also in `packages/engine/data/units.json`.
- [Templates](templates.md) - The six root templates as data, matching a spec to a template by roles and ratios with distance and a tie rule, the range check (within, below, above, unknown) and the evidence of every number (all assumptions).
- [Engine](engine.md) - The one public entry point of the engine package: purity, every exported function with signature and units, general model apart from drink-specific rules, vector folders, how to add a rule, executed examples, the build and its size.
- [Engine amounts module](engine-amounts.md) - Parse, convert, scale and format amounts: files, error codes, options and the vector files.
- [Shared model inventory](shared-model.md) - General and drink-specific engine modules from the code, the coupling points with file paths, what Culina needs differently, and the extraction order that keeps the public engine API.

# Decisions

- [App name](decisions/app-name.md) - Code name Mixtura, visible name Drink Builder.
- [Two apps, one engine](decisions/two-apps-one-engine.md) - Bar and kitchen are separate apps; shared code moves out when the second app needs it; the bar app comes first.
- [Stored unit versus display unit](decisions/units-and-display.md) - Amounts stored as entered, computed in ml and g, display system a setting; default metric proposed, needs owner decision.
- [Counted units, open amounts and the glass volume](decisions/counted-units.md) - Counted units are units without a table volume; volume only as data (`unitVolumes`, `topMl`), otherwise a line is listed as not counted; no glass volume; batches round counts up.
- [Packaging for Android and Linux](decisions/packaging.md) - Proposal, needs decision: Capacitor APK on GitHub Releases after a device test, web apps on Linux first, Flatpak shell only if needed, no TWA.
- [Hosting](decisions/hosting.md) - Proposed on the owner's direction: Cloudflare Workers static assets at mixtura.nexumia.de instead of GitHub Pages; real headers, correct caching, a preview per pull request.
- [PWA with own local data](decisions/pwa-own-data.md) - One web build installed on Android and Linux; data stays on the device, seeded from open data, no server.
- [Where the shared model lives](decisions/shared-model.md) - Proposal, needs decision: a new repository with an npm package consumed by git tag and built by `prepare`; phosh-toolkit, monorepo, GitHub Packages, npmjs and submodules weighed.

# Reference

- [Data model](data-model.md) - Entities, fields, required and stored-versus-derived, ids, inheritance, units of measure and the JSON export format; the JSON Schemas are in `packages/engine/schemas/`.
- [Seed data](seed-data.md) - Bar Assistant's dataset: format, counts, licence, field mapping, gaps, problems, attribution; the converter, its rules and deviations, results, file layout, regenerating, thresholds, the 20 checked classics and Mixtura's own additions.

- [Export and import](export-format.md) - The export file, how files are checked and migrated, merge and replace rules, import backup and Undo, change counter and the backup reminder.
- [Local store](store.md) - IndexedDB stores and indexes, schema versions and migrations, seed data beside user data with one catalog view, the persistence request and failure states.

# Behaviour and design

- [Behaviour](behaviour.md) - Navigation, deep links, state across reloads, interaction rules, flows and the screen index with issue numbers and mock-ups.
- [Screens: browse and read](screens-browse.md) - Templates, drinks list, filters, spec with balance panel, swap mode; the sections "As built" say what #18, #19, #20 and the alcohol filters of #37 do with the real seed data.
- [Screens: own specs](screens-specs.md) - Spec editor, ingredient picker, prepared ingredients, save with note, versions and diff, riffs and family; "As built" sections say what #25, #26 and #27 do.
- [Screens: stock and settings](screens-stock-settings.md) - Stock, Buy Next, settings, export and import, About; the section "As built" says what #30 and #33 do.
- [Design](design.md) - Layout rules, colour tokens with computed contrast and the proposed accent, type scale, how balance is drawn, copy rules, open questions and the review checklist.
- [UI strings](ui-strings.md) - Every fixed text of the app, including empty, error and offline states.

# Development

- [Accessibility pass](accessibility.md) - The browser checks on every screen at both sizes in light and dark (names, focus, order, headings, landmarks, fields, targets, contrast, reduced motion, 200 % zoom), what they found and fixed, the open findings.
- [Screenshots](screenshots.md) - The current screens at 360x720 and 1200x800 in light and dark, how to regenerate them, and the mock-up pictures kept apart.
- [Development](development.md) - Setup, commands, layout, the app shell and how to add a screen, service worker and update flow, e2e test, the engine's purity rule, the CI jobs and the hosts the research needed.
- [Deployment](deployment.md) - Where the app is hosted (Cloudflare Workers static assets at mixtura.nexumia.de; GitHub Pages until the move is confirmed), the `_headers` file and the caching of each file, the deploy job with and without secrets, the owner's one-time steps with the exact token permission, what was verified.
- [Install](install.md) - Public address, how to install on Android, Linux desktop and a Phosh phone (browser support from MDN, device steps marked as unchecked), updates, offline use, where the data lives, removal, and the owner's steps to switch on GitHub Pages.
- [Dependencies](dependencies.md) - Every dependency with exact version, licence and use.
