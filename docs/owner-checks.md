---
type: Guide
title: What only the owner can do
description: The short list of checks and steps that need a real device, the owner's accounts, a book or a legal check, collected on 2026-11-22 from the issues that were closed; each line says where the result goes. Nothing on it was done by an agent.
tags: [owner, checks, devices, sources, names, release]
generated: { by: claude-code, at: 2026-11-22 }
sources:
  - id: triage
    title: 'Decision: triage of every open issue, 2026-11-22'
    url: decisions/issue-triage-2026-11-22.md
---

# What only the owner can do

Collected on 2026-11-22 (triage[^triage]). **None of this was run by an
agent.** Tick a line by writing what was seen (device, browser, version,
date) into the document named at its end.

## On a device

- [ ] Mixtura: the six marks "to be checked on a device" in the
      [install guide](../apps/mixtura/docs/install.md) (Android Chrome and
      Firefox, Chromium on Linux, GNOME Web, GNOME Web on Phosh, offline
      start and the update banner). Into that guide.
- [ ] Culina and Emptio: install from `domus.nexumia.de` on Android
      and on Linux, start offline, see an update arrive. Into each app's
      `docs/deployment.md` or `docs/behaviour.md`.
- [ ] The native Linux apps: build and install each Flatpak, run it on
      the phone ([roadmap](roadmap.md), goal 11). Into each app's
      `docs/native-linux.md`.
- [ ] A screen reader or voice control on Mixtura's variant link and on
      Culina's ticks "What it is like" (both changed on 2026-11-22).

## With the owner's accounts and secrets

- [ ] A space on the real GitHub storage, and WebDAV against a real
      server: nothing was run against either ([roadmap](roadmap.md), goals
      4 to 8).
- [ ] The deploy with the real Cloudflare token, and the ruleset of
      this repository ([deployment](deployment.md),
      [development](development.md#open-points)).
- [ ] Tags: `materia-v0.2.0` and `materia-v0.3.0` are not on the
      remote; the release tags `<app>-v<version>` of the native apps.

## Books and hosts no session can read

- [ ] Mixtura, template ratios: Cocktail Codex (root chapters),
      Embury's _Fine Art of Mixing Drinks_, the IBA list. Then the bands
      in [templates](../apps/mixtura/docs/templates.md) can be marked
      verified and optional slots added.
- [ ] Mixtura, dilution: _Liquid Intelligence_ around pp. 123 to 126
      (sign, constant, variable, range of the equations). Into
      [balance](../apps/mixtura/docs/balance.md).
- [ ] Culina, the correction checklist: the rules "tastes like X, try
      Y" read in Nosrat's _Salt Fat Acid Heat_, each with its page
      ([roadmap](../apps/culina/docs/roadmap.md), goal 5).

Page photos or the text of the pages are enough; an agent then turns
them into data with the citation.

## Names

- [ ] Culina and Cook's Notebook in Google Play, F-Droid, the App
      Store and the trademark registers (TMview, DPMA, USPTO; classes 9
      and 42). Into Culina's [name check](../apps/culina/docs/name-check.md).
- [ ] The open findings of [Mixtura's](../apps/mixtura/docs/name-check.md)
      and [Emptio's](../apps/emptio/docs/name-check.md) name checks, among
      them the family organiser app named Domus.

## Decisions an agent made for the owner on 2026-11-22

Listed with their reasons in the triage[^triage]; each can be
overturned by reopening the issue: which "later" goals were closed as
not planned, the litre staying out of Mixtura's unit table, no export
of its own in Emptio, and in Culina that a character named in both
lists of a correction is shown.

[^triage]: [Triage of every open issue](decisions/issue-triage-2026-11-22.md).
