---
type: Specification
title: Ingredient catalogue
description: The catalogue of basic ingredients shipped with the app, generated from USDA FoodData Central SR Legacy; why that dataset, the selection rule, how density and unit weight are derived, how the ingredient tree and the yields are built, where the German names (Wikidata) and USDA's food categories come from and by which rules, the file, and what the catalogue does not have.
tags: [catalogue, ingredients, data, usda, wikidata, german, licences, generator, tree, yields]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: fdc
    title: 'USDA FoodData Central: home page, Licensing (public domain, CC0 1.0 Universal)'
    url: https://fdc.nal.usda.gov/
  - id: fdcdl
    title: 'USDA FoodData Central: Download Datasets (release list)'
    url: https://fdc.nal.usda.gov/download-datasets/
  - id: srzip
    title: 'SR Legacy JSON, April 2018 (FoodData_Central_sr_legacy_food_json_2018-04.zip)'
    url: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
  - id: sr28zip
    title: 'SR Legacy archive, SR28 ASCII (SR-Legacy-Archive/sr28asc.zip, file FOOD_DES.txt) and its documentation (sr28_doc.pdf, Food Description file)'
    url: https://fdc.nal.usda.gov/fdc-datasets/SR-Legacy-Archive/sr28asc.zip
  - id: srcsv
    title: 'SR Legacy CSV, April 2018 (FoodData_Central_sr_legacy_food_csv_2018-04.zip), inspected for a refuse field, none found'
    url: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
  - id: wdlic
    title: 'Wikidata:Licensing (all structured data is CC0), read 2026-11-18'
    url: https://www.wikidata.org/wiki/Wikidata:Licensing
  - id: wdsparql
    title: 'Wikidata Query Service, SPARQL endpoint (property P1978, USDA NDB number)'
    url: https://query.wikidata.org/sparql
  - id: fdczip
    title: 'Foundation Foods JSON, October 2026 (FoodData_Central_foundation_food_json_2026-10-29.zip), inspected, not used'
    url: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip
---

# Ingredient catalogue

