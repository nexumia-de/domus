---
type: Specification
title: Native Linux app
description: Emptio as a GTK 4 and libadwaita app on GJS for Phosh and the desktop (packages/linux, app id de.nexumia.Emptio) - what it shares with the web app, the pieces GJS lacks and how they are filled (Web Crypto subset, fetch on libsoup, a file store), the pages, joining a space by invitation link, how it is built, run and packaged, what the checks prove and what nobody verified.
tags: [linux, gtk, libadwaita, gjs, phosh, flatpak, native]
generated: { by: claude-code, at: 2026-11-20 }
sources:
  - id: decision
    title: 'Decision: native Linux apps in GJS'
    url: ../../../docs/decisions/native-linux-gjs.md
  - id: gtk-rules
    title: 'phosh-toolkit: agent rules for Phosh GTK apps'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/agents/gtk-app.md
  - id: noble
    title: '@noble/ciphers and @noble/hashes 2.4.0 (MIT), licence read from their LICENSE files'
    url: https://github.com/paulmillr/noble-ciphers
---

# Native Linux app

Decided by the owner on 2026-11-20[^decision]: real libadwaita screens
in GJS, Emptio first. `packages/linux` (`@emptio/linux`) is that app.
The GTK rules of the toolkit[^gtk-rules] apply to it and to nothing else
in Emptio.

# What is shared

Everything but the screens. The native app bundles the engine, the host
package and the web app's screen-free core (`@emptio/app/core`:
`createApp`, the actions, the categories, the status words, the texts in
English and German). So the rules, the records, the sealed files and
the sync loop are the same code, and a native device and a browser are
two devices of one space.

# What GJS lacks

GJS 1.80 has no `crypto`, `fetch`, `structuredClone` and no IndexedDB.
The pieces that fill each (a Web Crypto subset on `@noble/hashes` and
`@noble/ciphers`[^noble], random bytes, `fetch` on libsoup 3, the host
package's file store on GIO, the preferences file, the style helpers and
joining a space by link) were built here first and have been in the
shared package `packages/gjs` (`@nexumia-de/gjs`) since 2026-11-21,
when Mixtura's native app became the second that needs them
([platform pieces](../../../packages/gjs/docs/platform.md)). Emptio
imports them from there; the data lives in `$XDG_DATA_HOME/emptio`, and
the device's language is read from `GLib.get_language_names()`.

# Pages

One `AdwNavigationView` in one window; every page opened from another
is pushed, so swiping back works.

- **List**: groups per priority and one for bought entries with "Clear
  bought"; a row has a check button and opens the entry. The add field,
  the priority and the add button are in a bottom bar. Space name and
  sync status are the header's subtitle. Empty, loading and a store that
  cannot be read are an `AdwStatusPage`.
- **Entry**: name, amount, note, priority, category; Save in the bottom
  bar; Remove at the end of the page, acting at once with a toast
  offering Undo.
