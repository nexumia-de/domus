---
type: Decision Record
title: Native Linux apps in GJS
description: Decided by the owner on 2026-11-20 - the household apps get native Linux apps for Phosh built with the phosh toolkit, as real libadwaita screens in GJS that reuse the TypeScript engines and the sync code, Emptio first, then Mixtura and Culina (both built 2026-11-21), inside this repository and released into the shared Flatpak repository; the alternatives weighed (web view shell, Python), the agent's choices and what is open.
tags: [decision, linux, gtk, libadwaita, gjs, phosh, flatpak, native]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: toolkit
    title: 'phosh-toolkit: agent rules for Phosh GTK apps'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/agents/gtk-app.md
  - id: emptio
    title: 'Emptio: native Linux app (the first one, as built)'
    url: ../../apps/emptio/docs/native-linux.md
  - id: mixtura
    title: 'Mixtura: native Linux app (the second one, as built)'
    url: ../../apps/mixtura/docs/native-linux.md
  - id: gjs
    title: 'gjs: the package the native apps share'
    url: ../../packages/gjs/docs/platform.md
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
- **The platform pieces moved to `packages/gjs`** (`@nexumia-de/gjs`) on
  2026-11-21, when Mixtura's native app became the second that needs
  them, as the repository's rule says: the Web Crypto subset, random
  bytes, `fetch` on libsoup, the file folder, `gi.d.ts`, joining by link,
  the preferences file, the style helpers, and the build, smoke and
  Broadway tooling[^gjs]. The code was moved, not changed; both apps pass
  their checks. The sync status words moved to the host package for the
  same reason. What is still written per app: the screens, the texts
  (the web apps' texts are English only, so Mixtura's native app has
  both languages of its own) and a session object that joins the app's
  engine, its screen-free web core and the host package.
- **Each native app is built from what its web app already has without a
  DOM.** Emptio had `@emptio/app/core`; Mixtura got `@mixtura/app/core`
  (the browse model, what the stock allows, the stock records, the seed's
  shape), by moving one small file out of a file that touches the DOM,
  never by copying. Mixtura's native app shows the built-in drinks and
  the stock of one space; what the user made in the browser stays in the
  browser's own database ([Mixtura's native app](../../apps/mixtura/docs/native-linux.md)[^mixtura]).
- **Culina's native app** (2026-11-21, [native
  app](../../apps/culina/docs/native-linux.md)) shows the shipped classics
  and the stock of one space, and not the notebook. Its web code chooses
  texts and the decimal mark from `navigator.languages` when it loads, so
  `@nexumia-de/gjs/language` defines that from the device's locale and is
  imported first; the other texts the three native apps share moved to
  `@nexumia-de/gjs/texts` (Emptio and Mixtura still hold copies). The
  web app's `core.ts` exports what a second shell needs; the one change in
  web code was `itemsFromRecords`, taken out of `notebook/stock.ts`.
- **Each native app joins a space by its invitation link.** There is no
  native Household app; a space is shared (invited to) in a browser.
  Since 2026-11-22 (owner) the native apps can also make a space and
  leave one, with the host's `createSpace` and the preferences group of
  `packages/gjs` ([platform](../../packages/gjs/docs/platform.md#spaces-in-the-preferences)). The
  three apps on one device do not share their spaces: each keeps
  `$XDG_DATA_HOME/<app>` in its own Flatpak sandbox and needs the
  invitation link once (owner, 2026-11-22: no sandbox permission or
  other workaround to make them share; the web apps share one database
  because they share one address).
- **The toolkit's GTK rules apply to the native packages only**; the web
  apps and libraries stay outside them.
- **CI builds the Flatpak with its own job**, not the toolkit's reusable
  workflow: that one cannot take a file built before flatpak-builder
  runs and requires REUSE files.
- **Every native app is published in the shared Flatpak repository**
  (owner, 2026-11-21). Each releases on its own with a tag
  `<app>-v<version>` (Emptio: `emptio-v0.1.0`), made by the release
  workflow when its release pull request is merged; phosh-apps lists it as
  `nexumia-de/domus <app>-v*` and publishes the newest release of each
  ([Emptio's releases](../../apps/emptio/docs/native-linux.md#releases),
  [Mixtura's](../../apps/mixtura/docs/native-linux.md#releases)). CI has
  the same three jobs per app, made of shared composite actions
  ([development](../development.md#ci-for-the-native-apps)).

## Open

- The drinks a person made in the web app are not in a space and so not
  in the native app; whether the native app should read the web app's
  export file, or those drinks should be synced too, is the owner's call.
- REUSE compliance, as the toolkit describes it for a repository per app.
- Whether the web apps stay the first shell on a phone once the native
  ones exist.

## Not verified

CI built Emptio's Flatpak bundles for x86_64 and aarch64, but nobody
installed one; Mixtura's and Culina's were not built yet (`mixtura-flatpak` and
`culina-flatpak` run on the pull request); nothing ran on a phone, and the start time and
memory in the table above were never measured.
