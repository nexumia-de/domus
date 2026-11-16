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

# Decisions

- [App name](decisions/app-name.md) - Code name Mixtura, visible name Drink Builder.
- [Two apps, one engine](decisions/two-apps-one-engine.md) - Bar and kitchen are separate apps; shared code moves out when the second app needs it; the bar app comes first.
- [PWA with own local data](decisions/pwa-own-data.md) - One web build installed on Android and Linux; data stays on the device, seeded from open data, no server.

# Development

- [Development](development.md) - Setup, commands, layout, the engine's purity rule, the CI job `check` and the hosts the research needed.
- [Dependencies](dependencies.md) - Every dependency with exact version, licence and use.
