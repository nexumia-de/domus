---
okf_version: '0.2'
---

# Emptio knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle. One file per concept, YAML frontmatter, plain markdown
links. Change history is in [log.md](log.md).

# Plan

- [Roadmap](roadmap.md) - Goals and their order: foundations, the list, sharing, stores, hand-over, Domus.
- [How Emptio is built](architecture.md) - Shape as Culina, what is stored and derived, engine rules, the plan of 2026-11-18 (the list as its own file, hand-over by link; both superseded by one address), screens, the owner's decisions.

# Specifications

- [Behaviour as built](behaviour.md) - The list, an entry, categories, settings, which space is shown, sync when opened, after a change or when asked, offline, what is checked and what is not built.
- [KitchenOwl sync](kitchenowl.md) - Two-way sync of a space's list with a KitchenOwl list: mapping, links, one cycle, setup, CORS for the web app, the API calls, what is lost and not proven.
- [Native Linux app](native-linux.md) - The GTK 4 and libadwaita app on GJS: what it shares with the web app, what GJS lacks and how it is filled, pages, joining a space, build, packaging, what is not checked.

- [Data model](data-model.md) - Category and store with fields and ids (the entry is in the shared list package), what is derived, records in collections of a space, limits of merging.
- [Engine rules](engine-rules.md) - Order at home and in a store, hiding, what the add field offers; the sort key, the category of a new entry and adding what is already there are in the shared list package; later rules in outline.
- [Test vector format](vectors.md) - JSON shape of the worked examples, the engine's three kinds, how the files are checked; the kinds of rules 4 and 5 are in the list package.

# Reference

- [Starting categories and usual items](categories.md) - The 19 categories in English and German, the mapping from USDA food groups, usual household goods, taxonomies not used.
- [List orderings](list-orderings.md) - Unlucky orders of events around the list with the test that pins each, and the ones no test pins.
- [Dependencies](dependencies.md) - Every dependency with exact version, licence and use; none at run time yet.

# Development

- [Development](development.md) - Setup, commands, layout, the purity rule and its guard, how the lockfile is made, CI.

# Decisions

- [The app is called Emptio, shown as Shopping List](decisions/app-name.md) - Names of the app, the umbrella and the shared packages; Domus has an open question.

# Research

- [Existing tools and their gaps](existing-tools.md) - Survey of FOSS shopping list apps, to-do tools, household suites and shared-expense tools, what each lacks against the requirements, and the gap Emptio fills.
- [Store layouts and the route through a store](store-layouts.md) - German stores share a pattern but no fixed order, no open layout data exists, the route is learned per store from the order of ticking, and the unofficial Rewe client is not bound in.
- [Name check](name-check.md) - Emptio, hospes and cibus without serious collision; a family organiser app named Domus exists; the trademark register counts about 3 marks for Emptio, not yet read.
