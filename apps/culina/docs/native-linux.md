---
type: Specification
title: Native Linux app
description: Cook's Workbench as a GTK 4 and libadwaita app on GJS for Phosh and the desktop (packages/linux, app id de.nexumia.Culina) - what it shares with the web app, which screens it has (Cook, the one list with the switch and the order, since 2026-11-23, in groups, and a frame's choice of filling, since 2026-11-24) and what version 0.1 leaves out, the ingredient list's alignment, the stock of the shown space, joining a space by invitation link, how it is built, run, released and packaged, what the checks prove and what nobody verified.
tags: [linux, gtk, libadwaita, gjs, phosh, flatpak, native]
generated: { by: claude-code, at: 2026-11-23 }
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

| From                     | What the native app uses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@culina/engine`         | `deriveClassic` (every amount for the portions), `classicsMakeable` (what the stock allows), `techniqueNotes`, the units and rounding                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `@culina/app/core`       | The dish view (`dishView`), the steps (`cookView`), the one filter over the dishes (`entryOfClassic`, `matchesFilter`, `offeredBy`, `parseDishFilter`, the character table), Cook's one list (`dishListView`, `readyKeysOf`, `useUpFrom`, `useUpNote`, `useUpWords`, `parseCookList`) and its groups (`groupRows`), a frame's choice of filling (`asChosen`, `fillingChoices`, `chooseFilling`, `roleLabel`), the readers of `classics.json` and the catalogue, the stock space (`createStockSpace`, the edits that tick and untick), the web app's texts (`strings`) |
| `make-classics.mjs`      | The shipped content (the 48 dishes, the techniques, handling rules and substitutes): the web app's own `classics.json`, compiled into the bundle at build time                                                                                                                                                                                                                                                                                                                                                                                                        |
| the ingredient catalogue | `ingredient-catalogue.json` (USDA FoodData Central, German names), compiled in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `@nexumia-de/hospes`     | Spaces, the file store, the collection loop                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `@nexumia-de/gjs`        | What GJS lacks, joining by link, the preferences file, the build and the checks; new for this app: `language` (the device's language, see below) and `texts` (the texts the three native apps have in common)                                                                                                                                                                                                                                                                                                                                                         |

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

- **Cook** (German "Kochen"; since 2026-11-23, issue 44, as the web app's
  Cook screen, [decision](decisions/cook-screen.md)): the first page.
  Every dish in one list (the number of dishes is the title above it), by
  name in the web app's groups (since 2026-11-24, see
  [Cook's list](#cooks-list)), each with its course, its cuisine and
  whether it has meat or fish, under one boxed list of three rows: the filter **What you feel
  like** (see [the filter](#the-filter-over-the-dishes)), a switch row
  **Only with what I have** and a combo row **Order** (**By name**, **Use
  up first**); see [Cook's list](#cooks-list). The bottom bar has **What
  is there**, the stock. The header's subtitle is the shown space and its
  sync status. Start and **What can I cook** are gone; the cuisine is the
  way to one country.
- **Dish**: the name, the original name, a portions stepper (minus and
  plus, 44 px, 1 to 99, default 2), the ingredients per component and for
  the dish with the amounts for those portions (the engine's numbers,
  rounded once for display), for a frame **Choose what goes in** (see
  [a choice of filling](#a-choice-of-filling)), the method, and **Source** (author, title,
  year, place, licence where there is one, the link, the persons the
  source states or the number we took, how it was checked, and the remarks
  on the source). **Cook step by step** is in the bottom bar.
- **Cooking**: the dish as the dish page shows it, with its choice of
  filling; one step at a time with "Step 3 of 8", where it comes from,
  the text, the lines it uses with their amounts, time and temperature as
  the source gives them, a progress bar, and the note of a technique the
  first time it comes (what to watch, behind a tap why and the sources).
  Back and Next are 56 px high in a 1:2 grid in the bottom bar, "Finish"
  on the last step. The screen is kept on while the page is shown
  (`Gtk.Application.inhibit`; nobody saw it work, see below).
- **What is there** (pushed from Cook, so swiping back returns): the stock of the shown space: what is at hand with a
  switch each, and a search over the ingredient catalogue (all names and
  aliases, in both languages, folded as in the web app). A switch writes
  the shared collection `stock` at once with the web app's own edits
  (`tickEdit`, `untickEdit`: fields other apps wrote survive); an untick
  offers Undo.
- **Preferences**: style (Follow System, Light, Dark), the spaces with their status, which one is shown, **Leave** per space
  (asks first; [what it does](../../../packages/gjs/docs/platform.md#spaces-in-the-preferences))
  and **Create a Space** (a GitHub repository with a token, or a WebDAV
  folder; the host package's `createSpace`, as in the Household app),
  and **Join a Space** by an invitation link (made in the Household app in a browser; a token is
  asked for only when the invitation carries none).
- **About** with the support link and a legal section for the data.

The accent colour is Beet (`#a02b45`, white on it) set in the app's one
stylesheet ([design](design.md)); every control a finger taps is at least
44 px.