A fresh notebook has no ingredients. The app ships a catalogue of basic
ingredients with what the engine needs to convert amounts: the density
(grams per millilitre) and the weight of one piece. It is **generated** by
`tools/catalogue/build.mjs` from a public-domain dataset and is rebuilt,
never edited by hand. The app offers it in the ingredient picker
([behaviour](behaviour.md#ingredient-picker)); the file's shape and how an
entry becomes a record are in [data model](data-model.md#ingredient-catalogue-file).

## Source and licence

USDA FoodData Central, **SR Legacy**, April 2018 release
(`FoodData_Central_sr_legacy_food_json_2018-04.zip`, from
`https://fdc.nal.usda.gov/fdc-datasets/`)[^srzip]. The licence statement,
read on the site's home page on 2026-11-18 (section Licensing): "USDA
FoodData Central data are in the public domain and they are not
copyrighted. They are published under CC0 1.0 Universal (CC0 1.0). No
permission is needed for their use, but we request that users list
FoodData Central as the source of the data"[^fdc]. The file names the
source in its envelope and in every number's `source`;
[dependencies](dependencies.md#data) lists it too.

**Why SR Legacy and not Foundation Foods.** Both were opened on
2026-11-18. Foundation Foods (October 2026) is the maintained dataset but
small: 424 foods, 291 with any portion, 36 with a cup, tablespoon or
teaspoon portion. SR Legacy (frozen in 2018, 7,793 foods) carries portions
for 7,533 foods, 2,850 of them with a volume portion, and states them as
text such as `1 cup`, `1 tbsp`, `1 medium (3" dia)`. Its figures are old
but are weights of foods, which do not move. Using one dataset keeps the
rules, the ids and the licence statement single; Foundation Foods can be
added later by a pull request that extends the generator.

## Selection rule

A food becomes a candidate when all of these hold:

1. Its food category is one of Baked Products, Cereal Grains and Pasta,
   Dairy and Egg Products, Fats and Oils, Fruits and Fruit Juices,
   Legumes and Legume Products, Nut and Seed Products, Spices and Herbs,
   Sweets, Vegetables and Vegetable Products.
2. In Baked Products only descriptions starting with "Leavening agents"
   (baking powder, soda, yeast), in Sweets only those starting with Cocoa,
   Honey, Molasses, Sugars or Syrups.
3. In Fruits, Legumes and Vegetables the description names the state
   `raw`.
4. The description (without its parentheses) has no word of the exclusion
   list in `tools/catalogue/derive.mjs` (cooked, canned, frozen, baked,
   roasted, prepared, babyfood, restaurant, sauce, dressing, and so on)
   and no brand (a word of three or more capital letters).

A candidate becomes a row only if a density or a unit weight can be
derived; a food with neither is no use to the engine and is left out. Yields
are no reason for a row: they are added to rows that exist.

## Derivation rules

- **Density.** From portions whose modifier is exactly `cup`, `tbsp`,
  `tablespoon`, `tsp` or `teaspoon` (any amount): grams / (amount x ml of
  the unit). The millilitres are read from `packages/engine/data/units.json`
  (US customary, exact), never typed again. Bulk forms such as `cup,
chopped`, `cup, sliced` or `cup (8 fl oz)` are not densities and are
  skipped. If several volume portions exist they must agree within a ratio
  of 1.1, otherwise the density is left out; the value comes from the cup,
  else tablespoon, else teaspoon, rounded to three decimals. A result
  outside 0.05 to 2.5 g/ml is treated as a data error and left out.
- **Unit weight.** From a portion of amount 1: the one whose modifier is
  `medium` (also `medium (3" dia)`); else the only `small`, `medium` or
  `large` portion; else the only portion whose modifier is one piece word
  (clove, each, item, piece, fruit, head, leaf, pepper, pod, root, spear,
  stalk), with or without a size in parentheses. If two portions qualify
  (two sizes of fruit, two mediums) there is no unit weight rather than a
  guess. Portions like `3 cloves` or `slice` are not used.
- **Name.** The FDC description without parentheses and without the word
  `raw`. If two rows would share a name, both use the full description,
  then add the FDC id. The full description is kept in `x-fdc`. The names
  are USDA's: nothing is reworded, reordered or renamed by hand or by a
  word list.
- **Nothing else is filled in.** Roles, shelf life, season and allergens
  are absent because the source does not carry them; yields are described
  [below](#yields).
- **Order and bytes.** Entries sorted by id; no clock; the same datasets
  give the same file. The envelope holds the SHA-256 of each dataset file
  read.

Every number's `source` names the dataset and release, the FDC id and the
exact portion text, for example `USDA FoodData Central, SR Legacy,
release 2018-04, FDC ID 169230, portion: 1 clove = 3 g`. A density also
names the unit's millilitres.

## Grouping rule

USDA's descriptions are hierarchical by their commas: "Butter, salted" and
"Butter, without salt" are two kinds of "Butter". The generator
(`tools/catalogue/group.mjs`) builds the ingredient tree from this, with
no hand maintenance. A **segment** is the part of a row's name between
", " separators; a **run** is the first k segments (k from 1 up to one
fewer than the name has).

1. **A run is a parent when at least two rows have names that start with
   it** and are longer ("Wheat flour, white, all-purpose" is the run of
   three rows). Segments are compared whole and exactly (case included):
   "Wheat" is not above "Wheat flour", "Cheese, Brie" is not "Cheese,
   brie".
2. **A row whose own name is such a run is the parent**; no second entry
   with the same name is made ("Cabbage" above "Cabbage, red"). A food row
   can therefore have children.
3. **A parent that would have one child is not made**: a food that stands
   alone has no parent and its row shows its own name, and a run that all
   its rows share only through a longer run ("Wheat flour, white" above
   only "Wheat flour, white, all-purpose") is skipped and the child moves
   up. Repeated until nothing changes.
4. **Levels arise from the runs**: a row's parent is the longest run (or
   row) above it that exists, so "Milk" > "Milk, buttermilk, fluid" >
   "Milk, buttermilk, fluid, cultured" > its rows. There is no depth limit;
   the tree stops where the names stop sharing segments (deepest: 6 levels).
5. **Inverted names are not rewritten.** USDA puts a category word first
   ("Spices, caraway seed", "Nuts, cashew butter", "Oil, grapeseed"); the
   run "Spices" is a legitimate class and becomes a parent like any other.
   There is no list of category words: the data shows them by the rule
   (Oil, Milk, Spices, Beans, Nuts, Cheese and Seeds have the most rows
   below them).
6. **The id of a parent** is `fdc-group-` and its name as a slug: NFKD,
   accents dropped, lower case, every run of characters other than a-z and
   0-9 becomes one `-`, no `-` at the ends ("Milk, whole, 3.25% milkfat" is
   `fdc-group-milk-whole-3-25-milkfat`). A slug that would make the id
   longer than 80 characters is cut and ends in `-` and the first 8 hex
   digits of the SHA-256 of the name. The id depends on the name only, so
   it is the same on every run and a parent is the same entry in every
   notebook. A food row keeps its `fdc-<FDC id>` id as the parent of its
   variants.
7. **A parent's number.** A parent takes `densityGPerMl` or `unitWeightG`
   only when **every food row below it has the value** (a row without one
   inherits the parent's, so the number must be true of all of them), at
   least two rows have it, and the largest value is at most **1.05 times**
   the smallest. The value is the median (the mean of the middle two for an
   even count), to three decimals, and its `source` says so, names the rule
   and lists the FDC id of every row it comes from. A source text that would
   pass 500 characters would leave the number out. Otherwise the parent has
   no number. A parent has no yields. The parent record carries
   `x-group: { rows }`, the number of food rows below it.

Result for SR Legacy 2018-04: 539 food rows and 116 parents, 655 entries (a catalogue of 291 kB, 33 kB gzipped; 245 kB and 28 kB before the German names).
380 food rows have a parent, 153 stand alone and 6 food rows are
roots of a group. The tree has 6 levels (212 entries at the top, 283, 111,
37, 10 and 2 below). 53 parents are at the top, 43, 16 and 4 at the next
levels. 18 food rows are parents of a variant. 54 parents carry a density
and 4 a unit weight (the rule above; counting only the children that have
a value, as a first reading would, gives 56 densities, among them "Peppers"
from 2 of its 7 rows, which is why every row must have it).

## Yields

The SR Legacy JSON and CSV[^srcsv] downloads of April 2018 carry no refuse
percentage: the JSON has no field for it, and the CSV zip's
`food_attribute.csv` holds only a "Latino food" attribute; the only place
the word appears is in portion texts ("fruit without refuse",
"chop, excluding refuse (yield from 1 raw chop, with refuse, weighing 151
g)"), and the field descriptions of that zip list `is_refuse` for food
components, a table SR Legacy does not have. The refuse is in the older
SR28 ASCII archive of the same dataset, listed on the same download page[^sr28zip]
(`SR-Legacy-Archive/sr28asc.zip`), file `FOOD_DES.txt`, field `Refuse`
("percentage of refuse", of the total weight as purchased) with `Ref_desc`
("description of inedible parts"), as `sr28_doc.pdf` of that archive says
(Food Description file). It is the 2015 file; the May 2016 patch of SR28
(`sr28upd0516.zip`) is not applied, and the file was not checked against the
2018 release beyond the join below.

- **Join.** The JSON's `ndbNumber` is the file's `NDB_No`. The food gets a
  yield only if its description, with parentheses and extra spaces
  dropped, equals the file's `Long_Desc`: 524 of the 539 rows match
  exactly, 14 differ only by a parenthesis ("Includes foods for USDA's
  Food Distribution Program"), one ("Oil, vegetable, soybean, refined")
  differs in wording and has no refuse. Every row with a refuse above 0
  joins; a food that does not join gets none.
- **Rule.** A refuse above 0 and below 100 gives
  `yields: [{ state: raw, percent: 100 - refuse, source }]`. Zero or no
  refuse gives no yield (the file writes 0 and an empty field both; an
  unknown yield is never taken as 100 %, [data
  model](data-model.md#ingredient)). The state is `raw` because the
  selection leaves out cooked and prepared foods. The source names the
  file, the NDB number, the FDC id, the refuse and its `Ref_desc`, for
  example `Refuse 13 %, Ref_desc "Knob and skin"; yield = 100 - 13` for
  garlic (87 %).
- **Result.** 153 of the 539 food rows have a yield, none of the parents.
- **Envelope.** `refuseDataset` names the file and its SHA-256; the
  generator needs it (`--refuse <FOOD_DES.txt>`).
- Weights of the portions are edible-portion weights, so the density and
  unit weight of a row do not change with its yield.

## German names

English stays the canonical language of the data and the code; German is
supported on top, so a search for "Mehl" finds flour and a shopping list
app can search the same file in German. The names come from Wikidata, whose
structured data is public domain: "All structured data (i.e. the main,
Property, Lexeme, and EntitySchema namespaces) is released into the public
domain under Creative Commons Zero", "All data in Wikidata has a CC0
license" (Wikidata:Licensing, read 2026-11-18)[^wdlic]. Nothing is translated by hand
or from memory: a food has a German name only when a Wikidata item carries
its USDA NDB number (property P1978) and the rules below accept the item.

**The snapshot.** The generator never calls the network. Two SPARQL
queries to `https://query.wikidata.org/sparql`[^wdsparql] on 2026-11-18 (a
generic User-Agent, no per-item requests) fetched every item with a P1978
value at once: item, NDB number, German and English label, German aliases
(`skos:altLabel`), and the classes (P31 and P279); the second query gave
the English labels of the P31 classes. The response had 1,470 rows (item and NDB
number pairs; 142 items carry more than one NDB number). The file
`tools/catalogue/wikidata-de.json` keeps the rows whose NDB number
belongs to a food row of the catalogue: 293 rows, with the query text, the
date and both row counts in its head, one row per line (about 46 kB, 9 kB
gzipped). A row has the item id, the NDB number as Wikidata writes it,
`ndbCount` (how many NDB numbers the item carries in the whole response,
which trimming would otherwise lose), the German label, the sorted German
aliases, the English label and the P31 class ids; the class ids that are a
taxon (the class's English label ends in "taxon": `Q16521` and
`Q136343650`, hybrid taxon) are listed in the head. `tools/catalogue/snapshot.mjs`
trims saved responses to this file, see [development](development.md#german-names);
the generator reads only the file, and the envelope's `namesDataset` holds
its SHA-256 and date.

**The rules**, in `tools/catalogue/wikidata.mjs`, applied in this order to
each food row, the first that fails ends it (the counts are for the 539 rows):

1. **Join.** The food's NDB number and the item's are both normalised: four
   or five digits only, padded to five with a leading zero ("1001" and
   "01001" are the same). Anything else (six digits such as "011022",
   other numbering schemes, text) joins nothing. 260 foods have no item; 279 have one.
2. **Ties between items.** If more than one item carries the NDB number,
   none is used (14 foods, 14 numbers).
3. **German label.** The item must have one (15 foods fail here).
4. **Label against food.** The item's English label must say the food. If the
   item carries one NDB number, all words of its English label (lower case,
   plural endings dropped; the label written as one word counts, "corn starch"
   for "Cornstarch") occur in the description without its parentheses (39
   foods fail). If the item carries several NDB numbers it is a class
   ("milk" for fourteen milks, "margarine" for 39 foods) and is used
   only when its label has exactly the words of the description's first
   segment, the text before the first comma ("Milk, whole" yes; "Orange peel"
   for "orange" no; 62 foods fail). Scientific English labels ("Carya" for
   hickory nuts, "Morus" for mulberries) never occur in USDA's
   descriptions and fall out here.
5. **Taxon.** 40 foods have an item (after rule 2) that is an instance of a
   taxon (P31 `Q16521` or `Q136343650`): 32 of them fail the rules above, in
   practice rule 4,
   3 are rejected because their German label is a scientific name (a
   capitalised word followed by a lower-case word, or `×`, `sect.`, `var.`:
   "Lactuca sativa var. angustana", "Vaccinium sect. Cyanococcus"), 5 are
   kept: the item is the food's common-name item, as "Rosenkohl" for
   "Brussels sprouts", "Rotkohl", "Kohlrabi", "Triticale", "Rote Bete". The
   pattern is applied to the label of taxon items only, because it also
   matches loan names ("Aceto balsamico", which stays).
6. **Aliases.** The item's German aliases without the label itself,
   duplicates (ignoring case) and scientific names, sorted. Where Wikidata
   has a longer list than a cook needs the list stays long: nothing is
   chosen by hand.

**Result.** 146 of 539 foods have a German name (72 through a class item
with several NDB numbers), 83 of them also aliases. A name's `source` is
"Wikidata Q..., label de and aliases, NDB ..., snapshot 2026-11-18".

**Parents.** A generated parent takes a German name only when every food
row below it has a German name, there are at least two rows, and all the names
are the same; it has no aliases, and its `source` says so and lists the
Wikidata items ("Derived by tools/catalogue/build.mjs: all 5 rows below have
the de name "Milch"; Wikidata Q..."). A parent that is itself a food row has
its own name (or none). 12 of 116 parents get one: Cream, fluid
(Sahne), Guavas (Guaven), Margarine and the four parents below it
(Margarine), "Milk, lowfat, fluid, 1% milkfat" (Milch), Oranges
(Orange), Pineapple (Ananas), Shortening and "Shortening, household"
(Shortening). Parents such as "Milk" or "Cheese" stay English only. A search
for a German name still reaches the foods below a parent without one, and
the parent is shown on the way.

**Doubtful, listed for the owner** (the rules cannot see these; each is
Wikidata's own label):

- "Oil, corn, peanut, and olive": "Öle" (Q42962, plural, the generic oil
  item), aliases "Süßöl", "Öl".
- "Cheese, cream": "Doppelrahmkäse" (Q426337, English label "cream cheese").
- "Pears, raw, bosc": "Boscs Flaschenbirne" (Q894405), aliases of other
  names for the cultivar ("Kaiser Alexander", "Kaiserkrone").
- "Spinach, raw": "Blattspinat" (Q36814998), alias "Spinat".
- "Spices, cloves, ground": "Nelke" (Q15622897, also the carnation's word).
- "Spices, allspice, ground": "Piment" (Q1963621).
- "Spices, mustard seed, ground": "Senfkorn" (Q1937700), also "Senfsaaten".
- "Spices, pepper, red or cayenne": "Cayennepfeffer" (Q52075540).
- "Spices, poppy seed": "Mohnsaat", alias "Mohn".
- "Thyme, fresh": "Thymiankraut" (Q3215980), alias "Thymian".
- "Vinegar, distilled": "Essig" (Q41354), the generic item; aliases
  include "Acetum", "Orleans-Verfahren", "Schnellessigverfahren" (also for
  red wine and cider vinegar).
- "Oil, rice bran": "Reisöl" (Q175933).
- "Fish oil, menhaden, fully hydrogenated": "Fischöl" (generic, also
  sardine), alias "Tran".
- "Lard": "Schweineschmalz" (Q72827), alias "Fettbemme".
- "Cream, fluid, light (coffee cream...)": "Sahne" (Q13228), aliases "Rahm",
  "Obers", "Nidel": one word for light, whipping and half and half.
- "Wheat flour, whole-grain": "Weizenmehl" (Q2249305), not "Vollkorn".
- "Peaches, yellow, raw": "Pfirsich" with alias "Nektarine".
- "Kohlrabi, raw": "Kohlrabi" (taxon item) with alias "Kohlrübe", another vegetable.
- "Carrots, raw": "Karotte" (Q81), alias "Wurzel".
- "Dulce de Leche": "Dulce de leche" and "Eggnog": "Eggnog" are loan
  names, and "Shortening", "Brauner Reis" (lower case, as Wikidata has it).
- "Guavas, strawberry": "Guaven", the plural.

Many aliases are regional or historical ("Rüeblí", "Schmer", "Fettbemme");
they are kept because a search by them is right.

## Food category

USDA's `foodCategory.description` of the SR Legacy JSON (for example "Dairy
and Egg Products", "Spices and Herbs") is written out for every food
row as `x-fdc.category`, as USDA gives it. A generated parent takes it as
`x-group.category` only when every food row below it has the same one
(107 of 116 parents). It is not mapped to shop aisles or anything else.

## What the catalogue does not have

- No meat, fish, poultry, baked goods, beverages, soups, sauces, canned,
  frozen, cooked or prepared foods, and no brand products.
- No shelf life, roles, seasons, allergens or nutrition figures; yields only
  where SR28 gives a refuse percentage (153 foods), none for cooked states.
- No density for foods whose only volume portion is a bulk form (chopped,
  sliced, shredded), no unit weight where the source gives several sizes
  or no single piece; many ingredients appear with a density but no unit
  weight and the other way round.
- Weights are those of the food as SR Legacy describes it (mostly the
  edible portion); a medium apple is 182 g without its core, not as
  bought. Leafy greens and herbs have low densities because the source's
  cup is loosely packed.
- English as the canonical language; German names for 146 of 539 foods and 12 of 116
  parents ([German names](#german-names)), no other language; US customary portions
  only; the data is from 2018.
- Several rows are variants of the same food (milks with different added
  vitamins, margarines, oils); the source's variants are kept, and the
  tree above groups them by the commas of USDA's names, nothing more. Some
  groups are odd to a cook: "Milk" holds human, sheep, goat and dry milk
  next to cow's milk, "Beans" and "Nuts" mix very different foods, "Fat"
  holds only poultry and beef fats, and a few parents are named by the
  shared segments of long descriptions ("Milk, reduced fat, fluid, 2%
  milkfat"). A parent's number says only that the foods below agree.

## Regenerating and testing

How to download and regenerate: [development](development.md#ingredient-catalogue).
`packages/app/test/catalogue-file.test.ts` validates the shipped file
against the schemas, checks ids and sources, recomputes rows from fixture
excerpts of a few foods (`packages/app/test/fixtures/catalogue/`) and tests
the rules on synthetic portions. `packages/app/test/catalogue-groups.test.ts`
tests the grouping rule on a second excerpt (with `food-des-excerpt.txt`
for the yields) and on synthetic names, the parents' numbers and ids, the
yields, the input-order independence of the bytes, and runs the shipped
file through `validateModel` (no `cycle`, no `unknown-parent`) and
`buildTree`. `packages/app/test/catalogue-names.test.ts` tests the German names: the NDB join,
the tie, label and taxon rules on small excerpts, the parents' names and categories, the
snapshot builder, that every shipped name cites an item of the committed snapshot with that
label, and the bytes. The catalogue schema and its examples
are in `packages/engine/schemas/`.

[^wdlic]: Wikidata, Wikidata:Licensing, sections Official policy and Determining the copyright of a dataset, read 2026-11-18.

[^wdsparql]: Wikidata Query Service, `https://query.wikidata.org/sparql`, queried 2026-11-18; the query text is in `tools/catalogue/wikidata-items.rq` and in the snapshot.

[^sr28zip]: USDA FoodData Central, Download Datasets, SR Legacy archive list, `sr28asc.zip` and `sr28_doc.pdf`, read 2026-11-18.

[^srcsv]: USDA FoodData Central, Download Datasets, SR Legacy row "April 2018 (CSV)", read 2026-11-18.

[^fdc]: USDA FoodData Central, home page, section Licensing, read 2026-11-18.

[^srzip]: USDA FoodData Central, Download Datasets, SR Legacy row "April 2018 (JSON)", read 2026-11-18.
