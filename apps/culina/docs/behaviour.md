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
    url: ../../mixtura
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

| Screen   | Route                                                                                                                        | Today                                                                                                                                                                                                           | Source                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Start    | `#/start`                                                                                                                    | What do you want to cook: the classics by country and the way into every tool ([below](#classics)); the start screen                                                                                            | `src/screens/classics/`                              |
| Ratios   | `#/ratios`, `#/ratios/<id>`                                                                                                  | The ratio list and the ratio cards ([below](#ratios))                                                                                                                                                           | `src/screens/ratios.ts`                              |
| Notebook | `#/components`, `#/components/<id>`, `#/dishes`, `#/dishes/<id>`                                                             | Two parts, Components and Dishes: the lists and the screens of one entry ([components](#components), [dishes](#dishes))                                                                                         | `src/screens/components.ts`, `src/screens/dishes.ts` |
| Cook     | `#/cook`, `#/cook/use-up`, `#/cook/<id>/with`, `#/classics`, `#/classics/<country>`, `#/classic/<id>`, `#/classic/<id>/cook` | Two parts: with what I have (what can I cook, use up first, what uses one ingredient, the stock) and the classics by country with their dishes and cooking step by step ([below](#cook), [classics](#classics)) | `src/screens/cook/`, `src/screens/classics/`         |
| Stock    | `#/stock`, `#/stock/add`, `#/stock/<id>/edit`                                                                                | A view of Cook, "What is there": the list, the quick entry and the detail of one item ([below](#stock))                                                                                                         | `src/screens/stock/`                                 |
| Settings | `#/settings` (the gear in the header)                                                                                        | Theme (Follow system, Light, Dark), Your data (export, import, reminder; [below](#export-and-import)), the statement that data stays on the device, the engine name                                             | `src/screens/settings.ts`                            |

An unknown route (`#/nope`, empty) shows Start and rewrites the URL to
`#/start` without a new history entry. **Test:** `test/router.test.ts`,
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
water"). The names and the role words are the user's language (the shipped ratios have their names and
notes in `strings.ratios.seed`, the role words in `strings.roles`, so German shows "Brotteig, Verhältnis" and
"Mehl : Wasser"); a ratio of the user's own is shown as typed. The search finds a ratio by the name shown.
No match: one quiet line. Ratios are grouped by family (the root
of the lineage, named after the root, root first, then variations in seed
order); **a family of one member has no heading**, since it would repeat
the row's name. The seed has two families with headings, "Bread dough,
ratio" and "Roux"; the other templates are single rows. The search text stays when
a card opens and when the user comes back. **Test:**
`test/ratios-view.test.ts`, `e2e/ratios.mjs`.

**Card.** Name; table of parts (ingredient role, parts, percent of the
anchor from `templatePercent` where the template has one); the usual range
as plain text beside the part ("usual 1.8-2", only where the template
gives one); the source line (author, title and page of the template's `references`, for example "Source:
Michael Ruhlman, Ratio, p. 17"; the template's `source` is a pointer into the repository and is never
shown; a ratio without references has no source line); a short note where one is worth showing (a
cross-reference by id is not shown as text);
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
`test/strings.test.ts` scans every `strings-*.ts` and, with the German words
(falsch, Fehler, fehlt, zu viel, zu wenig, schlecht, ungültig and their forms), every file in
`src/de/`;
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
`method`). A line without an amount is kept ("to taste" in the component view). The state and
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
  entries and the search text filters it too. With no text it says how many
  entries it holds. The catalogue is a tree
  ([ingredient catalogue](ingredient-catalogue.md#grouping-rule)): a result is
  a **parent first, its variants below it**. A parent that matches the text
  itself shows its variants **collapsed** with a toggle that says "N variants"
  and names what it opens ("Show the variants of Wheat flour"); a parent that is
  only on the way to a matching variant is shown **open**, so a matched
  variant always stands under the parents that lead to it, each row named by the
  part that follows its parent's name ("unbleached") with the full name as its
  accessible name. The toggle is a button (Enter or Space, `aria-expanded`, the
  focus stays on it) and, like every row, at least 44 px; what the user opened
  or closed is kept while the text stays the same. Entries whose name or alias
  contains the text, in English or any other language the entry has names in
  (German: a search for "Mehl" finds the flours), ignoring case, accents and
  umlauts ("kase" finds "Käse") and sharp s as ss; one predicate
  (`shared/names.ts`: all searchable names of a record) that the import matcher
  and the stock entry can use later. In the English app a row found through
  another language shows that name beside the English one, marked with its
  `lang`, so "Rosenkohl" gives "Brussels sprouts Rosenkohl by volume"; a row
  found by its English name shows no second name. **In the German app the
  German name leads and the English name stands beside it** (marked `lang="en"`):
  "Rosenkohl" with "Brussels sprouts" below it, however it was found; an entry
  without a German name shows its English name as it is, with nothing beside
  it. The German names come from the catalogue's `names.de` and are not
  invented; the classics' ingredient ids without one are listed for the owner. The rows of the catalogue stay in the English tree (variants are shown
  by what follows the parent's name); the names of the user's own ingredients follow the language
  setting. Those
  that start with the text in any name come first, at most 25 top-level results at
  once with a quiet line "Showing 25 of N" for the rest. Each row shows the
  name and "by volume", "by piece" or both (a parent without numbers shows just
  its name). An entry already in the notebook is not offered again (it is in the
  user's own list) but stays as the way to its variants. **Choosing an entry**
  copies the catalogue row, unchanged, into the notebook through the ordinary
  save path (`saveRecord`) and picks it: a variant also saves its parent chain,
  root first, only the entries not in the notebook yet; a parent saves itself and
  its own parents. The notebook's ingredient tree is therefore whole, and a
  record the user already has, changed or not, is never written again. The
  catalogue is the file `catalogue.json` of the app's own origin, fetched the
  first time a picker opens and kept for the session; it is precached by the
  service worker, so the section works offline, and `main.js` does not carry
  it. While it loads the section says so quietly; if it cannot be loaded (or is
  not a catalogue of format 1) it says "The catalogue could not be loaded. Your
  own ingredients still work." and the picker works as before, and the next
  picker tries again. Entries that do not fit the ingredient schema are left
  out; an entry whose parent is not in the file is a top-level result.
  **Test:** `test/catalogue-app.test.ts` (reading, loading once, retry, copying
  without overwriting), `test/catalogue-tree.test.ts` (tree, search, chain,
  adopting with the chain), `test/names.test.ts` (the name predicate),
  `e2e/catalogue-german.mjs` (search by a German name and an alias, the name
  shown, choosing it stores the names, offline), `e2e/catalogue.mjs` and `e2e/catalogue-tree.mjs`
  (empty notebook, search, a collapsed parent and its count, keyboard, a
  matched variant under its parents, choosing a parent and a variant, the
  stored chain and `validateModel`, volume and count amounts against the
  engine from the catalogue rows, reload, offline under the service worker, an
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
rewrite of history) and a toast offers "Undo" for 10 seconds (it goes by itself
then, and also when the user goes to another screen: see
[Toast](#toast-and-undo)); there is no confirmation dialog. Undo writes all kept records again.
**Test:** `e2e/editor.mjs`, `e2e/editor-more.mjs`.

**Form behaviour.** No field is focused when an editor opens. A field that
gets focus scrolls clear of the on-screen keyboard (`scroll-margin` on the
form controls; the page itself scrolls). Every control is at least 44 x 44
px. Lines and slots are reordered with "Move up" and "Move down" buttons
(focus follows the moved line); there is no drag-only interaction. The
screens fit 360 px without horizontal scroll. **Test:** `e2e/editor.mjs`
(`layout`), `e2e/editor-more.mjs`.

**Save stays on the screen; a message is at its field.** Save, Discard
changes and (for a stored record) Delete are a bar that sticks above the
bottom navigation (`.editor-bar`), so Save is on the screen however long the
form is; Save and Discard sit side by side at 360 px. What cannot be saved is
said **at the field it concerns**, not only at the end: under the Name field
(no name), under the add buttons (no lines, a cycle), at the line or slot whose
ingredient or filling is not chosen or whose amount is not a number, under
Portions and under the yield. Each message is a quiet line (dashed outline, no
alarm colour) with `role="alert"` so it is announced when it appears, the
field it concerns points at it (`aria-describedby`, `aria-invalid` on inputs),
and the first such field takes the focus, which also scrolls it into view. The
message goes when the field is changed. The bar itself says only "Check the
fields marked above to save." (`strings.editor.needs.summary`); a refusal of
the store, which is no field's, stays there in words. **Test:**
`e2e/editor.mjs`.

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

# Stock

What is there, with as little upkeep as possible
([decision](decisions/recipe-book.md), points 4 and 5; data:
[stock item](data-model.md#stock-item); rules:
[engine rules](engine-rules.md#stock)). Not an entry of its own: the stock
screens are the view "What is there" of [Cook](#cook), and the navigation
entry Cook stays marked on them. Start and Cook both offer it, so it is two taps from every screen. The list's heading is "What is there".
Texts: `src/strings-stock.ts`.

- **Tick what is there** (`#/stock/add`). A list to tick from: the
  notebook's ingredients and components by name, then the catalogue by
  search (the picker's catalogue section; choosing copies the entry and
  its parents into the notebook and ticks it, with a toast and Undo).
  Many ticks in a row without leaving the screen; each is saved at once and
  stores nothing but `id` and `ref`. Ticking again unticks, with the toast
  and Undo. "Always there" is a button on a ticked row (a check mark and a
  bar as well as colour); that item counts as present until unticked.
  Nothing is offered by default: no staples list is shipped; "Always there"
  can be set on any item. A tick is a box with a check mark, not only a
  colour. **Test:** `e2e/stock.mjs`, `test/stock-notebook.test.ts`.
- **The list** (`#/stock`). Sorted by use by where one is known (nearest
  first), then by name. A row shows the name and only what was entered
  (amount, state, "always there") and the remaining days in plain words:
  "2 days left", "1 day left", "use by today", "past use by". No alarm
  colour and no judgement: the words carry the information, and all three
  use the same text colour. The days come from the engine's `stockExpiry`
  with today from the injected clock; an item without a use-by date shows
  none, unless the ingredient's recorded shelf life gives exactly one date
  for the item's state and date prepared. Remove acts at once with the toast
  and Undo.
- **Detail of one item** (`#/stock/<id>/edit`). Amount and unit, state,
  date prepared (a native date field with a "Today" button from the
  injected clock), use by (with "Clear"), always there, note: all optional,
  an empty field says nothing. Where the ingredient has a recorded shelf
  life with a source, the dates it allows are offered as buttons; nothing
  is applied unless chosen. "Use some" subtracts an amount (any unit that
  converts, else a quiet sentence) from the amount in stock at once; using
  all of it removes the item with the toast and Undo. Saving changes a copy
  of the stored record, so fields of another app (`x-...`) stay. Nothing is
  focused on open.
- **Prepared components** are stock items with `ref.kind` `component`.
  Only an entered use by counts for them (components have no shelf life).
- **Layout.** At 360 x 720 and from 720 px; no horizontal scroll, targets at
  least 44 px. The navigation has four entries, each label on one line at 320 px
  also in a wide font ([design](design.md#layout-and-breakpoints)).
- **Offline.** The catalogue is precached; ticking, the list and the detail
  work offline. **Test:** `e2e/stock.mjs` (also 320 and 1000 px, remaining
  days at fixed dates, a field of another app surviving an edit).

# Cook

"I stand in the kitchen and do not know what to cook"
([decision](decisions/recipe-book.md), issue 22; rules:
[engine rules](engine-rules.md#what-the-stock-allows)). The navigation
entry "Cook" (German "Kochen", the second of four) leads to `#/cook`. At the top of
each of its screens are two parts, a row of two equal links ("With what I
have", "Classics"; German "Mit meinem Vorrat", "Klassiker"): the second is the
[classics by country](#classics) (`#/classics`, the country lists, the dish
and cooking step by step, which the navigation marks as Cook too). Under the
first part three views, switched by links below it (a group with
`aria-current`, a bar and bold text for the current one, not a second
navigation landmark): **What can I cook** (`#/cook`), **Use up first**
(`#/cook/use-up`) and **What is there** (`#/stock`, the stock list with its
"Tick what is there" action). Texts:
`src/strings-cook.ts`. **Test:** `e2e/cook.mjs`, `test/cook-finder.test.ts`,
`test/router-cook.test.ts`.

- **One adapter.** `src/cook/input.ts` builds the engine's input from the
  notebook cache: the ingredient tree (a `parentId` that names no
  ingredient is left out), every version of components and dishes, the seed
  templates, the stock as stored, the facts for conversion and today. No
  arithmetic in the app: every number and status comes from `makeable`.
  Today is the shell's injected clock (`?e2e-now=` in tests), read in
  `src/cook/source.ts` only, and shown on the screen as "As of 18 Nov 2026".
- **What can I cook.** The engine's candidates (own components and dishes,
  ratio templates where the engine returns them) in the engine's exact
  order; the filters only drop entries. "Complete only" is not a rule:
  each entry shows "complete" or "lacks N" as text. Each entry is one link
  to its recipe (a dish, a component or a ratio card) and shows: the
  reason line, "uses the Leek with 1 day left; covers aromatic, sauce"
  (the engine's urgency item and days, or "nothing it uses has a use-by
  date", then the roles covered, or "no roles recorded"); "Lacks: Thyme,
  Cream (100 g there, 200 g needed)"; the substitutes, "with Salted butter
  in place of Unsalted butter"; items that are there with no known amount,
  "Cream is there; how much is not known."; and for a dish the open roles
  the stock can fill, "You could add a crunch: Walnut", only where the
  stock has an ingredient or component with that role. The same offer is
  shown on the dish screen beside "Open: add a crunch". Wording is neutral:
  "lacks", "could add", never an alarm word or colour.
- **Filters**, kept in `localStorage` (`culina.cook`, like the theme; no
  storage means the defaults): "Show" is the engine's threshold, complete
  only or lacking at most 1, 2 or 3 (default 1); "Covers the role" keeps
  entries whose covered roles include the chosen one. The same three choices
  apply to the classics below; "Country" and "Meat and fish" are kept in the
  same entry and belong to the classics only.
- **Classic dishes**, a section below the own list ("Classic dishes",
  `src/screens/cook/classics-section.ts`; not on the "uses an ingredient"
  view). Each shipped classic is derived (`deriveClassic`, 2 portions) and
  judged by the engine's finder on the stock (`classicsMakeable`,
  [engine rules](engine-rules.md#the-shipped-classics-in-the-finder)); the
  app only filters (country: Germany, Italy, France, Spain or all; "Without
  meat and fish") and shows. The entry reads like an own dish (status,
  reason, substitutes, unknown amounts) with the country and, where it
  applies, "without meat and fish" in the kind line, and what is missing as
  "Needs: Oil, Salt" (never "lacks"/"wrong"). Water is never asked for. A
  line the catalogue has no ingredient for yet is not counted and is named
  apart: "Not in the catalogue yet, so not counted: Bouquet garni". The
  ingredient tree is the notebook's completed by the shipped catalogue (the
  notebook wins on an id), loaded on the first draw and drawn again when it
  is there; names are in the content language. Each entry is one link to
  `#/classic/<id>`. With nothing that fits: "No classic fits these choices."
  (or the quiet sentence for no stock) and the three nearest, "<name> needs
  <list>". **Test:** `test/cook-classics.test.ts`, `e2e/classics-finder.mjs`.
- **Start from one ingredient** (`#/cook/<ingredientId>/with`, heading
  "What uses Leek"): a section at the top lists the ticked ingredients and
  a search over the notebook's ingredients by every name (English and
  German, through `shared/names.ts`). The list keeps the engine's order and
  only own components and dishes that use the ingredient or one it can
  stand in for (`usesIngredient`); "Show everything" leaves it.
- **Use up first.** The stock items that have a use-by date, nearest first
  (the engine's `useUpFirst`), each with days left in words and links to
  the components and dishes that use it, counted within the same "lacking
  at most" choice; an item nothing uses says so. Tapping the item opens it
  in the stock screen (`#/stock/<id>/edit`).
- **Empty states**, each with the way forward: nothing ticked yet (link
  "Tick what is there"); nothing in the notebook yet, when nothing is
  found and there is no component or dish (links to add a component and to
  import); nothing matches, with the three nearest candidates and what each
  lacks (the engine at a wide threshold, fewest lacking first).
- **Catalogue ingredients only.** The generated catalogue carries no roles;
  the [role table](data-model.md#roles) adds a few when the catalogue is
  read, so a ratio card is makeable from stock of catalogue foods. With no
  recipe of one's own and no ratio card that fits there is nothing to rank
  in the own list and the screen shows "Your notebook has no components or
  dishes yet." with its links (the classics below are listed regardless).
- **Layout.** At 360 x 720 and from 720 px; no horizontal scroll, targets at
  least 44 px, nothing focused on open. **Offline:** the finder reads the
  local notebook. No "add to list": shopping lists are the planned sister
  app's.

# Classics

The first stage of the [helper](helper-plan.md#stages-of-the-app): pick a
shipped classic and cook it step by step. The app proposes and never decides;
one thing is on the screen at a time. Texts: `src/strings-classics.ts`; the
view logic is in `src/classics/` (no DOM), the screens in
`src/screens/classics/`. **Test:** `test/classics-view.test.ts`,
`test/classics-notebook.test.ts`, `e2e/classics.mjs`.

- **Start** (`#/start`, the screen the app opens on and the first navigation
  entry, "Start"). The heading asks "What do you want to cook?". The first
  choice is "Classics by country": Germany, Italy, France and Spain, each with
  its number of dishes. Behind it, "Your tools" links to What can I cook, What
  is there (the stock), Components, Dishes and Ratios, as before; nothing was
  removed. The classics screens are shown under the Cook entry, in its
  second part "Classics".
- **List** (`#/classics/<country>`). Each dish with its name in the content
  language, its course and "Without meat and fish" or "With meat or fish". A
  country without a dish says so quietly ("No dishes from here yet"); the
  app works with no dish at all. A dish id or a country that is not known gives
  one quiet sentence.
- **Dish** (`#/classic/<id>`). In this order, so that the ingredients are on
  the first screen at 360 x 720: the name, the original name, course and meat
  flag; a portions stepper, default 2; the ingredient lines per component and
  for the dish; "Cook step by step"; the whole method; then, each closed behind
  a tap (`<details>`), **Nutrition per portion** (below) and **Source**. **The
  app does no arithmetic**: amounts come from `deriveClassic` and are only
  rounded for display with the shared helpers (`formatMass` for grams,
  `formatNumber` otherwise). A range is shown as "100 ml to 150 ml" (the
  source's range, not the middle the engine uses for copies); a settled line is
  marked "settled by us".
- **What a line shows and what is behind the Source tap.** Running text is
  what helps the cook: the name, the amount, the line's cooking `note`
  ("Boiled potatoes, cut into slices."), "optional" and the settled mark. **A
  line without an amount shows its name alone**: "to taste" or "as needed"
  stands in the amount place only where the data says so (`amountWord`, set
  only where the source's own words say it), never as a stand-in for missing
  data. Everything that is about the source and not about cooking is **only**
  inside **Source** at the foot of the dish, never in a line, never when
  cooking: one line in the user's language (author, title, year), the place,
  the licence where there is one, a link, the persons the source states or,
  where it names none, the number we took ("The source names no number; we took
  6 persons."), one sentence on how it was checked (page image, second edition
  or second reader), and "Remarks on the source": the transcriber's note on the
  dish, each line's `sourceNote` and the source's own wording of an amount
  (`amount.original`, in the source's language and in quotation marks), and
  each step's `sourceNote`. The maintainer texts `settled[].reason` and
  `check.note` are English, name files and say who read what; they stay in the
  data and in the [classic format](classic-format.md) but **are not shown in
  the app**, and no disclosure holds only them. The source section is drawn
  again when the catalogue's names arrive and keeps being open.
- **Nutrition per portion** (closed `<details>` on the dish, first of the closed
  sections; `src/screens/classics/nutrition-block.ts`, view logic
  `src/classics/nutrition-view.ts`, texts `src/strings-nutrition.ts`). Shows the
  figures of one portion for the chosen portions, drawn again when they change:
  energy (kcal and kJ), protein, fat, carbohydrate and, when every counted
  ingredient has the figure, fibre and salt, **rounded by the engine**
  (`roundNutrition`); the app does no arithmetic. Then the coverage in words
  ("Counted 2 of 3 ingredients."), the data source (USDA FoodData Central, SR
  Legacy) and that it is not a food label. **A second tap** ("What was left
  out, and how it is counted", `.nutrition-more`) holds the list of what was
  not counted ("Not counted: name (no amount)."), the share of the weight the
  figures rest on where it can be stated, that amounts are raw and as the recipe
  gives them, and the rounding rule. An ingredient is found in the notebook
  first, then in the catalogue; a variety without its own density or unit
  weight takes its parent's. **With too few ingredients counted** (none, one,
  or fewer than a quarter of them; a judgement, `MIN_COUNTED` and `MIN_SHARE`
  in `nutrition-view.ts`) there are no figures, only one short line
  ("Nutrition cannot be worked out: too few ingredients have an amount and
  nutrient data."), and everything else is behind the second tap. **It never judges**: no
  "healthy", "high" or "low", no colour, no traffic light, no comparison with a
  daily value, no portion reference (none was found in a source that could be
  read, [evaluation](nutrition-evaluation.md#what-was-built)); the wording test
  scans `strings-nutrition.ts` and a test lists the words it must not contain.
  **Tests:** `test/nutrition-view.test.ts`, `e2e/classics-nutrition.mjs`.
- **Cooking** (`#/classic/<id>/cook`, portions as chosen on the dish). One
  step: "Step 3 of 8" as a heading, the component it belongs to, the text,
  the lines it uses with their amounts, time and temperature as the source
  gives them, a progress bar. "Back" and "Next" are 56 px high ("Finish" on the
  last step) and **stay on the screen**: they are a bar that sticks above the
  bottom navigation (`position: sticky`, `bottom: var(--nav-real-h)`), so they
  are reachable without scrolling at 360 x 720 however long the step is; the
  step and the whole recipe scroll under it. Only the cooking `note` of a line
  is shown here, never a remark about the source or the source's wording (those
  are in the Source section of the dish). On a step change focus moves to the
  step heading. **Test:** `e2e/classics.mjs`, `e2e/german.mjs`. "Whole
  recipe" opens the whole recipe in place. The screen is kept awake with the
  Wake Lock API where the browser has it (`src/shell/wake-lock.ts`); where it
  has not, or refuses, nothing happens and nothing is shown.
- **Technique note.** The engine's `techniqueNotes` says where a note shows
  (first step that uses a technique not marked as learned). The note shows
  `watch` in one or two sentences; behind a tap `why`, the level (studied,
  textbook, kitchen test, authority, tradition, in words) and the sources with a link. "I know this"
  stores a skill record (`skills` kind, `skill-<technique>`) and the note is
  not shown again on any dish. Nothing is marked automatically. The write does not redraw the
  other screens, so the cook keeps the place and focus (focus goes to the
  status line "Marked as learned: ...").
- **Handling rule beside a step.** The engine's `handlingRules` (ingredient or
  group above it, the dish's techniques as `used`, learned skills left out)
  says which rules apply; `src/classics/handling-view.ts` places them. A rule
  shows once per dish, under the lines of the first step that uses its
  ingredient: "Handling: <ingredient>", the rule in one or two sentences, and
  behind a tap why, level and sources (the same card as the technique note).
  At most two notes of any kind on a step, the technique note first; a rule
  that does not fit waits for the next step that uses the same ingredient. It
  fades with its skill: "I know this" on a rule stores the same skill record
  as on the technique note, so both are gone on every dish, and "Teach again"
  in Settings brings both back. Texts follow the content language.
- **Substitutes ("Instead").** An ingredient line whose ingredient (or a group
  above it) has substitutes (`substituteEffects`) gets a quiet "Instead"
  button (44 px, `aria-expanded`). It opens, under the line, each replacement
  with the factor in words when the source gives one ("Amount: about half",
  from the data, no arithmetic in the app), what changes, and behind a tap the
  level and sources. Offered on the dish screen, on the lines of a step and in
  the whole recipe; reference knowledge, so it never fades and has no "I know
  this".
- **End of cooking.** "Done cooking" offers "Keep in my notebook": `copyClassic`
  makes the records (version 1 of a new dish and its components, with the
  source in `x-origin` and in the version's `change`), the app writes them
  (the catalogue ingredients first, as the picker does) and opens the new
  dish. A classic with a `wanted` ingredient is refused by the engine; the
  offer is then replaced by one neutral sentence naming the ingredient. A
  classic itself is never written to the store.
- **Settings.** "Language" (see [Language](#language)). "Skills you marked as learned"
  lists each with "Teach again", which stores the mark taken back (the record
  stays) so the note shows again.
- **Shipped content is its own file.** The build writes the dishes of
  `data/classics/` and the technique notes of `packages/engine/data/techniques/`
  to `dist/classics.json` (`format: culina-classics`); `src/main.ts` fetches it
  at start together with the notebook (`loadContent` in
  `src/classics/content.ts`), the service worker precaches it, so it works
  offline, and `main.js` carries neither dishes nor notes. If the file is
  missing or unreadable the lists are empty and the app works with zero dishes.
  `test/build.test.ts` checks that no dish or technique id is in `main.js`.
- **Test content.** `?e2e-content` lets the browser test hand the app fictional
  example dishes and an example technique
  (`test/fixtures/classics-example.json`) on `globalThis.__culinaContent`
  before it loads (`src/classics/content.ts`); without that query nothing is
  read from there.

# Language

One setting decides the language of the whole app: "Language" in Settings, with Follow device
(German when the device's first language is German, otherwise English), English and Deutsch,
kept in `localStorage` (`culina.lang`) like the theme. English is canonical, German is supported.

- **Own texts.** `src/strings.ts` picks `stringsEn` or `stringsDe` once, when the app starts, so
  screens keep importing `strings` as before and module-level constants stay valid. Changing the
  setting stores the choice and reloads the app (`location.reload()`; the hash stays, so the same
  screen opens in the new language); a choice that cannot be stored is not applied and says so.
  `<html lang>` is set at start from the same setting; the manifest and the `<noscript>` text in
  `index.html` stay English because they are read before any script runs.
- **Same keys.** The German set is `src/de/strings-app.ts`, `strings-stock.ts`, `strings-cook.ts`,
  `strings-classics.ts`, `strings-nutrition.ts`, each typed as the English object (`typeof`), so a
  missing key or a different function signature does not compile. **Test:**
  `test/strings-de.test.ts` (equal keys, equal kind of value, equal number of arguments, every
  argument used in both, no judging word in German), `test/strings.test.ts` (trimmed, short,
  navigation equals titles, in both sets).
- **Ingredient names.** `displayName` in `shared/names.ts`: the German name when the language is
  German and the record has one, else the canonical English name. Used for the notebook's
  ingredient names, the stock lists, the finder, the pickers of the editors (also the catalogue
  section, where the German name leads and the English one stands beside it) and the classics.
  Where the catalogue has no German name the English name is shown as it is; names are never
  invented. Search still finds a record by any of its names. **Test:** `test/locale.test.ts`.
- **Numbers.** Input accepts `2.5` and `2,5` in both languages (`shared/parse.ts`). Output has a
  decimal comma in German (`formatNumber`, `formatMass`, prefilled input fields, the time and the
  temperature of a step: "1,5 bis 2,5 Std."; `withDecimalMark` in `shared/locale.ts`); the engine never
  formats and knows no language. The strings that build a time or a temperature take the number as
  text already formatted, so a new text cannot print a decimal point by itself. **Test:**
  `test/locale.test.ts`, `e2e/german.mjs`.
- **Ratios.** The names and notes of the shipped ratios are in `strings.ratios.seed` and the role words
  ("flour", "water", ...) in `strings.roles`, English and German with the same keys
  (`test/ratios-view.test.ts` checks that every shipped ratio and role has both); the table columns, the
  calculator's choices and the comparison use them. Nothing of a ratio card is English in German mode.
- **Example data.** "Add example data" stores the texts of the examples in the language the app speaks
  (`demo/german.ts`: names, notes, the source of a made-up figure, the example method); the example
  ingredients carry their German names as `names.de` with the source "Example data, not a source".
- **Layout.** German labels are longer (Verhältnisse, Notizbuch), and with four entries
  every label is one line at 320 and 360 px, also with a wide system font such as DejaVu Sans; no
  soft hyphens, no smaller type, no second line (`e2e/navigation.mjs`).
- **Test:** `e2e/german.mjs` chooses German through the setting, walks the main screens and the
  classics flow at 360 x 720 (no horizontal scroll, targets at least 44 x 44, navigation labels
  inside their entries, no console error), chooses English again, and repeats the walk with the
  browser locale `de` and the setting on Follow device.

# Navigation

- **One back stack: the browser history.** Every destination is a hash
  route (`src/router.ts`, no framework); a tap on the navigation adds an
  entry, the browser's back button and the system back gesture go back.
  There is no second stack and no in-app back button at this level.
  **Test:** `test/router.test.ts`, `e2e/smoke.mjs` (back returns to
  Ratios).
- **Four destinations** (the usual guidance for a bottom bar is three to
  five): **Start**, **Cook** (German Kochen), **Notebook** (Notizbuch) and
  **Ratios** (Verhältnisse), in that order. A route belongs to one of them
  (`navEntryFor` in `src/router.ts`): Cook holds the finder, the stock and the
  classics with their cooking mode; the Notebook holds Components and Dishes,
  two parts shown as a row of two equal links at the top of their lists
  (`src/screens/section-tabs.ts`). The old routes (`#/components`, `#/dishes`,
  `#/classics`, `#/cook`, `#/stock`, `#/settings`) work as before, links,
  bookmarks and tests included, and the navigation marks the destination
  they belong to. The Notebook entry opens on Components.
- **Settings is the gear** at the right end of the header, a 44 px target
  named for assistive technology ("Settings", "Einstellungen") and marked
  `aria-current` on the Settings screen; it is the first stop after the skip link.
  It is there on every screen of a phone. From 720 px it is not in the header:
  Settings is the last entry of the side rail.
- **Every former destination is at most two taps from Start**: Ratios, Cook
  and Settings one, Components one, Dishes, Classics, Use up first and the
  stock two (Start also has an entry for each tool); the stock is two taps
  from every screen (Cook, then "What is there"). **Test:** `e2e/navigation.mjs`.
- **Phone first.** Below 720 px width a bottom navigation bar with icon
  and label; from 720 px a side navigation with the same four destinations and
  Settings at its bottom ([design](design.md#layout-and-breakpoints)).
  Both are the same `<nav aria-label="Main">`. Each label is one word on one
  line at 320 and 360 px, in the default and in a wide font. **Test:**
  `e2e/smoke.mjs` at 320, 360 and 1000 px, `e2e/navigation.mjs`.
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
  first stop, which is the gear on a phone, Enter navigates and focuses the heading).
- **Names.** Every link, button, input and summary has an accessible
  name; icons are decorative. **Test:** `e2e/smoke.mjs`.
- **Texts for the experienced cook.** Short, no tutorials; guidance only
  in a collapsible `<details>`, closed by default. **Test:**
  `test/strings.test.ts`.
- **Theme.** Chosen on Settings, applied at once, kept on the device,
  applied before the first paint on the next visit
  ([design](design.md#themes)). **Test:** `e2e/smoke.mjs`,
  `test/prefs.test.ts`.

## Toast and Undo

One quiet message at a time (`src/shell/toast.ts`), above the bottom navigation on a
phone and in the corner from 720 px, with an optional action such as "Undo". **It goes by
itself after 10 seconds**, which is long enough to use Undo, **and when the user goes to
another screen** (the shell dismisses it on every navigation; a navigation within half a second of
the toast belongs to the action that showed it, such as Save followed by the opened record, and
keeps it). Undo after that is gone, as the [import](#the-import-screen) text says for a
reload. While a toast shows, the page has room under its last row (`--toast-space` on the
root, the bottom padding of the main area), so the toast never covers the last row of a list.
**Test:** `e2e/stock.mjs`.

# States

| State   | Behaviour                                                                                                                                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty   | Components, Dishes and Ratios: an empty search is one quiet line; a list without a detail (desktop) says to choose one. An empty notebook invites ("Add a component", "Add example data"). An open dish slot is an invitation, never an error.                                                 |
| Error   | The shell has no network and no data to fail on. One error exists: the theme cannot be stored (private mode, blocked storage, full). The choice then applies until the page closes and Settings says so in a `role="status"` line. **Test:** `test/prefs.test.ts` (the write reports `false`). |
| Offline | The whole app is precached: every screen, the stylesheet, the icons and the manifest work without a connection and there is no offline banner, since nothing needs the network. **Test:** `e2e/smoke.mjs` (offline reload renders and navigates).                                              |

# Export and import

Issue #18. Engine rules: [exchange](exchange.md). Code: `src/exchange/` (logic, no DOM),
`src/screens/settings-data.ts`, `src/screens/import/`, `src/shell/backup-banner.ts`,
`src/store/bulk.ts`. **Test:** `e2e/export-import.mjs`, `e2e/cooklang-flow.mjs`,
`test/reminder.test.ts`, `test/cook-model.test.ts`, `test/store-bulk.test.ts`,
`test/router-import.test.ts`. Screenshots: `docs/screenshots/import-*`, `settings-*`,
`backup-banner-360x720-light.png`.

## Settings, Your data

Export everything, Import from a file (`#/settings/import`), the date of the last export, and the
reminder period. **Export** hands the browser one file, `cooks-notebook-YYYY-MM-DD.json`
(no name, no time of day), built by the engine from the store's live records: every version,
tasting note and ingredient; not drafts, not tombstones. It makes no request. Nothing to export
gives a quiet sentence.

## Backup reminder

The date of the last export is kept in `localStorage` (`culina.lastExport`) with the period the
user chose (`culina.reminderDays`: Never, 7, 14, **30 (default)**, 90 days). A quiet line above the
screen (never a dialog) shows only when the notebook has changes that no export holds (some
row's `updatedAt`, tombstones included, is later than the last export) **and** the period has
passed since the last export, or, with no export yet, since the oldest change. Text: "Your notebook
has changes that are in no export yet." / "... The last export was N days ago." with "Export now"
(links to Settings) and "Not now" (hides it until the app is reopened). Exporting hides it.
**Test:** `test/reminder.test.ts`; `e2e/export-import.mjs` injects the clock with
`?e2e-now=<instant>` (`src/store/e2e-clock.ts`, inert without the query) instead of waiting.

## The import screen

`#/settings/import`: choose a file; `.cook` files go to the Cooklang step, everything else is read
as an export file. A file that cannot be used (not JSON, not an export, a record that does not fit
its schema, a repeated id, a newer version) ends in one quiet sentence plus "Nothing was changed."
and **never touches stored data** (the engine returns no records and nothing is written before
the user confirms). Older versions would be migrated by the export migration chain (none yet).

**JSON files.** The summary lists counts per entity. Then:

- **Merge** (default). By id: records the notebook does not have are added, identical ones are
  left, records with the same id and other content are listed as conflicts, and the user picks
  "Keep mine" or "Take the file's" per conflict or "for all". **Newer wins is never assumed.**
  A component or dish version record is immutable ([data model](data-model.md#version)): such a
  conflict offers no choice, the notebook's record stays, and tasting notes of the file that
  belong to that version are left out and counted. A record removed here earlier is added again.
- **Ingredients that may be here already.** A file ingredient whose id the notebook does not know but
  whose name it does (`matchIngredients`: same name ignoring case, spacing and plural, or sharing
  all words with one) is listed with the exact match preselected (never a close one) and
  "Add as a new ingredient"; a chosen match makes the file's lines, slots, stock, parent links and
  pairings point at the notebook's ingredient and no duplicate is created. The candidate list
  comes from one function, `candidateIngredients()` in `src/exchange/candidates.ts` (the
  notebook's ingredients; the Cooklang step adds the catalogue's, see below).
- **Replace everything.** Asks first with an inline row ("Replace the N records here with the M
  records of the file?"), then writes the file's records and gives the others a tombstone.
- Both act at once with an **Undo** toast (10 s): the previous version of every touched record is
  put back, a record that was new is removed, other records are left alone. Deviation: the
  store's `backup` object store is cleared at every open and only holds migration data, so Undo
  keeps what it needs in memory; after the toast or a reload it is gone (hence the question before
  "replace").

**Cooklang files.** Nothing is saved until the step is complete and the user presses Save.
The step shows what was read (ingredient lines, steps; cookware, timers and notes stay as words in the
steps; `=` locks are not kept) and asks, in this order:

1. Name, output weight in grams (prefilled from a mass `yield`), percent base (among the roles
   given below), and, when a component of that name exists, "A new component" or "A variation of
   ...".
2. **Which ingredient each name means**, once per name (the same name on other lines follows the
   choice). Offered: the exact match (preselected, only this), close matches (the notebook's
   ingredients first, then the shipped catalogue's, marked "From the catalogue"; the catalogue is
   loaded when the step opens, and if it cannot be loaded a quiet line says so and the notebook's
   ingredients are still offered), a component for a
   recipe reference `@./path`, "Create a new ingredient" and, when the tree knows classes of the
   matches, "File it under (optional)": a new ingredient may be filed under a close match or
   its parent class (the ingredient tree, materia's `buildTree`, parent links), so a match can be
   an ingredient or its class. Nothing is created that the user did not see; "Create a new
   ingredient for every name left open" is one button. Save waits until every name is decided.
3. **Amounts and roles per line**: as written (mass, or a volume or count Culina knows), from the
   ingredient's density or unit weight (only when it has one), "I weighed it" (grams) or "Leave open,
   keep as text". A line left open keeps the written quantity as its note and is **reported as
   unmeasured** after saving; nothing is guessed. A role is optional (lower case id).

Save writes the new ingredients and the component in one transaction as **version 1 of a new
family** (date from the clock, change "Imported from <file>", `parent` only for a variation); the
same file imported again is a new family or a variation, never an overwrite. A catalogue entry
chosen for a name (or as the class to file a new ingredient under) is copied into the notebook
with its parent chain in that save, the picker's way, and the lines point at the copy; Undo takes
the copies back too. Nothing is copied for a name left unconfirmed or when the step is left.
A toast offers Undo.
**Test:** `test/import-catalogue.test.ts`, `e2e/import-catalogue.mjs` (empty notebook, offline).

## Cooklang export

A component's detail has "Export as Cooklang": one `.cook` file for the shown version; one quiet
sentence says what it cannot carry ([decision](decisions/cooklang.md#what-is-lost): ratios and
percentages, roles, states, version history, other tasting notes, step characters that would read
as markup).

**Text:** `strings.importing`, `strings.backup`, `strings.settings`, `strings.cooklang`.

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
file except `sw.js`, `catalogue.json` and `classics.json` among them). On `install` it precaches the list and takes over
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

[^mixtura]: Mixtura, `docs/behaviour.md`, [apps/mixtura](../../mixtura), read 2026-11-18; no source code was read or copied.
