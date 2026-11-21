---
type: Decision Record
title: Native Linux apps in GJS
description: Decided by the owner on 2026-11-20 - the household apps get native Linux apps for Phosh built with the phosh toolkit, as real libadwaita screens in GJS that reuse the TypeScript engines and the sync code, Emptio first, then Mixtura and Culina, inside this repository; the alternatives weighed (web view shell, Python), the agent's choices and what is open.
tags: [decision, linux, gtk, libadwaita, gjs, phosh, flatpak, native]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: toolkit
    title: 'phosh-toolkit: agent rules for Phosh GTK apps'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/agents/gtk-app.md
  - id: emptio
    title: 'Emptio: native Linux app (the first one, as built)'
    url: ../../apps/emptio/docs/native-linux.md
---

# Native Linux apps in GJS

**Status: decided by the owner on 2026-11-20** in the session that built
roadmap goal 7. The numbered points are the owner's; "Agent's choices"
are proposals the owner can change.

## Context

The apps are web apps, installable from one address. The owner asked for
native Linux apps built with the phosh toolkit[^toolkit] as well. Three
ways were put to the owner with what each costs:

| Way                    | Start and memory on a phone (general knowledge, **not measured**)  | Work                                             |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| Web view shell         | Slowest: own WebKit processes, about 150 to 250 MB, 1 to 3 s       | Least: the web screens as they are               |
| Native screens, GJS    | Fast start, a fraction of the memory, the engines run unchanged    | New screens per app; sync needs pieces GJS lacks |
| Native screens, Python | Screens as light as GJS, computing parts slowest, every rule twice | Most: rules and sync written a second time       |

## Decision

1. **Native screens in GJS**, chosen for performance.
2. **Emptio first**, then Mixtura and Culina, each in a session of its
   own.
3. **Inside this repository**, a package per app beside its web app, so a
   native app is built from the same commit as its engine.

## Agent's choices

- **One core, two shells.** The native app imports the app's engine, the
  host package and the web app's screen-free code; only screens and the
  platform pieces are new ([Emptio](../../apps/emptio/docs/native-linux.md)[^emptio]).
- **Pure JavaScript for the cipher**: GJS has no Web Crypto, so the
  subset the host package calls runs on `@noble/ciphers` and
  `@noble/hashes` (MIT, audited), tested against Node's Web Crypto in
  both directions. The files a native device seals are the files a
  browser seals.
- **Data in files**, not in a database: the host package got a `Store`
  on files (`createFileStore`), in `$XDG_DATA_HOME/<app>`.
- **The platform pieces live in Emptio** until a second native app needs
  them; they then move to a shared package with their user, as the
  repository's rule says.
- **Each native app joins a space by its invitation link.** There is no
  native Household app; a space is made and shared in a browser.
- **The toolkit's GTK rules apply to the native packages only**; the web
  apps and libraries stay outside them.
- **CI builds the Flatpak with its own job**, not the toolkit's reusable
  workflow: that one cannot take a file built before flatpak-builder
  runs and requires REUSE files.
- **Every native app is published in the shared Flatpak repository**
  (owner, 2026-11-21). Each releases on its own with a tag
  `<app>-v<version>` (Emptio: `emptio-v0.1.0`); phosh-apps lists it as
  `suitably/domus <app>-v*` and publishes the newest release of each
  ([Emptio's releases](../../apps/emptio/docs/native-linux.md#releases)).

## Open

- A native app keeps its own copy of a space's data, so the three apps
  on one phone each join the space; whether they should share one folder
  (as the web apps share one database) is to decide with the second app.
- REUSE compliance, as the toolkit describes it for a repository per app.
- Whether the web apps stay the first shell on a phone once the native
  ones exist.

## Not verified

CI built the Flatpak bundles for x86_64 and aarch64, but nobody
installed one; nothing ran on a phone, and the start time and
memory in the table above were never measured.
