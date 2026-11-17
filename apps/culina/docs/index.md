---
okf_version: '0.2'
---

# Culina knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle. One file per concept, YAML frontmatter, plain markdown
links. Change history is in [log.md](log.md).

# Plan

- [Roadmap](roadmap.md) - Goals and their order; Mixtura's engine exists; engine code waits for the shared-model decision.

# Research

- [Existing tools and data](existing-tools.md) - Survey of FOSS cooking software and data sets with licences, and the gap Culina fills.
- [Evaluation of nutrition values and food tracking](nutrition-evaluation.md) - Whether nutrition figures, an adviser and a food diary fit Culina; existing tools, open data, evidence, and the recommendation: neutral per-portion figures, recipes handed to an existing tracker, no diary, no backend.
- [How chefs work](chef-practice.md) - Ratios, components, seasoning, pairing, cooking from stock, operations; what a tool should do and the data model that follows.
- [Ratios and salt percentages checked against sources](ratios.md) - Every ratio, baker's percentage and salt percentage with basis, status (confirmed, corrected, unverified) and source; NCHFP fermentation data.

# Specifications

- [Test vector format](vectors.md) - JSON shape of the engine's worked examples for ratio checks, baker's percentages, scaling by weight and salt, with five vectors computed by hand.

# Decisions

- [App name](decisions/app-name.md) - Code name Culina, visible name Cook's Notebook.
- [After Mixtura](decisions/after-mixtura.md) - Culina is the second app on the engine Mixtura builds first, as a PWA with own local data.
- [Cooklang](decisions/cooklang.md) - Needs decision: own JSON as the lossless format, Cooklang as a one-way export, no import and no schema.org export in the first version.

# Development

- [Development](development.md) - Setup, commands, layout, the engine's purity rule, CI and the network hosts.
- [Dependencies](dependencies.md) - Every dependency with exact version, licence and use.
