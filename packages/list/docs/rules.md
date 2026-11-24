---
type: Specification
title: Rules of the list
description: The rules every app follows when it puts something on the household's list - the sort key of a name, rule 4 (the category of a new entry, with the usual items), rule 5 (twice the same), the one plan of a write (planAdd, planAdds) - and the open weaknesses of rule 5 with what the household sees. Rules 4 and 5 and the sort key moved from Emptio's engine rules on 2026-11-24, unchanged.
tags: [list, rules, category, twice-the-same, sort-key, plan]
generated: { by: claude-code, at: 2026-11-24 }
sources:
  - id: emptio-rules
    title: 'Emptio: engine rules (rules 1 to 8; 4, 5 and the sort key were there until 2026-11-24)'
    url: ../../../apps/emptio/docs/engine-rules.md
  - id: emptio-categories
    title: 'Emptio: starting categories and usual items (the categories the ids name, the source of the list)'
    url: ../../../apps/emptio/docs/categories.md
---

# Rules of the list

Every rule is a pure function of this package, reached through
`src/index.ts`, with worked examples in `vectors/`
([vector format](vectors.md)). Time and ids come in as input. The
entry is in [the entry](entry.md). The numbers are Emptio's: rules 1
to 3 and 6 to 8 are about the order of the list, stores and offers and
stay in Emptio[^emptio-rules].

# The sort key of a name

Names are compared by a key, so that "Äpfel" stands with "Apfel" and
the result is the same on every device: the name in Unicode form NFD
with combining marks removed, `ß` as `ss`, lower case, spaces at the
ends removed and runs of spaces as one. Keys are compared by code
units. No locale of the device is used (`sortKey`, `compareText`).

# 4. Category of a new entry

Input: the name, the catalogue's match for it if any (an ingredient id
with a category), and the household's earlier entries
(`newEntryCategory`).

1. If an earlier entry has the same ingredient id, or no ingredient id
   and the same sort key, the category of the latest such entry (by
   `addedAt`). The household's choice wins over the catalogue.
2. Otherwise the category the catalogue gives the ingredient.
3. Otherwise the category of the usual item the name means
   (`usualCategory`, the list is described in Emptio's
   [categories](../../../apps/emptio/docs/categories.md#usual-items)).
   Names are compared by their sort key, word by word:
   1. the longest run of the name's words that is an item ("Bio-Milch
      3,5 %" is milk), the last such run on a tie;
   2. otherwise, from the last word to the first, the item a word is a
      plural of ("Tomaten", "eggs": the item followed by `e`, `n`, `s`,
      `en`, `es`, `er` or `nen`), or the longest item the word ends
      with, the head of a German compound ("Vollmilch" is milk,
      "Wildschwein" is Schwein and not Wein). Only items of one word
      and four letters or more are looked for inside a word.
4. Otherwise `other`.

Step 3 is a guess from a short list and is wrong for some names (a
compound whose head is another department). The household corrects it
on the entry, and step 1 keeps that choice from then on.

The category ids are Emptio's starting categories; Emptio's
`categories-data.test.ts` checks that every usual item belongs to one.

## Usual items

`data/usual-items.json`: about 750 German and English names by
category. **Source and licence**: curated by the Emptio project on
2026-11-20 from what German households usually buy in supermarkets and
drugstores; own work, AGPL-3.0-or-later, stated in the file. The German
names are not yet reviewed by a native speaker. Moved here from
Emptio's engine on 2026-11-24 without a change, so that Culina's
hand-over finds a category the same way[^emptio-categories].

# 5. Twice the same

Adding an entry when an open entry is the same thing does not make a
second one (`addEntry`). Two things are the same when both have the same
ingredient id, or neither has one and their names have the same sort
key (`sameThing`). A bought entry never counts; adding again makes a new
entry.

The open entry is kept with:

- the more pressing of the two priorities;
- the amounts: if only one has an amount, that one; if both have the
  same text, that text; otherwise both joined as `<old> + <new>`
  (amounts are free text, so nothing is added up);
- the notes by the same rule as the amounts;
- the origins of both, each once, the old ones first: a recipe origin
  is one by its app and its `dish` where it names one (the same dish
  under an English and a German title is one, two dishes of one title
  are two), else by its app and title;
- its own id, name, category, `addedAt` and `notAt`.

# Putting something on the list

`planAdd(records, input, { now, newId })` is how a person's or an app's
addition is planned (Emptio's `addToList`, Culina's `handOver`); Emptio's
KitchenOwl bridge writes the entries it imports with `newEntryCategory`
and `valueFor` itself, by the same rules 4 and 5 but not through this
function. `planAdd`, from the records of the collection as stored
now, it returns the record to write (the new entry, or the open one it
joined), its id and whether it joined. The caller runs it inside one
atomic change of the collection (the host package's `localChange`), so
a sync cycle or another tab in between is not overwritten. The name is
trimmed with runs of spaces as one; an empty name gives nothing; the
optional texts are trimmed and left out when empty; the priority is
`soon` unless given; the category is given or decided by rule 4; a
joined record keeps the fields another app wrote (`valueFor`).

Two inputs beyond what a person types, both optional:

- `origins`: why it is on the list; default `[{ kind: 'typed' }]`.
- `catalogue`: the match for rule 4, step 2. Without it, an input with
  an ingredient id is passed as that ingredient with the category
  `other` (what Emptio has always passed: a typed name with an id comes
  from an earlier entry, so step 1 decides). Culina passes the usual
  item of the name as the category, so that its butter lands in Dairy
  and not in Other when the household never had butter on the list.

`planAdds` puts several things in one change, each on the records as
the ones before left them, so two lines of the same thing make one
entry. Culina's `handOver` uses it; Emptio's `addToList` uses `planAdd`.

# Open weaknesses

Two behaviours of rule 5 are weak for a hand-over from a recipe. They
are Emptio's behaviour too, so they wait for the owner; today's
behaviour is pinned by tests in Culina's `hand-over.test.ts`. Two more
points of Culina's hand-over follow them, also open.

- **An equal amount is dropped on join.** The household typed "200 g"
  of butter; the dish needs another 200 g; the list shows one "200 g"
  with both origins, and the household buys 200 g too little. (The
  same rule is what keeps a dish handed twice from doubling its
  amounts.) Pinned by 'open weakness of rule 5, pinned as it is: an
  equal amount is dropped on join'.
- **A typed name without an id never joins an entry with one.** "Butter"
  typed in Emptio has no ingredient id; Culina's butter has one; the
  list shows "Butter" twice. Pinned by 'open weakness of rule 5, pinned
  as it is: a typed name without an id never joins the catalogue’s'.

- **Another filling of the same frame is another dish.** Culina's dish
  key includes the chosen filling (`shipped:burrito#sauce=guacamole-sauce`),
  so the frame handed again with another filling joins the open entries
  ("5½ tsp + 6 tsp" salt; an equal text is dropped as above; the origins
  hold the same title twice), where a household probably means
  "instead". Not pinned; the owner decides.
- **Pieces carry no word for the thing's form.** An amount in pieces says
  "6 pcs" of garlic, neither cloves nor heads; the catalogue has no
  word for it.

[^emptio-rules]: Emptio, engine rules, ../../../apps/emptio/docs/engine-rules.md

[^emptio-categories]: Emptio, categories, ../../../apps/emptio/docs/categories.md
