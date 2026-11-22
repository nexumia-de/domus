---
type: Specification
title: Behaviour
description: Navigation, URLs, state across reloads, interaction rules and flows of the Mixtura app at 360 px and desktop size, with the index of every screen, the issue that builds it and its mock-up.
tags: [behaviour, ui, navigation, pwa]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mockups
    title: 'docs/mockups/: static HTML pages with one shared CSS file; screenshots of the mock-ups in docs/screenshots/mockups/, of the app in docs/screenshots/ ([overview](screenshots.md)) (Playwright, Chromium, 360x720 and 1200x800, scale 2)'
---

# Behaviour

What the app does, screen by screen, so the app issues can be built from
the documents alone. Audience: an experienced bartender who wants the
numbers and the spec, fast; there is no tutorial and no first-run tour.
Colours, type, layout rules, copy rules and the review checklist are in
[design](design.md); every fixed text in [UI strings](ui-strings.md).
What the app can compute is fixed by the [data model](data-model.md),
[balance](balance.md), [units](units.md) and
[how bartenders work](bartender-practice.md#what-mixtura-should-do);
the screens show those figures and invent none.

Screens are specified in three files, each entry with purpose, content,
actions, empty, error and offline states, and what is stored versus
derived:

- [Browse and read](screens-browse.md): templates, drinks, filters,
  spec, swap.
- [Own specs](screens-specs.md): editor, ingredient picker, prepared
  ingredients, versions, riffs and family.
- [Stock and settings](screens-stock-settings.md): stock, Buy Next,
  settings, export and import, About.

# Screen index

Goals are those of the [roadmap](roadmap.md). Mock-ups open in a browser
without a server ([index](mockups/index.html)).

| Screen                                                           | Goal    | Built by                                                                                                                                                                                | Mock-up and screenshots                                                                                                                      |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell, navigation                                            | 3       | [#17](https://github.com/nexumia-de/mixtura/issues/17)                                                                                                                                  | all below                                                                                                                                    |
| [Templates overview](screens-browse.md#templates-overview)       | 3       | [#18](https://github.com/nexumia-de/mixtura/issues/18)                                                                                                                                  | text only                                                                                                                                    |
| [Template detail](screens-browse.md#template-detail)             | 3       | [#18](https://github.com/nexumia-de/mixtura/issues/18)                                                                                                                                  | text only                                                                                                                                    |
| [Drinks list](screens-browse.md#drinks-list)                     | 3       | [#18](https://github.com/nexumia-de/mixtura/issues/18)                                                                                                                                  | [html](mockups/drinks-list.html) · [360](screenshots/mockups/drinks-list-360x720.png) · [1200](screenshots/mockups/drinks-list-1200x800.png) |
| [Filters](screens-browse.md#filters)                             | 3, 5, 6 | [#18](https://github.com/nexumia-de/mixtura/issues/18), makeable [#33](https://github.com/nexumia-de/mixtura/issues/33), alcohol [#37](https://github.com/nexumia-de/mixtura/issues/37) | [html](mockups/filters.html) · [360](screenshots/mockups/filters-360x720.png) · [1200](screenshots/mockups/filters-1200x800.png)             |
| [Spec with balance panel](screens-browse.md#spec)                | 3       | [#19](https://github.com/nexumia-de/mixtura/issues/19); servings and batch [#52](https://github.com/nexumia-de/mixtura/issues/52)                                                       | [html](mockups/spec.html) · [360](screenshots/mockups/spec-360x720.png) · [1200](screenshots/mockups/spec-1200x800.png)                      |
| [Swap mode](screens-browse.md#swap-mode)                         | 3       | [#20](https://github.com/nexumia-de/mixtura/issues/20)                                                                                                                                  | [html](mockups/swap.html) · [360](screenshots/mockups/swap-360x720.png) · [1200](screenshots/mockups/swap-1200x800.png)                      |
| [Spec editor](screens-specs.md#spec-editor)                      | 4       | [#25](https://github.com/nexumia-de/mixtura/issues/25)                                                                                                                                  | [html](mockups/editor.html) · [360](screenshots/mockups/editor-360x720.png) · [1200](screenshots/mockups/editor-1200x800.png)                |
| [Ingredient picker](screens-specs.md#ingredient-picker)          | 4       | [#25](https://github.com/nexumia-de/mixtura/issues/25)                                                                                                                                  | text only                                                                                                                                    |
| [Prepared ingredient](screens-specs.md#prepared-ingredient)      | 4       | [#25](https://github.com/nexumia-de/mixtura/issues/25)                                                                                                                                  | text only                                                                                                                                    |
| [Save and notes](screens-specs.md#save-version-and-notes)        | 4       | [#26](https://github.com/nexumia-de/mixtura/issues/26)                                                                                                                                  | text only                                                                                                                                    |
| [Versions and diff](screens-specs.md#versions-and-diff)          | 4       | [#26](https://github.com/nexumia-de/mixtura/issues/26)                                                                                                                                  | text only                                                                                                                                    |
| [Riff and family](screens-specs.md#riff-and-family)              | 4       | [#27](https://github.com/nexumia-de/mixtura/issues/27)                                                                                                                                  | text only                                                                                                                                    |
| [Stock](screens-stock-settings.md#stock)                         | 5       | [#30](https://github.com/nexumia-de/mixtura/issues/30), engine [#31](https://github.com/nexumia-de/mixtura/issues/31), dates [#37](https://github.com/nexumia-de/mixtura/issues/37)     | [html](mockups/stock.html) · [360](screenshots/mockups/stock-360x720.png) · [1200](screenshots/mockups/stock-1200x800.png)                   |
| [Buy Next](screens-stock-settings.md#buy-next)                   | 5       | [#33](https://github.com/nexumia-de/mixtura/issues/33), engine [#32](https://github.com/nexumia-de/mixtura/issues/32)                                                                   | [html](mockups/buy-next.html) · [360](screenshots/mockups/buy-next-360x720.png) · [1200](screenshots/mockups/buy-next-1200x800.png)          |
| [Settings](screens-stock-settings.md#settings)                   | 3       | [#17](https://github.com/nexumia-de/mixtura/issues/17)                                                                                                                                  | text only                                                                                                                                    |
| [Export and import](screens-stock-settings.md#export-and-import) | 4       | [#28](https://github.com/nexumia-de/mixtura/issues/28)                                                                                                                                  | text only                                                                                                                                    |
| [About](screens-stock-settings.md#about)                         | 3       | [#17](https://github.com/nexumia-de/mixtura/issues/17), install guide [#22](https://github.com/nexumia-de/mixtura/issues/22)                                                            | text only                                                                                                                                    |

Not specified here (goals 6 and 7 beyond the alcohol filters): cost per
drink ([#39](https://github.com/nexumia-de/mixtura/issues/39)), menus
([#40](https://github.com/nexumia-de/mixtura/issues/40)), affinities
([#41](https://github.com/nexumia-de/mixtura/issues/41)), non-alcoholic
templates and shelf-life screens beyond the date fields
([#34](https://github.com/nexumia-de/mixtura/issues/34),
[#37](https://github.com/nexumia-de/mixtura/issues/37)). The structure
leaves room: a cost line fits the spec screen's meta list, menus are a
fifth destination or a list under Drinks, affinities a section of the
ingredient detail, with no change to the shell.

The mock-ups use illustrative content. Their balance figures are the
worked Daiquiri example of [balance](balance.md#worked-examples) (ABV
18.3 %, sugar 10.8 g/100 ml, acid 1.03 %) and the ranges are the
model's, **not yet verified against a source**. Names such as Mai Tai in
Buy Next are placeholders, not seed data. The screenshots were made with
Playwright (Chromium) at the two sizes; the screenshot issue
([#21](https://github.com/nexumia-de/mixtura/issues/21)) replaces that
by the tests of the repository.

# Navigation

**One structure** (owner question Q2 in [design](design.md#open-questions)):

- **Three top-level destinations**, always in the same order: **Drinks**
  (the list of all specs, the home), **Templates**, **Stock** (with the
  second view **Buy Next**). Below 840 px they are a bottom navigation
  bar (56 px high, icon and label); from 840 px a rail on the left
  under the header.
- **The header** is the shared frame (`@nexumia-de/hospes/frame`,
  [frame](../../../packages/host/docs/frame.md), [decision](../../../docs/decisions/shared-shell.md)):
  one bar across the window with the page title (the page's one `h1`),
  a back arrow on a pushed screen, the page's own action (Share on a
  drink of your own, New Drink on the lists), a small **sync icon** and
  **Settings**. The sync icon shows the worst state of the spaces that
  count on Stock; a tap says the details in a toast; a slim banner with
  Retry appears only on a real error (offline is not one). The body
  starts with content, never repeats the title. **Settings** is a
  pushed page (Back returns to where it was opened; the bar is hidden
  on a phone) and is not in the bar.
- **Pushed screens** open on top of a destination: spec, swap mode,
  editor, versions, family, template detail, ingredient picker. A pushed
  screen replaces the bottom navigation with its own action bar
  ([design](design.md#layout-rules)) and has a back button at the top
  left.
- **Two panes from 840 px.** Drinks, Templates and Stock show a list pane
  (380 px) and a detail pane; selecting a row fills the detail pane
  without leaving the screen. Below 840 px the detail replaces the list.
  A screen opened by URL at desktop size shows the list with the
  detail selected.
- **Back stack.** Each tap into a pushed screen adds one entry to the
  history; the destinations are not pushed on top of each other:
  switching destination keeps the destination's own stack, so returning
  to Drinks shows the spec the user left. Tapping the active destination
  pops its stack to the list. Filters and sheets are not history
  entries on desktop; on a phone a sheet is one entry, so back closes it.
- **Back button, gesture.** The header back button, the browser back
  button and the installed app's system back gesture all go one entry
  back in the history. At the first entry of a destination the system
  back gesture leaves the app (nothing intercepts it). Swap mode and the
  editor intercept back only when they hold changes: back then keeps the
  draft (editor) or drops the swap (swap mode, it was never saved) and
  shows a toast with Undo (the shared toast: 5 s, 8 s when it has Undo); no confirm dialog.
- **Deep links.** Every screen has a URL; the app uses hash routes so
  static hosting needs no rewrite rules (Q5). The URL is the shareable
  address of the screen and restores it on open.

| Screen | URL |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------- |
| Drinks list | `#/drinks?q=…&template=…&method=…&base=…&strength=…&makeable=yes                                                               | substitute | one&alcohol=none` |
| Spec | `#/drinks/<spec id>` (opens the newest version; may carry the list's `q` and filters so the list pane stays as it was) |
| A named version | `#/drinks/<spec id>/v/<n>` |
| Swap mode | `#/drinks/<spec id>?swap=<slot>:<ingredient>:<amount>,…` |
| Spec editor | `#/drinks/<spec id>/edit`, new drink `#/drinks/new` |
| Versions | `#/drinks/<spec id>/versions`, diff `…/versions?a=2&b=3` |
| Family | `#/drinks/<spec id>/family` |
| Templates | `#/templates`, detail `#/templates/<template id>` |
| Stock | `#/stock`, search and show `#/stock?q=…&show=in`; sheets `?sheet=spaces`, `?sheet=batches&ing=<id>` |
| Buy Next | `#/stock/buy-next`, `?strict=1` without substitutes, `?open=<ingredient id>` for the unlocked drinks |
| Settings | `#/settings`, export and import `#/settings/data`; the Household row leaves the app for `../` (spaces and sync are set up there) |
| Shared drink | `#/share/<payload>` opens once and becomes `#/share` while the preview shows; see [export format](export-format.md#share-link) |
| About | `#/about` |

The addressed id is a spec's `lineageId`, so a link keeps working when a
new version is saved. A swap in the URL is applied on open and is not
stored. A link to something that does not exist (deleted spec, template
from a newer seed) shows the "Not found" status page with a button back
to the list, never an empty screen.

# State and reload

| State                                           | Where it lives                                                                                      | After a reload                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Screen and its parameters, filters, query, swap | URL                                                                                                 | Restored from the URL                                                              |
| Scroll position of a list                       | session storage, per URL                                                                            | Restored                                                                           |
| Open sheet                                      | URL entry `&sheet=filters`                                                                          | Reopens                                                                            |
| Editor draft                                    | local store, key `draft/<address id>` (`draft/new`)                                                 | Banner "Draft kept" and the fields restored; Discard draft is in the overflow menu |
| Specs, versions, user settings                  | local store ([PWA decision](decisions/pwa-own-data.md))                                             | Unchanged                                                                          |
| Stock                                           | the collection `stock` of a space, shared database of the apps ([store](store.md#stock-in-a-space)) | Unchanged; a sync cycle may bring changes of another device                        |
| Unit system, theme                              | local store (settings)                                                                              | Applied before first paint (theme) to avoid a flash                                |
| Balance, makeable, ranking, scaled amounts      | not stored, derived                                                                                 | Computed again from the data                                                       |

A draft is the only unsaved work the app keeps, and it keeps it because
losing a half-typed spec on a phone call is the failure to avoid.
Everything else the user did is already saved when it happens.

# Interaction rules

- **Touch targets** at least 44 × 44 px, 8 px apart; rows at least
  56 px; no hover-only affordance (every hover tooltip has a visible
  label or an accessible name, and the action is also reachable by tap).
- **Keyboard (desktop).** Everything works with Tab, Shift+Tab, Enter,
  Space and Escape; Escape closes a sheet and goes back from a pushed
  screen without changes. Shortcuts, all optional and never the only
  way: `/` focus search and `n` new drink (built, [#75](screens-browse.md#as-built-75)), `e` edit, `s` try a swap, `?`
  list the shortcuts (not built). Shortcuts are off while a text field has
  focus, with Ctrl, Cmd or Alt held and over a dialog, and can be turned off
  in Settings (WCAG 2.1.4). In a list, arrow keys move between the rows.
  A modal sheet keeps Tab inside and returns focus to its opener.
- **No autofocus.** Opening a screen focuses nothing; the on-screen
  keyboard appears only when the user taps a field (the "Add by name"
  field and the search field included). One exception: after the user
  taps Add Ingredient, the new line's ingredient picker opens with its
  search field focused, because the user asked for it.
- **Forms scroll** with the keyboard open; the focused field is
  scrolled into view above the bottom bar; bottom bars stay.
- **Undo, not confirm.** Retire, delete a spec or version, remove a line,
  clear stock, mark in or out of stock: act at once, toast with Undo
  for 8 seconds (it stays while the pointer or focus is on it). Undo
  works within the session only. **The app has no confirm dialog.**
  Import is no exception: it keeps a copy of the data first and offers
  Undo ([import](screens-stock-settings.md#export-and-import)).
- **Accessible names.** Every icon-only button (back, overflow, new,
  search, filters, close, stepper, line menu) has an accessible name and
  a tooltip; the list in [UI strings](ui-strings.md#accessible-names).
  Charts are text first: the balance track has a text alternative that
  states value, range and position.
- **Numbers are entered as bartenders write them**: `1 1/2 oz`, `1½`,
  `45ml`, `2 dashes`, `3/4 oz` ([units grammar](units.md#parsing-grammar)).
  The field shows what was understood ("= 22.5 ml") and keeps the entered
  text; an unreadable amount is marked in text under the field, the
  line is not lost.
- **Language** is English; amounts follow the unit setting and ingredient
  names are as in the data.

# Flows

Short paths for the work an experienced bartender does most; each is a
sequence of screens, no instructions are shown in the app.

1. **Look up and read.** Drinks, type in search, row, spec: ingredients
   and balance on one screen.
2. **Try a change.** Spec, Try a Swap, change a line (amount or
   ingredient), read the three figures against the range, Reset or
   Save (new version) or Riff (new drink linked to this one).
3. **Write a new spec.** Drinks, New drink, pick a template (or none),
   fill the lines (the slots of the template are suggested as empty
   lines with their role), balance preview updates while typing, Save
   Version with a note.
4. **Develop a drink.** Spec, Edit, change, Save Version with the note
   "less syrup, rounder", Versions to compare with the last one.
5. **What can I make.** Stock, mark what is there, Drinks with Makeable
   now; or Buy Next for the one bottle that adds the most.
6. **Back up.** Settings, Export, the file is saved; import on another
   device.

# Failure and offline, in general

- The app is installed once and then works without network; nothing in
  it asks for the network except the update check of the service worker.
  **Offline is therefore the normal case, and no screen differs when
  offline.** Each screen entry still says so, so the build is checked
  with the network off ([review checklist](design.md#review-checklist)).
  The one visible offline state: the update line in About reads
  "Updates are checked when you are online."
- **The local store cannot be opened** (private window, blocked storage,
  full disk): a full-screen status "Your data cannot be saved here" with
  the reason, Try Again and a read-only mode in which seed data can be
  browsed and nothing can be saved.
- **Seed data newer or older than the user's references** (an ingredient
  was renamed): the line keeps its stored id and shows "Unknown ingredient" with that id
  and the note "Not in the current data"; it does not break the balance (no
  figure for that line, named).
- **Engine cannot compute a figure**: the figure says "No figure" and
  names the cause ([design](design.md#drawing-balance)).
