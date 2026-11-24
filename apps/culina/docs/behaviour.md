---
type: Specification
title: Behaviour
description: Screens, navigation, the ratio list and cards with the calculator and the neutral range display, the component and dish screens with role slots, interaction rules, states, offline behaviour and the installability check of Cook's Workbench, each rule with the test that checks it.
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

What Cook's Workbench does today. It has four screens; Ratios, Components
and Dishes have their content, and Components and Dishes can be written and
edited by the user ([editor](#editor)); what is entered is kept in the local
store. Colours, type and layout are in
[design](design.md). The audience is an experienced cook who wants the
numbers fast: no tutorial, no first-run tour. The same conventions as
Mixtura[^mixtura].

# Screens

| Screen   | Route                                                                               | Today                                                                                                                                                                                                                                                                                                                | Source                                               |
| -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Ratios   | `#/ratios`, `#/ratios/<id>`                                                         | The ratio list and the ratio cards ([below](#ratios))                                                                                                                                                                                                                                                                | `src/screens/ratios.ts`                              |
| Notebook | `#/components`, `#/components/<id>`, `#/dishes`, `#/dishes/<id>`, `#/dishes/random` | Two parts, Components and Dishes: the lists and the screens of one entry; Dishes lists the own dishes, for editing and building on ([components](#components), [dishes](#dishes))                                                                                                                                    | `src/screens/components.ts`, `src/screens/dishes.ts` |
| Cook     | `#/cook`, `#/cook/<id>/with`, `#/classic/<id>`, `#/classic/<id>/cook`               | One screen: the one list of every dish, own and shipped, under the one filter, with "Only with what I have" and the order "Use up first", the way to the stock and "Start from one ingredient"; the first screen ([below](#cook), [the one list](#one-filter-over-every-dish), [decision](decisions/cook-screen.md)) | `src/screens/cook/`, `src/screens/dish-list.ts`      |
| Stock    | `#/stock`, `#/stock/add`, `#/stock/<id>/edit`                                       | Reached from Cook, "What is there": the list, the quick entry and the detail of one item ([below](#stock))                                                                                                                                                                                                           | `src/screens/stock/`                                 |
| Settings | `#/settings` (the gear in the header)                                               | Theme (Follow system, Light, Dark), Your data (export, import, reminder; [below](#export-and-import)), the statement that data stays on the device, the engine name                                                                                                                                                  | `src/screens/settings.ts`                            |

An unknown route (`#/nope`, empty), and the old start screen `#/start`,
show Cook and rewrite the URL to `#/cook` without a new history entry. The
old address `#/cook/use-up` keeps the order "Use up first" and is rewritten
to `#/cook`; the old addresses of the country lists, `#/classics` and
`#/classics/<country>`, set the one filter to the shipped dishes (of that
country) and are rewritten to `#/cook`, also without a new history entry
([below](#one-filter-over-every-dish), [decision](decisions/cook-screen.md)).
**Test:** `test/router.test.ts`, `test/cook-list.test.ts`, `e2e/smoke.mjs`,
`e2e/navigation.mjs`, `e2e/dish-browse.mjs`.

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

**Keeps and the stock (meal prep, since 2026-11-20).** The editor has a
section **Keeps** after the yield: one row per storage place (fridge,
freezer, pantry; "Add a storage place" offers the first one not used yet)
with the days and a line on how it is kept. The figures are the user's own
and are stored with the source `user`; the app proposes none, because a
shelf life is a food-safety figure. Save refuses days that are no whole
number and a place given twice, at the row. The component shows the
entries ("Fridge: 3 days · airtight") and, on its current version, the
button **Made it: put it in stock**: it stores a new stock item for the
component, prepared today, and opens it. The stock item has a new field
**Where it lies**. Without it the dates of every place the component keeps
in are offered; with it only that place counts, and the use-by date is
derived from the day of preparation and the component's days
(`shelfLifeOf` in `src/screens/stock/lookup.ts`, the engine's
`stockExpiry` and `useBySuggestions`). The date is shown and counted in
the stock list, and never written into the item. Each "Made it" is a batch
of its own, so two batches keep their own dates. **Test:**
`test/meal-prep.test.ts`, `e2e/meal-prep.mjs`; in the engine
`test/keeps.test.ts`. Not proved: looked at in Chromium at 360 px in
English only; the test store is the in-memory one.

**Steps and cooking (since 2026-11-20).** A component with `steps` shows
them under **Steps**, one line per step: the word, the lines it uses, time,
temperature, the note ("Searing: Beef · 10 min · until brown"); a copied
step shows its text. Below stands **Cook step by step**, which opens
`#/components/<id>/cook` (`src/screens/component-cook.ts`, since
2026-11-21 the one cook screen of every origin, [dishes](#dishes)): the
screen of the shipped dishes with the component's own steps, one step at a time with
the lines it uses and their amounts, time and temperature, the note of a
skill at its first step until the skill is marked as learned, and the
handling rules of the ingredients in the step, "Instead" on a line
with substitutes, and the component's lines in "Whole recipe"
(`ownCookView` in `src/components/steps-view.ts`; the notes are placed by
the same `techniqueNotes` and `handlingNotes` as for a shipped dish). A
handling rule shows only for an ingredient that is in the catalogue or
under one of its groups: an ingredient the user made up has no rule. A
whole dish is cooked the same way ([dishes](#dishes)). **Test:**
`test/steps-view.test.ts`, `test/router.test.ts`, `e2e/steps-kit.mjs`.

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

**Shipped components in the same list** (since 2026-11-22, issue 44 point 4,
decided by the owner). The list (`src/screens/notebook-list.ts`, the same
pane as the Notebook's Dishes; rows in `src/components/list.ts`) holds the notebook's components and every component
of every shipped dish and base, a base's alternatives included
(`shippedEntries` in `src/components/shipped.ts`): 82 from the 68 dishes on
2026-11-23. Two groups, each under a heading: "In my notebook" first (in its
order; while it has none, it says so and offers the example data), then
"Shipped with the app", sorted by the dish's name and then in file order, so
the parts of one dish stand together. A shipped row says "Shipped"
("Mitgeliefert") and names its dish under the name ("Sauce · Shipped ·
Tomato sauce"). Beside the search, a select **From** with "All components",
"Mine" and "Shipped" (the origin values of the [one filter](#one-filter-over-every-dish),
kept while the page is open, not stored) leaves a group out; the search also
finds a shipped component by its dish's name. Nothing shipped is written to
the store. The dish editor, Swap and the finder still offer only the
notebook's components (`listComponents` is unchanged).

**A shipped component** opens at `#/components/<classic id>.<component id>`
(`shippedKey`, `parseShippedKey`): ids are slugs or `u-` plus a UUID and hold
no dot, so the address cannot meet an own id or `new`; the router is
unchanged. The screen (`src/screens/shipped-component.ts`) is read-only: the
name, the role and "Shipped with the app", "Part of <dish>" (a link to the
dish), Keep in my notebook, the portions of the dish (shared with the dish
screen) with "The amounts are for these portions of the whole dish", the
lines with their amounts (the dish screen's own view, `dishView` through
`deriveClassic`; a line that names another shipped component links it, with
the "component" tag), the component's own steps numbered from 1 (`cookView`),
and the dish's source closed at the foot, its remarks narrowed to this
component's lines and steps. No edit, no history, no versions, no "Cook step
by step" (the dish has it). **Keep in my notebook** copies the component and
the components its lines name as version 1 of own components with their role
and origin (`keepShippedComponent` in `src/classics/keep.ts`, the engine's
`copyClassicComponent`, [engine rules](engine-rules.md));
the ingredients are adopted from the catalogue as when a dish is kept; then the
new component opens. The components it names are written before it, so a
store failure half way never leaves a component naming one that is not there
(`test/components-shipped-order.test.ts` pins the order). **Not rolled back:**
a store failure half way leaves the ingredients already adopted and the
components already written in the notebook, as when a whole dish is kept; the
screen shows the store's message under the button. No test makes the store fail half
way. A component whose lines, or those of a component it
names, still have an ingredient the catalogue lacks shows "This component
cannot be kept yet: the notebook does not know Water. The recipe stays here to
cook." instead of the button (40 of the 59 on this day, mostly for water).
**Test:** `test/components-shipped.test.ts` (fictional example dishes,
in-memory store), `e2e/components-shipped.mjs` (the real shipped content, 360
and 1000 px, English and German). Not proved: a screen reader; a real phone.

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

**Engine errors never crash a screen.** A cycle, an unknown component, a
percent line whose base cannot be weighed, an output weight asked of a
component that has none, or an unusable number gives one
quiet sentence in the place of the amounts ("These components use each other
in a circle: ...", "The output of X is not weighed yet, so it cannot be
scaled."), and the rest of the screen renders. **Test:**
`test/components-view.test.ts` with the engine's error vectors and a broken
fixture.

**Amounts as a cook writes them (since 2026-11-21).** A tester found that
one onion written as "1 pcs" (an ingredient without a piece weight) replaced
the lines, the yield and the raw list with one sentence, and that the steps
then named the lines by their ids ("Simmering: fdc-group-tomatoes"),
because the step lines took their names from the same engine result as the
amounts. Now:

- **One line that cannot be weighed is one line.** The engine lists it in
  `unconverted` and leaves it out of the sums, as a line without amount
  ([engine rules](engine-rules.md#line-grams)). The Lines table shows it as
  written ("1 pcs", "1 Stück") with a quiet note ("no piece weight recorded,
  not in the sums"); the yield's input adds up the other lines and says "The
  input counts only the lines whose amount can be weighed."; the raw list
  adds up the rest and lists it under "Not weighed"; the editor shows the
  same note in place of the line's figure; the dish and cook screens show
  it with its amount (pieces scaled and rounded to a half) and the note
  beside its own; the nutrition lists it as not counted. Only a percent line
  that rests on such a line still gives the one sentence.
- **A name is never an id.** Every line, on every screen, takes its name
  from the notebook (`refName`), whatever the engine says about the amounts
  (`lineViews` in `src/components/steps-view.ts`). An id shows only where
  the record itself is gone.
- **One rule for an unweighed component in a dish.** The dish's total list
  and its cook screen both take one run of a component without a weighed
  output as weighing what goes into it (the engine's `withoutYield:
'input'` and `runGrams`), so they give the same amounts; the total list
  says quietly "The output of X is not weighed: one run is taken as
  weighing what goes in." Before, the total list left the component out
  ("Not added up") while the cook screen computed it. The component's own
  screen still scales by a factor until it has an output weight.
- **Pieces and spoons.** A piece count is shown to a whole or a half, the
  exact count quietly beside where they differ ("5½ pcs (5.33)"); a volume
  the source wrote in a spoon or cup is shown in that measure to a quarter
  ("½ tbsp", "1 cup"), the millilitres beside where they differ. Both rules
  are the engine's (`roundPieces`, `roundMeasure`,
  [engine rules](engine-rules.md#rounding)) and change only what is shown:
  the derived amounts, the sums and the nutrition keep the exact figures.
- **Unit names.** Every unit has a name per language in one table
  (`strings.units`, written through `src/shared/units.ts`): the unit
  selects of the editors and the stock, the stock rows, the finder's
  shortfalls and the history ("1 Stück → 100 g"). German: g, kg, oz, lb,
  ml, l, TL, EL, Tasse, Flüssigunze (brit.), Gill (brit.), Pint (brit.),
  Quart (brit.), Stück; English: tsp, tbsp, cup, fl oz (UK), gill (UK),
  pint (UK), quart (UK), pcs. The stored value stays the unit id.

**Test:** `test/amounts-written.test.ts` (the tester's sauce: rows, input,
step names, cook amounts, dish total list and cook screen by one rule,
pieces and spoons, unit names), `test/components-view.test.ts`,
`test/dishes-view.test.ts`; in the engine `test/components.test.ts` and the
vectors `expand-unconverted-*`, `expand-without-yield-*`,
`expand-error-cannot-convert-percent-base`, `yield-unconverted-line`,
`round-pieces-*`, `round-measure-*`, `household-measure-*`;
`e2e/amounts-written.mjs` (the sauce and a dish at 360 px in English and
German: lines, input, raw list, step names, both cook screens, the
dish's total list and note, the editor's unit names). Not proved: a real
phone, desktop width, the stock and history screens in a browser (the unit
names there are checked through `unitName` only); the rounding steps (a
half, a quarter) are an assumption without a source.

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
view logic in `src/dishes/` (`shown.ts`, `slots.ts`, `raw.ts`, `roles.ts`).

**One dish screen and one cook screen for both origins (since
2026-11-21).** A dish looks and works the same whether it is in the
notebook or shipped. One view model, `ShownDish` in `src/dishes/shown.ts`
(pure, no DOM), is built from a shipped classic (`shownOfClassic`, through
`deriveClassic`: `dishView`, `cookView`, `nutritionView`, `entryOfClassic`)
and from a dish of the notebook (`shownOfDish`: `slotRows`, `dishParts`,
`dishRaw`, `ownNutritionView`, `entryOfDish`). One screen module,
`src/screens/dish-detail.ts`, draws it for `#/dishes/<id>` and
`#/classic/<id>`; one cook screen module, `src/screens/component-cook.ts`,
serves `#/dishes/<id>/cook`, `#/components/<id>/cook` and
`#/classic/<id>/cook`. The addresses did not change.

- **Top to bottom, for both:** Back; the name; the original name (only a
  shipped dish has one); the **quiet line**: course, cuisine, "Without
  meat and fish" or "With meat or fish", and the origin ("In my notebook",
  "Shipped with the app"), each part only where it is known (an own
  dish's course and cuisine are read where the record has them, its meat
  flag is the derived one of the lists and is left out when not known);
  the note of an own dish; what the dish can do (own: version, Edit and
  the rest as before; shipped: **Keep in my notebook**, the same copy as at
  the end of cooking, left out for a dish with an ingredient the catalogue
  lacks); the character chips (without "with meat" and "with fish", which
  the quiet line says); **Portions**; **Ingredients**, a heading per
  component and "For the dish", each line with its amount for the
  portions, its note, "optional", the settled mark of a shipped line and
  "Instead" where there are substitutes; for an own dish the role slots
  with Swap ([below](#dishes)); **Cook step by step**, where there are
  steps; **Method**, every step grouped by the part it belongs to; for an
  own dish "What goes in, all the way down"; then behind a tap **Nutrition
  per portion** and, for a shipped dish, **Source**.
- **Portions** are kept in memory per dish while the app is open
  (`src/classics/session.ts`): a shipped dish starts at 2, an own dish at
  its stored `portions` or 1. The cook screen cooks the portions chosen on
  the dish screen, for both origins; before, an own dish was always
  cooked for its stored portions.
- **An own dish's ingredients.** A component that fills a slot is a group
  with its lines at what the dish needs of it (the grams its slots ask for
  over one run, as when cooking); a component ready in stock still lists
  its lines. The "For the dish" lines are the slots with their totals.
  The role slot table below says the same totals again, with the role,
  the amount per portion and Swap.
- **An own dish's method** lists every step the cook screen cooks, the
  components' first, one line per step as on a component ("Pan-frying:
  Beef · 8 min"); before, only the assembly was listed.
- **Nutrition per portion of an own dish** counts its raw ingredients all
  the way down (`dishRaw`, the engine's expansion) with the same
  `dishNutrition`, rounding, coverage and words as a shipped dish. An
  optional slot is not counted, as on a shipped dish. A line without an
  amount is listed as not counted with "no amount"; a slot that cannot be
  added up (a component without an output weight, an unknown component, an
  amount without a known weight) with "weight not known" (since
  2026-11-21: `unweighed`). Both keep the figures back under the same rule
  as a shipped dish; an own line without amount reaches the view by its
  name only, so it is never taken for a seasoning (not proved otherwise:
  `UnmeasuredRow` carries no ingredient id). A slot of a group (milk, egg)
  is counted with the group's usual member where its grams are known; the
  notebook's own conversion of a cup of a group to grams is not changed
  here. Cooked or prepared ingredients are counted with the
  figures of the raw food, as the catalogue gives only those.

What each screen had that the other lacked, before (2026-11-21):

| On the screen of | Shipped had, own lacked                                                                                      | Own had, shipped lacked                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| the dish         | original name, quiet line, ingredient lines per component, "Instead", method, nutrition, source              | note, version and its actions, role slots with Swap and open roles, "all the way down" |
| cooking          | ingredients in "Whole recipe", "Instead" on a step's lines, the portions of the dish screen, Keep at the end | "From stock" for a ready component, a back link at the end                             |

Now given to the other origin, because the function was there: the quiet
line, the ingredient lines per component, "Instead", the whole method,
nutrition per portion and the dish screen's portions reaching the cook
screen for an own dish (and "Instead" and the ingredients in "Whole
recipe" for an own component); Keep in my notebook on a shipped dish's
screen. **Not built:** Swap, role slots, open roles and "all the way
down" for a shipped dish (a shipped slot's amount is in the source's
units, the slot table is in grams, and shipped dishes are never written);
a source block, settled marks and an original name for an own dish (no
data); versions, history and tasting notes for a shipped dish (it is
read-only; Keep makes it an own dish that has them); folding Swap into
the ingredient lines so that the role slot table can go (the browser
checks of the slot table would have to be rewritten).

**Test:** `test/dish-shown.test.ts` (every shipped classic at 2 and 5
portions against `dishView`, `cookView` and its list entry; a notebook in
memory: the groups, the totals, the portions, the steps against
`dishCookView`, the stock, the slot rows, the nutrition and what it leaves
out, course and cuisine read defensively), `e2e/dish-cook.mjs` (the quiet
line, the groups, the nutrition tap and 3 portions reaching the cook
screen at 360 px), `e2e/classics.mjs` (the quiet line and Keep on a
shipped dish). Not proved: the nutrition test uses the catalogue's own
records as the notebook's ingredients and made-up output weights; the
browser checks ran in Chromium at 360 and 1000 px in English only; no
real phone.

**Assembly and cooking a dish (since 2026-11-20).** The dish editor has a
section **Assembly** after the slots: the steps of the
[kit](#editor), with one difference, a step ticks **fillings** (the slots
of the dish, each named by what fills it) where a component's step ticks
lines. A slot gets its `key` when a step first ticks it (`s1`, `s2`, ...).
The dish shows the assembly, one line per step ("Serve: Patties, Mash"),
and **Cook step by step**, which opens `#/dishes/<id>/cook`: the screen of
a component ([components](#components)) for the whole dish
(`dishCookView` in `src/components/steps-view.ts`,
`src/screens/component-cook.ts`).

- **Order.** The components in the order of the slots, each with its own
  steps, then the assembly. A step says which part it belongs to
  ("From: Patties"). A component that fills two slots is made once. A
  slot filled by an ingredient has no steps.
- **Amounts.** A component's lines show what the dish needs: the grams
  its slots ask for, times the portions, over one run of the component
  (its recorded yield, else the sum of its lines). A slot without an
  amount leaves the component as it is written. The portions are the
  ones chosen on the dish screen (before any choice, the ones stored
  with the dish).
- **Ready in stock.** A component with a stock item is not cooked again:
  its steps are replaced by one step, "From stock: Mash", and its skill
  is not taught there. This looks only at whether an item is there, not
  at its amount or its date, and nothing is taken out of stock.
- **Notes.** The note of a skill shows at its first step in the whole
  dish, and the handling rules of the ingredients as for a component.

**Test:** `test/dish-cook.test.ts`, `test/router.test.ts`,
`e2e/dish-cook.mjs`. Not proved: looked at in Chromium at 360 px in English
only; the unit tests build the notebook in memory.

**Alternatives and the random pick (since 2026-11-20).** A dish is put
together from components, and a component names the role it usually fills
(`role`). Both features read that and store no list of their own
(`src/dishes/alternatives.ts`, `pick.ts`, `session.ts`).

- **Alternatives of a slot.** The components of the notebook, in their
  current version, whose `role` is the role of the slot, other than the
  one that fills it. The role is the slot's, not the filling's. A slot
  filled by an ingredient has none, and a component without a role is
  nobody's alternative.
- **Swap.** On the current version of a dish a slot with alternatives has
  **Swap** under its filling; it opens a row with one button per
  alternative. Choosing one changes the filling for now: the slot keeps
  its role, its amount per portion and its key, so the totals, the list of
  what goes in, the assembly lines and the cook screen follow. The slot
  says "swapped for now", and under the table stands "Swapped for now.
  Nothing is stored." with two buttons. **Back to the stored fillings**
  drops every swap of the dish. **Keep as my version** stores the dish as
  shown as the next version of its family, by the rule of the editor's
  Save (`asNextVersion`), with the change named ("Rice in place of Mash"),
  and opens that version. An older version of a dish has no Swap.
- **How the swap reaches the cook screen.** The swaps are kept in memory
  per dish version and slot (`src/dishes/session.ts`, as
  `src/classics/session.ts` keeps the step). The dish screen writes them;
  `#/dishes/<id>/cook` reads them and cooks the stored dish with those
  fillings (`withSwaps`). They last until the page is loaded again, until
  they are dropped or kept; the address does not carry them, so a link to
  the cook screen opened elsewhere cooks the stored dish. A swap sets the
  step of the cook screen back to the first.
- **Random pick**, `#/dishes/random`, reached by "Put a dish together at
  random" beside "Add a dish" (`src/screens/dish-random.ts`): what do I
  feel like? The screen shows the controls of the
  [one filter over every dish](#one-filter-over-every-dish) at its top; a
  choice made here is stored there (`culina.dishes`) and holds for the list
  and the finder too. A change by keyboard keeps the focus on the control
  that was changed (`replaceDishFilterControls` in
  `src/screens/dish-filter.ts`). Under it, two rolls.
- **Surprise me with a dish** (since 2026-11-21, `src/dishes/pick-dish.ts`).
  **Surprise me** takes one whole dish by chance, each with the same share,
  among the entries of both origins (`allEntries`) that pass the filter.
  The tick "Only what the stock allows now" narrows it to the dishes whose
  every required line the stock covers today, as the finder judges it: the
  screen asks `find` (the notebook's dishes) and `classicsWithin` (the
  shipped ones) with no line allowed to lack and keeps the complete ones
  (`src/dishes/ready-now.ts`; the finder is called, not changed). The result
  names the dish as a link to its own screen (own or shipped), its origin,
  course and cuisine, and "By chance among n dishes."; with more than one
  dish **Roll again** gives another, never the same. When nothing fits, the
  quiet sentence of the list ("No dish fits these choices.", or "The stock
  allows none of these dishes now." when only the tick empties it) and
  **Show all**, which drops every choice of the filter and the tick and
  rolls again. A dish rolled earlier that no longer fits a changed choice
  is no longer shown. The entries are read once when the screen opens (and
  again when the catalogue has loaded), not on every choice or roll.
- **Without own components (since 2026-11-23)** the section "Put one
  together from your components" shows no ticks and no roll: one sentence
  says that the notebook has no components to put together yet, and a
  link leads to the Components list, where a shipped one is kept or a new
  one written. Before, the roll answered "No component of yours has this
  role yet" for every role. **Test:** `e2e/editor-pairing.mjs` (German).
- **The roll per role** ("Put one together from your components"). The cook
  ticks the roles wanted (main element, sauce and starch are ticked at
  first), may tick "Only what is ready in stock", and presses **Roll**:
  one component per ticked role, by chance. Without a character or
  "Without meat and fish" chosen, each candidate of a role has the same
  share; with one chosen, see below: then the draw is even over the
  combinations that fit, not over the candidates of a role. A component counts as in stock when a stock item of it
  exists, whatever its amount or date, as on the cook screen. A role with
  more than one candidate has **Roll again**, which gives another
  component of that role and leaves the other roles. A role without a
  candidate says so in the quiet text colour ("No component of yours has
  this role yet.", "Nothing with this role is in stock."). The screen says
  in one line what the pick does not know: "The pick is random within each
  role. It does not know what goes together." **Make it a dish** opens the
  dish editor with one slot per picked component (role and filling; name
  and amounts are still to be given), the way a ratio hands its amounts to
  the component editor (`src/editor/prefill.ts`); nothing is stored until
  the dish is saved there. The ticks and the last picks are kept in memory
  while the app is open. Each pick is kept under its role, never by its
  place in the list, so a later change of what a role may hold cannot move
  a component into another role's row. Ticking or unticking "Only what is
  ready in stock" drops the picks (they were rolled under the other choice);
  the next **Roll** follows the tick.
- **The roll per role under the filter** (since 2026-11-21,
  `src/dishes/pick-judge.ts`, `rollFitting` in `pick.ts`). A combination is
  a dish that does not exist yet, so it is put together in memory (one slot
  per picked component, no amounts) and judged as a dish of the notebook is
  (`entryOfDish`): its characters, and "without meat and fish" derived the
  same way, so a component with an ingredient the catalogue does not place
  is never meat-free. Without amounts a character that needs a share is
  judged on what is there, as for a dish of the notebook without amounts.
  With a character or "Without meat and fish" chosen, the roll is among the
  combinations that have it, and a quiet line says "Rolled among the
  combinations that are like your choice above." Every combination that
  fits has the same share, so a component that fits with more of the others
  comes up more often: with main A or B and sauce x or y, where A+x, A+y
  and B+x fit, A comes up in two rolls of three. The search is bounded:
  up to 200 combinations (the product of the candidates of the ticked roles
  that have any) every one is judged and one of those that fit is taken;
  above, 60 combinations are drawn by chance and the first that fits is
  taken. None found: "No combination of your components is like that."
  when all were judged, and "No combination of your components was like
  that in 60 tries by chance (of n)." when only tries were made, since then
  one may exist. **Roll again** on a role stays among its candidates that
  fit with the other picks, and is offered only where there is a second
  that fits; the other roles keep their picks, and a role with no other
  that fits keeps its own. Origin, course, cuisine and "Only with every amount given"
  say nothing about a combination of components and do not apply to this
  roll; the screen does not judge them for it. A change of the character or
  "Without meat and fish" drops the picks and "none found", since they were
  judged by the choice before; this holds too when the choice was changed
  on the list or in the finder: the screen compares, when it opens, the
  stored filter with the one the picks were judged under. "Nothing fits"
  of **Surprise me** is dropped the same way when the filter or the tick
  differ.
- **The pick is a pure function.** `roll`, `rollRole`, `rollFitting`,
  `rollRoleFitting` and `surpriseDish` take the roles or entries, the
  candidates, the stock question, the judge and the random numbers as
  arguments; the screen passes `Math.random`. The engine stays without
  randomness.
- **In the dish editor**, a slot added with "Add an ingredient or component" takes the usual
  role of the component picked for it, as long as nobody chose the slot's
  role by hand; before, it kept the first open role, so a mash picked into
  a new slot stood there as a sauce and had the sauces as alternatives.

**Test:** `test/dish-swap-pick.test.ts` (candidates, alternatives, the
swapped dish as shown and as cooked, the session, the next version, the
pick with fixed numbers, only from stock, an empty role, rolling again,
the prefill), `test/dish-pick-filter.test.ts` (with fixed numbers: every
dish of both origins reachable, the filter and the stock keys narrow the
pool, rolling again never gives the same dish, none fits; the combinations
judged with catalogue ingredients for "without meat and fish" and a
character, each that fits reachable, rolling a role again within what fits,
none found when all are judged, the bounded tries above 200 combinations;
every pick stays in its own role when the stock option changes between
Roll and Roll again, and when nothing is in stock; the draw is even over the
combinations that fit),
`test/router.test.ts`, `e2e/dish-swap.mjs`. Not proved: the unit tests build
the notebook in memory, give the stock as a list of ids and never call
`Math.random`; what the stock allows now is the finder's answer and is
checked in the browser only for "none allowed"; the browser check runs in
Chromium at 360 px in English only, its components are made of typed
ingredients without a character, so there the roll per role under a
character shows only "none found", and the pick is by chance, so it checks
only what holds for every number. It also checks that the focus stays on a
select and on a tick changed by keyboard, that the stock tick drops the
picks, and that a character dropped on the list drops a "none found" judged
under it. No test shows that the shares are equal
over many rolls with `Math.random`, and no real phone was used.

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
starting at the dish's `portions` or 1 and kept in memory while the app
is open (since 2026-11-21, so that the cook screen cooks them; a reload
starts again).
Typing `6` or `2,5` recalculates at once; the buttons step by whole portions
and never go below 1; text that is not a number above 0 gets the hint "Enter
a number above 0." and keeps the last results. The totals are per-portion
amounts times the portions; the list "What goes in, all the way down" expands
each component slot by the engine with its total as the wanted output (the
nested-yield rule) and adds the ingredient slots. A component without an
output weight is taken as weighing what goes into it, the same rule as the
cook screen, with a quiet note under the list
([amounts as a cook writes them](#components)); a slot that still cannot be
expanded (a circle, a component that is gone) stays in the table, the sum
leaves it out and a "Not added up" list says why; the other slots still add
up. Lines without an amount, and lines that cannot be weighed, are listed
apart. **Test:** `test/dishes-view.test.ts`,
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

- **Steps of a component (the kit, since 2026-11-20).** Between the lines
  and the yield stands **Steps**: one card per step, added with "Add a
  step". A card has **What is done** (one select with two groups: the
  skills, which are the techniques and show their note when cooking, and
  the simple actions, which only name the step), **What goes in** (the
  lines of the component as checkboxes; a line gets its `key` when a
  step first ticks it, `l1`, `l2`, ...), time and temperature with their
  unit, and one line of note. Buttons move a step up or down and remove
  it; after a move the focus is on the step that moved. No text is
  typed for a step: it is shown from its word and its lines, in the
  language of the content. A step copied from a shipped dish keeps its
  text, shown above the fields and not edited. A card nothing was
  entered in is left out on Save. Save refuses two things, each said at
  its card: lines or a time without a word and without a note, and a
  time or temperature that is not a number above 0. The lists of lines
  in the cards follow the lines above (a new line appears, a removed one
  goes, and with it its use in the steps); they are redrawn only when
  the names of the lines changed, so typing elsewhere does not move the
  focus. Code: `StepForm` in `src/editor/component-form.ts`,
  `src/screens/editor/component-steps-editor.ts`, the words and the
  line of a step in `src/components/steps-view.ts`. **Fixed with it:**
  the editor read and wrote neither `steps` nor the `key` of a line, so
  a copied dish lost its steps the first time it was saved from the
  editor. **Test:** `test/editor-steps.test.ts` ("editing a copied dish
  keeps its steps and the keys of its lines" fails on the form of
  commit `e6f1d45` and its control passes there),
  `test/steps-view.test.ts`, `e2e/steps-kit.mjs`. Not proved: the kit
  was looked at in Chromium at 360 px in English only.

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
  pick lands once it is stored, a moment later: by then the cook may be
  typing the amount, and drawing the lines again keeps the focus, the caret
  and every key in that field (and in a unit select); the focus moves to the
  pick button only while it is still in the picker. Until 2026-11-22 it
  always moved there, so the keys typed after the pick landed were lost and
  the line could be saved without its amount (seen as "to taste" in
  `e2e/catalogue.mjs`, about 1 run in 6; pinned by its check "an amount typed
  while the pick lands", which fails on the old code every time). The
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

**Dish editor.** Name, portions (a whole number or empty), then what goes
into the dish (the role slots: a role, a filling, a component or an
ingredient from the same picker, and an amount per portion; heading "What
goes into the dish", button "Add an ingredient or component"), then
course, cuisine and a note. Until 2026-11-23 the slots stood below course,
cuisine and note. A new dish or component is asked for a tasting note
only under "This version"; "What changed" and "Why" are shown when a
stored one is edited (`version-fields.ts`; `e2e/editor-pairing.mjs`). A stored slot
always has a filling; a slot without one lives only in the draft. Open
roles remain derived on the dish screen. **Test:** `test/notebook.test.ts`,
`e2e/editor-more.mjs`.

- **Goes with (since 2026-11-23)**, a section under the slots and "Add a
  slot" (`src/screens/editor/pairing-suggest.ts`, the draft's ingredients
  in `src/pairing/draft.ts`; the rule and the data are those of
  [Goes with on the dish](#classics), [decision](decisions/flavordb.md)).
  While no slot has a filling it says to choose a first ingredient or
  component, and the pairing data is not fetched. From 2026-11-23 the
  offers come in two parts: **Proven together** first, from the project's
  own table (`data/affinities.json`, `src/pairing/affinity.ts`; written by
  an AI model, which the section says), there at once without a fetch; then
  **From the flavour data**, the computed offers described next, without
  what stands above. From the first filling
  on it offers up to eight ingredients of the catalogue that stand out
  with what the draft holds: the ingredients that fill a slot and the
  ingredients of the components that fill one, through the components
  they name. Each offer is a button of at least 44 px with the name and
  the fillings it goes with; its accessible name is "Add <name> to the
  dish". A tap copies the ingredient from the catalogue into the notebook
  (as the picker does), adds it as a slot of the next open role (garnish
  when none is open) without an amount, and moves the focus to that slot;
  the role is a guess, the data knows none, and the cook changes it on the
  row. The offers are drawn again with every change of the fillings, never
  with one already in the dish. Below them the hint that this is computed
  and the source with its licence. Only ingredients are offered, no
  components. Not in the native app. **Test:** `test/pairing-draft.test.ts`,
  `e2e/editor-pairing.mjs` (Chromium at 360 px; English in full, in German
  the heading and the empty state only; whether the offers help a cook is
  tested nowhere).
- **Course and cuisine (since 2026-11-21)** are two labelled selects of
  44 px, "Course" and "Cuisine", each starting with "Not stated", which
  stores no field. The courses are a classic's (starter to snack); the
  cuisines are the four countries the app names (Germany, Italy, France,
  Spain), [why only these](data-model.md#dish). They are fields of the
  version like the name: a change is a new version, and the history says
  "Course: empty → Main course". A copy of a classic keeps its course and
  its country as the cuisine. The dish screen shows what is stated in one
  quiet line under the name ("Main course · Italy"); nothing when neither
  is. With them, the [one filter](#one-filter-over-every-dish) finds a dish
  of the notebook by course and cuisine as it finds a classic. An older
  draft without the fields saves without them. **Test:**
  `test/dish-kind.test.ts` (form, schema, export and import, the copy, the
  history), `test/browse.test.ts` (the entry and the filter),
  `e2e/editor-more.mjs` (the selects at 360 px: 44 px, "Not stated"
  first, saved, shown on the dish screen, read back by Edit).

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

# Characters

What a dish is like (tomatoey, creamy, fried), derived when it is shown and
never stored ([analysis](dish-characters.md),
[engine rules](engine-rules.md#characters)). Code: `src/characters/`
(`table.ts`, `classes.ts`, `dish.ts`, `classic.ts`, `view.ts`), the table
`data/dish-characters.json`, `src/screens/character-chips.ts`.

- **Chips on a dish.** A dish of the notebook and a shipped classic show
  their characters as quiet chips under the name: text in a pill, no
  control, the muted text colour; the chip's title says what its rule rests
  on. A dish with no character shows no row. On a dish of the notebook the
  chips are those of the dish **as shown**: a swapped filling changes them
  at once. A classic does not show "With meat" and "With fish": its line
  "Without meat and fish" is set by hand and stays the one statement.
- **Filter by character.** The select "What it is like" of the one filter
  ([below](#one-filter-over-every-dish)), on Cook: "Anything"
  and the characters at least one dish has, own or shipped, in the table's
  order. It replaced the single select of the Dishes list on 2026-11-21 and
  is kept with the other choices, across a reload.
- **The catalogue.** Groups and food categories above an ingredient come
  with the catalogue, which loads after the first draw; the dish is drawn
  again when it is there. So do the egg weights of a shipped dish (a group
  takes the weight its foods agree on), so eggy shows once it is loaded.
- **Which dishes have which character** changed on 2026-11-21 after a
  reading of every shipped dish: eggy, cheesy, sweet, rich and garlicky now
  show on shipped dishes, a soup is never fried, a baked soufflé is not
  creamy; the table of changes, the counts and what was left as it is are in
  [dish characters](dish-characters.md#every-shipped-dish-read-as-a-cook-would-2026-11-21).
- **The cook's correction (since 2026-11-22).** Every rule is a judgement
  and can be wrong on a dish, so the dish editor has a section **What it is
  like** under the assembly: one tick box of 44 px per character of the
  table, ticked where the dish shows it, the title of each the rule's
  basis. Unticking a computed character takes it away from this dish;
  ticking one no rule gives adds it; such a row says "taken away by you" or
  "added by you", and **As worked out** drops every correction. The ticks
  are worked out from the draft as it stands (the filled slots, their
  amounts, the course), again on every change and when the catalogue is
  there. Stored is only the difference
  ([data model](data-model.md#dish)), so a changed recipe still changes
  the characters the cook did not touch. The corrected set is what the
  chips, the one filter, the finder and the pick of a dish read
  (`entryOfDish`); a combination of the random pick is no stored dish and
  is judged by the rules alone. It is a field of the version: the history
  says "What it is like: empty → added: Creamy". A shipped dish is
  read-only and is corrected on its copy. Code: `src/editor/dish-characters.ts`,
  `src/characters/correction.ts`, `src/screens/editor/dish-characters-editor.ts`.
  **Test:** `test/dish-character-correction.test.ts` (entry and filter,
  the ticks, the form, schema, export and import, the history),
  `e2e/editor-more.mjs` (tick, the mark, focus, save, chip, read back, at
  360 px). Not verified: a screen reader on the ticks, the German texts in
  a browser, the native Linux app (it shows no dish of the notebook).

**Test:** `test/characters.test.ts` (the table against the catalogue, the
facts of a dish and of a classic, shipped dishes by name),
`e2e/dish-characters.mjs` (chips, the character choice over the user's
dishes, 360 px; the ingredients there are the user's own, so only a
technique gives a character). Not verified:
desktop width, the German texts in a browser, a screen reader on the chips.

# One filter over every dish

Since 2026-11-21 the shipped classics and the dishes of the notebook are
one list with one filter, instead of two parts of the app each with its
own; the origin is only a choice of the filter.

- **One entry.** `src/browse/entry.ts` gives every dish the same entry,
  whatever its origin (`own` or `shipped`): name, link, course, cuisine,
  characters, whether it is without meat and fish, and whether every line
  has an amount. For a shipped dish "without meat and fish" is the value
  set by hand in its file; for a dish of the notebook it is derived from
  its ingredient lines (`src/characters/meat-free.ts`, the list
  `meatAndFish` in `data/dish-characters.json`, since 2026-11-21): not
  meat-free when a line is meat, poultry or fish by its USDA category, or
  one of the animal foods USDA files under Fats and Oils (lard, tallow,
  bacon grease, chicken, turkey and goose fat, the fish oils, shortenings
  made with lard or tallow; a line of plain "fat" is the animal-fat group);
  meat-free only when every line is known, and otherwise not known, which
  the filter leaves out. Not known: an ingredient the user made up, a line
  naming a group with an animal food below it ("shortening"), a slot whose
  component is gone or empty. A component nested in another counts with
  all its ingredients, with or without amounts. A group without a category
  of its own (butter, peas, beans) is known by its foods. **What it cannot
  know:** an ingredient the catalogue files as a plant or dairy food that
  holds meat or fish in fact (the catalogue has no stock, gelatine,
  anchovy or fish sauce today; a user's own "stock" is made up and so not
  known), and anything outside the lines (a dish cooked in a meat broth
  that is not a line).
- **One filter.** `src/browse/filter.ts`: origin, character, course,
  cuisine, "Without meat and fish", "Only with every amount given"; each
  choice only drops entries. It is kept in `localStorage`
  (`culina.dishes`), like the theme. Every screen reads and keeps it
  through `currentDishFilter` and `keepDishFilter`; where the browser keeps
  nothing (private mode), the choice holds for every screen until the page
  is closed. **A link inside the app never changes the filter**; only an
  old address from outside does (below).
- **One set of controls.** `src/screens/dish-filter.ts`: selects of 44 px,
  drawn only where there is something to offer, and two ticks. The origin
  select offers "All dishes", "Mine" and "Shipped" (German "Alle
  Gerichte", "Meine", "Mitgelieferte"), short enough that no option is cut
  off in half a phone's width, in either language. A stored
  choice no dish has any more stays offered under its name, so that it can
  be seen and dropped. The control that had focus keeps it when the
  controls are drawn again after a change.
- **One list** (`src/screens/dish-list.ts`, view logic in
  `src/browse/list-view.ts`), on **Cook** (`#/cook`, since 2026-11-22,
  [decision](decisions/cook-screen.md); before, the same list stood on
  Start and on the Notebook's Dishes). In this order: search by name, the
  tick **Only with what I have** and the select **Order** (by name, or
  **Use up first**; both below, under [Cook](#cook)), the filter folded
  behind one line ("What you feel like" and the active choices, or
  "Everything"; a `<details>`, so a button for assistive technology, opened
  with Enter or Space, and it stays open or closed until the page is
  closed), and opened the selects (origin, character, course, cuisine in two
  columns from 360 px) and the two ticks; a count line ("4 dishes"), the
  rows. Every dish whose entry passes the filter and the search, sorted by
  name in the content language, own and shipped mixed. A row is the name and
  a quiet line: course, cuisine, and the origin ("My dish", "Shipped") while
  the rows shown hold both (with one origin left, by "From", a character
  or a search, no row repeats it). A row of a shipped
  dish opens `#/classic/<id>`, a row of an own dish `#/dishes/<id>`. Nothing
  found says "No dish fits these choices." and offers **Show all**, which
  empties the filter and the search, lets go of "Only with what I have" (the
  order stays) and puts the focus on the search field. The catalogue loads
  after the first draw (it gives the characters of the ingredients it places
  and whether a dish is without meat); the list and the controls are drawn
  again once it is there. Until then the list does not say that nothing
  fits: it shows the rows that pass already, or, with none, one quiet line
  "Reading the dishes …" and no Show all. The search text lives until the
  page is closed; the filter is the stored one, shared with the random pick,
  and survives a reload. Where the browser cannot store it, it holds until
  the page is closed.
- **The Notebook's Dishes are the user's own (since 2026-11-23,
  [decision](decisions/sauces-are-parts.md)).** `#/dishes` is a plain list
  (`src/screens/notebook-list.ts`, rows in `src/dishes/list.ts`, search in
  `src/shared/notebook-rows.ts`): the user's own dishes in their order; a
  row has the name and a quiet line (course, cuisine); the search by name,
  "Add a dish" and "Put a dish together at random". No shipped dish and no
  choice of origin: the shipped dishes are on Cook, and "Keep in my
  notebook" on one brings a copy here. No dish filter, no "Only with what I
  have", no "Use up first": those are Cook's. A notebook without a dish of
  its own says so, names Cook as the place to keep one from, and offers its
  example data. Until 2026-11-23 the shipped dishes stood here too, under
  "Shipped with the app", with a select "From". **Test:**
  `test/dishes-notebook-list.test.ts`, `e2e/dish-browse.mjs`,
  `e2e/kit-parts.mjs`.
- **A sauce that is a base is no dish (since 2026-11-23).** The
  shipped bases of the course sauce (26 of them) are on no dish list, in
  the finder or the random pick; they are in the Components list. Cook
  lists 98 of the 124 shipped files. **Test:** `test/sauce-bases.test.ts`, `e2e/kit-parts.mjs`.
- **The way back from a dish.** A dish, shipped or own, has one link back,
  "Back to the list" (`src/screens/list-return.ts`). Opened from a row of
  Cook, it is the browser's back to Cook, so the list is as the user left it
  (also after the cook screen and back); opened any other way (a bookmark, a
  link from elsewhere) it leads to the list the dish belongs to: an own dish
  to `#/dishes`, a shipped one to `#/cook`. Opened from a row of the
  Notebook's Dishes (own or shipped), it is the browser's back to that list. A history
  entry marked by an older version (from Start or the old Dishes list) is
  still a way back. It never changes the filter. The own dish's link hides
  from 720 px, where the list stands beside it.
- **The first screen at 360 x 720.** On Cook the title with the way to the
  stock on one line, the search, the switch, the order, the folded filter
  and the first row above the bar ("Start from one ingredient" follows the
  list).
- **The old country lists.** `#/classics` and `#/classics/<country>` are no
  screens of their own any more: the router hands them to
  `classicsRedirect` (`src/screens/classics/classics-list.ts`), which stores
  the filter "Shipped dishes" (with the country as the cuisine; a country
  the app does not know gives none, and every other choice is dropped) and
  replaces the address with `#/cook` (until 2026-11-22 `#/dishes`) without a
  new history entry. So old bookmarks and links from outside open the one
  list with that choice; the navigation then marks Cook. No link inside the app leads to these
  addresses (the link back from a shipped dish led to `#/classics/<country>`
  and so replaced the user's filter until 2026-11-21; Cook's part
  "Classics" is being removed by its own change).

**Test:** `test/browse.test.ts` (the shipped classics and catalogue, a
notebook built in memory, a plain object as the store),
`test/browse-list.test.ts` (order, each choice, combined choices, the line
under a name, the filter of an old address, the summary's choices, the kept
filter with a store that throws; entries written by hand),
`test/router.test.ts` (the redirect without a history entry),
`e2e/dish-browse.mjs` (360 x 720, the two fictional shipped dishes and the
example data: both origins in one list on Cook, each choice narrows, choices
combine, Show all, the choice across a reload and on the old address
`#/start`, the first result on the first screen of Cook with the filter
folded, the Notebook's Dishes as the own dishes in a plain list without the
filter and without a choice of origin, a shipped row of Cook opens its
dish, the old addresses, the way back to Cook with the filter untouched, no option of a select cut off in English and German, no "nothing
fits" while the catalogue is held back, the focus after Show all, no
horizontal scroll, 44 px targets). The private-mode fallback is proved only
with a store that throws in the unit test, not in a private window. Not proved: the
list with the real 48 shipped dishes in a browser beyond a look at a
screenshot, desktop width beyond a look, German in a browser beyond
`e2e/german.mjs` walking the screens, a screen reader on the count line.

# Stock

What is there, with as little upkeep as possible
([decision](decisions/recipe-book.md), points 4 and 5; data:
[stock item](data-model.md#stock-item); rules:
[engine rules](engine-rules.md#stock)). Not an entry of its own: the stock
screens are reached from [Cook](#cook) ("What is there" beside its title;
"Back to Cook" on the stock list), and the navigation entry Cook stays
marked on them, so the stock is two taps from every screen. The list's heading is "What is there".
Texts: `src/strings-stock.ts`. Since 2026-11-20 the stock is the collection
`stock` of a space, shared with the other apps of the household
([decision](decisions/stock-in-spaces.md)).

- **Tick what is there** (`#/stock/add`). A list to tick from: the
  notebook's ingredients and components by name, then the catalogue by
  search (the picker's catalogue section; choosing copies the entry and
  its parents into the notebook and ticks it, with a toast and Undo).
  Many ticks in a row without leaving the screen; each is saved at once and
  stores nothing but `present: true` under the key of the thing. Ticking
  again unticks (`present: false`, the record stays), with the toast and
  Undo. "Always there" is a button on a ticked row (a check mark and a
  bar as well as colour); that item counts as present until unticked.
  "Always there" can be set on any item. A tick is a box with a check mark,
  not only a colour. **The catalogue search offers first** the entry whose
  name (in any language) is the search text itself, then names that start
  with it, then the rest (`rankFound`, `src/catalogue/tree.ts`): "Kartoffel"
  offers the potato before potato flour, "Tomaten" the tomatoes before the
  canned tomato products (a tester's finding of 2026-11-21: he took the first
  entry and had potato flour in stock). **Test:** `e2e/stock.mjs`,
  `e2e/everyday-stock.mjs`, `test/stock-staples-parts.test.ts`,
  `test/stock-notebook.test.ts`.
- **Staples** (on the list, 2026-11-21). While table salt or black pepper has
  no stock item, a short section "Staples" names the ones not ticked ("Salt,
  table, Spices, pepper, black count as there only once ticked. Tick them as
  always there and the finder stops asking for them.") with one button, "Tick
  the staples", which copies the catalogue entries into the notebook and ticks
  them as always there, with the toast and Undo; the section goes once both
  are ticked. Nothing is assumed silently: until the tap they are not there,
  and the finder names salt as lacking (33 lines of the shipped dishes ask for
  salt, 13 for black pepper). The list is `src/stock/staples.ts`, two entries;
  water is no staple, the finder treats it as the kitchen's
  ([engine rules](engine-rules.md#what-the-stock-allows)). **Test:**
  `e2e/everyday-stock.mjs`, `test/stock-staples-parts.test.ts`.
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
- **The space** (on the list). "Stock of Home" names the space whose stock
  is shown; with more than one space on the device a choice ("Stock of")
  that the device remembers (`culina.space`). Below it the sync status in
  a few words (on this device only, not synced yet, syncing, in step with
  the household, not in step and why), updated in place, and a link to the
  space in the Household app, where spaces are made, shared and given a
  storage. When the shared database cannot be opened (a private window)
  the list says so and offers no ticking. **Test:** `e2e/stock.mjs`
  (device only), `test/stock-notebook.test.ts` (which space is used).
- **Detail of one item** (`#/stock/<id>/edit`). Amount and unit, state,
  date prepared (a native date field with a "Today" button from the
  injected clock), use by (with "Clear"), always there, note: all optional,
  an empty field says nothing. Where the ingredient has a recorded shelf
  life with a source, the dates it allows are offered as buttons; nothing
  is applied unless chosen. "Use some" subtracts an amount (any unit that
  converts, else a quiet sentence) from the amount in stock at once; using
  all of it removes the item with the toast and Undo. Saving is worked out
  from the record as stored at that moment, so fields of another app
  (Mixtura's `moreBatches`, `x-...`) and batches added elsewhere stay.
  Nothing is focused on open.
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
[engine rules](engine-rules.md#what-the-stock-allows)). Since 2026-11-22
Cook is **one screen** ([decision](decisions/cook-screen.md), issue 44):
the navigation entry "Cook" (German "Kochen", the first of three) leads to
`#/cook`, the [one list](#one-filter-over-every-dish) of every dish, own and
shipped, under the one filter, with:

- **Only with what I have** (German "Nur mit dem, was da ist"), a tick:
  only the dishes whose every required line the stock covers today, as the
  finder judges them, own dishes with `makeable` and shipped ones with
  `classicsMakeable`, both at threshold 0 (`readyNowKeys` in
  `src/dishes/ready-now.ts`, the same question the random pick asks). It only
  drops rows; the dish filter and the search apply as well. With nothing
  ticked, the list gives way to "Nothing is ticked yet …" and the link "Tick
  what is there".
- **Order: Use up first** (German "Zuerst verbrauchen"), the other choice
  of the select beside "By name": the dishes that use a stock item with a
  use-by date come first, in the engine's one ranking (`rankCandidates`: the
  nearest use-by first, then roles covered, name), the rest follow by name.
  The finder is asked at its wide threshold, so a dish that lacks something
  is placed too (`useUpMarks` in `src/cook/one-list.ts`, asked by
  `src/dishes/use-up-order.ts`). The row then also says which item sets its
  place, "uses the Leek with 1 day left" (or "past use by", "use by today"),
  and for a dish that lacks lines how many, "lacks 2" (German "noch 2
  nötig"), since such a dish can stand above complete ones. With no dated
  item a quiet line says so; when the finder cannot read the notebook (a
  broken ingredient tree) the order places nothing and no such line is
  shown, because nothing is known about the dates.
- Both are kept on the device under `culina.cookList` (`{ have, order }`,
  `src/prefs.ts`; anything unreadable falls back field by field).
- **The stock** is one tap away: "What is there" (German "Vorrat") beside
  the title opens `#/stock`, its own screen under Cook, with "Back to Cook".
- **Start from one ingredient**, a closed section under the list, opens
  "What uses <ingredient>" (`#/cook/<id>/with`, below).
- **The old addresses** keep working, without a new history entry:
  `#/start` is no route any more and opens the default route, Cook;
  `#/cook/use-up` keeps the order "Use up first" and is replaced by `#/cook`
  (`cookRedirect`, `src/screens/cook/redirect.ts`); `#/classics[/<country>]`
  lands on Cook with its filter ([above](#one-filter-over-every-dish)).

Every address of Cook marks Cook in the navigation: `#/cook`,
`#/cook/<id>/with`, `#/stock`, `#/stock/add`, `#/stock/<id>/edit`. A dish
opens the dish screen, which belongs to the Notebook (own or shipped). Texts:
`src/strings-cook.ts`. **Test:** `test/cook-list.test.ts` (the redirects,
the kept choices, the switch and the order on invented entries and on the
fixture notebook), `e2e/cook.mjs`, `e2e/classics-finder.mjs` (the switch
and the order with own and shipped dishes against the engine),
`e2e/navigation.mjs`, `test/cook-finder.test.ts`, `test/router-cook.test.ts`.
What they do not prove: a real device's clock and storage, the switch and
the order with the real 48 shipped dishes compared with the engine (only
seen in a screenshot).

**What went** (the owner's decision): the start screen with its list of
tools, the finder's screen "What can I cook" with its three views, and the
view "Use up first" as a list of stock items. What is said below of the
finder's list, its two choices and its empty states now holds for "What
uses <ingredient>" only.

- **One adapter.** `src/cook/input.ts` builds the engine's input from the
  notebook cache: the ingredient tree (a `parentId` that names no
  ingredient is left out), every version of components and dishes, the seed
  templates, the stock as stored, the facts for conversion, the parts of
  whole foods and today. No
  arithmetic in the app: every number and status comes from `makeable`.
  Today is the shell's injected clock (`?e2e-now=` in tests), read in
  `src/cook/source.ts` only, and shown on the screen as "As of 18 Nov 2026".
- **The finder's list** (until 2026-11-22 "What can I cook", now the list
  of "What uses <ingredient>"). Own dishes and the shipped dishes are
  one list, whatever their origin (owner's goal of 2026-11-21). The engine
  judges both: own components, dishes and ratio templates with `makeable`,
  each shipped dish derived (`deriveClassic`, 2 portions) with
  `classicsMakeable` ([engine rules](engine-rules.md#the-shipped-classics-in-the-finder)).
  **The order is a rule:** both finders rank by the same contract (urgency,
  then roles covered, then name, id and kind as plain string comparison), a
  total order, so the app merges them by ranking the union again with the
  engine's `rankCandidates` ([ranking contract](engine-rules.md#what-the-stock-allows));
  the filters only drop entries (`src/cook/one-list.ts`). **Two groups:**
  "Dishes" (own and shipped) first, then "Components and ratios" (own
  components and ratio cards, in the same ranking), because a component or a
  ratio card is not a dish: it has no course, cuisine or character, so the
  second group is shown only while the dish filter chooses nothing or only
  "My dishes"; otherwise a quiet line says it is left out. Each entry is one
  link (an own dish, a component, a ratio card, or `#/classic/<id>` for a
  shipped dish) and shows: a quiet line with the origin word ("mine",
  "shipped"; only where both origins are in the group) and the country of a
  shipped dish, or the kind ("component", "ratio") in the second group;
  "complete" or "lacks N" as text ("Complete only" is not a rule); the reason
  line, "uses the Leek with 1 day left; covers aromatic, sauce" (the engine's
  urgency item and days, or "nothing it uses has a use-by date", then the
  roles covered, or "no roles recorded"); "Lacks: Thyme, Cream (100 g there,
  200 g needed)" for both origins; the substitutes, "with Salted butter in
  place of Unsalted butter" (a sibling, or a shipped substitute effect, for
  own and shipped dishes alike), and where a group or a whole in stock covers a
  line by the engine's group or part rule, "Egg in stock counts for Egg,
  whole" or "Egg, yolk from the Egg, whole in stock", so a broad tick is named
  and not hidden; items that are there with no known amount,
  "Cream is there; how much is not known."; for an own dish the open roles
  the stock can fill, "You could add a crunch: Walnut", only where the stock
  has an ingredient or component with that role (the same offer is shown on
  the dish screen beside "Open: add a crunch"); for a shipped dish a line the
  catalogue has no ingredient for yet is not counted and is named apart,
  "Not in the catalogue yet, so not counted: Bouquet garni" (a `wanted` line,
  such as "Cheese (cacio)", is not matched to any stock, even to cheese in
  stock: the catalogue has no food for it). Water is never asked for: a shipped
  dish names it as `wanted` and is not asked, a ratio card's role water and an
  own line whose ingredient has the role water are the kitchen's (engine
  rule). For both origins the ingredient tree is the notebook's completed by
  the shipped catalogue (the notebook wins on an id; since 2026-11-21 also for
  the own candidates, so that a group ticked in the stock has its members and
  the engine's group rule can see them), loaded on the first draw and drawn
  again when it is there; the names of shipped dishes are in the content
  language. The parts of whole foods come from `data/ingredient-parts.json`
  (one entry: a whole egg has a yolk and a white; each entry a judgement with
  its `basis`), read in `src/cook/parts.ts`. A ratio card is named as on the
  Ratios screen ("Nudelteig", not "Pasta dough"); a role word in a sentence is
  lower case in English and keeps its capital in German ("deckt Fett, Mehl
  ab", `roleInSentence`); the heading of "What uses" names the ingredient in
  the app's language ("Was Hühnerei verwendet"). Wording is neutral: "lacks",
  "could add", never an alarm word or colour. **Test:**
  `test/cook-one-list.test.ts`, `test/cook-finder.test.ts`,
  `test/cook-rows-words.test.ts`, `test/finder-everyday-stock.test.ts` (the
  real catalogue and the 48 real classics), `e2e/cook.mjs`,
  `e2e/classics-finder.mjs`, `e2e/everyday-stock.mjs` (German, the real
  content, the stock route).
- **The one filter on top** (until 2026-11-22; "What uses <ingredient>"
  shows only the finder's own two choices), the same as on the Dishes list
  ([one filter over every dish](#one-filter-over-every-dish)): "From" (mine,
  shipped), "What it is like" (character), course, cuisine, "Without meat and
  fish", "Only with every amount given", read on the `DishEntry` of each
  dish (`entryOfDish`, `entryOfClassic`) and kept under `culina.dishes`: a
  choice made on the finder is the Dishes list's and the other way round. A
  select offers only values some dish has. When the controls are drawn again
  after a change, the control that had focus keeps it. Below it the finder's
  own two choices, kept in `culina.cook` (no storage means the defaults):
  "Show" is the engine's threshold, complete only or lacking at most 1, 2 or
  3 (default 1); "Covers the role" keeps entries whose covered roles include
  the chosen one. Both apply to own and shipped entries alike.
- **The old country and meat choices.** An older version kept "Country"
  and "Meat and fish" for the classics in `culina.cook`. They are ignored,
  as the native Linux app ignores them: they are not carried into the dish
  filter, because they only ever narrowed the classics section and carried
  over they would hide own dishes on the Dishes list and in the random pick
  too, behind the user's back. Role and threshold in the same entry are still
  read; the two old fields fall away the next time the finder writes its
  choices. An unreadable entry is the default, never an error. **Test:**
  `test/cook-old-entry.test.ts`, `e2e/cook.mjs`.
- **Start from one ingredient** (`#/cook/<ingredientId>/with`, heading
  "What uses Leek"): a section at the top lists the ticked ingredients and
  a search over the notebook's ingredients by every name (English and
  German, through `shared/names.ts`). The list keeps the engine's order and
  only own components and dishes that use the ingredient or one it can
  stand in for (`usesIngredient`); "Show everything" leaves it. No shipped
  dish is listed here: the engine has no "uses" question for them yet. The
  dish filter does not narrow this view and its controls are not shown here:
  the user came from one ingredient and asked what uses it, so a course or a
  character chosen on another screen must not hide the answer (the finder's
  own "Show" and "Covers the role" still apply and are shown). **Test:**
  `e2e/cook.mjs` (a course kept elsewhere, "What uses Leek" unchanged).
- **Use up first, the view** (until 2026-11-22; now the order of Cook's
  list, above). The stock items that have a use-by date, nearest first
  (the engine's `useUpFirst`), each with days left in words and links to
  what uses it among the entries of What can I cook under the same choices:
  the same "lacking at most" and role, and the same dish filter, so own and
  shipped dishes count, and components and ratio cards while no dish filter
  is chosen (in the one ranking, by the engine's `usedItems`). A line says
  when a filter applies; an item nothing in the list uses says so. Tapping the item opens it
  in the stock screen (`#/stock/<id>/edit`).
- **Empty states**, each with the way forward: nothing ticked yet (link
  "Tick what is there"); nothing in the notebook yet, when the notebook has
  no component or dish and the engine finds nothing of one's own (links to
  add a component and to import; said below the list when shipped dishes
  are listed, in place of it when none is); nothing matches, with the three
  nearest under the same choices, own or shipped, and what each lacks (both
  engines at a wide threshold, fewest lacking first, the one ranking within
  the same number); with nothing near at all, only "Nothing matches these
  choices.". (Until 2026-11-22 the empty state also named the dish filter's
  choices and offered "Show all"; the dish filter does not narrow "What uses
  <ingredient>".) **Test:** `e2e/cook.mjs`.
- **Catalogue ingredients only.** The generated catalogue carries no roles;
  the [role table](data-model.md#roles) adds a few when the catalogue is
  read, so a ratio card is makeable from stock of catalogue foods. With no
  recipe of one's own and no ratio card that fits the screen shows "Your
  notebook has no components or dishes yet." with its links (shipped dishes
  that fit are listed regardless).
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

- **Start and the list.** The shipped dishes are listed with the
  dishes of the notebook in the [one list](#one-filter-over-every-dish), on
  Cook; "Shipped dishes" and a cuisine are choices of its
  filter. The country lists (`#/classics`, `#/classics/<country>`) became
  that list with the filter set; their addresses keep working. A
  collection without a dish leaves the list with the notebook's dishes, and
  the app works with no dish at all. A dish id that is not known gives one
  quiet sentence.
- **Dish** (`#/classic/<id>`, drawn by the one dish screen of both
  origins since 2026-11-21, [dishes](#dishes)). In this order, so that the
  ingredients are on the first screen at 360 x 720: the name, the original
  name, the quiet line (course, cuisine, meat flag, "Shipped with the
  app"); Keep in my notebook; the characters; a portions stepper, default 2; the ingredient lines per component and
  for the dish; "Cook step by step"; the whole method; then, each closed behind
  a tap (`<details>`), **Goes with** (below), **Nutrition per portion** (below) and **Source**. **The
  app does no arithmetic**: amounts come from `deriveClassic` and are only
  rounded for display with the shared helpers (`formatMass` for grams,
  `formatNumber` otherwise), and by the engine's display rules for pieces (to a
  half, the exact count beside) and for a spoon or cup the source wrote (that
  measure to a quarter, "½ tbsp"; [amounts as a cook writes them](#components)).
  A range is shown as "100 ml to 150 ml" (the
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
- **Goes with** (closed `<details>` on the dish of either origin, first of the
  closed sections; `src/screens/classics/pairing-block.ts`, view logic
  `src/pairing/view.ts`, the files `src/pairing/load.ts`, texts
  `src/strings-classics.ts`; [decision](decisions/flavordb.md)). Up to eight
  ingredients of the catalogue that the dish does not have and that share more
  flavour molecules with the dish's ingredients than they usually do, each with
  up to three of the dish's lines it goes with ("with Butter, Parmesan,
  Potato"); then the hint that this is computed and says nothing of amounts or
  of sweet, sour, salty and bitter, and the source with its licence (FlavorDB,
  CC BY-NC-SA 3.0). The two data files (`pairings.json`, `pairing-links.json`)
  are fetched when the section is first opened, not before, and once per
  session; they are precached, so it works offline. While they load the section
  says so; if they cannot be read it says that. A line stands for the entity
  its catalogue ingredient is linked to, else for that of its nearest ancestor,
  so the user's own ingredient under "Tomatoes" counts as tomato; a dish none
  of whose lines is known says so, and one for which nothing stands out says
  that. The section never judges: no pairing is called right or missing. Not
  in the native app. **Test:** `test/pairing-view.test.ts`,
  `test/flavordb-data.test.ts`, `e2e/dish-pairing.mjs` (English and German, at
  360 px; what a cook thinks of the pairings is tested nowhere).
- **Nutrition per portion** (closed `<details>` on the dish, second of the closed
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
  first, then in the catalogue; its density, unit weight and figures come from
  the engine's `lineFigures` (its own, else a parent's, else, for a group
  whose rows do not agree, its **usual member**; [engine
  rules](engine-rules.md#nutrition)). A line counted with a usual member is
  named under the figures ("Where the recipe names no kind, the usual one is
  counted: Egg, whole as Egg, whole, fresh."), and one line says what the
  figures are not ("Raw figures for a cooked dish: no frying fat taken up, no
  losses; old sources give rough amounts."). **When the figures would
  mislead** (the engine's `shown`, since 2026-11-21): nothing is counted, or an
  ingredient is left out that is no seasoning (USDA's "Spices and Herbs"), not
  water and has more than 50 kcal per 100 g or no known figures. Then there are
  no figures and no energy at all, only one line that names what keeps them
  back ("No figures are shown: Butter, Sugars cannot be counted, and a total
  without them would mislead.", or "Nutrition cannot be worked out: ..." when
  nothing is counted), the coverage, and everything else behind the second
  tap. Before, figures were shown from two counted ingredients and a quarter of
  all (`MIN_COUNTED`, `MIN_SHARE`, removed), which let the herb omelette show 5
  kcal from its salt and pepper. On the 124 shipped dishes 68 show figures (17 of 68 before the own recipes of 2026-11-24, 9 of 48 before the recipes of 2026-11-23)
  ([evaluation](nutrition-evaluation.md#figures-only-where-they-mean-something-2026-11-21)). **It never judges**: no
  "healthy", "high" or "low", no colour, no traffic light, no comparison with a
  daily value, no portion reference (none was found in a source that could be
  read, [evaluation](nutrition-evaluation.md#what-was-built)); the wording test
  scans `strings-nutrition.ts` and a test lists the words it must not contain.
  **Tests:** `test/nutrition-view.test.ts`, `test/nutrition-shipped.test.ts`
  (all 48 shipped dishes: figures shown or not, energy, coverage; the omelette
  and Artusi's crema worked out by hand from the USDA figures),
  `e2e/classics-nutrition.mjs` (also a variant whose butter names the group
  and one whose oil is not in the catalogue, at 360 and 1000 px).
- **Cooking** (`#/classic/<id>/cook`, portions as chosen on the dish; the
  one cook screen of every origin since 2026-11-21). One
  step: "Step 3 of 8" as a heading, the component it belongs to (left out
  where the part has the dish's own name), the text,
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
- **Dates.** A stored date is shown through `formatDate` in `shared/locale.ts`: `18.11.2026` in
  German, `18 Nov 2026` in English, written by hand so that every browser shows the same (version
  line, tasting notes in the history, last export, the import's export date and tasting labels).
  The field where a tasting date is typed still takes `2026-11-18`. **Test:** `test/cite.test.ts`,
  `e2e/german.mjs` (the version line), `e2e/export-import.mjs` (the last export).
- **Cuisines and sources.** A cuisine is named by its adjective (`strings.browse.cuisines`: "Italian",
  "Italienische Küche"), read by `cuisineLabel` and the history; the country's name stays for the
  lists by country. A source's title and place are shown through `citeText`
  (`screens/classics/cite.ts`): the transcriber's line numbers and file names never, and in German
  Kap., Abschn., Aufl., S., Nr.; a technique note lists each source once. The year after a title is
  left out when the title already ends with it. The German wording was reviewed on 2026-11-21
  ([german review](german-review.md)). **Test:** `test/cite.test.ts`, `e2e/german.mjs`.
- **Ratios.** The names and notes of the shipped ratios are in `strings.ratios.seed` and the role words
  ("flour", "water", ...) in `strings.roles`, English and German with the same keys
  (`test/ratios-view.test.ts` checks that every shipped ratio and role has both); the table columns, the
  calculator's choices and the comparison use them. Nothing of a ratio card is English in German mode.
- **Example data.** "Add example data" stores the texts of the examples in the language the app speaks
  (`demo/german.ts`: names, notes, the source of a made-up figure, the example method); the example
  ingredients carry their German names as `names.de` with the source "Example data, not a source".
- **Layout.** German labels are longer (Verhältnisse, Notizbuch), and with three entries
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
- **Three destinations** since 2026-11-22
  ([decision](decisions/cook-screen.md), issue 44; four with Start
  before): **Cook** (German Kochen), **Notebook** (Notizbuch) and
  **Ratios** (Verhältnisse), in that order (`NAV_ENTRIES` in
  `src/router.ts`). A route belongs to one of them (`navEntryFor`): Cook
  holds the one list of dishes, the finder from one ingredient and the stock
  (`#/cook…`, `#/stock…`), with no parts and no views at the top; the
  Notebook holds Components and Dishes (own and shipped components, the own
  dishes, for editing and building on), two parts shown as a row of two equal
  links at the top of their lists (`src/screens/section-tabs.ts`), and every
  dish screen with its cooking mode, own (`#/dishes/<id>`) or shipped
  (`#/classic/<id>`, `#/classic/<id>/cook`). The empty address and any
  unknown one open Cook (`DEFAULT_ROUTE`). The old routes keep working,
  links, bookmarks and tests included, each replaced without a new history
  entry: `#/start` opens Cook, `#/cook/use-up` opens Cook in the order "Use
  up first", `#/classics` and `#/classics/<country>` open Cook with the
  shipped dishes chosen; `#/components`, `#/dishes`, `#/stock`, `#/stock/add`,
  `#/stock/<id>/edit`, `#/cook/<id>/with` and `#/settings` are as before. The
  Notebook entry opens on Components.
- **Settings is the gear** at the right end of the header, a 44 px target
  named for assistive technology ("Settings", "Einstellungen") and marked
  `aria-current` on the Settings screen; it is the first stop after the skip link.
  It is there on every screen of a phone. From 720 px it is not in the header:
  Settings is the last entry of the side rail.
- **Every former destination is at most two taps from Cook**: Ratios,
  Components, the stock and Settings one, Dishes two; "Use up first" is a
  choice of Cook's order. The stock is two taps from every screen (Cook,
  then "What is there"). **Test:** `e2e/navigation.mjs`.
- **Phone first.** Below 720 px width a bottom navigation bar with icon
  and label; from 720 px a side navigation with the same three destinations and
  Settings at its bottom ([design](design.md#layout-and-breakpoints)).
  Both are the same `<nav aria-label="Main">`. Each label is one word on one
  line at 320 and 360 px, in the default and in a wide font. **Test:**
  `e2e/smoke.mjs` at 320, 360 and 1000 px, `e2e/navigation.mjs`.
- **Landmarks:** one `<header>`, one `<nav>` with a label, one `<main>`;
  the current destination has `aria-current="page"`. A skip link ("Skip
  to content") is the first focusable element. The document title is
  "<screen> - Cook's Workbench". **Test:** `e2e/smoke.mjs`.
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
  After a change of screen the heading takes focus for screen readers; the ring on it shows only
  when a key led there. `:focus-visible` cannot tell that for a focus by script, so the shell keeps
  the last kind of input (key or pointer) and marks the heading `focus-quiet` after a tap or a
  click (`shell/shell.ts`). **Test:** `e2e/german.mjs` (no ring after a tap, a ring after Enter).
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
`src/store/bulk.ts`. **Test:** `e2e/export-import.mjs`, `e2e/erase-device.mjs`, `e2e/cooklang-flow.mjs`,
`test/backup-round-trip.test.ts`, `test/backup-erase.test.ts`, `test/reminder.test.ts`, `test/cook-model.test.ts`, `test/store-bulk.test.ts`,
`test/router-import.test.ts`. Screenshots: `docs/screenshots/import-*`, `settings-*`,
`backup-banner-360x720-light.png`.

## Settings, Your data

Export everything, Import from a file (`#/settings/import`), what the file does not hold, the date
of the last export, the reminder period, and "Erase everything on this device". **Export** hands
the browser one file, `cooks-notebook-YYYY-MM-DD.json` (no name, no time of day), format 3, built
by the engine from the store's live records: every version, tasting note and ingredient, and the
skill state (techniques marked as learned, and marks taken back); not drafts, not tombstones. It
makes no request. Nothing to export gives a quiet sentence. Two quiet lines under the hint say what
is not in the file: "Not in the file: the stock of “Home”, kept with the household's other apps."
(the used space's name; without a space "kept in a space") and "Nor are unsaved drafts and the
settings of this device." Why the stock is not in it: [exchange](exchange.md#versions).

**What holds user data, and what the file does with it** (checked 2026-11-21):

| Where                                                                                                                                                  | In the file         | Import                                                 | Erase on this device                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------ | ------------------------------------------ |
| IndexedDB `culina`: `ingredients`, `templates`, `components`, `dishes`, `affinities`, `tastings`                                                       | yes                 | merge or replace                                       | yes                                        |
| IndexedDB `culina`: `skills`                                                                                                                           | yes, since format 3 | merge or replace; a format 1 or 2 file leaves it as is | yes                                        |
| IndexedDB `culina`: `drafts`                                                                                                                           | no                  | no                                                     | yes                                        |
| IndexedDB `culina`: `stock` (old items waiting for their move into a space), `backup` (migration data)                                                 | no                  | no                                                     | yes                                        |
| IndexedDB `domus`: collection `stock` of each space, the spaces themselves (shared with Mixtura, Emptio and the Household app)                         | no                  | no (a format 1 file's stock is left out and counted)   | no: removed in the Household app           |
| localStorage `culina.theme`, `culina.lang`, `culina.dishes`, `culina.cook`, `culina.space`, `culina.lastExport`, `culina.reminderDays`, `culina.debug` | no                  | no                                                     | yes (every key that starts with `culina.`) |

**Test:** `test/backup-round-trip.test.ts` (export, a fresh database, "Merge now", every record
and the skill state compared; replace with format 3 and format 2; a differing mark is a
conflict), `e2e/export-import.mjs` (the same in a browser, the tester's steps, and a format 2
file). Not proved: fake-indexeddb in the unit test; the browser check clears IndexedDB through the
developer protocol on one device in Chromium.

## Erase everything on this device

A button under "Your data". It asks first with an inline row (never a dialog) that names what goes,
with counts: "Erase from this device: 24 ingredients, 8 component versions, 5 dish versions, 3
tasting notes, 1 skill marks, 2 unsaved drafts, this app's settings (theme, language, filters,
reminder)?" (only what is there; nothing there gives one quiet sentence). When a space is used, two
quiet lines say "The stock of “Home” stays: it is shared with the household's other apps." and
"To remove it from this device, remove the space in the Household app.", with a link to the space
there (`../#/spaces/<id>`). Then "Export first" (the export as above; the question stays open),
"Erase everything" and "Cancel". There is no Undo, hence the export offered first.

The erase empties every object store of Culina's database `culina` except `meta` in one
transaction (every record and version, the skill state, drafts, old stock items, the migration
backup; no tombstones: nothing of the notebook is synced today), removes every localStorage key
that starts with `culina.`, and starts the app again at `#/cook` (a reload; `#/start` before 2026-11-22), so the app is as on
a first start: empty notebook, default theme and language, no filter, no export date.

**The stock is left out on purpose.** It is the collection `stock` of a space in the database
`domus` that Mixtura, Emptio and the Household app share on this origin. Removing Culina's view of
it would remove Mixtura's on this device too; writing removal markers would remove it for the
whole household at the next cycle; deleting rows without markers would bring them back from the
storage at the next cycle, and the host's `removeSpace` is not safe while a loop runs
([sync orderings](../../../packages/host/docs/sync-orderings.md), "A space is removed while its loop
is still running": not handled). Removing a space from this device is the Household app's.

Not handled: a second open tab of Culina keeps its notebook in memory until it is reloaded, and a
save there writes that record again. When the notebook is synced one day (the library of the
[sync decision](decisions/sync.md)), the erase must be decided again: rows deleted without
markers would come back from the storage, which may be what "this device only" wants.

**Code:** `src/exchange/erase.ts`, `Store.eraseAll` (`src/store/repository.ts`),
`src/screens/settings-data.ts`. **Test:** `test/backup-erase.test.ts` (counts; every row of the
own database, drafts and `culina.` keys gone, other apps' keys and the stock of the space and the
space itself kept; the next start is empty), `e2e/erase-device.mjs` (run from
`e2e/export-import.mjs`: question with counts, Export first, Cancel, erase, reload at `#/cook`,
default theme, stock untouched). Not proved: fake-indexeddb and a memory store for `domus` in the
unit test; one tab; Chromium only; the German texts were not seen in a browser.

## Backup reminder

The date of the last export is kept in `localStorage` (`culina.lastExport`) with the period the
user chose (`culina.reminderDays`: Never, 7, 14, **30 (default)**, 90 days). A quiet line above the
screen (never a dialog) shows only when the notebook has changes that no export holds (some
row's `updatedAt`, tombstones included, is later than the last export) **and** the period has
passed since the last export, or, with no export yet, since the oldest change (the skill state
counts since format 3). Text: "Your notebook
has changes that are in no export yet." / "... The last export was N days ago." with "Export now"
(links to Settings) and "Not now" (hides it until the app is reopened). Exporting hides it.
**Test:** `test/reminder.test.ts`; `e2e/export-import.mjs` injects the clock with
`?e2e-now=<instant>` (`src/store/e2e-clock.ts`, inert without the query) instead of waiting.

## The import screen

`#/settings/import`: choose a file; `.cook` files go to the Cooklang step, everything else is read
as an export file. A file that cannot be used (not JSON, not an export, a record that does not fit
its schema, a repeated id, a newer version) ends in one quiet sentence plus "Nothing was changed."
and **never touches stored data** (the engine returns no records and nothing is written before
the user confirms). Older versions are migrated by the export migration chain
([versions](exchange.md#versions)): a format 1 file's stock is left out and counted; a format 1 or 2
file holds no skill state, and the summary says "The file is from an older version and holds no
skill marks; the skills marked as learned here stay." ("replace everything" then leaves the skill
state as it is). The summary counts skill records as "skill marks"; a skill conflict is labelled
with the technique's name.

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

**Recipe from an AI** ([decision](decisions/ai-prompt-import.md), issue 40, built 2026-11-22
and 2026-11-23). Below the file button: **Copy AI prompt** copies a prompt in the app's language,
generated from the import format's schema ([exchange](exchange.md#the-recipe-import-format)): the
fields, the roles, the units Culina reads, "mark every amount you guessed" and "copy no text
beyond what the recipe states", and an example. It is also shown read-only, so it can be selected
when the clipboard is refused ("The prompt could not be copied; select it below and copy it.").
The user pastes the answer into **Answer of the AI** and presses **Read the answer**; a saved
answer can also be chosen as a `.json` file with the file button (a JSON file in the format
`culina-recipes` goes to this step, any other JSON file is read as an export). An empty field says
"Paste the answer first."; a text that does not start with `{` (after a Markdown code fence,
which is taken off) goes through the Cooklang step below like a `.cook` file named "Pasted recipe",
as the first prompt asked; a line under the field says so ("A Cooklang text can be pasted here
too, and a .cook file chosen with the file button above."). No model runs in the app and nothing
is sent anywhere. An answer longer than 1,000,000 characters is refused with one sentence before
it is read.

- **Refused answers.** JSON that cannot be read, another format, an answer the schema refuses, or
  names that point nowhere: under "What the answer cannot say this way" one sentence per error,
  naming its place ("Recipe 1 (Pancakes), component 1 (Batter), line 1: "ingredient" is needed.",
  "Recipe 1 (Pancakes), slot 2: the alternative "Jam" is not a component of the recipe."), the hint
  to ask the AI for a correction, and "Nothing was changed." Nothing is stored. A title or name
  from the answer is cut to 40 characters with "…" in these sentences.
- **The step** (`src/screens/import/ai-import.ts`, model `src/exchange/ai-model.ts`) reports what
  was read ("2 recipes with 7 ingredient lines read. Nothing is saved until you save.") and how
  many amounts the AI marked as guessed. Then **which ingredient each name means**, once for the
  whole answer (a name in two recipes is asked once and created once), exactly as for a Cooklang
  file (exact match preselected, close matches from the notebook and the catalogue, create new,
  file under a class, "Create a new ingredient for every name left open"). Then per recipe: what it
  becomes ("Becomes a dish with 3 components." or "Becomes a component."), its source or "The
  answer names no source.", its name, portions (a dish, prefilled from `persons`) or output weight
  in grams (a component, prefilled from a mass `yield`; another yield is named and left out of the
  field, a dish's yield goes into its note, both said in the step), and per component its name (a
  dish), its role in the dish and its lines with the per-line decisions of the Cooklang step
  (amount as written, by the ingredient's facts, weighed, or open; role). An alternative says "Alternative
  for Apple sauce: not in the dish; Swap offers it." A slot filled by an ingredient has its line
  under "Slot Garnish, filled by an ingredient".
- **Guessed amounts** carry a tag "guessed" beside the amount on their line, are counted at the
  top, keep "guessed" at the end of the stored line's note and are listed again after the save
  under "Amounts the AI guessed". A word without a readable size ("2 EL", "1 Prise") offers
  only "I weighed it" and "Leave open, keep as text" and starts open.
- **Save all recipes** is possible once every name is decided, every recipe and every component
  of a dish has a name, and the numbers are usable; it writes every recipe, the new ingredients and
  the catalogue entries chosen in **one transaction**, then an **Undo** toast ("Imported 2
  recipes.") that takes all of it back. The result lists links to the saved recipes, the guessed
  amounts and the lines left open.
- **Known loss: the source.** No component or dish record has a source field, so the recipe's
  source (`title`, `author`, `url`, `where`) is kept only as free text in the `change` of
  version 1, of the dish and of each of its components ("Imported from an AI answer; source:
  Family card, Anna, back side"); a later version has the change its author gives it. It is not
  a link and not searchable.

**Test:** `test/ai-import.test.ts` (fence, refusals one sentence each, names once over the answer,
guessed, roles, yields, one transaction, Undo), `test/ai-prompt.test.ts` (the prompt and the schema
agree), in the engine `test/recipes.test.ts`; browser check `e2e/ai-import-flow.mjs` (a broken
answer, two recipes with a guessed amount and an alternative, Save, Undo, layout at 360 px). Not
proved: what a real model writes for the prompt; the screen reader's reading of the step.

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
with its parent chain in that save, and the lines point at the copy; Undo takes
the copies back too. Nothing is copied for a name left unconfirmed or when the step is left.
**The copies are written in the same transaction as the import** (since 2026-11-23): a save the
store refuses leaves none of them behind. Before, they were saved one by one ahead of the import,
so a refused save left them in the notebook (pinned by "a save the store refuses leaves no
catalogue entry behind" in `test/import-catalogue.test.ts`, which fails on the earlier code with 3
entries left).
A toast offers Undo.
**Test:** `test/import-catalogue.test.ts`, `e2e/import-catalogue.mjs` (empty notebook, offline).

**A file with sections** (`= Teig`, `== Soße ==`; issue 41,
[decision](decisions/ai-prompt-import.md), point 6) **becomes a dish** of one component per
section with ingredient lines ([exchange](exchange.md#cooklang) has the rule for every part and
why). The step says so under what was read ("The file has sections: it becomes a dish of 2
components.") and changes as follows:

1. Name of the dish (prefilled from `title`, else the file name), **Portions (optional)**
   (prefilled from the leading whole number of `servings`; a whole number above 0 or empty), and,
   when a dish of that name exists, "A new dish" or "A variation of ...". No output weight and no
   percent base for the dish.
2. Which ingredient each name means: unchanged, once per name for the whole file.
3. **Components of the dish**, one block per part in file order, headed by where it comes from
   ("From the section Teig", "Before the first section", "From a section without a name"). A part
   with lines has the component's **name** (prefilled with the section's name; text before the
   first section with the file's title), its **Role in the dish** (the dish roles, prefilled
   "Main element", so nothing is left unset; the cook changes it), its own **percent base** among
   the roles of its lines, and then its lines with the same amount and role decisions as above.
   Two parts that would get the same name ("= Teig" twice, or a section named like the file) are
   named apart, "Teig (2)", since two components of one dish with one name cannot be told apart
   and their Cooklang export would write one file stem for both; the fields stay editable, and a
   name the cook types is not checked again.
   A part without lines says what it becomes: "No ingredients: becomes the note of the dish."
   (before the first section), followed by the note's text in quotes on one line (cut at a word
   after 160 characters with "…"), or "No ingredients: its 2 steps and 1 note become part of the
   assembly of the dish." (steps and notes counted apart; each becomes one assembly step).

Save waits for every name, a name for every component, usable grams, roles and portions. It
writes the new ingredients, each component (version 1 of its own family) and the dish (version 1,
or a variation) in one transaction; the change of each is "Imported from <file>". The lines left
open are reported as for one component; "Open the dish" leads to it. **Undo** in the toast takes
back the dish, its components, the new ingredients and the adopted catalogue entries. A file
without sections is one component, as above.
**Test:** `e2e/cooklang-flow.mjs` (two sections become a dish of two components after Save, nothing
before, a component without a name blocks Save, Undo removes them, export), `test/cook-model.test.ts`,
engine vectors `parts-*` and `import-dish-*`. Screenshots: `docs/screenshots/import-cooklang-sections-360x720-light.png`, `...-1000x700-light.png`.

## Cooklang export

A component's detail has "Export as Cooklang": one `.cook` file for the shown version, with its
method and its steps; one quiet
sentence says what it cannot carry ([decision](decisions/cooklang.md#what-is-lost): ratios and
percentages, roles, states, version history, other tasting notes, step characters that would read
as markup).

An own dish's detail has "Export as Cooklang" too (`dishDetail`; a shipped dish is drawn by
`classicScreen` and has no such button, a kept copy is an own dish and has it): **one file for the dish**, one section per
slot (a component's lines and steps; its current version, as the dish shows it), the dish's note
before the first section and its assembly under "Assembly" ("Zusammenbau"). The sentence adds
what a dish loses: how much of each component the dish takes and optional roles, the output
weights of the components, course, cuisine and the correction of the characters
([exchange](exchange.md#cooklang)). Read back, the file gives a dish with the same components,
lines, note and assembly steps, minus what is listed as lost.

**Text:** `strings.importing`, `strings.backup`, `strings.settings`, `strings.cooklang`.

# Local store

The app keeps what the user enters in IndexedDB ([data model](data-model.md#storage-and-migrations));
the editors write ([editor](#editor)). Its own database is `culina`; the stock lives in the
database `domus` that the household's apps share ([stock](#stock)). Which of them the export file
holds and what "Erase everything on this device" removes: [Settings, Your data](#settings-your-data). Settings shows one quiet line about it, read with
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
file except `sw.js`; `catalogue.json`, `classics.json`, `pairings.json` and `pairing-links.json` among them). On `install` it precaches the list and takes over
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