## Cook's list

The web app's one list (`dishListView`, [behaviour](behaviour.md#cook)),
asked through `src/session.ts` (`cookView`, `cookList`, `setCookList`);
nothing of it is judged here:

- **Only with what I have** keeps the dishes whose every required line the
  stock covers today: the web app's `readyKeysOf`, the engine's
  `classicsMakeable` at threshold 0, the same question as the web app's
  switch and its random pick. With nothing ticked, the list gives way to
  "Nothing is ticked yet …" and **Tick what is there**, which opens the
  stock. The finder's own choices of the old page ("lacking at most",
  the nearest dishes) are not on Cook, as in the web app.
- **Use up first** puts the dishes that use a stock item with a use-by
  date first, in the engine's one ranking (the web app's `useUpFrom`:
  `find` at the wide threshold and `useUpMarks`), the rest by name; such a
  row adds "uses the Milk with 1 day left" and, for a dish that lacks
  lines, "lacks 2" (`useUpWords`). The dates are the ones the web app
  wrote: `itemsFromRecords` reads a record's `bestBefore` as the item's
  use-by, and the native app shows a record when its key is a catalogue
  ingredient, which is also the id the web app keeps for a catalogue food
  copied into its notebook. The native app writes no dates itself, so on a
  device whose stock only it ticked the order places nothing and the quiet
  line "No item has a use-by date yet. …" says so (the web app's text;
  the date is added on the item in the web app).
- **Show all**, beside the count or in place of an empty list, drops the
  filter's choices and "Only with what I have"; the order stays.
- Both choices are kept in the preferences file under the web app's key
  `culina.cookList` (`{ have, order }`, `parseCookList`: anything
  unreadable falls back field by field). The finder's old key
  `culina.cook` is no longer read or written.
- The finder's answers are asked once per stock and day (the stock list is
  replaced when the records change), not on every redraw for a status.

- **Groups** (since 2026-11-24, as the web app's, [behaviour](behaviour.md#cook)):
  in the order by name the session's `cookView` also gives the rows in
  the web app's groups (`groupRows` of `src/browse/groups.ts`, unchanged):
  the frames first (**Put together**), then the courses in the web app's
  order (main course, soup, starter, side dish, sauce, breakfast, snack,
  dessert, baking). Each group is an `AdwPreferencesGroup` titled with its
  name and count, "Main course · 37 dishes"; above them an empty
  preferences group keeps the count of the whole list as its title, with
  **Show all** beside it. An empty group is not shown; with one group
  left (a course that no frame has, such as soup) and in the order **Use
  up first** the list is one group under the count, as before. In a
  course's group the line under a dish drops the course, which the title
  says; in the frames group it keeps it (`rowLine` in
  `src/dish-choices.ts`). The group names are the web app's
  (`strings.browse.groupFrames`, `groupNoCourse`, the course names).

The texts are the web app's (`strings.cook`: title, switch, order,
"Use up first", the empty state, the note).

## A choice of filling

