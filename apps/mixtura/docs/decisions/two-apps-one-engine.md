---
type: Decision Record
title: Two apps, one engine, the bar app first
description: Mixed drinks and cooking get one app each, Mixtura and Culina; the shared model becomes shared code when Culina needs it; Mixtura is built first.
tags: [decision, architecture, culina]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# Two apps, one engine, the bar app first

## Context

The analysis of how [bartenders](../bartender-practice.md) and chefs
work gave the same structure for both: ingredients with roles, templates
with slots, versioned specs, prepared components, stock and "what can I
make". The use differs: a bar has about fifty long-lived bottles and
balance that can be calculated; a kitchen has perishable stock, weights,
yields and expiry dates.

## Decision

1. **Two apps**: Mixtura for drinks, [Culina](https://github.com/nexumia-de/culina)
   for cooking. One app would bury each half under the other's concepts
   on a 360 px screen.
2. **Not more than two.** Stock, pairing and calculators stay inside
   each app, because "what can I make" needs them together.
3. **One engine in the end.** The shared model moves into shared code
   when Culina needs it, not in advance.
4. **Mixtura first**: its gap is the clearest, its domain is small, its
   balance can be tested with vectors, and open seed data exists
   ([existing tools](../existing-tools.md)).

## Consequences

Mixtura's engine keeps drink-specific rules (dilution, ABV) apart from
the general model (roles, slots, specs, stock), so the general part can
move out later without a rewrite.
