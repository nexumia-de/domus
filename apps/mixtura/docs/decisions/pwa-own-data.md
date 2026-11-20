---
type: Decision Record
title: A PWA with its own local data
description: Mixtura is one web build that works offline and is installed on Android and Linux; data stays on the device, seeded from Bar Assistant's MIT dataset, with import and export and no server; amended on 2026-11-18 (stock sync) and on 2026-11-20 (stock in spaces, which replaces that amendment).
tags: [decision, architecture, pwa, data]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# A PWA with its own local data

## Context

The owner wants apps that run as PWA and are also used as Android and
Linux apps. For the data there were two ways: keep it in the app, or be
a client of a self-hosted [Bar Assistant](../existing-tools.md#bar-assistant),
which already has stock, hierarchy, substitutes and prices.

## Decision

Chosen by the owner on 2026-11-16:

1. **One web build**, offline-capable, installed from the browser on
   Android and as an installed web app or in a thin wrapper on Linux.
   The GTK rules of phosh-toolkit do not apply; 360 × 720 with touch and
   a desktop size do.
2. **Own local data** in the browser's storage. No server, no account.
3. **Seed data** from Bar Assistant's dataset (MIT), with attribution.
4. **Import and export** of everything the user entered, as one file.

## Consequences

- Stock, hierarchy and substitutes are built here and not taken from a
  server.
- Browser storage can be cleared by the system, so export and a backup
  reminder matter early.
- Syncing with a Bar Assistant server stays possible later and is not
  planned now.

## Amendment of 2026-11-18: stock sync (replaced on 2026-11-20)

"No server, no account" still holds for Mixtura itself. Since the
[stock sync decision](stock-sync.md) the app may send requests to
storage the user configured (a WebDAV folder), and only there. Sync is
off until the user adds a storage and binds a place to it; without that
the app sends no request to another host, and local data works offline
as before. What is sent is encrypted in the browser with a passphrase
per place.

## Amendment of 2026-11-20: stock in spaces

The amendment above is replaced by the decision
[stock in spaces](stock-in-spaces.md). "No server of ours, no account"
still holds. Stock is no longer Mixtura's own local data: it is the
collection `stock` of a space, kept on the device in the database all
apps on the address share. The only requests to another host go to the
storage of a space the household set up in the Household app; a space
that is on this device only sends none, and everything works offline as
before. Mixtura has no storage, passphrase, place or invite of its own.
The export file holds the user's specs, ingredients, templates and
pairings, not the stock.