A frame ([format](classic-format.md#a-frame)) may have slots with
alternatives (the refried beans in place of the chicken). Since
2026-11-24 the dish page and the cook page are given the dish as it is
cooked, through the session's `dish(id)`: the web app's `asChosen`
(`src/classics/choices.ts`: the cook's choices, then the engine's
`withoutAlternatives`). Under the ingredients an `AdwPreferencesGroup`
**Choose what goes in** (the web app's `fillingHeading`) holds an
`AdwComboRow` per slot with alternatives, titled with the role's name
(the web app's `roleLabel`: "Main element", "Sauce", "Starch"), listing
the recipes that can fill the slot, the one in the dish first and
selected (`session.fillings`, the web app's `fillingChoices`). Choosing
one calls the web app's `chooseFilling` and draws the page again: the
ingredients, the method, the source (the frame's parts) and the line
"with meat or fish" in the header follow the dish as chosen; the group of
combo rows is the same widget after the redraw, so the row keeps its
place. **Cook step by step** reads the same choice. The choice lasts
while the app runs and is not stored, as on the web; the native app has
no Keep. Nothing of the choice is written here: the module is the web
app's, exported from `@culina/app/core`.

**A defect fixed with it.** Before, the dish page and the cook page read
the full base (`classics()`), so a frame with an alternative listed the
alternative's recipe among its parts with its ingredients, and its steps
in the method and while cooking (the burrito: the guacamole beside the
lime sour cream). The list on Cook was right (`dishClassics()` drops the
alternatives). Found by reading the code and a run of the web app's
`dishView` on the full burrito in Node, not on a screen.

## The filter over the dishes

The web app's one filter ([behaviour](behaviour.md)): the native app makes
the web app's entry of each shipped dish (`entryOfClassic`, with the
catalogue as the lookup of the character rules) and keeps those that pass
`matchesFilter`, inside `dishListView`; nothing of the rule is written
here (`src/session.ts`: `entries`, `offered`, `dishFilter`,
`setDishFilter`, `cookView`). On screen it is one
`AdwExpanderRow` **What you feel like**, closed by default, whose
subtitle names the choices made ("Anything" when none): a combo row each
for **What it is like** (the characters), **Course** and **Cuisine**,
offering only values some dish has (`offeredBy`, in the character table's,
the courses' and the countries' order) and a kept value no dish has any
more, so that it can be dropped; and a switch row each for **Without meat
and fish** and **Only with every amount given**. The texts are the web
app's (`strings.browse`). There is no origin row: every dish here is a
shipped one (the notebook is not in the native app). When something is
chosen, **Show all** stands beside the list's title, and in the place of
an empty list.

The filter is kept in the preferences file under the web app's key
(`culina.dishes`, `parseDishFilter`), like the space and Cook's choices; a
change tells every open page. The finder's kept `country` and `meatFree`
of an earlier version are not read and not moved into the filter.

`src/dish-choices.ts` holds what the rows offer and say without a widget
(the choices of each list, the summary, the line under a dish) and is
tested in Node; `src/ui/dish-filter.ts` is the row.

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
  `{ present: true }` and keeps what other apps wrote; a use-by date the
  web app wrote is read for the order "Use up first"), and "start from
  one ingredient" ("What uses <ingredient>").
- The search by name above Cook's list (the web app has one; the filter
  and the switch are here).
- The Notebook (own and shipped components and dishes for editing), and
  with it shipped components in a list.
- The choice of language (the device decides), a combined view of several
  spaces (one is shown), the Household screens.

# Build, run, checks

| Command                             | What it does                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build -w @culina/linux`    | Generates the validators, techniques and substitutes, then esbuild makes `dist/de.nexumia.Culina.js` (about 1.6 MB with the content); `gi://` stays imported                                                                                                                                                                                                                                                                      |
| `gjs -m dist/de.nexumia.Culina.js`  | Runs it; needs `gjs`, GTK 4, libadwaita 1.5 and the libsoup 3 typelib. `CULINA_DATA_DIR=<folder>` uses a folder of recorded data (`scripts/seed.mjs`)                                                                                                                                                                                                                                                                             |
| `npm test -w @culina/linux`         | The session on the real content and the shared database in memory (the filter, Cook's switch and order against the web app's `readyKeysOf` and `useUpFrom`, a `bestBefore` the web app wrote, the kept choices, the day the answers are kept for, Cook's groups, a frame as it is cooked and its choice of filling), the filter's choices and words, the group headings, and the texts (23 tests); part of `npm run check:culina` |
| `npm run smoke -w @culina/linux`    | In real GJS: the fixed vector, random bytes, the file store and two folders as two devices through sync cycles of the collection `stock` against the fake GitHub on localhost (17 checks)                                                                                                                                                                                                                                         |
| `npm run interact -w @culina/linux` | Drives the app through GTK's Broadway backend with Playwright and checks the data files after each step (32 checks of its own, the 10 shared create-and-leave steps of the Spaces group and one at 1000 x 700; screenshots at 360 x 720 and 1000 x 700 to look at); `SHOTS=<folder>` keeps a screenshot per step                                                                                                                  |

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
`nexumia-de/domus culina-v*` to its `apps.txt`, as for the other two). There
is no nightly app yet.

Screenshots for the store: one shot of the main page with the recorded
data of `scripts/seed.mjs`, declared in `release.toml` and taken by the
x86_64 Flatpak job from the built app ([CI for the native apps](../../../docs/development.md#ci-for-the-native-apps)).
Locally, after `npm run build -w @culina/linux`, from `packages/linux`:

```sh
node scripts/seed.mjs dist/screenshot-data en
```

```sh
python3 ../../../../phosh-toolkit/scripts/release.py --root . screenshots --out shots -- gjs -m dist/de.nexumia.Culina.js
```

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

- **Cook** (2026-11-23) was run in GTK 4.14 and libadwaita 1.5 through
  Broadway; the coordinates of `scripts/interact.mjs` are read from its
  screenshots. The checks see that the switch, the order and "Tick what
  is there" change the screen and the kept choices; which dishes are
  shown is proven in Node against the web app's functions, not read off
  the screen. "Use up first" was seen only with the recorded date of
  `scripts/seed-entry.ts` (run by `scripts/seed.mjs`: the milk,
  tomorrow), never with dates a real web app wrote into a synced space.
  German was looked at once (the order's popover); "Show all" on Cook
  was not clicked by the script.
- **Cook does not redraw by itself when the day changes.** The session
  asks the finder again for a new day (pinned by the session test "the
  same stock on the next day …"), but the page only asks the session on
  its next event (a sync status, a tick, a choice, a page popped back
  to); left open over midnight, its days left are yesterday's until then.

- **The choice of filling and Cook's groups (2026-11-24) were never on a
  screen.** The container they were built in has no display, no `gjs`
  and no Broadway, so neither the app nor `npm run smoke` and `npm run
interact` were run; the bundle was built (`npm run build`) and the
  types checked. What is proven is in Node
  (`test/session.test.ts`: "a frame is shown as it is cooked …", "a slot
  with alternatives offers its recipes …", "Cook's list by name stands in
  the web app's groups …"; `test/dish-choices.test.ts`: the line under a
  row in a group, the group headings): what the pages are given, not the
  combo row, its popover, the redraw after a choice, the group headings
  on screen or their size at 360 px. `scripts/interact.mjs` clicks the
  first dish at coordinates read from screenshots of the flat list; with
  the count above the groups the first dish now stands lower, so
  `FIRST_DISH` very likely has to be read again from a new screenshot
  before the next run. German was not looked at. The two new session
  tests fail on the code before the change because `session.dish`,
  `session.fillings`, `session.chooseFilling` and `cookView`'s `groups`
  did not exist; the first half of "a frame is shown as it is cooked"
  (the full burrito lists the guacamole) passes before and after and
  shows the defect.
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
- Whether the engine's order of "Use up first" suits a cook is the
  engine's and was not judged here: a dish that lacks something can stand
  above a complete one (its row says "lacks N").
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