- **Categories**: the name edited in place, a switch for a starting
  category, a remove button for an own one, a row to add one. Every row
  is a text field, and a field takes the focus on a tap only, so a drag
  that starts on one scrolls the list
  ([why](../../../packages/gjs/docs/platform.md#text-fields-in-a-scrolling-list));
  the same holds for every text field of the app.
- **Preferences**: style (Follow System, Light, Dark), the spaces with their status, which one is shown, **Leave** per space
  (asks first; [what it does](../../../packages/gjs/docs/platform.md#spaces-in-the-preferences))
  and **Create a Space** (a GitHub repository with a token, or a WebDAV
  folder; the host package's `createSpace`, as in the Household app), and **Join a Space** by an
  invitation link (`joinByLink` of `@nexumia-de/gjs`). The link is made in the Household app
  in a browser; a token is asked for only when the invitation carries
  none. The space is stored and the first cycle says whether the storage
  works; the Household app's connection test before storing is not here.
- **About** with the support link.

Not in the native app: suggestions while typing, the amount in the add
bar, inviting someone to a space (the invitation link is made in the
Household app), the language choice (it follows the device).

# Build, run, checks

| Command                             | What it does                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build -w @emptio/linux`    | esbuild (the shared build of `packages/gjs`) makes one module, `dist/de.nexumia.Emptio.js`; `gi://` stays imported. The GitHub address is compiled in                                                                                                                                                                                                                                                                 |
| `gjs -m dist/de.nexumia.Emptio.js`  | Runs it; needs `gjs`, GTK 4, libadwaita 1.5 and the libsoup 3 typelib. `EMPTIO_DATA_DIR=<folder>` uses a folder of recorded data (`scripts/seed.mjs`)                                                                                                                                                                                                                                                                 |
| `npm test -w @emptio/linux`         | The native texts (German has what English has). The Web Crypto subset and joining by link are tested in `packages/gjs`                                                                                                                                                                                                                                                                                                |
| `npm run smoke -w @emptio/linux`    | In real GJS: the fixed vector, random bytes, the file store, and two folders as two devices through sync cycles against the fake GitHub on localhost                                                                                                                                                                                                                                                                  |
| `npm run interact -w @emptio/linux` | Drives the app through GTK's Broadway backend with Playwright and checks the data files after each step; step 13 drags the categories by touch at 360 × 720 (the proof of the scroll fix is that the drag focused no field; the scroll distance is a control), step 13b clicks a field with the mouse at 1000 × 700, then the shared steps create a space against the fake GitHub, leave it, and leave the last space |

The smoke check and the Broadway session are the shared ones
(`packages/gjs/tooling`), given Emptio's collection `list` and app id.

Packaging is in `data/` and `de.nexumia.Emptio.yml` (GNOME runtime,
network and display only, no file access); CI builds the module, runs
the smoke check and the validators (`emptio-linux-check`) and builds
Flatpak bundles for x86_64 and aarch64 (`emptio-flatpak`), with the same composite actions as Mixtura's jobs. The toolkit's
reusable workflow is not used: it cannot take a file built before
flatpak-builder runs, and it requires REUSE files this repository does
not have.

# Releases

The version lives only in the metainfo's newest stable `<release>`;
`build.mjs` reads it for the About dialog. Later releases are prepared by
the toolkit's `release.py` from `changelog.d/` (`release.toml`); the
first, 0.1.0, was written by hand because `release.py` needs an existing
Releases are automatic ([release workflow](../../../.github/workflows/release.yml),
the toolkit's reusable `release.yml` with `tag-prefix` from `release.toml`):
a pull request that changes the native package adds a fragment in
`changelog.d/` (or gets the label `no-changelog`); on Mondays, or by hand
(Actions, Release, app emptio), the fragments become a pull request
"Release emptio-v<version>"; merging it tags `emptio-v<version>`, which
runs CI on that commit. The
job `emptio-release` checks the tag against the metainfo and attaches
both bundles to the GitHub Release of the tag. phosh-apps publishes the
newest such release to the shared Flatpak repository
(`flatpak.nexumia.de`, `apps.txt` line `nexumia-de/domus emptio-v*`), where
the phone installs and updates it. The tag needs the secret
`RELEASE_TOKEN` (Contents and Pull requests read/write on this
repository); without it a tag can still be pushed by hand. There is no nightly app (`de.nexumia.Emptio.Devel`) yet: it needs a
second app id for the bundle, the desktop file, the metainfo and the
icons.

Screenshots for the store: one shot of the main page with the recorded
data of `scripts/seed.mjs`, declared in `release.toml` and taken by the
x86_64 Flatpak job from the built app ([CI for the native apps](../../../docs/development.md#ci-for-the-native-apps)).
Locally, after `npm run build -w @emptio/linux`, from `packages/linux`:

```sh
node scripts/seed.mjs dist/screenshot-data en
```

```sh
python3 ../../../../phosh-toolkit/scripts/release.py --root . screenshots --out shots -- gjs -m dist/de.nexumia.Emptio.js
```

# What is not checked

- **The Flatpak was built by CI only** (`emptio-flatpak`, x86_64 and
  aarch64, first on 2026-11-20 in pull request 12); nobody installed or
  started a bundle, so the launcher and the sandbox's permissions are
  untried.
- **No phone**: Broadway is not Phosh. Swipe back, the on-screen
  keyboard and the real compositor were not tried. Touch is driven in
  Broadway (step 13, creating and leaving a space), with events made in
  the page, not by a finger on a phone. The scroll defect the owner saw
  on Phosh was not seen there: in Broadway the categories scrolled
  before the fix too, and Broadway has no on-screen keyboard. The proof
  of the fix is the check "the drag focused no field", which fails on
  the code before: the field under the finger took the focus, which on
  Phosh brings up the keyboard; the scroll distance is only a control
  ([why](../../../packages/gjs/docs/platform.md#text-fields-in-a-scrolling-list)).
- Creating a space was driven against the fake GitHub only; a WebDAV
  space is created in Node tests only.
- The `gi://` calls have no types (`packages/gjs/src/gi.d.ts`); the smoke run,
  the interaction check and the screenshots are what checks them.
- The real GitHub and a WebDAV server; a second instance of the app on
  the same folder (the file store expects one process).
- REUSE compliance is not set up for this repository.
- `emptio-release` and its publishing have not run yet: the first tag
  `emptio-v0.1.0` comes after this is merged.
