---
type: Specification
title: Native Linux app
description: Drink Builder as a GTK 4 and libadwaita app on GJS for Phosh and the desktop (packages/linux, app id de.nexumia.Mixtura) - what it shares with the web app, which screens it has and which not, joining a space by invitation link, how it is built, run, released and packaged, what the checks prove and what nobody verified.
tags: [linux, gtk, libadwaita, gjs, phosh, flatpak, native]
generated: { by: claude-code, at: 2026-11-21 }
sources:
  - id: decision
    title: 'Decision: native Linux apps in GJS'
    url: ../../../docs/decisions/native-linux-gjs.md
  - id: gtk-rules
    title: 'phosh-toolkit: agent rules for Phosh GTK apps'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/agents/gtk-app.md
  - id: emptio
    title: 'Emptio: native Linux app (the first one)'
    url: ../../emptio/docs/native-linux.md
  - id: platform
    title: 'gjs: platform pieces (shared with Emptio)'
    url: ../../../packages/gjs/docs/platform.md
---

# Native Linux app

The second native app of the repository[^decision], after Emptio's[^emptio]:
real libadwaita screens in GJS, built on 2026-11-21. `packages/linux`
(`@mixtura/linux`) is that app. The GTK rules of the toolkit[^gtk-rules]
apply to it and to nothing else in Mixtura.

# What is shared

Everything but the screens. The native app bundles the engine
(`@mixtura/engine`), the web app's screen-free core
(`@mixtura/app/core`), the host package and the web app's seed:

| From                             | What the native app uses                                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mixtura/engine`                | Balance (`computeBalance`), what the stock allows (`makeableSpecs`, `missingOne`), amounts and units, through the browse model                                                                                               |
| `@mixtura/app/core`              | The seed's shape (`parseSeed`), the browse model (`buildModel`), `deriveStock`, the stock tree, the stock collection's reading and writing (`loadStock`, `rowsOf`, `writeStock` keep the fields of other apps), `amountText` |
| `@mixtura/app/seed-assemble.mjs` | The built-in drinks and ingredients (Bar Assistant public data and Mixtura's additions), compiled into the bundle at build time                                                                                              |
| `@nexumia-de/hospes`             | Spaces, the file store, the collection loop, the status words' shape                                                                                                                                                         |
| `@nexumia-de/gjs`                | What GJS lacks, joining by link, the preferences file, the build and the checks ([platform pieces](../../../packages/gjs/docs/platform.md))                                                                                  |

`@mixtura/app/core` (`packages/app/src/core.ts`) is new: the files it
exports were in the web app already and have no DOM; the one change is
`stock/marks.ts` (`withPresent`, `presentIds`, `StockRecords`), taken out
of `stock/state.ts`, which re-exports them, so the web screens behave as
before. `src/session.ts` of the native package joins these pieces (the
shown space, the records, what they allow, marking, the loop) and
imports no `gi://`, so Node tests run it.

So the rules, the numbers, the records and the sync loop are the same
code. A native device and a browser are two devices of one space: a
bottle marked here is a record of the collection `stock` that the web
app, Culina and Emptio read.

# Screens

One `AdwNavigationView` in one window; every page opened from another is
pushed, so swiping back works. Texts are English and German (the device's
language); the drinks' and ingredients' names are the built-in data's own
(English).

- **Drinks**: every drink by name, with a search and a button that shows
  only what the bottles at hand allow, in three groups (can make, with a
  substitute, missing one ingredient). Without that button each row says
  what it needs ("Can make", "With a substitute", "Missing 2"). The
  search, the filter button and the button to the bottles are in a bottom
  bar within reach of the thumb. 60 rows per group at first, then "Show
  more". Space name and sync status are the header's subtitle.
- **Drink**: whether the bottles at hand allow it, its ingredients with
  amounts in the chosen units (substitutes, "optional" and notes in the
  subtitle), method, glass, garnish and notes, and the balance as the
  engine's numbers: alcohol by volume after dilution (undiluted without a
  method), sugar per 100 ml, acid, volume. An unknown figure says "No
  figure"; lines the figures do not count are named. No verdict.
- **Bottles**: one group per kind of ingredient with a switch per
  ingredient and "n of m at hand"; a search shows the matching
  ingredients as one list. A switch writes the stock record of the shown
  space at once and the drinks follow. "Clear all" acts at once with a
  toast offering Undo.
- **Preferences**: style (Follow System, Light, Dark), units (metric,
  US, imperial), the spaces with their status and which one is shown, and
  **Join a Space** by an invitation link (the link is made in the
  Household app in a browser; a token is asked for only when the
  invitation carries none).
- **About** with the support link and the notice of Bar Assistant's
  data (MIT) as a legal section.

The accent colour is the web app's brown (`#9a4a12`, white on it),
set in the app's one stylesheet; every control a finger taps is at least
44 px.

Not in the native app, on purpose for the first release: the drinks
the user made in the browser (they are in that browser's own database,
not in a space), editing or making drinks, templates and the balance
ranges, Buy Next, batches and shelf life, share links, export and import,
the Household screens (making, sharing and removing a space), the choice
of language, a combined view of several spaces (the app shows one
space; the web app can tick several).

