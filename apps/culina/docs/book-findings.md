---
type: Research
title: Four books read against the notes
description: Research of 2026-11-20 - McGee (2004), Der junge Koch (38th ed. 2022) and The Food Lab (2015) read by three agents against the 64 shipped notes, Texture Over Taste (2023) sampled; how the texts were handled (not in the repository, facts in own words, one sentence of 25 words per finding, each checked by script), the editions and how a place is cited, what the books confirm, refine and contradict, what was changed in 24 notes, the 14 new notes, where the books disagree with each other, what was not shipped and why, and what nobody verified.
tags: [research, sources, books, citations, evidence-levels, notes, method]
generated: { by: claude-code, at: 2026-11-20 }
---

# Four books read against the notes

Research of 2026-11-20. The owner handed over text copies of four books
in the session and asked for the app to be improved from them, for
validating what is there and for extending it. This document is the
record: the method, what was found, what was changed, and what stays
open. The choice of the books is argued in
[books as cited authorities](source-books.md).

## Method

### How the texts were handled

- **The texts are not in the repository and are stored nowhere else.**
  They were read in the session's own machine, which is thrown away with
  the session. No agent got a copy to keep; nothing was uploaded.
- **What the repository holds is the result, as in a term paper:** the
  statement in our own words, the place it stands (work, edition,
  chapter, page), and one sentence of at most 25 words for the reviewer
  ([licence of the sources](decisions/sources-licence.md), point 4). No
  table, list or recipe was taken. A single number with its place is a
  fact and is cited as one.
- **An agent that needs a passage again reads the book,** from the
  place given here. The texts themselves are not passed on between
  agents.
- **Where the copies came from.** The file names carry the name of a
  shadow library, and the McGee file is a lending scan of the Internet
  Archive. Three of the four books are in print and in copyright. This
  is not legal advice, but the clean basis for citing is a copy the
  owner bought or borrowed; McGee, The Food Lab and Der junge Koch were
  already on the [buying list](source-books.md). Until then the printed
  page numbers below are derived, not seen (see "Not verified").

### Who read what

Three agents each read one book under the same written brief: read all
64 notes first; search the book, then read the passage around a hit (a
search hit alone is not a reading); report whether the book confirms,
refines or contradicts each note; report what it says on a list of
disputed topics; propose up to 20 new notes. Each finding carries the
statement in own words (English and German), how the book knows it
(explains a mechanism, the author's own test, kitchen practice, a cited
study), the place, and the sentence. Nothing from memory: where a
passage was not found, the finding says "not found".

The lead (the agent that held the task) wrote a script that takes each
sentence and looks for it in the book text under the page or section
the finding names, with line breaks and line-end hyphens joined. A
sentence that is not there, or has more than 25 words, is thrown away.

| Book           | Findings reported | Passed the script | Notes of the 64 touched |
| -------------- | ----------------- | ----------------- | ----------------------- |
| McGee          | 105               | 105               | 54                      |
| The Food Lab   | 78                | 78                | 35                      |
| Der junge Koch | 130               | 129               | 47                      |

312 findings in all. The lead then read every one of the 64 notes
beside its findings and decided each change; the texts of the notes are
the lead's.

The fourth book, Joshua Weissman's _Texture Over Taste_ (DK 2023), was
sampled by the lead only: the opening essay and the first paragraphs of
its six chapters. It is an essay with recipes; it names six textures
(crunchy, chewy, aerated, creamy, fluid, fatty) and explains no
mechanism. Nothing was taken from it. It could serve, as the author's
judgement, for a question about texture in the tasting check, which is
not built.

### The editions and how a place is cited

| Work                                                                                               | Edition read                                                                    | ISBN in the data | Place                                                                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| Harold McGee, _McGee on Food and Cooking: An Encyclopedia of Kitchen Science, History and Culture_ | Hodder & Stoughton, London 2004 (the UK edition of _On Food and Cooking_, 2004) | 9780340831496    | chapter, section heading, printed page; the scan page is the printed page plus 16            |
| Brandes, Harten, Krödel, Voll, Wolffgang, _Der junge Koch / Die junge Köchin_                      | 38th edition 2022, corrected reprint 2023, Fachbuchverlag Pfanneberg            | 9783805708388    | chapter, section heading, printed page; the scan page is the printed page plus 1             |
| J. Kenji López-Alt, _The Food Lab: Better Home Cooking Through Science_                            | W. W. Norton, New York 2015, e-book (the hardcover is 9780393081084)            | 9780393249866    | chapter and section heading; an e-book has no pages, and no page of the hardcover is claimed |

