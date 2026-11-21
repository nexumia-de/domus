---
type: Specification
title: Native Linux app
description: Cook's Notebook as a GTK 4 and libadwaita app on GJS for Phosh and the desktop (packages/linux, app id de.nexumia.Culina) - what it shares with the web app, which screens it has and what version 0.1 leaves out, the ingredient list's alignment, the stock of the shown space, joining a space by invitation link, how it is built, run, released and packaged, what the checks prove and what nobody verified.
tags: [linux, gtk, libadwaita, gjs, phosh, flatpak, native]
generated: { by: claude-code, at: 2026-11-21 }
sources:
  - id: decision
    title: 'Decision: native Linux apps in GJS'
    url: ../../../docs/decisions/native-linux-gjs.md
  - id: gtk-rules
    title: 'phosh-toolkit: agent rules for Phosh GTK apps'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/agents/gtk-app.md
  - id: mixtura
    title: 'Mixtura: native Linux app (the model this one follows)'
    url: ../../mixtura/docs/native-linux.md
  - id: platform
    title: 'gjs: platform pieces (shared with Emptio and Mixtura)'
    url: ../../../packages/gjs/docs/platform.md
---

# Native Linux app

The third native app of the repository[^decision], after Emptio's and
Mixtura's[^mixtura]: real libadwaita screens in GJS, built on 2026-11-21.
`packages/linux` (`@culina/linux`) is that app, visible name **Cook's
Notebook**, release 0.1.0. The GTK rules of the toolkit[^gtk-rules] apply
to it and to nothing else in Culina.

# What is shared

Everything but the screens. The native app bundles the engine
(`@culina/engine`), the web app's screen-free core (`@culina/app/core`),
the host package and the web app's shipped content:

| From                      | What the native app uses                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@culina/engine`          | `deriveClassic` (every amount for the portions), `classicsMakeable` (what the stock allows), `techniqueNotes`, the units and rounding                                                                                                                                         |
| `@culina/app/core`        | The dish view (`dishView`), the steps (`cookView`), the lists by country, the finder for the classics (`findClassics`, `classicRow`), the readers of `classics.json` and the catalogue, the filters, the stock space (`createStockSpace`, the edits that tick and untick), the web app's texts (`strings`) |
| `make-classics.mjs`       | The shipped content (the 48 dishes, the techniques, handling rules and substitutes): the web app's own `classics.json`, compiled into the bundle at build time                                                                                                                |
| the ingredient catalogue  | `ingredient-catalogue.json` (USDA FoodData Central, German names), compiled in                                                                                                                                                                                               |
| `@nexumia-de/hospes`      | Spaces, the file store, the collection loop                                                                                                                                                                                                                                  |
| `@nexumia-de/gjs`         | What GJS lacks, joining by link, the preferences file, the build and the checks; new for this app: `language` (the device's language, see below) and `texts` (the texts the three native apps have in common)                                                                |

`@culina/app/core` (`packages/app/src/core.ts`) is new: the files it
exports were in the web app already and have no DOM. The one change in
the web code is `shared-stock/items.ts` (`itemsFromRecords`), taken out of
`notebook/stock.ts`, which now calls it with its own resolver, so the web
screens behave as before. `src/session.ts` of the native package joins
these pieces (the shown space, the stock, what it allows, ticking, the
filters) and imports no `gi://`, so Node tests run it; that the tests
import the core in plain Node also shows that it needs no DOM.

**The language.** The web code chooses its texts and the decimal mark once,
when its modules load, from `navigator.languages`. GJS has no `navigator`,
so `@nexumia-de/gjs/language` defines one from the device's locale and is
imported first in `main.ts` (a bundle evaluates its modules in import
order). The app's own texts follow the same rule, English or German; the
web app's choice "English, German or follow the device" is not offered
here, the device decides.

# Screens

One `AdwNavigationView` in one window; every page opened from another is
pushed, so swiping back works. Texts are English and German. The names of
dishes, ingredients and notes come in both languages from the data.

- **Start**: the classics by country (Germany, Italy, France, Spain, each
  with its number of dishes). The bottom bar has **What can I cook**. The
  header's subtitle is the shown space and its sync status.