# Build, run, checks

| Command                              | What it does                                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build -w @mixtura/linux`    | Builds the engine and the validators, then esbuild makes `dist/de.nexumia.Mixtura.js` (about 0.9 MB with the seed); `gi://` stays imported. The GitHub address is compiled in           |
| `gjs -m dist/de.nexumia.Mixtura.js`  | Runs it; needs `gjs`, GTK 4, libadwaita 1.5 and the libsoup 3 typelib. `MIXTURA_DATA_DIR=<folder>` uses a folder of recorded data (`scripts/seed.mjs`)                                  |
| `npm test -w @mixtura/linux`         | The session on the real seed and the shared database in memory (13 tests, with the texts); part of `npm run check:mixtura`                                                              |
| `npm run smoke -w @mixtura/linux`    | In real GJS: the fixed vector, random bytes, the file store, and two folders as two devices through sync cycles of the collection `stock` against the fake GitHub on localhost          |
| `npm run interact -w @mixtura/linux` | Drives the app through GTK's Broadway backend with Playwright (18 checks and a wide screenshot) and checks the data files after each step; `SHOTS=<folder>` keeps a screenshot per step |

# Releases

The version lives only in the metainfo's newest stable `<release>`;
`build.mjs` reads it for the About dialog. The first, 0.1.0 (2026-11-21),
was written by hand because the toolkit's `release.py` needs an existing
release. Releases are automatic ([release workflow](../../../.github/workflows/release.yml),
the toolkit's reusable `release.yml` with `tag-prefix` from `release.toml`):
a pull request that changes the native package adds a fragment in
`changelog.d/` (or gets the label `no-changelog`); on Mondays, or by hand
(Actions, Release, app mixtura), the fragments become a pull request
"Release mixtura-v<version>"; merging it tags `mixtura-v<version>`, which
runs CI on that commit. The job `mixtura-release` checks the tag
against the metainfo and attaches both Flatpak bundles to the GitHub
Release of the tag. phosh-apps publishes the newest such release to the
shared Flatpak repository (`flatpak.nexumia.de`; the owner adds the line
`suitably/domus mixtura-v*` to its `apps.txt`, like Emptio's), where the
phone installs and updates it. There is no nightly app
(`de.nexumia.Mixtura.Devel`) yet.

Screenshots for the store: one shot of the main page with the recorded
data of `scripts/seed.mjs`, declared in `release.toml` and taken by the
x86_64 Flatpak job from the built app ([CI for the native apps](../../../docs/development.md#ci-for-the-native-apps)).
Locally, after `npm run build -w @mixtura/linux`, from `packages/linux`:

```sh
node scripts/seed.mjs dist/screenshot-data en
```

```sh
python3 ../../../../phosh-toolkit/scripts/release.py --root . screenshots --out shots -- gjs -m dist/de.nexumia.Mixtura.js
```

# Packaging

`data/` holds the desktop file (`X-Purism-FormFactor=Workstation;Mobile;`),
the metainfo (display length, input controls, the donation link, the
first release), the launcher and the symbolic icon; the icon is the web
app's `icon.svg`, installed under the app id by the manifest
(`de.nexumia.Mixtura.yml`: GNOME runtime, network and display only, no
file access). The licences are installed into
`/app/share/licenses/de.nexumia.Mixtura/<module>/`: the app, the two
crypto libraries, Ajv and fast-deep-equal (the validators the seed and
the stock records pass through; all four kept once in
`packages/gjs/licenses/`), and Bar Assistant's data. CI (`mixtura-linux-check`,
`mixtura-flatpak` for x86_64 and aarch64, `mixtura-release`) uses the same
composite actions as Emptio's jobs
([development](../../../docs/development.md)).

# What is not checked

- **The Flatpak was never built**: `mixtura-flatpak` runs first in CI on
  the pull request. Nobody installed or started a bundle, so the launcher,
  the sandbox and the installed icon are untried (the About dialog shows
  a missing-icon image outside Flatpak, because the icon is not installed
  where the checks run).
- **No phone**: Broadway is not Phosh. Swipe back, the on-screen
  keyboard, touch and the real compositor were not tried; the screens
  were looked at at 360 x 720 and 1000 x 700 only. Start time and
  memory were not measured; the drinks list draws 60 rows first on that
  account, which was not measured either.
- **No sync against a real storage**: the smoke check syncs two folders
  through the fake of GitHub's API; the native app never joined a space
  made by the web app, and a space made by the native app does not exist
  (spaces are made in the Household app). The record format is the same
  code as the web app's and is tested against the memory store only.
- The `gi://` calls have no types; the smoke run, the interaction check
  and the screenshots are what checks them. The status words of a sync
  failure and the German texts were not read by a native speaker.
- The balance figures shown are the engine's; what they mean is the
  assumptions listed in [balance](balance.md#evidence).
- The accent colour is set with `@define-color` and `--accent-*` both;
  only libadwaita 1.5 (here) was seen, not the 1.9 of the GNOME 51
  runtime.
- REUSE compliance is not set up for this repository.
