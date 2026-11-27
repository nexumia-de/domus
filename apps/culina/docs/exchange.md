---
type: Specification
title: Export, import, matching and Cooklang in the engine
description: The pure engine rules of the export file (build, read, versions, migration chain), merging by id with conflicts, remapping ingredient ids, matching names to ingredients, and the Cooklang reader and writer written from the specification, with what is and is not supported; issue 18.
tags: [engine, export, import, merge, matching, cooklang, vectors]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: spec
    title: 'cooklang/spec, README.md (MIT), read 2026-11-18 on raw.githubusercontent.com'
    url: https://github.com/cooklang/spec
  - id: conventions
    title: 'cooklang/spec, conventions.md (MIT), read 2026-11-18 on raw.githubusercontent.com'
    url: https://github.com/cooklang/spec/blob/main/conventions.md
  - id: decision
    title: Whether Culina reads and writes Cooklang files
    url: decisions/cooklang.md
  - id: datamodel
    title: Data model, Export
    url: data-model.md#export
---

# Export, import, matching and Cooklang in the engine

Code: `packages/engine/src/exchange/` and `src/cooklang/`. Pure: time and ids
come in as input, the schema validators are passed in by the host (the app
compiles them at build time, the tests with Ajv). Every fallible function
returns `{ ok: true, ... }` or `{ ok: false, error }`. Vectors:
`packages/engine/vectors/export/`, `match/`, `merge/` and `cooklang/`
([vector format](vectors.md#kinds-of-export-matching-merging-and-cooklang-issue-18)).
How the app uses them: [behaviour](behaviour.md#export-and-import).

## The export file

- `buildExport(records, exportedAt)` makes the envelope of the
  [data model](data-model.md#export-file): `format`, `formatVersion`,
  `exportedAt` and one array per kind that has records, each sorted by id, so
  the same data gives the same text. `serializeExport` writes two-space JSON
  and a final newline. `exportFileName` is `cooks-notebook-YYYY-MM-DD.json`:
  no name, no time of day.
- `parseExport(text, validators)` reads in this order, and stops at the first
  problem, returning no records: not JSON (`not-json`); not an object with
  `format` `culina-export` (`not-an-export`); `formatVersion` not a whole
  number from 1 (`bad-version`); a higher version than the reader knows
  (`newer-version`, with `found` and `supported`, before anything else of the
  file is looked at); older versions migrated step by step through
  `EXPORT_MIGRATIONS` (`bad-migration` when a step is missing or throws; see
  [versions](#versions)); a top-level field that
  is not a header field, a kind or `x-` (`unknown-field`); a collection that is
  no list (`not-a-list`); a record that breaks its schema (`invalid-record`
  with kind, position and schema paths, never the text); two records of one
  kind with the same id (`duplicate-id`). Top-level `x-` fields are accepted
  and not kept; record-level `x-` fields are part of the record and are kept.
- The hand-written header rules agree with `export.schema.json`: a test
  validates every built envelope against it.

### Versions

| Version | Since      | What changed                                                                                                                                                                     |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | issue 18   | The first file                                                                                                                                                                   |
| 2       | 2026-11-20 | No `stock`: it is the shared collection of a space ([stock in spaces](decisions/stock-in-spaces.md)). The migration 1 to 2 leaves it out; `stockLeftOut` counts what it left out |
| 3       | 2026-11-21 | `skills`: the [skill state](data-model.md#skill-state) (techniques marked as learned, marks taken back). The migration 2 to 3 changes nothing                                    |
| 4       | 2026-11-24 | `cooked`: the [day a dish was last cooked](data-model.md#date-a-dish-was-cooked), one record per dish family. The migration 3 to 4 changes nothing                               |
| 5       | 2026-11-27 | `favourites`: the dishes marked as [favourites](data-model.md#favourite), one record per dish. The migration 4 to 5 changes nothing                                              |

A file of version 1 is read through the chain. `parseExport` counts the
items of its `stock` before the chain runs and returns the number as
`stockLeftOut` (absent when none, and absent when a test passes its own
chain); the import preview says that they are left out. A version 2 file
that holds `stock` is refused (`unknown-field`). Vectors:
`parse-leaves-out-the-stock-of-version-1`, `parse-refuses-stock-in-version-2`.

Version 3 adds the collection `skills` (2026-11-21, after a tester exported,
deleted the browser's data, imported and found the technique he had marked as
learned taught again). A kind belongs to the file from the version in
`KIND_SINCE` on: a version 2 file that holds `skills` is refused
(`unknown-field`), because the format decided that within one version the
fields are closed. `parseExport` returns the version the file was written in
as `fileVersion`, so the host knows that an older file could not hold the skill
state (the import says so, and "replace everything" leaves it as it is). An app
that reads up to version 2 refuses a version 3 file as `newer-version` with
"update the app", before it looks at the skills: that is the rule older apps
already follow (the vector `parse-refuses-newer-version` of version 2 was
exactly a version 3 file). Skill records are not immutable: a mark that
differs from the notebook's is a conflict the user decides, never "newer
wins". Vectors: `parse-reads-version-2-without-skills`,
`parse-reads-skills-of-version-3`, `parse-refuses-skills-in-version-2`,
`parse-an-older-reader-refuses-version-3` (the old reader simulated with the
`current: 2` test hook), and `round-trip-everything` with two skill records.

Version 4 adds the collection `cooked` (2026-11-24) by the same rules: a
version 3 file that holds `cooked` is refused (`unknown-field`); a version 3
file without it reads through the identity migration 3 to 4 and reports
`fileVersion` 3, so the import says it holds no days and "replace
everything" leaves the days kept on the device as they are; an app that
reads up to version 3 refuses a version 4 file as `newer-version` (the vector
`parse-refuses-newer-version` is now a version 5 file read by a version 4
reader). A day that differs from the notebook's is a conflict the user
decides, like a skill mark. Vectors: `parse-reads-cooked-of-version-4`,
`parse-reads-version-3-without-cooked`, `parse-refuses-cooked-in-version-3`,
`parse-an-older-reader-refuses-version-4`, and `round-trip-everything` with
one day, and `parse-refuses-a-cooked-day-the-calendar-lacks` (a day such as
30 February, which the date pattern lets through, refuses the file). The
app drops a day whose dish is not there: from the export, on "replace
everything" and on a merge (`src/exchange/orphan-days.ts`,
`test/cooked-orphans.test.ts`). App tests: `test/backup-cooked.test.ts` (export, a new device and
"Merge now" bring the day back; replace with a version 4 file makes the days
the file's; replace with a version 3 file leaves them).

Version 5 adds the collection `favourites` (2026-11-27) by the same rules: a
version 4 file that holds `favourites` is refused (`unknown-field`); a version 4
file without it reads through the identity migration 4 to 5 and reports
`fileVersion` 4, so the import says it holds no favourites and "replace
everything" leaves the marks kept on the device as they are; an app that reads
up to version 4 refuses a version 5 file as `newer-version` (the vector
`parse-refuses-newer-version` is now a version 6 file read by a version 5
reader). A favourite of an own dish whose dish is not there is dropped from the
export, on "replace everything" and on a merge; a favourite of a shipped dish is
kept (`src/exchange/orphan-favourites.ts`, `test/backup-favourites.test.ts`).
A record carries no date or count: one that does is refused. Vectors:
`parse-reads-favourites-of-version-5`, `parse-reads-version-4-without-favourites`,
`parse-refuses-favourites-in-version-4`, `parse-an-older-reader-refuses-version-5`,
`parse-refuses-a-favourite-with-a-date`,
`parse-refuses-a-favourite-whose-id-names-another-origin` and
`round-trip-everything`.

**What the file does not hold, and why.** The stock of a space (the shared
collection of the household's apps; a replace import would delete what
another app or person put there, and its ids, its space, its removal markers
and the newest-wins merge of the other apps' writes have no place in a merge by
id that asks the user: see below); drafts (unfinished forms); and this
device's preferences (theme, language, filters, the reminder, the choice of
space). Settings says so under "Your data".

**What a stock backup would take** (not built): the export is per space, so a
file names the space id and its name; the records are the space's sync records
with their stamps and removal markers, not Culina's view of them (records of
Mixtura and keys Culina does not show included, or another app's data is lost
on restore); an import never replaces: it merges by the host's
newest-stamp rule through `localChange`, so another device's later mark wins
and a restore cannot resurrect what the household removed since; importing into
another space or onto a device that has not joined the space needs a decision
(a new device-only space, or refuse); and each of these orderings (a restore
during a cycle, a restore of an older file over newer marks, two tabs) gets a
row in [sync orderings](../../../packages/host/docs/sync-orderings.md) with
its test. The decision record says the Household app exports a space; that is
where it belongs, since it holds the spaces of every app.

## Merging

`planMerge(mine, file)` compares live records by id:

| In the file                        | Result                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| id the notebook does not have      | added                                                                                                 |
| id the notebook has, same content  | left alone (key order and array order of the file do not matter for objects; arrays compare in order) |
| id the notebook has, other content | conflict, listed with both records                                                                    |

"Newer wins" is never assumed: the user chooses `mine` or `theirs` per
conflict or for all (`mergeWrites` returns the records to write; a conflict
without a choice keeps the notebook's record). Component and dish records
are versions and immutable ([data model](data-model.md#version)), so their
conflicts are `immutable`: only the notebook's record stays, `theirs` writes
nothing, and a tasting note of the file that refers to such a version is left
out (`skippedNotes`) rather than attached to different content. A record the
user removed earlier is a tombstone in the store, not a live record, so the
file's record is added and revives it.

`remapIngredients(records, map)` points every reference to an ingredient id in
`map` (line refs, slot refs, `parentId`, both ends of an
affinity) at the mapped id and drops the mapped ingredients from the set.
Component refs are never changed.

## Matching names to ingredients

`matchIngredients(names, candidates)`, candidates `{ id, name, origin,
parentId? }` (the notebook's first, then the shipped catalogue's entries with
`origin: 'catalogue'`; see below). For each name:

- **Exact**: the first candidate in list order whose name is the same after
  _normalising_: lower case, split at anything that is no letter or digit,
  each word in the singular (`ies` to `y`, `oes` to `o`, `s`/`x`/`z`/`ch`/`sh`
  plus `es` to the stem, otherwise a final `s` unless it follows `s`, `u` or
  `i`), words joined by one space.
- **Close**: other candidates (also a second one of the same name) whose
  words all occur in the name, or whose words contain all words of the name,
  best overlap first (shared words over all words), ties in list order, at most
  five. `chopped red onion` is close to `red onion` and `onion`; `sunflower oil`
  is not close to `olive oil` (one shared word, neither holds the other).
- **Classes**: the ancestors, in the candidates' tree (materia's `buildTree`
  and `ancestors`), of the exact and the close matches, nearest first, not
  listed already, at most five. A parent that is no candidate ends the chain.

Nothing is created or chosen by the function; it proposes.

**Candidates of the Cooklang import** come from `candidateIngredients(catalogue)`
(`packages/app/src/exchange/candidates.ts`): the notebook's ingredients first, then
the entries of the shipped catalogue (parents and foods, an entry the notebook
already holds is listed once, as the notebook's). The rules above are not
changed: an exact name in the notebook wins because it comes first; only an
exact match is preselected. Choosing a catalogue candidate adopts the entry
with its parent chain on Save (`adoptEntry`, as the picker does), also for a
catalogue class a new ingredient is filed under; nothing is adopted before Save
or when the step is left. The catalogue loads when the step opens; if it
cannot be loaded the notebook's candidates remain and one quiet line says so.
The JSON merge keeps the notebook's candidates only.

**What the rule proposes for common names** (shipped catalogue, empty
notebook): `butter`, `egg`, `milk`, `garlic`, `wheat flour` have an exact match
(the parent or the food of that name), `sugar` exact "Sugars", `onion` exact
"Onions" (plural form). `flour` and `salt` have none: the closest are the
two-word flours (Arrowroot, Millet, Corn, ...; the file says only "flour", so
no one is better) and "Salt, table". Most variants carry USDA's comma-separated
names, and a Cooklang ingredient name cannot contain a comma, so a file never
names such a food exactly; it reaches one as a close match (`white bread wheat
flour`) or through its parent. No ordering change was needed.

## Cooklang

Written from the specification, no library and no code of a Cooklang parser
copied. Read on 2026-11-18: `README.md` and `conventions.md` of
`cooklang/spec` at `raw.githubusercontent.com` (MIT; `github.com/cooklang/spec`
answers 403 from here, `cooklang.org` answers 200). The spec has no version; the
reader follows the README and the conventions as read that day.

**Reader** (`parseCooklang`, never fails, text that is not markup stays text):

| Supported                                                                                              | Not supported                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingredients `@name`, `@multi word{}`, `@name{qty}`, `@name{qty%unit}`, numbers, decimals and fractions | Ranges (`1-2`), temperatures, units with a space, aliases, `@&` references, hidden items (parser extensions of cooklang-rs, not the spec): quantity kept as text, line stays open |
| Optional `@?`, `#?` (an `@? x` with a space is text)                                                   | A mixed number such as `1 1/2` is kept as text, not read as a number                                                                                                              |
| Recipe references `@./path{qty}` (path may hold spaces when braces follow)                             | Scaling by servings or yield: the file's quantities are taken as written                                                                                                          |
| Cookware `#name`, `#multi word{}`; timers `~{qty%unit}`, `~name{qty%unit}`                             | Cookware and timers are read; Culina has no place for them, they become step text                                                                                                 |
| Short preparations `(…)` after an ingredient                                                           |                                                                                                                                                                                   |
| Comments `--` and `[- -]`, steps as paragraphs, `\` line breaks, notes `>`, sections `=`               |                                                                                                                                                                                   |
| Front matter: `key: value`, `key: [a, b]`, `- item` lists; nested maps are ignored                     | Nested front matter (`source.name`) is not read                                                                                                                                   |
| `=` lock in front of a quantity: read, flagged `locked`                                                | The lock has no equivalent in Culina and is dropped                                                                                                                               |

**What the import makes of a file without sections** (`importComponent`): one component, version 1
of a new family (`parent` only when the user makes it a variation). Every
ingredient occurrence is a line, in file order; the user decides per line the
target (an ingredient or component of the notebook, or a new ingredient), the
amount mode and a role. Steps become `method` entries in order, notes too
(as entries of their own, unmarked); cookware and timers
stay as words in the step text; inline positions of ingredients are lost.

**A file with sections becomes a dish** (`cooklangParts`, `importDish`; issue 41,
[decision](decisions/ai-prompt-import.md), point 6). The spec says sections are for
"components that need to be prepared separately"; it says nothing of text before
the first section, and the official parser cooklang-rs keeps that text as a
section without a name (`Recipe.sections`, read 2026-11-23). The file is read in
parts: the text before the first section line, then one part per section (a `=`
without a name is a part without a name; a section with nothing in it is left out).

| Part                                              | Becomes                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A section with ingredient lines                   | a component, version 1 of its own family, named after the section; its steps and notes are its `method` |
| Text before the first section, with lines         | a component of its own, first in the dish, named after the file (its `title`, else the file name)       |
| Text before the first section, without lines      | the dish's `note`, one paragraph per step or note                                                       |
| A later section (or `=` without a name), no lines | assembly steps of the dish (`steps`, each a `note`); the section's name is not kept                     |

**Why text before the first section is the note when it has no lines:** a
component needs lines, and as assembly it would be cooked after the components it
stands before; such text is mostly an introduction or a preparation for the whole.
With lines it is a part like any section (as in cooklang-rs). The dish has one slot
per component, in file order, with the role the user confirmed (prefilled `main`);
`portions` from the leading whole number of `servings` (or `serves`), as the user
confirmed. Each component gets the same `change` ("Imported from <file>"); only the
dish can be a variation of an existing dish. The per-line decisions are the same as
for one component, made per line wherever it stands; a name is asked once for the
whole file. Not read: `yield` for the dish (a component's output weight is not in
the file; the user may give each a percent base, no output weight). Two parts that
would get the same name are named apart in the step ("Teig", "Teig (2)"), since one
dish's components and their export file stems must be told apart.

**Amount modes** of all three imports (`availableModes`, `resolveAmount`): `given` (a number and a unit
Culina knows: g, kg, oz, lb, ml, l, tsp, tbsp, cup, and no unit as a count; unit
words in `units.ts`; a word with a size in `data/unit-words.json` would be read as that
size, none has one yet, see [unit words](#unit-words-without-a-table-unit)), `facts` (volume through the ingredient's density, count
through its unit weight; offered only when the ingredient has it), `grams` (the
user weighed it), `open` (no amount: the line is kept, the written quantity is
its note, and it is reported as unmeasured). A quantity that is not a number or
has an unknown unit (`{2%cloves}`, `{1-2}`) offers only `grams` and `open`.
Nothing is converted without the facts and nothing is guessed. The short
preparation and the written quantity (when it is not the amount) go into the
line's `note`, joined by a comma.

### Unit words without a table unit

`data/unit-words.json` (read by `sizedWord`, `sizedIn` and `noFixedSizeWord` in
`src/cooklang/units.ts`) is the one place for words a cook writes that are no unit
of the table: `sized` holds a word with a size read in a named source (unit, factor
and the quoted sentence), `noFixedSize` a word without one, with the reason. It is
read by the Cooklang reader and the recipe import alike. A word in `sized` would be
given as its size in the table's unit with its words in the note ("As written: …
(size)" in the step); moving a word there is the whole change. Checked 2026-11-23
(issue 40); the reader knew none of the six words before, and none has a size now:

| Word (also)                | Now             | Why                                                                                                                                            |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `EL` (Esslöffel, Eßlöffel) | open, no number | no source with a size could be read from this environment (below)                                                                              |
| `TL` (Teelöffel)           | open, no number | the same                                                                                                                                       |
| `Prise` (Prisen)           | open, no number | Wikipedia (English), [Pinch (unit)](<https://en.wikipedia.org/wiki/Pinch_(unit)>), read 2026-11-23: "There is no generally accepted standard." |
| `Msp.` (Msp, Messerspitze) | open, no number | no source read; taken to have no size, a judgement                                                                                             |
| `Becher`                   | open, no number | the product's size; no source read gives a general one                                                                                         |
| `Päckchen` (Pck., Packung) | open, no number | the product's size; no source read gives a general one                                                                                         |

**Why EL and TL have no size:** the candidates were not read. Michael Hertl,
_Kinderheilkunde und Kinderkrankenpflege für Schwestern_ (Thieme 1979; archive.org
item `kinderheilkundeu0000hert`) is a lending item: only a snippet of its OCR text
came back from archive.org's full-text search
(`https://archive.org/services/search/beta/page_production/?service_backend=fts&hits_per_page=5&page=1&user_query=identifier%3Akinderheilkundeu0000hert%20%221%20Messerspitze%22`),
the text file and the page images were not reachable, and a reviewer could not
reproduce the snippet. A cookbook (Judith Simons, _Lust auf… Landküche_, 2000) was
seen the same way, as a snippet only. Refused by the network: `de.wikipedia.org`,
`de.wiktionary.org`, `dwds.de`, `duden.de`, `ptb.de`, `bzfe.de` (403),
`gesetze-im-internet.de` (connection reset) and the archive.org scan hosts
`dn*.ca.archive.org` (403). The app's German name of the US `tbsp` is "EL"; the
reader does not take the reverse ("EL" is a `tbsp`) for a fact either.
A word without a size is handled like any unknown word and like "to taste": the
line stays open (or weighed), its words in the note.
**Test:** `test/recipes.test.ts` in the engine (no word has a size, they stay open,
the machinery with a table of its own, a Cooklang file reads `{2%EL}` the same way).

## The recipe import format

The answer a language model of the user's choice writes from a recipe
([decision](decisions/ai-prompt-import.md), issue 40). The schema is
`schemas/recipe-import.schema.json` (fields in the [data model](data-model.md#recipe-import-file));
`format` `culina-recipes`, `formatVersion` 1, `recipes` (1 to 20). Names and
amounts are as written, there are no ids:

- a **recipe**: `title`, `persons` or `yield` (written), `source` (`title`,
  `author`, `url`, `where`), `components`, `slots`, `steps` (the assembly);
- a **component**: `name` (unique in its recipe), `role`, `lines`, `steps`;
- a **line**: `ingredient`, `amount` ("200 g", "1/2 TL", "3"), `guessed`
  (only with an amount), `role` (closed list of the ratio and dish roles), `note`
  (the preparation);
- a **slot**: `role` (a dish role), a `component` or an `ingredient` by name
  (exactly one), `amount` and `guessed` for an ingredient, `optional`,
  `alternatives` (names of other components of the recipe that may fill it).

**Beyond the schema** (`checkRecipes`): component names unique; a slot's
component and every alternative exist; an alternative fills no slot and is listed
once; an ingredient slot has no alternatives and a component slot no amount; with
slots given, every component is in a slot or an alternative. Each problem names its
recipe and slot.

**What a recipe becomes** (`importRecipe`, pure; ids, date and texts come in):

| The recipe                                   | Becomes                                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| one component, no slots, no `persons`        | a component (its `role` when given, `yield` in grams when the written yield is a mass, steps then assembly as `method`) |
| `persons`, slots, or more than one component | a dish: `portions`, one slot per component in order when there are no slots, else the slots as written                  |
| a slot with an `ingredient`                  | a dish slot that refers to the ingredient, with its amount when it can be used                                          |
| an alternative                               | a component in no slot with the role of the slot it may replace (the notebook's rule; Swap offers it)                   |
| a yield of a dish                            | the dish's `note` ("Makes 1 kg"), shown in the step                                                                     |
| `source`                                     | the `change` of every new version: "Imported from an AI answer; source: …"                                              |
| `guessed`                                    | the word "guessed" (in the app's language) at the end of the line's note                                                |

Every component of a dish gets a `role` (its slot's, an alternative's slot's, or
its own, else `main`), so that the notebook's alternatives work. Amounts are read
by `readWrittenAmount` into the same quantity a Cooklang file gives: numbers with a
point or a comma, fractions `1/2`, mixed `1 1/2`, `½` and `1½`; a range ("2-3 EL"),
a text first ("etwas") or a number that could be a thousand or a decimal ("1.000 g",
"1,250 kg"; a leading 0 is plain: "0,125 l") keeps its words and no value, so the
line is open unless the user weighs it. A pasted answer or a file in the format longer
than 1,000,000 characters (`MAX_ANSWER_CHARS`; twenty full recipes are under 200,000)
is refused with one sentence before it is parsed; a file is recognised as an answer by
its `"format": "culina-recipes"` before that. In error sentences a name or value from
the answer is cut to 40 characters with "…" (`short`). The amount modes and the per-line decisions
are those of the Cooklang import.

**The prompt** (`src/screens/import/ai-prompt.ts`, `promptFor`) is generated from
the schema: every object and field in schema order, with "required" or "optional",
its kind (text, whole number from 1 to 100, true or false, list of …, one of the
closed list of roles, exactly the constant) read from the schema; only one
explanation per field and the rules are written in the module, in English and
German. The rules: copy no text beyond what the recipe states; invent no amount
and mark every guessed one with `"guessed": true`; several recipes go in one
answer; separately made parts are components; the units Culina reads (`UNIT_WORDS`:
the table's words and the sized words, none yet) and the words without a fixed size
(`NO_FIXED_SIZE_WORDS`: EL, TL, Prise, Msp., Becher, Päckchen). An example answer per language follows, then "Recipe:".
**Proved by** `test/ai-prompt.test.ts`: every field of the schema stands in each
prompt with its flag and an explanation, and no other; every role and unit word is
listed; the rules are there; the example passes the schema (Ajv over the schema
files), `checkRecipes` and the app's compiled validator; a field without an
explanation stops the generator. **Not proved by tests:** what a real model writes
for the prompt; no model is run, in the tests or in the app.

**Writer** (`componentToCooklang`): one component per file. Front matter
`title` (quoted when it holds a colon) and `yield: 70%g`; the latest tasting
note of this version as a `>` note; one step `Combine @A{qty%unit}, @B{…} and
@C{}.` with the line's note as a short preparation; then the method as
paragraphs, then the structured steps one line each as the app shows them (word,
time, temperature, note; passed in by the app, since 2026-11-23: before they were
left out without a word). Percent lines are written in grams (percent of the base mass, via
`componentLineGrams`); when that is not possible the line has no quantity. A
count is a bare number. A component line is `@./File-name{qty%g}`, the file
name being the component's name with spaces as hyphens. Core syntax only; no
extension and no `servings`. The result lists what was lost (`lost`):
`ratios` (percent lines, template, role of the component), `roles` (line roles),
`states`, `versions` (parent, change, reason), `tastings` (other notes),
`characters` (`@ # ~`, `--`, `[-` and a leading `>` or `=` removed from method
steps, since Cooklang has no escape) — see
[the decision](decisions/cooklang.md#what-is-lost).

**Dish writer** (`dishToCooklang`, issue 41): one file per dish. Front matter
`title` and `servings` (the portions); the latest tasting note of the dish as a `>`
note and the dish's note as paragraphs, both before the first section; then one
section per slot in slot order: `= <component name>` with the component's body as
above (its current version, as the dish shows it), an ingredient slot as
`= <name>` and `Add @Name{qty}.`, a component the notebook lacks as
`Add @./Name{}.`; then the assembly steps (one line each as the app shows them)
under `= Assembly` (`= Zusammenbau` in German). Read back, the file gives the same
parts (pinned by the vector `serialize-dish-one-section-per-slot` and a round trip
in `test/cooklang.test.ts`). **Still lost** besides the component losses: `roles`
(every slot's role, so always), `slots` (how much of a component the dish takes,
optional slots), `yields` (the components' output weights: the front matter is the
dish's), `details` (course, cuisine, the correction of the characters), `versions`
of the dish, `tastings` of the dish beyond the latest, which slots an assembly step
uses (only its words remain), and the difference between a component and an
ingredient slot on re-import (an ingredient slot comes back as a component of one
line). The tasting note comes back as part of the dish's note. Section names lose
`--`, `[-` and `=` at either end (`characters`).
