---
type: Specification
title: Classic, technique and handling rule file format
description: The guide a transcriber follows to write one dish file, one technique file and one handling rule file, field by field, with an invented example, the rules for amounts as the source gives them, source unit words, settled values and the second check, and the command that validates one file.
tags: [classics, techniques, handling, format, transcription, helper]
generated: { by: claude-code/2.1.326, at: 2026-11-19 }
sources:
  - id: plan
    title: Helper build plan, data and rules for content
    url: helper-plan.md
  - id: model
    title: Data model, Technique, Classic and Skill state
    url: data-model.md#technique
  - id: rules
    title: Engine rules for techniques, steps and classics
    url: engine-rules.md#techniques-steps-and-classics
---

# Classic and technique file format

One dish is one file, and so is one technique, so that many people can add
content at the same time without touching a shared file. The shapes and
their reasons are in the [data model](data-model.md#technique); what the engine
checks is in [engine rules](engine-rules.md#techniques-steps-and-classics). This
page is the guide for the one who writes a file. **The examples below are
invented**: no real recipe and no real book. Do not copy them into a dish.

| What       | Where                                            | File name   |
| ---------- | ------------------------------------------------ | ----------- |
| Technique  | `packages/engine/data/techniques/<id>.json`      | `<id>.json` |
| Substitute | `packages/engine/data/substitutes/<id>.json`     | `<id>.json` |
| Dish       | `packages/app/data/classics/<country>/<id>.json` | `<id>.json` |

The country folder is `de`, `it`, `fr` or `es`. An id is a lower-case slug
(`pommes-puree`), unique among all dishes (or all techniques), equal to the file
name without `.json`. A new file is found by the app and the tests without
editing any other file: the indexes are generated.

# The rules that hold for every file

These come from the [helper plan](helper-plan.md#rules-for-content).

- A dish follows **one** named source. Amounts and ingredients are facts taken
  from it; the **method is written in our own words**, in English and in German;
  no text, image or layout is copied. From one modern site at most three dishes.
  Each dish is read by hand; no crawler.
- **A model's memory is never a source.** Whoever writes a statement returns the
  sentence it rests on (at most 25 words) and the URL.
- Old scans are machine-read: every number is checked a second time by someone
  who did not transcribe it, and the dish records which check it had.
- Every text of a technique or a dish exists in **English and German**, both
  not empty. Wording never judges a dish: no "wrong", "too much", "falsch",
  "zu viel" (a test scans every text).
- The **unit sizes** of a source (Pfund, Loth, cucchiaio, a glass) are never
  taken from memory: they are written in the dish file with where the
  equivalence was read.

# A technique file

```json
{
  "id": "example-technique",
  "name": { "en": "Example technique (fictional)", "de": "Beispieltechnik (erfunden)" },
  "watch": {
    "en": "Example note: say in one short line what to watch.",
    "de": "Beispielnotiz: in einer kurzen Zeile sagen, worauf zu achten ist."
  },
  "why": {
    "en": "Example reason: say in one or two lines why it matters.",
    "de": "Beispielgrund: in ein bis zwei Zeilen sagen, warum es wichtig ist."
  },
  "level": "textbook",
  "sources": [
    {
      "title": "An Example Textbook (fictional, not a real book)",
      "place": "chapter 1, page 1",
      "url": "https://example.org/example-textbook",
      "licence": "CC0-1.0 (invented for this example)",
      "sentence": "This sentence is invented for the example and rests on nothing."
    }
  ]
}
```

| Field     | What to write                                                                                                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | The slug; the file name. Steps of dishes name it in `technique`.                                                                                                                                                            |
| `name`    | `{ en, de }`: the technique as a cook says it ("Folding").                                                                                                                                                                  |
| `watch`   | `{ en, de }`: **the short note** shown beside a step: what to watch. One short line.                                                                                                                                        |
| `why`     | `{ en, de }`: why it matters, in one or two lines.                                                                                                                                                                          |
| `level`   | `studied` (a study measured it), `textbook` (a textbook states it) or `tradition` (kitchens' sources state it, no study). A statement with no source at all is left out.                                                    |
| `sources` | At least one. `title` and `place` (chapter, page, section) of the work, `url`, `licence` where one is stated, and `sentence`: the sentence of the source the note rests on, **at most 25 words**, in the source's language. |

A note that says more than its source is cut back by the lead. The tests check
the two languages, the sentence length and that the file name is the id.

# A handling rule file

One file per rule in `packages/engine/data/handling/<id>.json`: when an
ingredient goes into a dish and how it is treated, with the reason
([mentor](decisions/mentor.md), point 8). It hangs on an ingredient or a group
of the catalogue and on one technique, so it shows on every dish that uses the
ingredient and fades when the user marks the technique as learned.

```json
{
  "id": "example-handling-rule",
  "target": "fdc-group-butter",
  "text": {
    "en": "Example rule (fictional): say in one or two short sentences when the ingredient goes in and how it is treated.",
    "de": "Beispielregel (erfunden): in ein bis zwei kurzen Sätzen sagen, wann die Zutat hineinkommt und wie sie behandelt wird."
  },
  "why": {
    "en": "Example reason: say in one or two lines why.",
    "de": "Beispielgrund: in ein bis zwei Zeilen sagen, warum."
  },
  "technique": "example-technique",
  "level": "textbook",
  "sources": [
    {
      "title": "An Example Textbook (fictional, not a real book)",
      "place": "chapter 1, page 1",
      "url": "https://example.org/example-textbook",
      "licence": "CC0-1.0 (invented for this example)",
      "sentence": "This sentence is invented for the example and rests on nothing."
    }
  ]
}
```

| Field       | What to write                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | The slug; the file name. Say what and which ingredient (`potatoes-cold-start`).                                                                                                                                                           |
| `target`    | A catalogue ingredient id (`fdc-173468`) or a catalogue group id (`fdc-group-butter`): the rule then shows for everything under the group. Use the group when the source speaks of the kind, the single id when it speaks of one product. |
| `text`      | `{ en, de }`: the rule in **one or two short sentences**: when it goes in, how it is treated. Own words, never the source's.                                                                                                              |
| `why`       | `{ en, de }`: the reason, in one short sentence, from the same source.                                                                                                                                                                    |
| `technique` | The id of one of the shipped techniques: the skill the rule belongs to. Choose the skill the cook practises while following the rule.                                                                                                     |
| `level`     | As for a technique: `studied` only when a paper measured it, `textbook` when a textbook states it, `tradition` when kitchens' sources state it.                                                                                           |
| `sources`   | At least one, shaped as for a technique: `title`, `place`, `url`, `licence`, `sentence` (at most 25 words, verbatim).                                                                                                                     |

The order of work: open a source, find the sentence, then write the rule from
it. **No source, no rule**; the owner's own examples are examples of the kind,
not data. Wording never judges (no wrong, error, mistake, bad, too much, too
little, missing and their German counterparts); the wording test covers these
texts. The tests check the schema, the two languages, the sentence length, the
file name, a known technique and a target in the catalogue. Check one file with
`npm run validate:content -- packages/engine/data/handling/<id>.json`. The
build writes every rule into `dist/classics.json` (key `handling`), not into
`main.js`.

# A dish file

The fictional example, in full (`packages/engine/schemas/examples/classic.valid.json`):

```json
{
  "id": "example-dish",
  "name": { "en": "Example dish (fictional)", "de": "Beispielgericht (erfunden)" },
  "originalName": "Example dish",
  "country": "de",
  "vegetarian": true,
  "course": "main",
  "source": {
    "author": "Example Author",
    "title": "An Example Cookbook (fictional, not a real book)",
    "year": 1900,
    "place": "page 1, recipe 1",
    "url": "https://example.org/example-cookbook"
  },
  "persons": { "value": 4, "basis": "settled" },
  "units": {
    "Example-measure": {
      "kind": "mass",
      "factor": 100,
      "read": "Invented for this example: 1 Example-measure = 100 g. A real file names the page or table where the equivalence was read."
    }
  },
  "components": [
    {
      "id": "example-sauce",
      "name": { "en": "Example sauce", "de": "Beispielsauce" },
      "role": "sauce",
      "lines": [
        {
          "key": "fat",
          "wanted": { "en": "Example fat", "de": "Beispielfett" },
          "amount": { "value": 2, "unit": "Example-measure", "original": "2 Example-measures" }
        },
        {
          "key": "liquid",
          "ref": { "kind": "ingredient", "id": "example-liquid" },
          "amount": { "value": 250, "max": 300, "unit": "ml" }
        },
        { "key": "salt", "wanted": { "en": "Example salt", "de": "Beispielsalz" } },
        {
          "key": "spice",
          "wanted": { "en": "Example spice", "de": "Beispielgewürz" },
          "amount": { "value": 1, "unit": "tsp" },
          "settled": true,
          "note": { "en": "to taste", "de": "nach Geschmack" }
        }
      ],
      "steps": [
        {
          "text": {
            "en": "Melt the fat over low heat.",
            "de": "Das Fett bei schwacher Hitze schmelzen."
          },
          "technique": "example-technique",
          "uses": ["fat"],
          "time": { "value": 5, "unit": "min" }
        },
        {
          "text": {
            "en": "Stir in the liquid and the spice.",
            "de": "Flüssigkeit und Gewürz einrühren."
          },
          "uses": ["liquid", "spice"],
          "temperature": { "value": 170, "to": 180, "unit": "C" }
        }
      ]
    }
  ],
  "slots": [
    { "role": "main", "ref": { "kind": "component", "id": "example-sauce" } },
    {
      "role": "starch",
      "wanted": { "en": "Example starch", "de": "Beispielstärke" },
      "amount": { "value": 1, "unit": "Example-measure" }
    }
  ],
  "settled": [
    {
      "what": "Number of persons",
      "value": "4",
      "reason": "Invented example: the source names no number.",
      "target": "persons"
    },
    {
      "what": "Amount of spice",
      "value": "1 tsp",
      "reason": "Invented example: the source says some.",
      "target": "example-sauce/spice"
    }
  ],
  "check": {
    "method": "second-reader",
    "note": "Example only: a real file says who read the page and what was compared."
  },
  "note": {
    "en": "An invented example, not a recipe.",
    "de": "Ein erfundenes Beispiel, kein Rezept."
  }
}
```

## Top level

| Field          | What to write                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | The slug; the file name.                                                                                                                                                          |
| `name`         | `{ en, de }`: how the dish is called in each language.                                                                                                                            |
| `originalName` | The name in the source's own language and spelling.                                                                                                                               |
| `country`      | `de`, `it`, `fr` or `es`; the folder the file is in.                                                                                                                              |
| `vegetarian`   | `true` without meat and fish (also without lard and meat stock).                                                                                                                  |
| `course`       | `starter`, `soup`, `main`, `side`, `dessert`, `baking`, `sauce`, `breakfast` or `snack`.                                                                                          |
| `source`       | `author`, `title`, `year` (of this edition), `place` (page or recipe number), `url` (where the page can be opened), `licence` where stated.                                       |
| `persons`      | `value`: the persons the source's amounts are for; `basis`: `stated` when the source says it, `settled` when we chose it (then an entry in `settled` with target `persons`).      |
| `units`        | Only source unit words that are not in `packages/engine/data/units.json` (see below).                                                                                             |
| `components`   | The made items (a sauce, a dough): `id`, `name`, optional `role`, `lines`, `steps`.                                                                                               |
| `slots`        | The dish's role slots, each filled by a component of this file (`ref` kind `component`) or by an ingredient. `role` is `main`, `sauce`, `starch`, `crunch`, `acid`, `garnish` ... |
| `settled`      | Everything we settled; an empty list when nothing.                                                                                                                                |
| `check`        | The second check (below).                                                                                                                                                         |
| `note`         | Optional `{ en, de }` note on the dish.                                                                                                                                           |

## Lines and slots

A line of a component, or a slot of the dish, names its ingredient in one of two ways:

- `ref`: `{ "kind": "ingredient", "id": "<id of packages/app/data/ingredient-catalogue.json>" }`,
  or `{ "kind": "component", "id": "<a component of this file>" }`. Look the
  ingredient up in the catalogue; the validator refuses an id it does not have.
- `wanted`: `{ en, de }`, **only while the catalogue lacks the ingredient**
  (a food the USDA data does not have: meat, fish, bouquet garni, orange-flower
  water, whole cloves ...). First look for the food in the catalogue by its
  English and German names and in the group nodes of the tree; a food that
  only the selection rule leaves out but the USDA data has is added through
  [named foods](ingredient-catalogue.md#named-foods), not typed. A dish with a
  `wanted` line can be read but not yet copied into the notebook. The finder
  never counts such a line as lacking and names it apart; a line whose English
  or German text is water ("Water", "Cold water", "Wasser") is not asked for at
  all ([engine rules](engine-rules.md#the-shipped-classics-in-the-finder)). The
  names that remain are an explicit, reviewed list in
  `test/classics-wanted-list.test.ts`: a new unmatched line fails it until a
  reviewer adds the name there.

Exactly one of the two. Further fields: `key` (a slug, unique in the component:
**give one to every line that a step uses, or that is settled**), `role`,
`state` (`raw`, `cooked`, `prepared`), `note` (`{ en, de }`, lines only) and
`optional` (slots).

## Amounts as the source gives them

`amount` is `{ "value": 2, "unit": "...", "original": "..." }`:

- `value` is a number greater than zero. For a range ("2 to 3") add `max`: `value` 2, `max` 3.
- `unit` is an id of `units.json` (`g`, `kg`, `oz`, `lb`, `ml`, `l`, `tsp`,
  `tbsp`, `cup`, `count`) or a word defined in the file's `units`.
- `original` (optional) is the short original wording, for example the
  source's own "1 Pfund"; it is shown beside the converted amount.
- **No amount in the source** ("salt", "some butter"): write the line **without**
  `amount`; the app shows "to taste" or "as needed". Or settle a number (see below).
- Never write a fraction as text ("1 1/2"): write `1.5`.

### Source unit words

If the source's unit is not in `units.json`, define it in the file:

```json
"units": {
  "Example-measure": { "kind": "mass", "factor": 100, "read": "where the equivalence was read" }
}
```

`kind` is `mass` (`factor` = grams in one unit), `volume` (millilitres) or
`count` (pieces). `read` names the page, table or standard that gives the
size; **no size from memory**, and none that you cannot point at. A word the
table has (`tsp`) is not defined again, and a defined word that no amount uses
is reported.

## Steps

`steps` (in a component) is the method **in our own words**, in order. Each step is

```json
{
  "text": { "en": "...", "de": "..." },
  "technique": "folding",
  "uses": ["fat"],
  "time": { "value": 5, "unit": "min" },
  "temperature": { "value": 180, "unit": "C" }
}
```

`technique` names a technique file that exists; `uses` the `key`s of the lines
the step uses; `time` (`s`, `min`, `h`) and `temperature` (`C`, `F`) **as the
source gives them**, one number or a range with `to`. A word ("moderate oven")
or another scale goes into the text.

## What was settled

Where the source is vague, we settle and say so. Every settled thing is an
entry of `settled`: `what`, `value` (text), `reason`, and `target`:

- the number of persons: `persons.basis` `settled` and an entry with target `persons`;
- an amount: the line has `"settled": true` and a `key`, and the entry's
  target is `<component id>/<line key>` (`slots/<key>` for a slot).

A settled line or slot may have no `amount`: then the entry records a choice,
not a number, and its `value` is free text ("water, not broth: the source says
either"). A line left without amount and without `settled` is "to taste". The
validator checks that both sides exist and does not ask for an amount.

## The second check

`check.method`: `page-image` (the numbers were compared with the opened page
image), `second-edition` (with a second scan or edition) or `second-reader`
(a second person read the same text). `check.note` says by whom and what was
compared. It must be someone who did not transcribe the dish.

# Validating one file

```sh
npm run validate:content -- packages/app/data/classics/de/<id>.json
```

The command first generates what it needs and git ignores (the compiled
schemas, the technique and dish indexes), so it works in a fresh checkout
after `npm ci`; nothing has to be built or tested before.

For a technique or a handling rule: `npm run validate:content -- packages/engine/data/techniques/<id>.json` or `.../data/handling/<id>.json`.
The command checks the schema, the file name and folder, then the engine's
rules against the shipped techniques and the catalogue, and derives the dish
for two portions; it prints what is wrong and exits with 1, or prints `ok`. It
also says how many `wanted` lines are left. The invented example fails it on
two counts, as it should: its ingredient and its technique are not real.
`npm run check` runs the same rules over every shipped file
(`test/content.test.ts`, `test/classics.test.ts`).

# Open

- Whether the export file gets a collection for skill state
  ([data model](data-model.md#skill-state)).
- A dish's slot with a range is copied as its middle; only components' lines
  keep the range in their note.
- All shipped dishes are bundled into the app's script; when there are many,
  they are loaded per country instead.

# A substitute file

A substitute says what replaces an ingredient and what changes. It is reference
knowledge: the app always offers it and it does not fade when the user learns
skills. **One direction per file**: `flour-to-cornstarch` and
`cornstarch-to-flour` are two files, and the second is written only if the
source says it. The shapes are in the [data model](data-model.md#substitute-effect);
the engine rules are in [engine rules](engine-rules.md#substitute-effects). The
example is invented.

```json
{
  "id": "example-a-to-b",
  "from": "example-ingredient-a",
  "to": "example-ingredient-b",
  "factor": 0.5,
  "changes": {
    "en": "Example effect (fictional): say in one or two short sentences what changes.",
    "de": "Beispielwirkung (erfunden): in ein bis zwei kurzen Sätzen sagen, was sich ändert."
  },
  "level": "textbook",
  "sources": [
    {
      "title": "An Example Textbook (fictional, not a real book)",
      "place": "chapter 1, page 1",
      "url": "https://example.org/example-textbook",
      "licence": "CC0-1.0 (invented for this example)",
      "sentence": "This sentence is invented for the example and rests on nothing."
    }
  ]
}
```

| Field     | What to write                                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | The slug, `<from>-to-<to>`; the file name.                                                                                                                                                                      |
| `from`    | The id of a catalogue ingredient or group that is replaced. A group covers everything below it.                                                                                                                 |
| `to`      | The id of a catalogue ingredient or group that replaces it. Pick the narrowest one the source names (a source that says "regular corn syrup" does not name the group of all corn syrups).                       |
| `factor`  | Optional: how much of `to` replaces one unit of `from`, **only when the source states a number** (the source says "half the amount" or "1.25"). "Up to 50 % more" is a limit, not a factor: leave `factor` out. |
| `changes` | `{ en, de }`: what changes, in one or two short sentences, in your own words, from the source. Taste, texture, amount, handling. **If the source names the replacement but not the effect, say only that.**     |
| `level`   | `studied` only where a study measured it; `textbook` where a textbook states it; `tradition` where kitchens' sources state it. No source: the file is not written.                                              |
| `sources` | At least one, each with `sentence`: the sentence of the source the statement rests on, at most 25 words, verbatim. A table row may stand as the sentence, with the table named in `place`.                      |

How to write one: open a source first, find the sentence that states the
replacement and its effect (and the factor), and only then write `changes`. A
note that says more than its source is cut back. Wording never judges: say what
changes, not whether it is good (a test scans `changes` for the words of
[behaviour](behaviour.md)). The tests check the two languages, the sentence
length, that the file name is the id and that `from` and `to` are in the
catalogue.
