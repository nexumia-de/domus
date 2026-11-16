---
type: Decision Record
title: A PWA with its own local data
description: Mixtura is one web build that works offline and is installed on Android and Linux; data stays on the device, seeded from Bar Assistant's MIT dataset, with import and export and no server.
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