- **Country**: the dishes with their course and whether they have meat or
  fish.
- **Dish**: the name, the original name, a portions stepper (minus and
  plus, 44 px, 1 to 99, default 2), the ingredients per component and for
  the dish with the amounts for those portions (the engine's numbers,
  rounded once for display), the method, and **Source** (author, title,
  year, place, licence where there is one, the link, the persons the
  source states or the number we took, how it was checked, and the remarks
  on the source). **Cook step by step** is in the bottom bar.
- **Cooking**: one step at a time with "Step 3 of 8", where it comes from,
  the text, the lines it uses with their amounts, time and temperature as
  the source gives them, a progress bar, and the note of a technique the
  first time it comes (what to watch, behind a tap why and the sources).
  Back and Next are 56 px high in a 1:2 grid in the bottom bar, "Finish"
  on the last step. The screen is kept on while the page is shown
  (`Gtk.Application.inhibit`; nobody saw it work, see below).
- **What can I cook**: the classics the stock of the shown space allows,
  judged by the engine's `classicsMakeable`, with the filters of the web
  app (how much may lack: complete only to 3; country; without meat and
  fish), kept in the preferences file. A row says country and status
  ("complete", "lacks 1"), what it needs and which stand-ins the engine
  names. When none fits, the nearest three are named. The stock is in the
  bottom bar.
- **What is there**: the stock of the shown space: what is at hand with a
  switch each, and a search over the ingredient catalogue (all names and
  aliases, in both languages, folded as in the web app). A switch writes
  the shared collection `stock` at once with the web app's own edits
  (`tickEdit`, `untickEdit`: fields other apps wrote survive); an untick
  offers Undo.
- **Preferences**: style (Follow System, Light, Dark), the spaces with
  their status and which one is shown, and **Join a Space** by an
  invitation link (made in the Household app in a browser; a token is
  asked for only when the invitation carries none).
- **About** with the support link and a legal section for the data.

The accent colour is Beet (`#a02b45`, white on it) set in the app's one
stylesheet ([design](design.md)); every control a finger taps is at least
44 px.

## The ingredient list

