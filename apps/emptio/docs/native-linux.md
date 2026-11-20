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
`src/platform/` fills each:

| Missing                    | Filled by                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web Crypto                 | `subtle.ts`: the subset the host package calls (HKDF-SHA-256, AES-256-GCM) on `@noble/hashes` and `@noble/ciphers`[^noble]; anything else throws             |
| Random bytes, `randomUUID` | `random.ts`: `/dev/urandom` through GIO                                                                                                                      |
| `fetch`, `Response`        | `soup-fetch.ts`: libsoup 3, no cookies, no cache; no answer rejects with a `TypeError` as in a browser                                                       |
| IndexedDB                  | The host package's file store on `gio-files.ts`: JSON files in `$XDG_DATA_HOME/emptio`, written atomically and readable by the user only (they hold secrets) |
| `structuredClone`          | A JSON copy (what the stores copy is JSON)                                                                                                                   |

The device's language is read from `GLib.get_language_names()`; style
and the shown space are kept in `prefs.json` beside the data.

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
  category, a remove button for an own one, a row to add one.
- **Preferences**: style (Follow System, Light, Dark), the spaces with
  their status and which one is shown, and **Join a Space** by an
  invitation link (`src/join.ts`). The link is made in the Household app
  in a browser; a token is asked for only when the invitation carries
  none. The space is stored and the first cycle says whether the storage
  works; the Household app's connection test before storing is not here.
- **About** with the support link.

Not in the native app: suggestions while typing, the amount in the add
bar, making or sharing a space, removing a space, the language choice
(it follows the device).

# Build, run, checks

| Command                             | What it does                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build -w @emptio/linux`    | esbuild makes one module, `dist/de.nexumia.Emptio.js`; `gi://` stays imported. The GitHub address is compiled in                                      |
| `gjs -m dist/de.nexumia.Emptio.js`  | Runs it; needs `gjs`, GTK 4, libadwaita 1.5 and the libsoup 3 typelib. `EMPTIO_DATA_DIR=<folder>` uses a folder of recorded data (`scripts/seed.mjs`) |
| `npm test -w @emptio/linux`         | The Web Crypto subset against Node's Web Crypto in both directions, the fixed vector of the host package, joining by link                             |
| `npm run smoke -w @emptio/linux`    | In real GJS: the fixed vector, random bytes, the file store, and two folders as two devices through sync cycles against the fake GitHub on localhost  |
| `npm run interact -w @emptio/linux` | Drives the app through GTK's Broadway backend with Playwright and checks the data files after each step                                               |

Packaging is in `data/` and `de.nexumia.Emptio.yml` (GNOME runtime,
network and display only, no file access); CI builds the module, runs
the smoke check and the validators (`emptio-linux-check`) and builds
Flatpak bundles for x86_64 and aarch64 (`emptio-flatpak`). The toolkit's
reusable workflow is not used: it cannot take a file built before
flatpak-builder runs, and it requires REUSE files this repository does
not have.

# What is not checked

- **The Flatpak was built by CI only** (`emptio-flatpak`, x86_64 and
  aarch64, first on 2026-11-20 in pull request 12); nobody installed or
  started a bundle, so the launcher and the sandbox's permissions are
  untried.
- **No phone**: Broadway is not Phosh. Swipe back, the on-screen
  keyboard, touch and the real compositor were not tried.
- The `gi://` calls have no types (`platform/gi.d.ts`); the smoke run,
  the interaction check and the screenshots are what checks them.
- The real GitHub and a WebDAV server; a second instance of the app on
  the same folder (the file store expects one process).
- REUSE compliance and a changelog-driven release as the toolkit
  describes them are not set up for this repository.
