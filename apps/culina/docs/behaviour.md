---
type: Specification
title: Behaviour
description: Screens, navigation, the ratio list and cards with the calculator and the neutral range display, the component and dish screens with role slots, interaction rules, states, offline behaviour and the installability check of Cook's Notebook, each rule with the test that checks it.
tags: [behaviour, ui, navigation, pwa, accessibility]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: wcag
    title: 'W3C, Web Content Accessibility Guidelines (WCAG) 2.2, read 2026-11-18: 2.4.3 Focus Order, 2.4.7 Focus Visible, 2.5.5 Target Size (Enhanced), 4.1.2 Name, Role, Value'
    url: https://www.w3.org/TR/WCAG22/
  - id: mixtura
    title: "Mixtura's behaviour document (docs/behaviour.md in nexumia-de/mixtura), read for the shared conventions: one back stack, no focused field on open, 44 px targets, no data leaving the device"
    url: https://github.com/nexumia-de/mixtura
---

# Behaviour

What Cook's Notebook does today. It has four screens; Ratios, Components
and Dishes have their content, and Components and Dishes can be written and
edited by the user ([editor](#editor)); what is entered is kept in the local
store. Colours, type and layout are in
[design](design.md). The audience is an experienced cook who wants the
numbers fast: no tutorial, no first-run tour. The same conventions as
Mixtura[^mixtura].

# Screens

| Screen     | Route                               | Today                                                                                            | Source                      |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- |
| Ratios     | `#/ratios`, `#/ratios/<id>`         | The ratio list and the ratio cards ([below](#ratios)); the start screen                          | `src/screens/ratios.ts`     |
| Components | `#/components`, `#/components/<id>` | The component list and the component screen ([below](#components))                               | `src/screens/components.ts` |
| Dishes     | `#/dishes`, `#/dishes/<id>`         | The dish list and the dish screen with role slots ([below](#dishes))                             | `src/screens/dishes.ts`     |
| Settings   | `#/settings`                        | Theme (Follow system, Light, Dark), the statement that data stays on the device, the engine name | `src/screens/settings.ts`   |

An unknown route (`#/nope`, empty) shows Ratios and rewrites the URL to
`#/ratios` without a new history entry. **Test:** `test/router.test.ts`,
`e2e/smoke.mjs`.

# Ratios

The seed templates of the engine (`SEED_TEMPLATES`, 12 today), shown by
`src/screens/ratios.ts`, `ratio-list.ts`, `ratio-card.ts`,
`ratio-calculator.ts` and `ratio-compare.ts`. All arithmetic is the
engine's; the app formats. The pure view logic is in `src/ratios/`
(`families.ts`, `search.ts`, `parse.ts`, `calc.ts`, `compare.ts`,
`format.ts`), without DOM. A ratio is read only; the calculator's amounts can
start a component ([editor](#editor)).

**Routes.** `#/ratios` is the list, `#/ratios/<templateId>` a card. An
unknown id shows the list with a quiet line ("That ratio is not in the
list.") and keeps the URL. Back is the browser history. **Test:**
`test/router.test.ts`, `e2e/ratios.mjs`.

**List.** A search field at the top (not focused when the screen opens),
case-insensitive substring of the name, trimmed; an empty search shows
all. Every ratio is one link, at least 44 px high, with the name and the
ratio in short form in template order ("3 : 2 : 1", "flour : fat :
water"). No match: one quiet line. Ratios are grouped by family (the root
of the lineage, named after the root, root first, then variations in seed
order); **a family of one member has no heading**, since it would repeat
the row's name. The seed has two families with headings, "Bread dough,
ratio" and "Roux"; the other templates are single rows. The search text stays when
a card opens and when the user comes back. **Test:**
`test/ratios-view.test.ts`, `e2e/ratios.mjs`.

**Card.** Name; table of parts (ingredient role, parts, percent of the
anchor from `templatePercent` where the template has one); the usual range
as plain text beside the part ("usual 1.8-2", only where the template
gives one); the source line (the template's `source`, small, wrapped);
the family (a "Variation of" link to the parent and a "Variations" list of
links to the children, none where there are none); the calculator; "Compare my amounts". On a phone (below 720 px) the
card is its own screen with a link back to the list; from 720 px the list
stays in a column beside the card, the open card marked with
`aria-current`. **Test:** `e2e/ratios.mjs` at 360 and 1000 px, `e2e/ratio-family.mjs` for the family links.

**Calculator.** A radio group chooses what is entered:

| Mode                | Entry                                     | Result per role                                                   | Engine                       |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| From one ingredient | a role, an amount, a unit (g, kg, oz, lb) | amount x parts of the role / parts of the weighed one             | `toGrams`, `scaleFromAnchor` |
| Total weight        | an amount, a unit                         | the role's share of the template's parts                          | `toGrams`                    |
| Factor              | a number                                  | parts times the factor, **one part is one gram times the factor** | none                         |

Results update on every input and are shown in the unit chosen with
"Show amounts in" (g by default). Display: the grams are rounded once with
the engine's `roundMass` and `displayStep` (0.1 g below 10 g, else 1 g;
333.33 g shows as 333 g, 247.5 g as 248 g), then converted with `convert`;
kg and lb show 3 decimals, oz 2, which only trims conversion noise. Numbers
sit right-aligned with tabular figures.

**Number entry.** `500`, `500.5` and `500,5` (comma as decimal mark),
trimmed, are numbers; everything else, and anything not above 0, is not.
The hint "Enter a number above 0." appears under the field (inline,
`aria-live`, field `aria-invalid`, dashed outline), never a dialog. The
previous results stay visible, dimmed with the `--dim` token, not red. An
empty field shows no hint and no results. **Test:** `test/ratios-view.test.ts`,
`e2e/ratios.mjs` (also asserts that no dialog opens).

**Cautions.** A quiet note under the results: "Cooking time does not scale
with the amounts." always when something is calculated (the parts read as
grams are no real reference batch), and "Salt does not scale linearly:
taste." when the engine's `cautionsFor` flags `salt-not-linear`, that is
when the template has a role `salt` (the engine gives no flag at factor 1).

**Compare my amounts.** A collapsible `<details>`, closed by default. The
cook enters grams per role, starting with the anchor; the app shows, from
`checkRatio`, the parts each role comes to, the template's parts and the
difference, and where the template has a range one neutral phrase:
"below the usual range by 0.3", "within the usual range", "above the usual
range by 0.2" (the bounds belong to "within"). A role left blank says "not
entered". No red, no warning icon. **Test:** `test/ratios-compare.test.ts`
(vectors `ratio-check-pie-dough`, `ratio-check-below-range`),
`e2e/ratios.mjs` (bread dough salt 8, 9, 10, 11 g on 500 g flour).

**The wording rule.** No text says that a recipe or a ratio is wrong,
invalid, failed or missing, and none says too much or too little (the only
word about the entry itself is the number hint above). **Test:**
`test/strings.test.ts` scans `strings.ts` for those words;
`e2e/ratios.mjs` scans the rendered card.

**Calculator output equals the engine vectors.** `test/ratios-calc.test.ts`
reads `scale-anchor-pasta-egg` (3:2 from 165 g egg), `scale-anchor-three-roles`
(3:2:1 from 80 g water) and `percent-ratio-to-bakers` (5:3, 100 g flour
gives 100 and 60) from disk and checks `calc.ts` in all three modes and in
four units; `e2e/ratios.mjs` enters the same weights in the browser and
compares the displayed amounts with those vectors (via
`e2e/ratio-fixture.mjs`), and 500 g flour in pie dough 3:2:1 (500, 333.33...,
166.66...; displayed 500 g, 333 g, 167 g).

**Variations.** Derivatives may change parts (`set`, issue 51), so the seed
has two families: `roux` with `roux-whole-butter`, and `bread-dough-ratio`
with `bread-dough-bakers-percent`. The list shows them under headings and
the cards link to each other. Grouping and links are unit-tested with
fixture templates (`test/ratios-view.test.ts`); the seed itself is pinned
by the engine's `test/seed-templates-pinned.test.ts`. The browser test
`e2e/ratio-family.mjs` (called from `e2e/ratios.mjs`) checks the headings,
the "Variations" and "Variation of" links and the way back with the
browser's back (`page.goBack()`).

# Components

`src/screens/components.ts` (list), `component-detail.ts` and its parts
`component-lines.ts`, `component-yield.ts`, `component-scale.ts`, with the
view logic without DOM in `src/components/` (`lines.ts`, `figures.ts`,
`raw.ts`, `names.ts`). All arithmetic is the engine's (`componentLineGrams`,
`bakersPercent`, `componentYield`, `expandComponent`, `portionsFromYield`,
`toPurchased`); the app rounds once for display (`src/shared/mass.ts`).

**Data and the example-data rule.** Records come from the notebook in memory
(`src/notebook/`: `listComponents`, `getComponent`, `listDishes`, `getDish`,
`ingredientName`, `factsByIngredient`), filled from the local store at
startup ([editor](#editor)). The hand-written example set stays in
`src/demo/` as plain data: 12 ingredients, 5 components and 2 dishes, valid
against the schemas, no `validateModel` finding, every name, note and yield
source says "Example", all numbers are made-up round figures, none is a real
recipe or a real yield. It reaches the store only through "Add example
data". **Test:** `test/demo-data.test.ts`.

**Routes and list.** `#/components` is the list, `#/components/<id>` the
screen; an unknown id shows the list with a quiet line and keeps the URL.
Search by name works as on the ratio list (trimmed, case-insensitive, text
kept when a screen opens and when the user comes back). Phone: the screen is
its own page; from 720 px the list stays beside it, the open entry marked
with `aria-current`. **Test:** `e2e/components.mjs` at 360 and 1000 px.

**Component screen**, top to bottom: name and usual role; **Lines** (name,
grams, and the percent of the `percentBase` where the component has one; a
sub-component line is a link with a small "component" tag and opens that
component, one level only, no inline tree; a line without an amount says
"to taste" and has no number; under an ingredient line with a state and a
recorded yield for it, "buy about X g" from `toPurchased`, and nothing where
none is recorded, never 100 %); **Yield** (input, output, loss, yield percent
and the output's source; a gain is called gain); **Scale** (the output weight
wanted in grams, or a factor when the component has no output weight);
**Portions** (only with an output weight: the weight of one portion gives
"About 2.7 portions: 2 whole, 50 g left over."); **What goes in, all the way
down** (raw ingredients through every nesting level for the wanted output,
one row per ingredient and state, a total, and the lines without an amount
listed apart). Without an entry the list is the recipe as written; the line
table always shows the recipe as written.

**"Not weighed yet".** A component without a recorded output shows the
neutral line "Output not weighed yet" and a factor field instead of the
output field; it cannot be used by weight inside another component, and the
screens say so where that matters (below). **Test:** `test/components-view.test.ts`,
`e2e/components.mjs`.

**Engine errors never crash a screen.** A cycle, an unknown component, a unit
that needs a density, a missing output weight or an unusable number gives one
quiet sentence in the place of the amounts ("These components use each other
in a circle: ...", "The output of X is not weighed yet, so it cannot be
scaled."), and the rest of the screen renders. **Test:**
`test/components-view.test.ts` with the engine's error vectors and a broken
fixture.

**Amounts equal the engine.** `test/components-view.test.ts` reads
`expand-three-level`, `expand-fractional-sub-component`,
`expand-output-g-nested`, `expand-percent-lines`,
`expand-aggregates-by-state-and-role`, `expand-unmeasured-nested`,
`yield-loss`, `yield-gain`, `yield-unknown`, `portions-remainder`,
`portions-exact`, `portions-binary-noise` and the error vectors from disk and
checks the view functions against them and against direct engine calls on
the example data. `e2e/components.mjs` loads it through "Add example data" and compares the rendered tables with numbers
that `e2e/notebook-fixture.mjs` computes by calling the engine on the example
data (200 g of the sauce, three levels deep, 75 g portions, a factor of 2,
the dough's percentages).

# Dishes

`src/screens/dishes.ts`, `dish-detail.ts`, `dish-slots.ts`, `stepper.ts`;
view logic in `src/dishes/` (`slots.ts`, `raw.ts`, `roles.ts`).

**Role slots.** Slots appear in stored order: the role label (main element,
sauce, crunch, acid, garnish, starch), the filling (a component is a link,
an ingredient plain text), the amount per portion and the total for the
chosen portions. A slot can be marked optional.

**The empty slot rule.** The stored model has no empty slot (a slot always
has a filling), so an open slot is derived: a role of main, sauce, crunch,
acid or garnish that no slot has is shown after the filled slots as a dashed
row with an invitation ("Open: add a crunch"). It has no red, no icon, no
alert role and the quiet text colour; there is no error or warning colour in
the design at all. Starch is often there but is never invited. **Test:**
`test/dishes-view.test.ts`, `e2e/components.mjs`.

**Portion control.** A number field with minus and plus buttons of 44 px,
starting at the dish's `portions` or 1 and not remembered between visits.
Typing `6` or `2,5` recalculates at once; the buttons step by whole portions
and never go below 1; text that is not a number above 0 gets the hint "Enter
a number above 0." and keeps the last results. The totals are per-portion
amounts times the portions; the list "What goes in, all the way down" expands
each component slot by the engine with its total as the wanted output (the
nested-yield rule) and adds the ingredient slots. A slot whose component has
no output weight cannot be scaled: it stays in the table, the sum leaves it
out and a "Not added up" list says why; the other slots still add up. Lines
without an amount are listed apart. **Test:** `test/dishes-view.test.ts`,
`e2e/components.mjs` (4, 6, 7, 2.5 portions against the engine).

**Navigation.** A component link in a slot or in a component line is an
ordinary navigation: dish, sauce, stock, base is four history entries and the
browser's back goes back through them. **Test:** `e2e/components.mjs`.

**Layout.** One column on the phone, list beside the screen from 720 px; the
slot, line and raw tables use a fixed layout, so long names wrap, very long
numbers wrap inside their cell and nothing scrolls sideways (tested at 360 px
with the longest ingredient name, three levels of nesting and 9-digit
entries). Every link, button and field is at least 44 x 44 px.

# Editor

Issue #16. The user writes components and dishes the way a cook thinks:
amounts by weight or as baker's percentages, switchable at any time. Data
goes into the local store; every figure shown is derived and never stored.
Routes: `#/components/new`, `#/components/<id>/edit`, `#/dishes/new`,
`#/dishes/<id>/edit` (`src/router.ts`, `action` in the navigation). Code:
form state and its translations without DOM in `src/editor/`
(`component-form.ts`, `component-convert.ts`, `figures.ts`, `cycle.ts`,
`dish-form.ts`, `ingredient-form.ts`, `prefill.ts`), the screens in
`src/screens/editor/`, the notebook access in `src/notebook/`.
**Test:** `test/editor-component.test.ts`, `test/notebook.test.ts`,
`test/router.test.ts`, `e2e/editor.mjs`, `e2e/editor-more.mjs`.

**The notebook and the store.** The screens read the notebook from memory
(`src/notebook/`, replacing `src/demo/index.ts` as their data access): the
store is opened and read once before the first screen, and a write goes
through the store (which validates it) first and changes the memory only
when the store accepted it. A store that cannot open (`unavailable`,
`newer-schema`, `migration-failed`) leaves the empty notebook and says why
in one quiet line on the lists, in Settings and when a save is tried; the
app never crashes on it. Lists are sorted by name, ignoring case.

**Empty notebook.** Components and Dishes say, quietly, that nothing is
there yet and invite ("Add a component", "Add a dish"). "Add example data"
(on the empty lists and in Settings) writes the hand-written example
records into the store through the same writes; they stay marked "Example"
in name, note and yield source, can be edited and deleted like any record,
and are not added twice. **Test:** `test/notebook.test.ts`, `e2e/components.mjs`
(which loads them this way first).

**Component editor.** Name, the role it usually fills in a dish, ingredients
and sub-components with amount and unit (every unit of the schemas; a
sub-component takes a mass), the yield as weighed (left empty until then;
the source is `user`), and method and notes (one per line, stored as
`method`). A line without an amount is kept ("to taste"). The state and
note of an existing line are kept as they are.

- **Weight or percent.** The two radio buttons switch at any time. In
  percent entry the lines that are not the reference are percent of the
  reference mass (`percentBase`, `percent` lines in the stored record);
  the reference lines (role = `percentBase`) stay in their mass unit, so
  several flours add up. Switching converts every line with the engine's
  `convertComponentLines` ([engine rules](engine-rules.md#converting-lines-between-weight-and-percent));
  the app does no arithmetic of its own. Choosing the reference ingredient
  in percent entry converts the lines anew; without one the lines stay
  weights until one is chosen. Each percent line shows the grams it comes
  to, each weight line its percent of the reference, both from
  `componentLineGrams` and `bakersPercent`. A line the engine cannot
  convert (a cup of an ingredient without a density) is said quietly and
  nothing changes. **Test:** `test/editor-component.test.ts` (grams unchanged
  by the conversion), `e2e/editor.mjs` (percentages equal the engine's,
  switch to weight, reload, values equal).
- **Ingredient picker.** Search over the user's own ingredients (or
  components, for a sub-component line); an ingredient is created on the
  spot with a name, an optional role, an optional yield (percent of the
  purchased weight) and an optional shelf life, all with the source `user`.
  Nothing is looked up outside the device.
- **From the catalogue.** In the ingredient picker (a component line, a
  dish slot) a section "From the catalogue" sits below the user's own
  entries and the search text filters it too: entries whose name contains the
  text, those that start with it first, at most 25 at once with a quiet line
  "Showing 25 of N" for the rest; with no text it says how many ingredients it
  holds. Each row shows the name and "by volume", "by piece" or both. An entry
  already in the notebook is not offered again (it is in the user's own
  list). Choosing an entry copies the catalogue row, unchanged, into the
  notebook through the ordinary save path (`saveRecord`) and picks it; from then on it
  is the user's ingredient, and picking it again, or an entry the user already
  has, writes nothing. The catalogue is the file `catalogue.json` of the
  app's own origin ([ingredient catalogue](ingredient-catalogue.md)), fetched
  the first time a picker opens and kept for the session; it is precached by
  the service worker, so the section works offline, and `main.js` does not
  carry it. While it loads the section says so quietly; if it cannot be loaded
  (or is not a catalogue of format 1) it says "The catalogue could not be
  loaded. Your own ingredients still work." and the picker works as before, and
  the next picker tries again. Entries that do not fit the ingredient
  schema are left out. **Test:** `test/catalogue-app.test.ts` (reading, loading
  once, retry, copying without overwriting), `e2e/catalogue.mjs` (empty
  notebook, search, choosing, volume and count amounts against the engine
  from the catalogue rows, reload, offline under the service worker, an
  unavailable file, no console error or foreign request, 360 px).
- **Cycles.** A component that is the one edited, or that uses it
  (directly or through another), is shown in the picker as "this component"
  or "uses this component" and cannot be chosen; a draft that would still
  make a cycle is not stored and says so. The check is the engine's
  `validateModel`. **Test:** `e2e/editor.mjs`.
- **Make a recipe from this ratio.** The calculator section of a ratio
  card has the link; it opens `#/components/new` with one line per role of
  the ratio, amounts as the calculator shows them, the role kept and the
  template in `templateId`; the anchor role is the reference. The
  ingredient of each line is still to pick and a line without one is only
  in the draft: saving says so quietly. The usual range of the ratio is
  shown under the lines as information, in the neutral words of the ratio
  card, and never blocks saving. **Test:** `e2e/editor-more.mjs`.

**Dish editor.** Name, portions (a whole number or empty), a note, and role
slots: a role, a filling (a component or an ingredient, from the same
picker) and an amount per portion. A stored slot always has a filling; a
slot without one lives only in the draft. Open roles remain derived on the
dish screen. **Test:** `test/notebook.test.ts`, `e2e/editor-more.mjs`.

**What blocks saving.** Only what cannot be stored: no name, no line or
slot, a line or slot without its ingredient or filling, an amount that is
not a number above 0 (empty is allowed), a portions or yield entry that is
not, a cycle. Each is one quiet sentence next to Save (`strings.editor.needs`).
Nothing about the recipe itself ever blocks: ranges are information. A new
record is version 1 of its own family with the date of the store's clock
(`version.family` = its id). Saving an edit never overwrites: it adds a new
version record ([versions](#versions-history-and-variations)). Ids are `u-`
and a random UUID, made in the app shell.

**Drafts.** Every change is kept as a draft in the store's own `drafts`
object store ([data model](data-model.md#drafts)) after a pause of 0.3 s,
and at once when the screen is left or the page is hidden. One draft per
edited record, one for "new component", one for "new dish". Opening the
editor again shows the draft's state directly, without a dialog. Save
removes the draft; "Discard changes" removes it and shows the stored record
(or an empty form) again. **Test:** `test/store-drafts.test.ts`,
`e2e/editor.mjs` (leave at once, return, reload).

**Delete.** "Delete" on a component or dish, and in its editor, acts at once:
every version record of the component or dish and every tasting note on one
is tombstoned in the store (the user's delete of the whole thing, not a
rewrite of history) and a toast offers "Undo" for 10 seconds; there is no
confirmation dialog. Undo writes all kept records again.
**Test:** `e2e/editor.mjs`, `e2e/editor-more.mjs`.

**Form behaviour.** No field is focused when an editor opens. A field that
gets focus scrolls clear of the on-screen keyboard (`scroll-margin` on the
form controls; the page itself scrolls). Every control is at least 44 x 44
px. Lines and slots are reordered with "Move up" and "Move down" buttons
(focus follows the moved line); there is no drag-only interaction. The
screens fit 360 px without horizontal scroll. **Test:** `e2e/editor.mjs`
(`layout`), `e2e/editor-more.mjs`.

# Versions, history and variations

Every save of an existing component or dish adds a **version**; nothing
stored is ever written again ([data model](data-model.md#version)).
**Test:** `test/versions.test.ts`, `e2e/versions.mjs`.

- **Save.** Next to Save, three optional fields: what changed, why, and a
  tasting note. Save of a new record stores version 1; Save of an existing
  one stores a new record (new id, same family, `parent` = the version
  edited, today's date from the injected clock) and opens it. A tasting note
  typed there becomes a `tastings` record that refers to the new version.
  The editor always opens the current version of a family, also when it is
  reached with the id of an older one. The three fields are kept in the
  draft like everything else.
- **Lists and references.** Lists and pickers show one entry per family, its
  head (the latest version). A line or slot stores the id of the **family**
  (the id of its first version) when picked in the editor; any version id
  works as a reference, and the screens resolve it to the head of that
  family, so sub-components always follow the current version of what they
  use. An older version shown read-only keeps its own lines but resolves its
  sub-components the same way.
- **Detail.** Under the name: "Version 3 · 2026-11-18", the change and the
  reason if written, links "History" and (on the current version only)
  "Make a variation", Edit and Delete. An older version opens at
  `#/components/<versionId>` (or `#/dishes/<versionId>`), read-only, with the
  quiet line "This is an older version." and a link to the current one.
- **History** (`#/components/<id>/history`, `#/dishes/<id>/history`, `id` any
  version of the family): the versions newest first, each with number, date,
  change and reason, "Open this version", "Restore as a new version" (not on
  the current one), the difference to the version before from the engine
  ([engine rules](engine-rules.md#versions-and-variations)) as one row per
  changed line or field ("Changed: Butter, 40 g → Butter, 50 g (amount)"),
  and its tasting notes. A note is added, edited or removed afterwards with
  its date (default today) and text; Remove acts at once with a toast and
  Undo; notes are records of their own, so the version is
  never touched.
- **Restore.** Adds a new current version with the content of the old one,
  `parent` = the current head and the change text "Restored version N". The
  history only grows.
- **Variation.** "Make a variation" copies the current version into a new
  record in a **new family** with `version.parent` = the version it came
  from, named "<name> (variation)", and opens it. The parent lists its
  variations (their current versions) and the variation says "Variation of
  <name> (from version N)", each a link. When the parent is deleted the
  variations stay and say "Variation of a record that was removed".
- **Append-only.** `saveRecord` refuses a version record that is already
  stored (`invalid-record`, path `id`); no function puts a stored version
  again. The test spies on the store and requires that no component or dish
  id is put twice across Save, Restore, Make a variation and tasting-note
  edits.

Screenshots: [design](design.md#screenshots). Out of scope: merging
branches, sharing versions between devices, comparing different recipes.

# Navigation

- **One back stack: the browser history.** Every destination is a hash
  route (`src/router.ts`, no framework); a tap on the navigation adds an
  entry, the browser's back button and the system back gesture go back.
  There is no second stack and no in-app back button at this level.
  **Test:** `test/router.test.ts`, `e2e/smoke.mjs` (back returns to
  Ratios).
- **Phone first.** Below 720 px width a bottom navigation bar with icon
  and label; from 720 px a side navigation ([design](design.md#layout-and-breakpoints)).
  Both are the same `<nav aria-label="Main">`, so the order and the
  names are the same. **Test:** `e2e/smoke.mjs` at 360 and 1000 px.
- **Landmarks:** one `<header>`, one `<nav>` with a label, one `<main>`;
  the current destination has `aria-current="page"`. A skip link ("Skip
  to content") is the first focusable element. The document title is
  "<screen> - Cook's Notebook". **Test:** `e2e/smoke.mjs`.
- **Focus on navigation.** When the user navigates, focus moves to the
  screen heading (`<h1>`, `tabindex="-1"`), so a screen reader announces
  the new screen. When the page first loads or reloads, nothing is
  focused: no text field is focused when a screen opens. **Test:**
  `e2e/smoke.mjs`.
- **Sub-paths.** All URLs are relative, so the app works under a
  sub-path; `e2e/smoke.mjs` runs the offline check under `/apps/cook/`.

# Interaction rules

- **Touch targets at least 44 x 44 px** for everything tappable
  (navigation links, ratio rows, fields, selects, summaries, radio rows).
  **Test:** `e2e/smoke.mjs`, `e2e/ratios.mjs`.
- **No hover-only affordance.** Nothing appears or changes meaning on
  hover. **Test:** `test/tokens-only.test.ts` (no `:hover` in any stylesheet).
- **Keyboard.** Everything works with the keyboard: Tab order follows the
  reading order (skip link, navigation, content), Enter follows a link,
  arrow keys and Space work in the theme radio group, the focus ring is
  always visible ([design](design.md#layout-and-breakpoints)); focus order
  and visible focus are WCAG 2.4.3 and 2.4.7[^wcag].
  **Test:** `e2e/smoke.mjs` (Tab to the skip link, ring on the
  navigation, Enter navigates and focuses the heading).
- **Names.** Every link, button, input and summary has an accessible
  name; icons are decorative. **Test:** `e2e/smoke.mjs`.
- **Texts for the experienced cook.** Short, no tutorials; guidance only
  in a collapsible `<details>`, closed by default. **Test:**
  `test/strings.test.ts`.
- **Theme.** Chosen on Settings, applied at once, kept on the device,
  applied before the first paint on the next visit
  ([design](design.md#themes)). **Test:** `e2e/smoke.mjs`,
  `test/prefs.test.ts`.

# States

| State   | Behaviour                                                                                                                                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty   | Components, Dishes and Ratios: an empty search is one quiet line; a list without a detail (desktop) says to choose one. An empty notebook invites ("Add a component", "Add example data"). An open dish slot is an invitation, never an error.                                                 |
| Error   | The shell has no network and no data to fail on. One error exists: the theme cannot be stored (private mode, blocked storage, full). The choice then applies until the page closes and Settings says so in a `role="status"` line. **Test:** `test/prefs.test.ts` (the write reports `false`). |
| Offline | The whole app is precached: every screen, the stylesheet, the icons and the manifest work without a connection and there is no offline banner, since nothing needs the network. **Test:** `e2e/smoke.mjs` (offline reload renders and navigates).                                              |

# Local store

The app keeps what the user enters in IndexedDB ([data model](data-model.md#storage-and-migrations));
the editors write ([editor](#editor)). Settings shows one quiet line about it, read with
`navigator.storage.persisted()` (the request is made when the user first
saves something):

| State       | Settings line                                         |
| ----------- | ----------------------------------------------------- |
| persistent  | Storage: kept by the browser                          |
| best-effort | Storage: the browser may clear it when space runs low |
| unsupported | Storage: not reported by this browser                 |

**Test:** `e2e/store.mjs`, `test/store-persistence.test.ts`.

Texts for the store's errors (`strings.store`, shown by the editing
screens; none says a recipe is wrong):

| Code               | Text                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| `unavailable`      | This browser cannot keep data here. Private browsing can cause this.              |
| `quota-exceeded`   | There is no space left on this device. Free some space and try again.             |
| `newer-schema`     | Your data was saved by a newer version of this app. Update the app to open it.    |
| `migration-failed` | Your data could not be brought up to date. It is untouched and can still be read. |
| `invalid-record`   | This entry has a value that is not allowed, so it was not saved.                  |
| `not-found`        | That entry no longer exists.                                                      |

The store makes no network request. **Test:** `e2e/store.mjs` (no request
leaves the origin while records are written, read, reloaded and read after
a service worker update).

# No data leaves the device

No server, no account, no telemetry, no analytics, no web font, no CDN.
The page has a Content Security Policy (`default-src 'self'`, no inline
script or style) and the app makes no request to another origin.
**Test:** `test/manifest.test.ts` (policy, no inline code),
`e2e/smoke.mjs` (no console error, no CSP violation, no request to
another origin, on every run of the shell and the offline checks).

# Service worker

Built by `packages/app/build.mjs`: it hashes all built files into a cache
name `culina-<16 hex>` and gives `sw.js` the exact file list (every built
file except `sw.js`, `catalogue.json` among them). On `install` it precaches the list and takes over
at once (`skipWaiting`); on `activate` it deletes every cache that starts
with `culina-` and has another version, then claims the open pages. A
`GET` request of its own origin is answered from the cache, a navigation
that is not cached gets `index.html`. A stored response that a host answered
through a redirect (some hosts send `index.html` to its folder) is given out
as a new response with the same content, because a browser refuses a
redirected response for a navigation ([deployment](deployment.md#the-redirect-of-indexhtml);
**Test:** `e2e/host-redirect.mjs`). Registration (`src/sw-register.ts`)
only happens over `http:` or `https:` and not when the page URL has
`?no-sw` (the e2e tests use it where they do not test the worker).
**Test:** `test/build.test.ts` runs the built `sw.js` against fake caches
(precache list equals the files in `dist`, old versions deleted, other
names kept), `test/sw-register.test.ts`, `e2e/smoke.mjs`.

# Installability check

`e2e/install.mjs` runs in `npm run e2e` against the built app served on
`localhost` (a secure context) and prints this table; every row must
pass. Result of the run on 2026-11-18:

| Check                              | Result                     |
| ---------------------------------- | -------------------------- |
| name and short_name                | Cook's Notebook / Notebook |
| start_url and scope                | `./` and `./`              |
| display standalone                 | standalone                 |
| theme_color and background_color   | `#faf9f6` both             |
| icon 192x192 loads                 | 200, decodes as 192x192    |
| icon 512x512 loads                 | 200, decodes as 512x512    |
| maskable icon loads                | 200, decodes as 512x512    |
| every icon answers 200 and decodes | 4 icons (3 PNG, 1 SVG)     |
| secure context (localhost)         | yes                        |
| service worker controls the page   | yes                        |
| precache holds every built file    | 9 files                    |

The unit counterpart is `test/manifest.test.ts` (required fields,
relative URLs, icons exist and have the stated PNG sizes, colours equal
the `--bg` tokens). Not checked: the install prompt itself, which
browsers show by their own rules, and the maskable icon in a real
launcher.

[^wcag]: W3C, WCAG 2.2, <https://www.w3.org/TR/WCAG22/>, read 2026-11-18.

[^mixtura]: Mixtura, `docs/behaviour.md`, <https://github.com/nexumia-de/mixtura>, read 2026-11-18; no source code was read or copied.
