---
type: Decision Record
title: Code name Culina, visible name Cook's Workbench
description: The kitchen app is called Culina as repository and app id; its visible name was Cook's Notebook from 2026-11-16 and is Cook's Workbench since 2026-11-23, both chosen by the owner.
tags: [decision, name]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# Code name Culina, visible name Cook's Notebook

## Context

Apps of nexumia-de have a code name for repository and app id and a
visible name that says what the app does. Suggested code names were
Culina, Mise, Fond and Brigade.

## Decision

The owner chose on 2026-11-16: code name **Culina** (Latin for kitchen),
the pair to Mixtura, and visible name **Cook's Notebook**.

## Consequences

The names were not checked against existing apps or trademarks when
they were chosen. On 2026-11-22 the npm registry and Flathub were read
([name check](../name-check.md)): no package or app of either name; the
app stores and the trademark registers could not be reached and are on
the [owner's list](../../../../docs/owner-checks.md), due before the first
release under these names.

## Cook's Workbench, 2026-11-23

With the [building kit](building-kit.md) the app is for finding and
putting together, and "Notebook" names only where the result is kept.
Offered Dish Builder, What to Cook and Cook's Workbench, the owner chose
**Cook's Workbench**. The code name Culina and the app id stay.

Changed: the name in the web app (title, manifest `name`, texts, with
`short_name` "Workbench"), in the native app (strings, desktop file,
metainfo name and description), in the issue forms, in Household's and
Emptio's lists of apps, and in the documents that describe the present.
**Not changed**: the export file name `cooks-notebook-YYYY-MM-DD.json`
(the file is the notebook's, and files already exported keep working
either way), the native app's user agent `CooksNotebook`, the release
note of 0.1.0 in the metainfo, and the logs and dated records. The
navigation entry "Notebook" is the screen, not the app, and stays.

The new name was looked up as the old one was
([name check](../name-check.md)): no npm package, no Flathub app of
that name; a GNOME app named "Workbench" is on Flathub. Stores and
trademark registers are on the
[owner's list](../../../../docs/owner-checks.md).
