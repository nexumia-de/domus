---
type: Specification
title: Ingredient catalogue
description: The catalogue of basic ingredients shipped with the app, generated from USDA FoodData Central SR Legacy; why that dataset, the selection rule, how density and unit weight are derived, how the ingredient tree and the yields are built, where the German names (Wikidata, and the project's own translation for the rest) and USDA's food categories come from and by which rules, the file, and what the catalogue does not have.
tags:
  [
    catalogue,
    ingredients,
    data,
    usda,
    wikidata,
    german,
    licences,
    generator,
    tree,
    yields,
    nutrition,
  ]
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

## Named foods

The selection rule leaves out foods that the shipped dishes still need: black
and white pepper (the spice rows give "tsp, ground", not "tsp"), fresh parsley
and rosemary (the vegetable rule wants "raw" in the name), lemon juice
(`juice` is an excluded word), bay leaf, red and white table wine (a
beverage), tomato, bread, dry breadcrumbs, fennel, cauliflower, parsnip,
shallot, basil, Gruyere, potato flour, dry pasta and green beans, savoy
cabbage, canned tomato sauce and tomato paste, and the meat, poultry, fish and
shellfish below. These are
**named foods**: `tools/catalogue/extras.json` lists their FDC ids, each with
the reason (the dish lines it serves). Nothing else about them is typed.
A named food is a row like any other: the same name rule, parents, yields and
German names (`build.mjs` selects `isBasic(food) || EXTRAS.has(id)`; the
snapshot builder asks the same question). Where the general portion rule
finds nothing, the entry may say which portions to read, by their exact
modifier text: `volume` (a modifier such as `tbsp, ground` counts as a volume
in the unit named, `fl oz` as 2 tbsp) and `piece` (the portion of amount 1 that
is one piece, for example `slice`). Every number is read from the dataset and
its `source` names the portion. A named food with no usable portion is a row
for mass amounts only (the other rows must have a density or a unit weight; the
shipped-file test lets named foods be the exception). **Adding one:** find the
food in the dataset (the SR Legacy JSON, by its `description`), add the id and reason to `extras.json`,
rebuild ([development](development.md#ingredient-catalogue)), then replace the
dish line's `wanted` by its `ref`. What USDA does not have stays `wanted`:
juniper, bouquet garni, soup vegetables, fine herbs, orange-flower water,
herring milt, chicken blood, prosciutto grasso, beef bones and beef extract
(carnesecca and the acquavite, once in this list, were matched on 2026-11-24
in the third pass below). The catalogue has no route for a food without USDA
data: no entry is typed by hand. A food the rule excludes and that is not
named stays out.

**Meat, poultry, fish and shellfish (26 named foods, 2026-11-21).** The
categories are not in the selection rule, so these are named foods, each raw
and unprepared, no brand, read from the dataset like the others; the name is
USDA's (the cut and the trim stay in it, for example "Beef, round, full cut,
separable lean and fat, trimmed to 1/8\" fat, choice"). Their
`x-fdc.category` is USDA's own, which a later feature can read to tell "with
meat" from "with fish" without a word list: "Beef Products" (3: round, chuck
pot roast, ground 80/20), "Pork Products" (6: backfat, shoulder, loin, ground,
bacon, cured ham), "Poultry Products" (4: chicken with skin, breast, thigh,
turkey), "Lamb, Veal, and Game Products" (5: lamb composite and leg, veal
composite lean and fat and lean only, ground veal), "Finfish and Shellfish
Products" (7: Atlantic herring, Atlantic salmon, Atlantic cod, yellowfin tuna,
European anchovy, shrimp, blue mussel) and "Sausages and Luncheon Meats" (1:
Italian pork sausage, mild). No selection or derivation rule changed: a named
food bypasses the rule, and the existing parent rule groups them by the commas
of the name ("Beef", "Pork, fresh", "Pork, cured", "Fish", "Veal, composite
of trimmed retail cuts" and so on, nine new parents, each with its category).
The portions give a density or a unit weight only where USDA has one (a cup of
cured ham and of mussels, a medium shrimp and mussel); the rest are rows for
mass amounts. Eight dish lines now point at them: the beef of the sauerbraten
(round), of the cocido and of the pot-au-feu (the chuck pot roast, the
dataset's cut for a pot), the fat pork of the sauerbraten (backfat), the
herring of the marinated herrings, the chicken of the poulet bourguignonne and
the pollastro of the pollo alla contadina (chicken with skin, cut up), and the
lean veal of the stracotto (lean only), eight lines in all. Lines that stay
`wanted` for want of a food that is clearly the one named: beef bone and bones, beef
extract, kidney suet, herring milt, boiled meat (lesso), meat stock and broth,
chicken blood, "Fatty ham (prosciutto grasso)" and carnesecca (the dataset has
no dry-cured Italian pork; its cured ham is a US wet-cured ham, which is
not claimed to be either). Judgement: "Beef for the pot" points at the chuck
arm pot roast because the dataset names that cut for a pot roast. On
2026-11-21 "Beef, from the joint" (the frikandelle) was linked to the
beef group, a ninth line: a joint is no cut, and a source that names
the animal and no cut points at its group, not at one cut.

Judgements made when matching a line to a food: "Pepper" (no colour) is black
pepper; "Peppergrass" is garden cress (the existing row); "Claret" and "Red
wine" are table wine, red; breadcrumbs and "grated bread roll" are dry grated
plain breadcrumbs; stale bread and a bread crumb are wheat bread, rye bread
crust is rye bread. "Cacio" (a sheep's cheese: the dataset's Romano is not
that), tarragon (only dried is in the dataset), chocolate (the dataset's baking
chocolate is unsweetened) and shallot-for-onion were not forced (looked at again in the third
pass, 2026-11-24: still not).

**For the project's own recipes (48 named foods, 2026-11-23).** The own
recipes of 13 cuisines ([own recipes](decisions/own-recipes.md)) need foods
the rule leaves out. A first agent proposed the list; the lead of a later
session read every id, description and portion in SR Legacy 2018-04 before
it was taken (all 48 are the food the reason names). They are: soy sauce
(shoyu), plain and Greek yogurt, feta, cheddar, ripe olives, avocado, lemon
without peel, lime juice, cumin seed, dried oregano, cardamom, sun-dried hot
chilli, dried ancho, prepared yellow mustard, ketchup ("Catsup"),
Worcestershire sauce, brown sugar, smooth peanut butter, fish sauce, oyster
sauce, hoisin sauce, miso, firm tofu, sake, laver (nori), pak-choi, Chinese
cabbage (pe-tsai), lemon grass, chicken breast without skin and bone,
chicken thigh meat only, home-prepared chicken and beef stock, vegetable
broth, dry pinto beans, capers, raw cashews, walnuts, raisins, dark
chocolate (70-85 %), sweet potato, aubergine, broccoli, fresh dill, chives,
sour cream, whole-milk mozzarella and Romano. The lemon was left out by the
rule because USDA gives two sizes of fruit; the entry names the smaller
(2-1/8", 58 g), a judgement. The two chicken cuts are in "Poultry Products",
so the named meat, poultry and fish are now 28. Nine parents are new
(alcoholic beverage, mozzarella, chicken, sour cream, walnuts, sauce, soup,
stock, yogurt). The dataset has no mirin, rice vinegar, curry paste, dashi,
kombu or bonito, garam masala, galangal or tamarind paste; a recipe that
needs one keeps a `wanted` line. Not verified: nobody compared the
portions' weights with a kitchen scale; the stocks are USDA's
"home-prepared" rows, the vegetable broth a ready-to-serve one.

**Tap water (1 named food, 2026-11-24).** 75 of the 124 shipped recipes
named water as a `wanted` line, and a recipe with such a line cannot be
kept in the notebook, which is where a dish is built on. "Beverages, water,
tap, drinking" (FDC 173647; 1 fl oz = 29.6 g read as 2 tbsp, density 1.001)
is now a row; 74 lines point at it ("Water", "Cold water", "Ice-cold water",
"Water, cold"; the cold ones say so in the line's note). "Water (the cooking
water of the peas)" stays `wanted`: it is not tap water. The role table gives
it the role water, which the finder takes as the kitchen's own, so no stock
is asked for it (`test/water-line.test.ts`, with the control that without the
role it is asked for). The characters leave it out
([dish characters](dish-characters.md)); the nutrition counts it with its
0 kcal. FlavorDB's link for it is taken out. 21 shipped recipes still have a
`wanted` line and cannot be kept.

**The lines that kept a recipe from the notebook (2 named foods,
2026-11-24, third pass).** 21 of the 135 shipped recipes had a `wanted` line
and could not be kept in the notebook. Each of the 26 names was looked up
again in SR Legacy 2018-04 (the downloaded JSON, SHA-256 as in the envelope,
by its `description`; each id, description, portion and figure read there).
The rule of this pass: a line points at a food only when the row is the food
the line names, and at a group only when every row of the group is that food;
a row that is merely like it is not taken. Two foods are added:

- "Pork, cured, salt pork, raw" (FDC 168287, Pork Products; portions in ounces
  only, so a row for mass amounts) for the carnesecca of the maccheroni alla
  bolognese and of the stracotto di vitella. Artusi's own word list, quoted in
  the lines' `sourceNote`, says "Carnesecca. Pancetta del maiale salata.":
  salted, unsmoked pork belly. US salt pork is salt-cured, unsmoked pork, as
  a rule from the belly or side; USDA names no cut. The note says that the row
  is US salt pork of no named cut. This revises the earlier "the dataset has no
  dry-cured Italian pork" for this word: the book defines carnesecca as salted
  belly, not as an air-dried product. Judgement: USDA's sample is fat (80.5 g
  fat in 100 g), fatter than a streaky belly would usually be; the nutrition
  of the two dishes counts it as such. "Pork, fresh, belly, raw" (FDC 167812,
  53 g fat, 32 mg sodium in 100 g) has the cut but is not salted: the salt
  (2680 mg sodium in the salt pork) is what makes carnesecca, so the cured
  row is the food and the fresh belly only its cut. Its parent is "Pork, cured" (2 rows to
  3, "Pork" 6 to 7); no line points at either group.
- "Alcoholic beverage, distilled, all (gin, rum, vodka, whiskey) 80 proof"
  (FDC 174815, Beverages; 1 fl oz = 27.8 g read as 2 tbsp, density 0.94) for
  the acquavite of the fried fennel's batter. Acquavite is the Italian word
  for a distilled spirit of any kind; the earlier wording "Fruit brandy" was
  narrower than the book. USDA's row is its row for all distilled spirits at
  40 % alcohol, and the note says "a spirit of no named kind". The parent
  "Alcoholic beverage" now has 4 rows and no longer a density (0.94 against
  0.994 of the wines and sake is beyond the 1.05 the parent rule allows); no
  line points at it. The line has no amount.

Neither has a Wikidata item for its NDB number (10165, 14037; asked on
2026-11-24, no item), so both have own German names ("Salzspeck, roh", marked
`uncertain`; "Spirituose, 40 % vol") and kitchen names ("Salt pork" /
"Salzspeck", "Spirit, 40 % alcohol" / "Spirituose, 40 % Alkohol"). FlavorDB's
rule links the salt pork to its pork entity (682 links); the spirit has none.

Two names now point at a group the catalogue had: "Meat broth" of the
maccheroni alla bolognese and of the minestrone, and "Meat stock" (bouillon)
of the poulet bourguignonne point at "Soup, stock", which holds exactly the
home-prepared beef and chicken stock (FDC 172883, 172884), each of them a meat
stock. This reverses the judgement of the second pass, which knew both rows
("the dataset has home-prepared beef and chicken stock, but the lines name no
animal") and left the lines `wanted`. The reason for reversing it: a line that
names no animal is not asked to point at one animal's stock; a group that
holds exactly the two meat stocks names no animal either, as the beef group
names no cut for "Beef, from the joint". Every row of the group is a meat
stock, so the group is the food the lines name. The note says "Beef or chicken stock.", the
`sourceNote` that the book names no meat; kitchen name "Stock (beef or
chicken)" / "Brühe (Rind oder Huhn)". A fish or vegetable stock joining the
group would make it wrong for these lines. None of the three has an amount.

Not matched, though the catalogue or the dataset has something near:

- "Cheese (cacio)" of the gnocchi di patate and the tagliatelle verdi. The
  cheese group holds 21 rows, cottage cheese, cream cheese and ricotta among
  them, which are not what is grated over pasta; whether Artusi's plain
  "cacio" is any cheese or a sheep's cheese, the group is not that food, and
  Romano is not it either. The earlier judgement stands.
- "Chocolate" of Muro's crema de chocolate (1894). The catalogue's dark
  chocolate (70-85 % cacao, FDC 170273, since 2026-11-23) is a modern bitter
  chocolate; the source names no kind, and the chocolate of the time was as a
  rule sweetened tablet chocolate. Dark chocolate, unsweetened baking chocolate
  and the sweet candies are each like it, none is clearly it. The earlier
  judgement stands.
- Tarragon (marinated herrings): only dried tarragon (FDC 170937); the herbs
  of that recipe are fresh (fresh thyme, garden cress), and dried tarragon
  would count a fresh herb as a dried one, several times as dense in
  nutrients.
- Kidney suet (frikandelle): "Beef, variety meats and by-products, suet, raw"
  (FDC 170193) is the food, but the reason of the second pass stands: its
  name puts it under the beef group, which the frikandelle's "Beef, from the
  joint" points at, so a pantry with suet alone would count as having the
  beef. Left for the owner; the parent rule has no way to keep a row out of
  its group. The frikandelle stays blocked by its juniper anyway.
- Shelled fresh beans (minestrone; the source names no kind): the dataset's
  immature (fresh) beans are lima beans, broad beans (FDC 170377, raw),
  hyacinth beans and winged beans, other species than the common bean
  (Phaseolus vulgaris) that an Italian minestrone's beans are as a rule (a
  judgement from general knowledge; the source text was not read again), and pinto
  beans, immature seeds, frozen (FDC 169958), which are the common bean but
  one named variety and a frozen product, while the source names no variety;
  the rest are dried beans. None is clearly a handful of fresh shelled beans
  of no named kind, and the dataset has no group of fresh common beans.
- Beef extract (fine potato soup): the dataset has bouillon powders and cubes,
  salted soup bases, and a yeast extract; none is a meat extract.

18 recipes still cannot be kept (117 of 135 can, 114 before), 22 names in 25
lines stay `wanted`; `test/classics-wanted-list.test.ts` names every recipe
with the lines that block it and checks that the engine's copy refuses exactly
those and copies every other:

- not in the dataset: juniper berries (frikandelle, sauerbraten),
  orange-flower water (flan clásico, huevos amerengados), bouquet garni and
  chicken blood (poulet bourguignonne), fine herbs (arlequín de judías), soup
  vegetables (fine potato soup), herring milt (marinated herrings; the dataset
  has roe, which is not milt), dashi (miso shiru; no dashi, kombu or bonito),
  red curry paste (kaeng phet kai; only curry powder), beef bone and bones
  (cocido, pot-au-feu; no bone row);
- in the dataset only as something near (above): cacio (gnocchi di patate,
  tagliatelle verdi), chocolate (crema de chocolate), tarragon (marinated
  herrings), shelled fresh beans (minestrone), beef extract (fine potato
  soup), and kidney suet (frikandelle, left for the owner);
- no single food: "Fatty ham (prosciutto grasso)" (minestrone; the dataset's
  cured ham is a US wet-cured ham), fresh berries and fresh berries, sugared
  (rote Grütze; the dataset names each berry and has no berry group), the
  boiled meat (lesso) of the minestrone, which names neither animal nor cut,
  and the cooking water of the peas (potage aux pois verts maigre), which is
  not tap water.

What changed for the dishes: the nutrition counts one line more for the
stracotto (6 of 15) and the maccheroni (6 of 13), the 50 g of carnesecca;
neither shows figures (lines without an amount stay). The characters of every
shipped dish are as before (compared dish by dish before and after). A kept
copy of the maccheroni, the stracotto or the fried fennel is a dish of the
notebook like any other. Not verified: nobody cooked these with the
catalogue's food; that US salt pork is cut from the belly rests on general
knowledge, not on a source.

**Savoy cabbage, tomato sauce and tomato paste (3 named foods,
2026-11-21, second pass).** The dish lines still `wanted` were looked up
again in SR Legacy 2018-04 (the downloaded JSON, SHA-256 as in the envelope;
each id, description and figure read there): "Cabbage, savoy, raw" (FDC
170388), "Tomato products, canned, sauce" (170054) and "Tomato products,
canned, paste, without salt added (Includes foods for USDA's Food
Distribution Program)" (170459) are the foods the lines name, in the form
they name. Savoy has only a `cup, shredded` portion, so it is a row for mass
amounts (with its yield from SR28); the sauce and the paste have a density from
their cup portions. The parent rule makes one new parent, "Tomato products,
canned", which holds exactly these two. A rebuild from the same datasets left
all 716 earlier entries byte for byte as they were (compared entry by entry;
the generator also reproduced the earlier file exactly before the change).
Six dish lines now point at the catalogue:

- the savoy cabbage of the minestrone: the savoy row;
- the tomato sauce of the gnocchi di patate: the canned sauce. Judgement: a
  US canned tomato sauce is a seasoned, thin cooked purée, which is what
  Artusi's "salsa di pomodoro" is in the pantry; the German name is marked
  `uncertain`;
- "Tomato sauce or paste" of the minestrone and of the stracotto: the parent
  "Tomato products, canned". The source gives a choice of two foods and the
  generated parent holds exactly those two, as the beef group stands for a
  source that names no cut; the wording "Tomato sauce or paste" stays as the
  line's note. Neither line has an amount, so no number of the parent is used
  (it has none: sauce and paste do not agree);
- the whole clove of the pot-au-feu: ground cloves (FDC 171321), as the
  cocido's whole clove already did, with the note "A whole clove." and the
  remark that the catalogue has only ground cloves. Grinding does not change
  what a gram of the spice is; it changes its volume and its piece. The line's
  amount is one piece and the ground row has no piece weight, so the engine
  gives it no mass and no nutrition rather than a wrong one;
- the white mustard seed of the marinated herrings: "Spices, mustard seed,
  ground" (FDC 170929), with the note "White mustard seeds, whole." and the
  remark that the catalogue has only ground mustard seed of no named kind. The
  amount is one ounce, a mass, so the nutrition is that of 28.35 g of ground
  mustard seed. Judgement: a gram of whole seed is a gram of ground seed; USDA
  names no kind (white or brown), which is not claimed.

Not added, though SR Legacy has the food: "Beef, variety meats and
by-products, suet, raw" (FDC 170193) for the "Kidney suet" of the frikandelle.
Its name puts it under the parent "Beef", so adding it changes an earlier entry
(the beef group's `x-group.rows`, 3 to 4) and puts a fat into the group that
the frikandelle's "Beef, from the joint" points at, so that a pantry with suet
alone would count as having the beef. It stays `wanted` for the owner to
decide. Still `wanted` for want of the same food: tarragon (dried only),
shelled fresh beans (only dried and other species), chocolate (the source's is
no named kind; the dataset has unsweetened baking chocolate and sweet
candies), "cacio" (Romano is not it), herring milt (the dataset has roe, which
is not milt), fresh berries (no parent "berries": the dataset names each
berry), meat stock, meat broth and boiled meat (the dataset has home-prepared
beef and chicken stock, but the lines name no animal; the earlier judgement
stands).

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
   `x-group: { rows }`, the number of food rows below it, and, for a parent
   named in `tools/catalogue/usual.json`, `usual` ([usual member](#usual-member)).

Result for SR Legacy 2018-04, counted on the file on 2026-11-24: 640 food rows (539 by the rule, 101 [named foods](#named-foods)) and 140 parents, 780 entries (minified 525 kB, 70 kB gzipped, as measured that day; 778 before the third pass of the named foods, 777 before tap water, 720 entries before the foods for the own recipes, 716 before savoy and the tomato products, 681 before the meat and fish).
449 food rows have a parent. The figures of the tree that follow were counted on 2026-11-21 at 720 entries and not again: 420 food rows had a parent, 162 stood alone and 7 food rows were
roots of a group. The tree has 6 levels (233 entries at the top, 316, 122,
37, 10 and 2 below). 64 parents are at the top, 47, 16 and 4 at the next
levels. 19 food rows are parents of a variant. 55 parents carry a density
and 5 a unit weight (the rule above; counting only the children that have
a value, as a first reading would, gives 56 densities, among them "Peppers"
from 2 of its 7 rows, which is why every row must have it).

## Usual member

Added 2026-11-21. A dish line often names a parent: Gouffé's "6 œufs" points at
"Egg, whole", Artusi's "zucchero" at "Sugars", a "Tasse Milch" at "Milk",
because the source names no kind. The parent rule above gives such a parent no
number when its rows disagree, and they do: "Egg, whole" holds a fresh egg
(143 kcal per 100 g, 44 g a piece) and two dried egg powders (592 and 615 kcal,
no piece); "Milk" holds 33 rows from 34 to 496 kcal (skimmed to dried); "Butter"
5 rows from 499 to 731 kcal. Taking a median or a range over such rows would
mix products no cook means. So the line was not counted at all ("egg (weight
unknown)", "butter (no nutrient data)"), and the herb omelette showed the 5 kcal
of its salt and pepper.

**The rule.** `tools/catalogue/usual.json` names, for a parent, the one row below
it that a recipe naming no kind means, with the reason. The generator
(`tools/catalogue/usual.mjs`, called by `build.mjs` after the names) checks that
the parent exists and that the row is a food row below it (it stops with an
error otherwise), and writes `x-group.usual = { id, source }` on the parent. The
`source` says that the choice is a **judgement of the project**, names the FDC
id and description of the member, gives the reason, and states the range of
energy over the parent's food rows, read from the rows ("The 3 food rows below
range from 143 to 615 kcal per 100 g."). **No number is copied** to the parent:
its own `densityGPerMl`, `unitWeightG` and `x-nutrition` stay those of the
agreement rule, because a child without its own value inherits its parent's and
the usual member's piece weight is not true of dried egg. The engine reads the
member's numbers through `x-group.usual` for a line that names the parent and
nowhere else ([engine rules](engine-rules.md#nutrition), "The figures of a
line").

**Why a judgement and not a range.** USDA SR Legacy marks no row as the usual
one; the dataset's "Egg, whole, raw, fresh" and "Egg, whole, dried" are equals
in it. A range over the rows would be honest about the data and wrong about the
dish (an omelette is not made with egg powder), and shown as a range it would
read "190 to 810 kcal" for three eggs. The choice is made once per parent, in
one file, with a reason a reader can disagree with.

**The 20 parents** (only those a shipped dish line points at; each reason in
`usual.json`): Egg, whole (fresh egg, FDC 171287); Egg, yolk (fresh, 172184);
Egg, white (fresh, 172183); Butter (without salt, 173430: the sources salt on a
line of their own); Milk (whole, 3.25 %, without added vitamins, 172217);
Sugars (granulated, 169655); Cream and Cream, fluid (light whipping, about 31 %
fat, 170858); Cheese, parmesan (shredded, 173431); Wheat flour and Wheat flour,
white (all-purpose, unenriched, 169761); Oil (olive, 171413); Vinegar (red
wine, 172240); Apples (with skin, no variety, 171688); Lettuce (cos or romaine,
169247); Mushrooms (white, 169251); Peppers, sweet (green, 170427); Peas
(green, 170419); Rice and Rice, white (white medium-grain, 168879).

**What changed in the file.** A rebuild from the same datasets (SR Legacy JSON
and SR28 FOOD_DES.txt downloaded again on 2026-11-21, SHA-256 as in the
envelope; the unchanged generator first reproduced the shipped file byte for
byte) changed exactly the 20 parent rows named in `usual.json`, each gaining
`x-group.usual`; all other 700 entries are byte for byte as they were. Tests:
`packages/app/test/catalogue-usual.test.ts` (the rule on synthetic rows, the
refusals, and the shipped file against `usual.json`).

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
app can search the same file in German. Every entry has a German name,
from two sources that the entry's `source` tells apart: **Wikidata** for
164 of 716 entries (this section up to [the result](#german-names-result)) and **the
project's own translation** for the other 552 ([below](#own-translation)).
The Wikidata names come from Wikidata, whose
structured data is public domain: "All structured data (i.e. the main,
Property, Lexeme, and EntitySchema namespaces) is released into the public
domain under Creative Commons Zero", "All data in Wikidata has a CC0
license" (Wikidata:Licensing, read 2026-11-18)[^wdlic]. In the Wikidata part nothing is translated by hand
or from memory: a food has a Wikidata name only when an item carries
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

<a id="german-names-result"></a>**Result.** 146 of 539 foods (152 of 560 with the first 21 named foods; none of the 26 meats and fish added later has a Wikidata name) have a German name (72 through a class item
with several NDB numbers), 83 of them also aliases. A name's `source` is
"Wikidata Q..., label de and aliases, NDB ..., snapshot 2026-11-18 or 2026-11-19".

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

### Kitchen names

The catalogue's names are the database's: "Oil, olive, salad or cooking",
"Chicken, broilers or fryers, dark meat, thigh, meat only", "Beverages,
water, tap, drinking", and German names translated word for word. In a
recipe line they read like a database
([pitfalls](design.md#pitfalls-of-an-interface-built-by-agents)). Since
2026-11-24 an entry may carry `x-kitchen`, the name a cook writes, in
English and German ("Olive oil" / "Olivenöl", "Water" / "Wasser"). It is
the project's own, written by an AI model and read by another agent (five
were changed), a judgement: `tools/catalogue/kitchen-names.json`, merged by
the generator, with its SHA-256 in the envelope (`kitchenNamesDataset`).

- **Shown, not renamed.** `displayName` (`src/shared/names.ts`) shows the
  kitchen name wherever an ingredient is named, in both languages; the
  entry's `name` and `names` stay what they are, and a search finds the
  entry by all of them.
- **Which entries.** Every ingredient a shipped recipe names (177 on
  2026-11-24, 174 before the third pass of the named foods; the overlay has
  180 names); a new recipe line without one fails `test/kitchen-names.test.ts`.
  The other 600 entries show the catalogue's name as before.
- **Honest about the row.** A kitchen name does not claim another food:
  distilled vinegar is not called rice vinegar, the yellow mustard not
  Dijon; "Weizenmehl 405" for US all-purpose flour is the nearest German
  flour, an assumption.

Not verified: no cook read the names; the picker still lists entries by
their catalogue name, where the long name tells rows apart.

### Own translation

The 598 entries without a Wikidata name (foods 470, groups 128; two of the
foods, salt pork and the spirit, since 2026-11-24) have a
German name that the project translated from the USDA description on
2026-11-19 (556 of them; 40 were added on 2026-11-23 with the foods for the
own recipes, and savoy cabbage left the overlay because Wikidata names it
since the snapshot of 2026-11-23; the head's one date stays 2026-11-19). They are a hand-kept overlay,
`tools/catalogue/names-de-own.json`: an id maps to `{ name, aliases? }`, the
head names the data set (`Own German names for the catalogue: translation of
the USDA description by the project`), its date and its licence
(**AGPL-3.0-or-later**, the licence of this repository), and a list
`uncertain` holds the ids whose word the translator was not sure of, with the
reason. The catalogue's envelope repeats the head as `ownNamesDataset` with
the SHA-256 of the overlay, and every merged entry has the `source`
"Own translation of the USDA description by the project, 2026-11-19", so
an own name is told from a Wikidata label by its source.

The 35 names added on 2026-11-21 for the 26 meats and fish and their nine
parents are in the same overlay, so their `source` still says 2026-11-19, the
overlay's date; no Wikidata snapshot was refreshed for them (they have no NDB
join), and none is claimed.

The four names added on 2026-11-21 for savoy cabbage, the canned tomato sauce,
the tomato paste and their parent are in the same overlay too ("Wirsing",
"Tomatensauce, aus der Dose" (marked `uncertain`), "Tomatenmark, ohne
Salzzusatz", "Tomatenkonserven"). The Wikidata snapshot was not refreshed for
them: a query on 2026-11-21 found an item for the savoy's NDB number 11114
(Q154013, label "Wirsing"), none for the sauce or the paste, but a refreshed
snapshot changes the `source` of all 164 Wikidata names (its date) and adds
items for three of the meats and fish, so it would rewrite earlier entries. The
own name of the savoy is the same word as the Wikidata label.

**Rules of the translation.**

- The everyday kitchen word of a home cook in Germany, not a literal
  rendering of the USDA text: "Potatoes, white, flesh and skin" is
  "Kartoffel" (alias "Kartoffel, mit Schale"), "Egg, whole" is "Ei", "Bread,
  rye" is "Roggenbrot", "Cream, sour, reduced fat, cultured" is "Saure
  Sahne, fettreduziert". The state "raw" is left out as in the English
  names.
- **No claim of equivalence that does not exist.** "Wheat flour, white,
  all-purpose, enriched, bleached" is "Weizenmehl, Allzweck" with the aliases
  "Weizenmehl" and "Mehl"; no German type number (405, 550) is named,
  because the USDA class does not equal one (a test keeps "Type 405" out of
  every name and alias). Risotto rice is not claimed for medium-grain rice.
- **Distinctions of the catalogue stay.** Two entries do not get the same
  primary name unless they share the English name, when they differ in
  something a cook cares about: salted and unsalted, fat content, fresh and
  dried, whole-grain and white. The qualifier follows after a comma ("Butter,
  gesalzen", "Butter, ungesalzen", "Milch, 2 % Fett, ..."). Plural words give
  the groups a name of their own ("Äpfel" beside the Wikidata "Apfel"); a
  group also takes the plain word where the classics use the group
  ("Milch", "Essig", "Weizenmehl").
- **US-only products keep an explanatory name** ("Pancake-Sirup", "Maisgrieß,
  weiß, selbsttreibend, gebeutelt, pur, angereichert", "Muscle Milk,
  Proteinpulver auf Milchbasis (Markenprodukt)").
- **Aliases** are common synonyms and regional words that help a search:
  Sahne, Rahm, Obers; Möhre, Karotte; Lauch, Porree; Zwiebel,
  Speisezwiebel.
- A Wikidata name is never overwritten, even where it is poor. Three
  plain words are therefore shared with a Wikidata name on purpose: the
  groups "Milch", "Essig" and "Weizenmehl" (the Wikidata label of the
  whole-grain flour is "Weizenmehl"; eleven milks carry "Milch", three vinegars
  "Essig"). `test/catalogue-german-own.test.ts` lists them.
- The labels of the groups (the tree in the picker, "Spices" and so on) are
  translated the same way: "Gewürze", "Nüsse", "Samen und Kerne".

**How it is merged, and how to rerun it.** `tools/catalogue/own-names.mjs`
holds the merge (pure): it adds the overlay's name to every entry that has
no German name from another source, replaces an earlier own name with the
overlay's current one, never touches a Wikidata name and reports an id the
catalogue does not have. Two places call it:

1. `tools/catalogue/build.mjs` merges the overlay after it has built the
   rows and the Wikidata names, so a regeneration from the USDA data keeps
   the own names.
2. `node tools/catalogue/merge-own-names.mjs` merges the overlay into the
   catalogue file as it is, offline (no USDA data, no network). Run it after
   every edit of the overlay; it is idempotent, and the test compares its
   result with the shipped file.

Order when everything changes: refresh the Wikidata snapshot, run `build.mjs`
(which merges the overlay); the catalogue file is not formatted by
Prettier. When only the overlay changes: edit it, run
`merge-own-names.mjs`, run the tests.

## Food category

USDA's `foodCategory.description` of the SR Legacy JSON (for example "Dairy
and Egg Products", "Spices and Herbs") is written out for every food
row as `x-fdc.category`, as USDA gives it. A generated parent takes it as
`x-group.category` only when every food row below it has the same one
(131 of 140 parents). It is not mapped to shop aisles or anything else.

## Nutrition

Work package 11 ([helper plan](helper-plan.md), [evaluation](nutrition-evaluation.md#what-was-built)).
The generator (`tools/catalogue/nutrition.mjs`) reads the nutrients from the
`foodNutrients` of the same SR Legacy food a row comes from, per 100 g, and
writes them as `x-nutrition.per100g`: `kcal` (FDC nutrient 208), `kJ` (268),
`proteinG` (203), `fatG` (204), `carbohydrateG` (205), `fibreG` (291) and
`sodiumMg` (307). No number is typed or computed. The unit the dataset states is
checked (kcal, kJ, g, mg); a food whose five core nutrients are not all there
in those units gets no `x-nutrition`, and fibre or sodium are left out where the
dataset has none (unknown, not zero). A food row has no `source` of its own: its
`x-fdc.id` and the envelope's `dataset` say where the numbers come from.

A parent takes the nutrition of the food rows below it only when energy,
protein, fat and carbohydrate each agree in all of them: the largest is at most
1.05 times the smallest, or they differ by at most 5 kcal, 20 kJ or 0.5 g (the
display steps of the [rounding](engine-rules.md#nutrition)); fibre and sodium
likewise, each on its own, and only when every row has them. The value is the
median, and the parent's `source` names the rule. Many parents do not agree
(milk holds skimmed, dry and human milk; eggs hold fresh and dried), so a dish
line that names such a parent has no nutrition and is reported as not counted.
36 of 140 parents and all 638 foods carry nutrition.

## What the catalogue does not have

- No baked goods, beverages, soups, sauces, canned, frozen, cooked or
  prepared foods, no cuts of meat beyond a short list, and no brand
  products, apart from the 101 [named foods](#named-foods) (counted on
  2026-11-24; bread, breadcrumbs, canned tomato sauce and paste, seven
  sauces and stocks, five beverages: red and white wine, sake, tap water and
  a distilled spirit of 80 proof; and 29 raw meats and fish among them).
  Meat, poultry, fish and shellfish are only those 29: no game, no duck or
  goose, no offal (beef suet is in the dataset and left out, see the third
  pass), no cured meat except bacon, a US wet-cured ham and US salt pork, no
  air-dried pork (prosciutto), no smoked or salted fish.
- No shelf life, seasons or allergens, no nutrition beyond the seven
  [nutrients](#nutrition) above (no vitamins or minerals), and no roles in the
  file (the app's [role table](data-model.md#roles) adds a few when it reads it); yields only
  where SR28 gives a refuse percentage (174 foods), none for cooked states.
- No density for foods whose only volume portion is a bulk form (chopped,
  sliced, shredded), no unit weight where the source gives several sizes
  or no single piece; many ingredients appear with a density but no unit
  weight and the other way round.
- Weights are those of the food as SR Legacy describes it (mostly the
  edible portion); a medium apple is 182 g without its core, not as
  bought. Leafy greens and herbs have low densities because the source's
  cup is loosely packed.
- English as the canonical language; a German name for every entry, 170 from Wikidata, 12 derived and 598 translated by the project ([German names](#german-names), [own translation](#own-translation)), no other language; US customary portions
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
`buildTree`. `packages/app/test/catalogue-nutrition.test.ts` tests the nutrition rules on synthetic foods, the parents' agreement, that the fixture figures are the dataset's and the shipped file against the schema. `packages/app/test/catalogue-german-own.test.ts` tests the own names (every entry has one, they are marked, the overlay and the file agree, names stay apart, a search for "Zwiebel" finds the onion). `packages/app/test/catalogue-names.test.ts` tests the Wikidata German names: the NDB join,
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
