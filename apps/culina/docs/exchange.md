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

**What the import makes of a file** (`importComponent`): one component, version 1
of a new family (`parent` only when the user makes it a variation). Every
ingredient occurrence is a line, in file order; the user decides per line the
target (an ingredient or component of the notebook, or a new ingredient), the
amount mode and a role. Steps become `method` entries in order, notes and
section names too (as entries of their own, unmarked); cookware and timers
stay as words in the step text; inline positions of ingredients are lost.
Amount modes (`availableModes`, `resolveAmount`): `given` (a number and a unit
Culina knows: g, kg, oz, lb, ml, l, tsp, tbsp, cup, and no unit as a count; unit
words in `units.ts`), `facts` (volume through the ingredient's density, count
through its unit weight; offered only when the ingredient has it), `grams` (the
user weighed it), `open` (no amount: the line is kept, the written quantity is
its note, and it is reported as unmeasured). A quantity that is not a number or
has an unknown unit (`{2%cloves}`, `{1-2}`) offers only `grams` and `open`.
Nothing is converted without the facts and nothing is guessed. The short
preparation and the written quantity (when it is not the amount) go into the
line's `note`, joined by a comma.

**Writer** (`componentToCooklang`): one component per file. Front matter
`title` (quoted when it holds a colon) and `yield: 70%g`; the latest tasting
note of this version as a `>` note; one step `Combine @A{qty%unit}, @B{…} and
@C{}.` with the line's note as a short preparation; then the method as
paragraphs. Percent lines are written in grams (percent of the base mass, via
`componentLineGrams`); when that is not possible the line has no quantity. A
count is a bare number. A component line is `@./File-name{qty%g}`, the file
name being the component's name with spaces as hyphens. Core syntax only; no
extension and no `servings`. The result lists what was lost (`lost`):
`ratios` (percent lines, template, role of the component), `roles` (line roles),
`states`, `versions` (parent, change, reason), `tastings` (other notes),
`characters` (`@ # ~`, `--`, `[-` and a leading `>` or `=` removed from method
steps, since Cooklang has no escape) — see
[the decision](decisions/cooklang.md#what-is-lost).