The page offsets were checked on four pages of each book (the running
head of McGee, the page number at the foot of Der junge Koch). The UK
edition of McGee was read, not the US one that
[the survey](source-books.md) lists first; whether the two have the
same pages is not known, so the data names the UK edition.

A book has no page to link to and no licence to reuse it under, so its
source entry carries the ISBN and neither `url` nor `licence`
([data model](data-model.md#technique)).

### Which level a book gives

- **McGee and Der junge Koch are `textbook`.** McGee explains
  mechanisms and refers to studies without citing them in a way that
  could be followed in the passages read; no paper was opened, so
  nothing is `studied`.
- **The Food Lab is cited only for what its author tested himself,**
  and such a source entry carries the level `tested`, shown as "Kitchen
  test". Where the book only explains a mechanism, McGee or Der junge
  Koch is cited instead, or nothing. The tests are small (often one
  steak, one batch) and not reviewed; the agent's remarks say what was
  compared in each.
- A note keeps its own level. One new note rests on a kitchen test
  alone and is `tested` (`handling/mushrooms-wash`).

## Result in numbers

- Of the 64 notes, 59 now cite at least one of the books; 24 of them
  also got a changed text, 35 only the sources. Five have no book:
  `techniques/roll-dough`, `handling/celery-sweat-first`,
  `handling/spinach-late-in-soup`, `substitutes/arrowroot-to-cornstarch`
  and `substitutes/flour-to-cornstarch`.
- 14 notes are new: 5 techniques and 9 handling rules. There are now 78
  notes (41 techniques, 28 handling rules, 9 substitutes).
- 157 source entries are books (McGee 77, Der junge Koch 66, The Food
  Lab 14), beside the 149 entries of the open textbooks, which are all
  kept.
- By books cited per note: three books 9 notes, two books 37, one book
  27, none 5.

## What the books contradict, and what was done

| Note                                            | What it said                                        | What the books say                                                                                                                                                                                | Done                                                                             |
| ----------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `techniques/sear`                               | Searing first gives "a caramelised taste"           | Browning of meat is the Maillard reaction, not caramelisation (McGee p. 779, The Food Lab ch. 3). Searing does not seal juices in (McGee p. 161, The Food Lab by weighing, Der junge Koch p. 278) | Text changed: browning is for flavour, it does not seal, the food should be dry  |
| `techniques/pan-fry`                            | Fat carries heat much better than air or water      | Fat transfers heat less well than water; its use is that it gets far hotter than the boil (McGee p. 160)                                                                                          | Text changed                                                                     |
| `techniques/boil`                               | Plenty of water keeps pasta from sticking           | McGee agrees (p. 576); The Food Lab tested that stirring in the first minutes is what counts                                                                                                      | Text changed: stir in the first minutes, and plenty of water dilutes the starch  |
| `techniques/roux`                               | A burnt roux no longer thickens                     | The loss is gradual: the darker, the less it thickens (McGee p. 617, Der junge Koch p. 632)                                                                                                       | Text changed                                                                     |
| `techniques/proof-yeast`                        | Proof in a warm place                               | Fastest at about 35 °C but with off-flavours; cooler and slower gives more aroma (McGee p. 538, Der junge Koch p. 852)                                                                            | Text changed: room temperature, slower tastes better                             |
| `techniques/marinate`                           | The acid works on the protein (as a benefit)        | It gets in only a little way; too long in acid, the surface turns firm and dry (McGee p. 155 and p. 399, Der junge Koch p. 909 and p. 913)                                                        | Text changed                                                                     |
| `techniques/warm-emulsion`                      | Yolks that are even slightly cooked lose their hold | The yolks are meant to thicken with heat and curdle at about 70 to 77 °C (McGee p. 635)                                                                                                           | Text changed                                                                     |
| `techniques/cook-rice`                          | Standing lets the grains take up the last moisture  | The grains firm up and break less (McGee p. 474)                                                                                                                                                  | Text widened: both reasons                                                       |
| `handling/milk-scald`                           | Boiling can make milk curdle                        | Fresh milk stands boiling; old milk and acid make it curdle (McGee p. 19)                                                                                                                         | Reason changed; the rule stays                                                   |
| `handling/flour-cooked-in-roux`                 | Cooking in fat takes the raw flour taste out        | McGee agrees (p. 617); Der junge Koch credits the boiling afterwards, at least 20 minutes (p. 633)                                                                                                | Text widened: both                                                               |
| `substitutes/cornstarch-to-flour`               | About twice the amount of flour                     | One and a half times (McGee p. 614)                                                                                                                                                               | Text says the sources differ; the factor 2 of the first source stays in the data |
| `techniques/braise` (a refinement, close to it) | Cover the pot                                       | A covered pot in the oven comes to the boil; about 80 °C is wanted, lid ajar (McGee p. 162; The Food Lab measured 99 °C covered against 85 to 88 °C open)                                         | Text changed                                                                     |

## Where the books disagree, left as it is

These are not decided here. The note keeps what its sources say, and
the other view is not cited as support.

- **Stirring a risotto.** McGee: the stirring rubs the starch off the
  grains (p. 475). The Food Lab: rinsed rice stirred all the time was
  no creamier, so the liquid can go in at once. `techniques/risotto`
  is unchanged and cites McGee and Der junge Koch.
- **How much water for pasta.** McGee and Der junge Koch: ten times the
  weight (p. 576; p. 366). The Food Lab tested less water, and even
  pasta off the heat under a lid. The rule in `cook-pasta` is the
  trade's.
- **Preheating the oven.** Der junge Koch calls it unnecessary in most
  cases (p. 275), as a general statement; McGee explains what a wrong
  temperature does to a cake (p. 559). `techniques/bake` is unchanged.
- **Crushing garlic.** McGee: the more the tissue is damaged, the
  stronger (p. 311). Der junge Koch advises against crushing, for the
  taste (p. 256). `handling/garlic-cut-and-cook` is unchanged.
- **The finger test of a risen dough.** McGee: the dent stays (p. 538).
  Der junge Koch: the dough returns to its shape (p. 852). The note
  keeps "springs back lightly".
- **Rinsing boiled potatoes.** The Food Lab rinses them for a fluffy
  mash; Der junge Koch lets them steam dry (p. 378). The rule follows
  the second.
- **Hot butter in a hollandaise.** The Food Lab pours hot butter into
  raw yolks on purpose; McGee (p. 629) and Der junge Koch (p. 649) want
  it warm. `handling/butter-warm-for-hollandaise` is unchanged.
- **The soaking water of pulses.** Der junge Koch keeps it in the main
  text and pours it away in its margin notes (p. 316); McGee says what
  is lost with it (p. 486). No rule was written.
- **Numbers that differ:** browning from 140 °C or from 150 °C (Der
  junge Koch p. 273 and p. 679); salt in the soaking water 1 % (McGee
  p. 489) or 2 % (Der junge Koch p. 316), which is why
  `handling/chickpeas-soak` says 10 to 20 g per litre.
- **Dried mint.** `substitutes/spearmint-fresh-to-dried` says the dried
  herb is the stronger one, after its source. McGee says drying drives
  off most of the aroma of many herbs and names the exceptions (p. 397),
  without naming mint. Left unchanged; an open point.

## New notes

| Note                                     | Rests on                                                            | Where it shows                                                     |
| ---------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `techniques/stock-cold-start`            | McGee p. 599, Der junge Koch p. 592                                 | Pot-au-feu and cocido, at the step where the water goes in         |
| `techniques/rest-meat`                   | McGee p. 153 and p. 165, The Food Lab (test), Der junge Koch p. 679 | No shipped dish has such a step yet                                |
| `techniques/deep-fry`                    | Der junge Koch p. 276                                               | No shipped dish has such a step yet                                |
| `techniques/deglaze`                     | McGee p. 600                                                        | No shipped dish has such a step yet                                |
| `techniques/brine`                       | McGee p. 156, The Food Lab (test), Der junge Koch p. 914            | No shipped dish has such a step yet                                |
| `handling/beans-acid-last`               | McGee p. 488, Der junge Koch p. 318                                 | Dishes with beans that are boiled                                  |
| `handling/beans-boil-through`            | Der junge Koch p. 316                                               | Dishes with beans that are boiled                                  |
| `handling/mushrooms-wash` (`tested`)     | The Food Lab (test)                                                 | Dishes with mushrooms that are sautéed (poulet à la bourguignonne) |
| `handling/egg-white-sugar-after-foaming` | McGee p. 104, Der junge Koch p. 844                                 | Dishes with whipped egg whites                                     |
| `handling/egg-white-salt-elsewhere`      | McGee p. 104                                                        | Dishes with whipped egg whites                                     |
| `handling/cream-in-acid-sauce`           | McGee p. 630                                                        | Braised dishes with cream (Sauerbraten)                            |
| `handling/rice-wash-for-loose-grains`    | McGee p. 474, Der junge Koch p. 343                                 | Dishes with rice                                                   |
| `handling/pasta-sauce-at-once`           | Der junge Koch p. 367, The Food Lab (test)                          | Dishes with bought pasta                                           |
| `handling/butter-late-in-hot-pan`        | McGee p. 37, Der junge Koch p. 278                                  | Dishes with butter that are seared                                 |

Four of the five new techniques are in the data without a step that
names them: the 48 classics are mostly without meat and their sources
have no such step. They show once a dish names them. That is decided by
the agent, for the owner's review.

## Found and not shipped

- **Food-safety figures of Der junge Koch.** The book gives a core
  temperature of 70 °C for at least 10 minutes (p. 169 to 171), keeping
  hot at 65 °C or more and cooling below 7 °C within two hours (p. 165;
  it names DIN 10508), raw-egg dishes within 24 hours at 7 °C or less
  (p. 386; it names the Tier-LMHV), and it states the critical range three ways (7 to
  65 °C, 6 to 60 °C, 10 to 60 °C). None is shipped: the owner decided
  that such a figure is cited from the authority of the user's language
  ([books](source-books.md)), and the book's 10 minutes differ from the
  2 minutes that the survey found for the BfR. The one safety rule
  shipped is `beans-boil-through`, which has no disputed number.
- **Doneness temperatures of meat** (Der junge Koch p. 680 after the
  Gastronomische Akademie Deutschlands; McGee p. 154; The Food Lab's
  tasting at 130 to 160 °F). They are tables, and they touch safety.
- **When to salt meat** (The Food Lab: 40 minutes ahead or right
  before; Der junge Koch p. 914). A good note, but no dish to show it.
- **From The Food Lab's tests:** turning a steak often, salting beaten
  eggs a quarter of an hour ahead, salting minced beef only outside,
  baking soda with onions, boiling potatoes before roasting, cooling a
  braise in its liquid, vinegar in potato water, pasta taken off the
  heat. Each rests on one small test; they are candidates.
- **From McGee:** cooking beans gently in little water, red cabbage
  with acid, starch in an egg cream, eggs in the shell below the boil,
  poaching eggs, rescuing a broken emulsion, a dough in the refrigerator
  overnight, steam for bread, the sound of the pan, the two meats of a
  bird, rinsing raw onion.
- **From Der junge Koch:** glazing vegetables, a braise a day ahead,
  roasting low, mounting a sauce with butter, beurre manié, rescuing a
  hollandaise, shortcrust mixed briefly, baking soda for pulses in hard
  water, the amount of roux per litre.

## Every note against the three books

"confirms", "refines", "contradicts": the book on the note itself.
"treats": the book says something on the topic that is neither.
The Food Lab has no pages, so its chapter is given.

| Note                                   | McGee                                                                   | The Food Lab                                                                            | Der junge Koch                                                             | In the data                  |
| -------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `techniques/bake`                      | treats (p. 113), confirms (p. 559)                                      | treats (ch. 3)                                                                          | contradicts (p. 275), treats (p. 265)                                      | 1 book sources               |
| `techniques/batter`                    | refines (p. 162)                                                        | refines (ch. 9), refines (ch. 9)                                                        | not found                                                                  | text changed, 1 book sources |
| `techniques/blanch`                    | refines (p. 280), treats (p. 280)                                       | confirms (ch. 4), refines (ch. 4)                                                       | confirms (p. 267), refines (p. 267), refines (p. 295)                      | text changed, 4 book sources |
| `techniques/boil`                      | confirms (p. 576)                                                       | contradicts (ch. 7), refines (ch. 7)                                                    | refines (p. 367)                                                           | text changed, 3 book sources |
| `techniques/braise`                    | refines (p. 162), refines (p. 163)                                      | refines (ch. 2), confirms (ch. 2), refines (ch. 2)                                      | refines (p. 279), confirms (p. 279), refines (p. 906)                      | text changed, 4 book sources |
| `techniques/caramelise-sugar`          | refines (p. 657), refines (p. 656)                                      | refines (ch. 2)                                                                         | not found                                                                  | text changed, 2 book sources |
| `techniques/cold-emulsion`             | confirms (p. 629), refines (p. 634)                                     | confirms (ch. 8), refines (ch. 8)                                                       | refines (p. 654), contradicts (p. 654), confirms (p. 654), treats (p. 116) | text changed, 5 book sources |
| `techniques/cook-pasta`                | treats (p. 576), treats (p. 576)                                        | contradicts (ch. 7), contradicts (ch. 7), treats (ch. 7)                                | refines (p. 366), treats (p. 366)                                          | text changed, 3 book sources |
| `techniques/cook-rice`                 | refines (p. 474)                                                        | not found                                                                               | treats (p. 343), refines (p. 347), contradicts (p. 348)                    | text changed, 2 book sources |
| `techniques/cream-butter`              | refines (p. 557)                                                        | not found                                                                               | not found                                                                  | 1 book sources               |
| `techniques/fold-in`                   | confirms (p. 113)                                                       | confirms (ch. 1)                                                                        | refines (p. 844)                                                           | 2 book sources               |
| `techniques/fresh-pasta`               | confirms (p. 574)                                                       | refines (ch. 7)                                                                         | confirms (p. 366)                                                          | 2 book sources               |
| `techniques/gratinate`                 | refines (p. 66)                                                         | not found                                                                               | confirms (p. 275)                                                          | 2 book sources               |
| `techniques/knead`                     | confirms (p. 538)                                                       | confirms (ch. 1)                                                                        | confirms (p. 123)                                                          | 2 book sources               |
| `techniques/knife-cuts`                | not found                                                               | not found                                                                               | confirms (p. 292), refines (p. 292)                                        | 1 book sources               |
| `techniques/marinate`                  | refines (p. 155), treats (p. 399)                                       | refines (ch. 3)                                                                         | contradicts (p. 909), refines (p. 909), treats (p. 913)                    | text changed, 4 book sources |
| `techniques/pan-fry`                   | contradicts (p. 160), refines (p. 160), refines (p. 90)                 | not found                                                                               | refines (p. 277), refines (p. 278)                                         | text changed, 2 book sources |
| `techniques/poach`                     | not found                                                               | refines (ch. 1)                                                                         | confirms (p. 268)                                                          | 1 book sources               |
| `techniques/proof-yeast`               | refines (p. 538), treats (p. 538)                                       | refines (ch. 1)                                                                         | contradicts (p. 852), confirms (p. 852), refines (p. 852), treats (p. 745) | text changed, 3 book sources |
| `techniques/reduce`                    | refines (p. 163)                                                        | confirms (ch. 2)                                                                        | not found                                                                  | 1 book sources               |
| `techniques/rest-dough`                | confirms (p. 523)                                                       | not found                                                                               | confirms (p. 123), confirms (p. 852)                                       | 2 book sources               |
| `techniques/risotto`                   | confirms (p. 475)                                                       | contradicts (ch. 7)                                                                     | confirms (p. 348)                                                          | 2 book sources               |
| `techniques/roll-dough`                | not found                                                               | not found                                                                               | not found                                                                  | unchanged                    |
| `techniques/roux`                      | refines (p. 617)                                                        | confirms (ch. 2), refines (ch. 7), refines (ch. 7)                                      | refines (p. 632), refines (p. 633)                                         | text changed, 4 book sources |
| `techniques/saute`                     | treats (p. 159)                                                         | treats (ch. 3)                                                                          | confirms (p. 278), refines (p. 292)                                        | text changed, 3 book sources |
| `techniques/sear`                      | confirms (p. 161), treats (p. 161), refines (p. 779)                    | treats (ch. 3), refines (ch. 3), contradicts (ch. 3), confirms (ch. 3), refines (ch. 5) | refines (p. 273), treats (p. 278), refines (p. 679), contradicts (p. 907)  | text changed, 5 book sources |
| `techniques/shape-dumplings`           | confirms (p. 576)                                                       | not found                                                                               | refines (p. 268)                                                           | 1 book sources               |
| `techniques/simmer`                    | confirms (p. 600)                                                       | confirms (ch. 2)                                                                        | confirms (p. 603)                                                          | 2 book sources               |
| `techniques/skim`                      | refines (p. 600)                                                        | refines (ch. 2)                                                                         | refines (p. 591), confirms (p. 591)                                        | 2 book sources               |
| `techniques/steam`                     | refines (p. 164), confirms (p. 284)                                     | not found                                                                               | confirms (p. 269), confirms (p. 269)                                       | 2 book sources               |
| `techniques/sweat`                     | confirms (p. 287)                                                       | confirms (ch. 2)                                                                        | confirms (p. 270), refines (p. 270)                                        | 2 book sources               |
| `techniques/thicken-with-egg`          | refines (p. 93)                                                         | not found                                                                               | refines (p. 620), confirms (p. 621), refines (p. 122), confirms (p. 807)   | 3 book sources               |
| `techniques/thicken-with-starch`       | refines (p. 612), treats (p. 616)                                       | confirms (ch. 2)                                                                        | confirms (p. 634), refines (p. 634)                                        | text changed, 4 book sources |
| `techniques/warm-emulsion`             | refines (p. 635)                                                        | refines (ch. 1)                                                                         | confirms (p. 649), refines (p. 649), refines (p. 651)                      | text changed, 4 book sources |
| `techniques/water-bath`                | refines (p. 95)                                                         | not found                                                                               | confirms (p. 268)                                                          | text changed, 3 book sources |
| `techniques/whip-egg-whites`           | treats (p. 105), treats (p. 103), refines (p. 106)                      | confirms (ch. 1), refines (ch. 1)                                                       | treats (p. 123), refines (p. 123)                                          | text changed, 2 book sources |
| `handling/butter-warm-for-hollandaise` | confirms (p. 629)                                                       | contradicts (ch. 1)                                                                     | confirms (p. 649)                                                          | 2 book sources               |
| `handling/celery-sweat-first`          | not found                                                               | not found                                                                               | not found                                                                  | unchanged                    |
| `handling/chickpeas-soak`              | refines (p. 488), treats (p. 488), treats (p. 489), treats (p. 486)     | treats (ch. 2)                                                                          | refines (p. 316), treats (p. 318), confirms (p. 317)                       | text changed, 5 book sources |
| `handling/cornstarch-cool-liquid`      | confirms (p. 617)                                                       | not found                                                                               | not found                                                                  | 1 book sources               |
| `handling/egg-white-keep-fat-out`      | refines (p. 104)                                                        | not found                                                                               | confirms (p. 844)                                                          | 2 book sources               |
| `handling/egg-yolk-temper`             | confirms (p. 93)                                                        | not found                                                                               | confirms (p. 620)                                                          | 2 book sources               |
| `handling/flour-cooked-in-roux`        | confirms (p. 617)                                                       | not found                                                                               | contradicts (p. 633)                                                       | text changed, 2 book sources |
| `handling/garlic-cut-and-cook`         | confirms (p. 311), confirms (p. 311)                                    | confirms (ch. 7)                                                                        | confirms (p. 256), contradicts (p. 256)                                    | 3 book sources               |
| `handling/leeks-wash`                  | confirms (p. 313)                                                       | not found                                                                               | confirms (p. 320)                                                          | 2 book sources               |
| `handling/milk-scald`                  | refines (p. 94), contradicts (p. 19)                                    | not found                                                                               | not found                                                                  | text changed, 2 book sources |
| `handling/potatoes-cold-start`         | confirms (p. 283)                                                       | confirms (ch. 4)                                                                        | refines (p. 266), treats (p. 266), refines (p. 293)                        | 2 book sources               |
| `handling/potatoes-no-refresh`         | not found                                                               | contradicts (ch. 4)                                                                     | refines (p. 378)                                                           | text changed, 1 book sources |
| `handling/rice-risotto-unrinsed`       | confirms (p. 474)                                                       | confirms (ch. 7), refines (ch. 7)                                                       | confirms (p. 348)                                                          | 3 book sources               |
| `handling/salt-pasta-water`            | refines (p. 576)                                                        | confirms (ch. 7)                                                                        | refines (p. 267)                                                           | text changed, 1 book sources |
| `handling/spices-early-in-fat`         | confirms (p. 399), refines (p. 398), refines (p. 400)                   | confirms (ch. 2)                                                                        | not found                                                                  | 1 book sources               |
| `handling/spices-short-cook`           | not found                                                               | not found                                                                               | refines (p. 278)                                                           | 1 book sources               |
| `handling/spinach-late-in-soup`        | not found                                                               | not found                                                                               | not found                                                                  | unchanged                    |
| `handling/spinach-rinse`               | confirms (p. 318)                                                       | not found                                                                               | confirms (p. 307)                                                          | 2 book sources               |
| `handling/vinegar-before-vegetables`   | treats (p. 488), confirms (p. 282), confirms (p. 279), refines (p. 283) | confirms (ch. 2), refines (ch. 8), confirms (ch. 4)                                     | confirms (p. 294), contradicts (p. 337)                                    | 4 book sources               |
| `substitutes/arrowroot-to-cornstarch`  | not found                                                               | not found                                                                               | not found                                                                  | unchanged                    |
| `substitutes/butter-to-lard`           | confirms (p. 802)                                                       | not found                                                                               | not found                                                                  | 1 book sources               |
| `substitutes/butter-to-margarine`      | confirms (p. 38)                                                        | not found                                                                               | not found                                                                  | 1 book sources               |
| `substitutes/butter-to-shortening`     | refines (p. 37)                                                         | confirms (ch. 6)                                                                        | not found                                                                  | 1 book sources               |
| `substitutes/cornstarch-to-arrowroot`  | confirms (p. 615)                                                       | not found                                                                               | not found                                                                  | 1 book sources               |
| `substitutes/cornstarch-to-flour`      | contradicts (p. 614), confirms (p. 614)                                 | not found                                                                               | not found                                                                  | text changed, 2 book sources |
| `substitutes/flour-to-cornstarch`      | not found                                                               | not found                                                                               | not found                                                                  | unchanged                    |
| `substitutes/spearmint-dried-to-fresh` | not found                                                               | not found                                                                               | confirms (p. 247)                                                          | 1 book sources               |
| `substitutes/spearmint-fresh-to-dried` | refines (p. 397)                                                        | not found                                                                               | confirms (p. 249)                                                          | 1 book sources               |

## Not verified

- **No printed book was seen.** The page numbers are the scan page
  minus a fixed offset, checked on four pages per book; where the
  running head of McGee was misread by the text recognition, the page
  follows from its neighbours. Someone with the paper book should
  confirm them. The Food Lab is cited by chapter and section only.
- **The books were searched, not read through.** Each agent read some
  thousand lines around its search hits. "Not found" means the search
  did not find it, not that the book is silent. The pastry, fish, game
  and dessert chapters of Der junge Koch and chapters 6 and 9 of The
  Food Lab were only sampled.
- **The script proves that a sentence stands in the book where the
  finding says. It does not prove that our statement follows from it.**
  That reading was done by one agent per book and then, from the
  agents' statements, by the lead; the lead did not open the passages
  again. Nobody read a finding against the book a second time.
- **The text copies are machine-read.** Sentences are kept as the files
  have them, with their reading faults.
- **No study was opened.** Where McGee refers to experiments, the note
  is still `textbook`.
- **The German texts** of the changed and new notes were written by the
  lead and read by no native speaker.
- **One browser check** covers a book source: the shipped pot-au-feu at
  360 px, step 4, in English (`e2e/classics.mjs`, "a note that rests on
  books"). The other 13 new notes and the German were not looked at in
  a browser.

## For the owner

1. **Buy or borrow the three books,** so that the citations rest on a
   copy that is yours and the pages can be confirmed.
2. **The rule of 2026-11-19, "a person reads the passage",** was not
   kept in its wording: agents read the texts you handed over. Either
   the rule changes to "the passage is read in the book, by a person or
   by an agent from a text of the book, and the sentence is checked", or
   the 157 entries are confirmed by a person.
3. **The unattached techniques** (rest, deep-fry, deglaze, brine): keep
   them for dishes to come, or take them out until then?
4. **Disagreements between the books** (risotto, pasta water, garlic):
   should the app show both views, with their levels, instead of one?
5. **Food-safety figures:** read the BfR, FSA and FSIS pages
   themselves, so that the temperature notes can be written.