All names stand in one column: the amount is a cell of its own in bold,
as wide as the longest amount of the list (a size group), and **a line
without an amount keeps an empty amount cell**. The web app draws such a
line as its name alone from the left edge
([design](design.md#classics-screens), `.recipe-line-bare`). The owner's
wish for consistent alignment was reported first as a decision and then
corrected to an open question; here the column is natural (an empty label
in the size group), so it was chosen. To follow the web instead, drop the
empty cell in `src/ui/lines.ts`: one line.

# Stock

The stock is the collection `stock` of the shown space, the same
collection Mixtura and Emptio keep ([decision](decisions/stock-in-spaces.md)).
Culina's native app shows a record when its key is an ingredient of the
shipped catalogue; the web app shows a record when its key is an
ingredient of the notebook. Culina's lemon and Mixtura's lemon are two
records, as the decision says: a bottle ticked in Drink Builder is not
"there" for the classics unless its key is a catalogue id. The native app
has no notebook, so the user's own ingredients and components of the web
app are not known to it.

# What version 0.1 leaves out

On purpose, for the first release:

- The notebook: your own components, dishes, ratios, versions, tasting
  notes, the editor, export, import, Cooklang, the meal-prep and
  shelf-life figures. They live in the browser's own database and are not
  in a space, so the native app cannot see them.
- Nutrition per portion, the handling notes beside a step and the
  substitutes ("Instead") of the web app's dish and cooking screens.
- "I know this": the technique notes are shown the first time each comes
  in a dish and not marked as learned (there is no skills store here), so
  a note comes again in the next dish; "Keep in my notebook".
- Amounts, dates and storage places of a stock item (the native app writes
  `{ present: true }` and keeps what other apps wrote), the use-up list
  and "start from one ingredient".
- The choice of language (the device decides), a combined view of several
  spaces (one is shown), the Household screens.

# Build, run, checks

| Command                              | What it does                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run build -w @culina/linux`     | Generates the validators, techniques and substitutes, then esbuild makes `dist/de.nexumia.Culina.js` (about 1.6 MB with the content); `gi://` stays imported                         |
| `gjs -m dist/de.nexumia.Culina.js`   | Runs it; needs `gjs`, GTK 4, libadwaita 1.5 and the libsoup 3 typelib. `CULINA_DATA_DIR=<folder>` uses a folder of recorded data (`scripts/seed.mjs`)                                |
| `npm test -w @culina/linux`          | The session on the real content and the shared database in memory, and the texts; part of `npm run check:culina`                                                                     |
| `npm run smoke -w @culina/linux`     | In real GJS: the fixed vector, random bytes, the file store and two folders as two devices through sync cycles of the collection `stock` against the fake GitHub on localhost        |
| `npm run interact -w @culina/linux`  | Drives the app through GTK's Broadway backend with Playwright and checks the data files after each step; `SHOTS=<folder>` keeps a screenshot per step                                |

# Releases

The version lives only in the metainfo's newest stable `<release>`;
`build.mjs` reads it for the About dialog. The first, 0.1.0 (2026-11-21),
was written by hand because the toolkit's `release.py` needs an existing
release; later ones are prepared from `changelog.d/` (`release.toml`,
`tag-prefix = "culina-v"`):

```sh
python3 ../phosh-toolkit/scripts/release.py --root apps/culina/packages/linux prepare
```

then merge, and push the tag `culina-v<version>` on the merged commit. CI
runs on that commit, and the job `culina-release` checks the tag against
the metainfo and attaches both Flatpak bundles to the GitHub Release of
the tag. phosh-apps publishes the newest such release to the shared
Flatpak repository (`flatpak.nexumia.de`; the owner adds the line
`suitably/domus culina-v*` to its `apps.txt`, as for the other two). There
is no nightly app yet.

# Packaging

`data/` holds the desktop file (`X-Purism-FormFactor=Workstation;Mobile;`),
the metainfo, the launcher and the symbolic icon; the icon is the web
app's `icon.svg`, installed under the app id by the manifest
(`de.nexumia.Culina.yml`: GNOME runtime, network and display only, no file
access). The licences are installed into
`/app/share/licenses/de.nexumia.Culina/<module>/`: the app, the two
crypto libraries, Ajv and fast-deep-equal (all four kept once in
`packages/gjs/licenses/`; the ingredient catalogue passes through Ajv's
validators), and `culina-data/NOTICE`, the notice of the built-in data
(USDA FoodData Central and Wikidata CC0, the named sources of the
classics, the textbooks behind the notes). CI: `culina-linux-check`,
`culina-flatpak` (x86_64 and aarch64), `culina-release`.

# What is not checked

- **The Flatpak was never built**: `culina-flatpak` runs first in CI on
  the pull request. Nobody installed or started a bundle, so the launcher,
  the sandbox and the installed icon are untried.
- **No phone**: Broadway is not Phosh. Swipe back, the on-screen keyboard,
  touch, the kept-awake screen and the real compositor were not tried; the
  screens were looked at at 360 x 720 and 1000 x 700 only. Start time and
  memory were not measured (the bundle parses 450 KB of catalogue and
  validates each entry at start; not timed on a phone).
- **No sync against a real storage**: the smoke check syncs two folders
  through the fake of GitHub's API; the native app never joined a space
  made by the web app. The record format is the same code as the web
  app's and is tested against the memory store only.
- The `gi://` calls have no types; the smoke run, the interaction check
  and the screenshots are what checks them. The German texts were not read
- Whether the engine's order of "what can I cook" suits a cook is the
  engine's and was not judged here: a complete dish can be listed after
  one that lacks something.
- The accent colour is set with `@define-color` and `--accent-*` both;
  only libadwaita 1.5 (here) was seen, not the 1.9 of the GNOME 51
  runtime.
- The shipped classics come from books of 1877 to 1907 and one Wikibooks
  page; four dishes carry the note "rights reserved; to be checked by the
  owner" in their source licence, and the technique notes cite open
  textbooks that are mostly CC BY-NC-SA. The repository decided that for
  the web app ([sources licence](decisions/sources-licence.md)); a public
  Flatpak repository is another way of distributing it, and the owner may
  want to look again before the first tag.
- REUSE compliance is not set up for this repository.
