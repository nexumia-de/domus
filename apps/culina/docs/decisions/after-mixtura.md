---
type: Decision Record
title: Culina follows Mixtura on the same engine
description: Culina is the second of two apps; it starts when Mixtura's engine exists, shares the general model with it, and is a PWA with own local data.
tags: [decision, architecture, mixtura, pwa]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: two
    title: 'Mixtura: Two apps, one engine, the bar app first'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/decisions/two-apps-one-engine.md
  - id: pwa
    title: 'Mixtura: A PWA with its own local data'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/decisions/pwa-own-data.md
---

# Culina follows Mixtura on the same engine

## Context

Drinks and cooking share a structure (ingredients with roles, templates
with slots, versioned specs, components, stock) and differ in use; the
owner decided on two apps with Mixtura first[^two].

## Decision

1. Culina starts when Mixtura's engine exists. The general model moves
   into shared code at that point; nothing is copied.
2. Culina is a PWA with its own local data, installed on Android and
   Linux, like Mixtura[^pwa].
3. Culina adds what cooking needs and drinks do not: weights and
   baker's percentages, yields, expiry dates, roles of a dish.
4. Recipes are read from [Cooklang](../existing-tools.md) files where
   possible instead of a new format. To be confirmed when work starts;
   decided on 2026-11-18: import and export, see the
   [Cooklang record](cooklang.md).

## Consequences

Until then this repository holds research and plan only. Since
2026-11-18 the general model is the package materia and engine work has
started ([shared model](shared-model.md)).
