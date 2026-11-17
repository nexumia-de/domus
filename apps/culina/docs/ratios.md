---
type: Research
title: Ratios and salt percentages checked against sources
description: Each ratio, baker's percentage and salt percentage from How chefs work, checked against a source reachable on 2026-11-17, with unit basis, status (confirmed, corrected, unverified), how the source was read, and the corrections.
tags: [research, ratios, bakers-percentage, salt, fermentation, sources]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: npr
    title: 'NPR: Throw Away The Recipe; Learn The Ratio Instead (2009, feature on Ruhlman: Ratio)'
    url: https://www.npr.org/2009/07/26/107019060/throw-away-the-recipe-learn-the-ratio-instead
  - id: ss
    title: 'Simon & Schuster: Ratio by Michael Ruhlman, book page'
    url: https://www.simonandschuster.com/books/Ratio/Michael-Ruhlman/Ruhlmans-Ratios/9781416571728
  - id: garden
    title: 'Book notes on Ruhlman: Ratio (secondary summary)'
    url: https://digital-garden-eta-vert.vercel.app/Books/Book-Reviews/Mich/Ratio
  - id: cooksinfo
    title: 'CooksInfo: Pound cake'
    url: https://www.cooksinfo.com/dishes/desserts/cakes/pound-cake/
  - id: knroux
    title: 'Kitchen Numbers: Roux'
    url: https://kitchennmbrs.app/en/product-knowledge/technieken/roux
  - id: parisi
    title: 'Billy Parisi: How to make roux'
    url: https://billyparisi.com/how-to-make-roux
  - id: kasalt
    title: 'King Arthur Baking, professional reference: Salt'
    url: https://www.kingarthurbaking.com/pro/reference/salt
  - id: kaciabatta
    title: 'King Arthur Baking, professional formula: Ciabatta'
    url: https://KingArthurFlour.com/pro/formulas/ciabatta
  - id: tsg
    title: 'Commission Regulation (EU) No 97/2010, Pizza Napoletana (TSG), product specification'
    url: https://eur-lex.europa.eu/eli/reg/2010/97/oj
  - id: fda
    title: 'FDA: CPG Sec. 585.750 Sauerkraut; Definition; Adulteration with Thrips (revised 2005-11-29)'
    url: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cpg-sec-585750-sauerkraut-definition-adulteration-thrips
  - id: zabat
    title: 'Zabat et al.: Microbial Community Analysis of Sauerkraut Fermentation, Foods 7(5):77 (2018), CC BY 4.0'
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC5977097/
  - id: nchfpkraut
    title: 'NCHFP: Sauerkraut'
    url: https://nchfp.uga.edu/how/ferment/sauerkraut/
  - id: nchfpdill
    title: 'NCHFP: Dill pickles (fermented)'
    url: https://nchfp.uga.edu/how/ferment/recipes/dill-pickles/
  - id: nchfpgen
    title: 'NCHFP: General information on fermenting'
    url: https://nchfp.uga.edu/how/ferment/general-information-on-fermenting/general-information-on-fermenting/
  - id: zhang
    title: 'Zhang et al.: Enhancing saltiness perception in bone broth, J Sci Food Agric 104(10):6108-6117 (2024), PMID 38445510'
    url: https://pubmed.ncbi.nlm.nih.gov/38445510/
  - id: rial
    title: 'Revista do Instituto Adolfo Lutz: soups with salt substitutes, 0 to 0.60 % NaCl (article PDF)'
    url: https://periodicoshomolog.saude.sp.gov.br/index.php/RIAL/article/download/33342/32174
  - id: atk
    title: "America's Test Kitchen: A Better Brine?"
    url: https://www.americastestkitchen.com/how_tos/6428-a-better-brine
  - id: pastawater
    title: 'The Spokesman-Review: How to salt pasta water (reports Serious Eats tests via the Washington Post)'
    url: https://spokesman.com/stories/2023/may/10/how-to-salt-pasta-water-its-as-much-art-as-science
  - id: pastastudy
    title: 'Press report on a Food Hydrocolloids (2026) study of salt in pasta cooking water'
    url: https://interaksyon.philstar.com/?p=304723
  - id: allergens
    title: 'Regulation (EU) No 1169/2011, Annex II (UK retained copy on legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2011/1169/annex/II
---

# Ratios and salt percentages checked against sources

Check of every number in [How chefs work](chef-practice.md) (issue #5).
The check ran on 2026-11-17 in a cloud session whose network blocked
most cooking sites, King Arthur Baking, USDA FSIS, schema.org,
Wikipedia, the Internet Archive, Google Books and EUR-Lex
([hosts](development.md)). Books (Ruhlman's _Ratio_, McGee's _On Food
and Cooking_) were not at hand; no page number is quoted.

## How to read the tables

- **Basis**: _parts by weight_ (ratio of masses), _baker's %_ (mass per
  100 mass of flour), _% of food_ (salt mass per 100 mass of the salted
  food), _% of brine_ (salt mass per 100 mass of salt plus water),
  _% of water_.
- **Read**: _page_: the page itself was read in this session.
  _excerpt_: only a search engine's excerpt of the page was seen,
  because the host is blocked; the value must be re-read at the page
  before it becomes seed data.
- **Status**: _confirmed_ (the source gives the same value), _corrected_
  (the source gives another value or a range; the corrected value is
  shown), _unverified_ (no reachable source, or sources contradict each
  other without a way to decide).

Where sources disagree the table keeps a range. Food-safety numbers are
taken only from an authority (FDA, USDA, NCHFP); anything else is
unverified.

# Ratios by weight

| Family       | Value in chef-practice               | Basis           | Status                                       | Read    | Source                                                                                                     | Note                                                                        |
| ------------ | ------------------------------------ | --------------- | -------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Bread dough  | 5 flour : 3 water                    | parts by weight | confirmed                                    | excerpt | Ruhlman via NPR[^npr]                                                                                      | Yeast and salt come on top of the ratio                                     |
| Pasta dough  | 3 flour : 2 egg                      | parts by weight | confirmed                                    | excerpt | Ruhlman via NPR[^npr]                                                                                      | Egg weighed, not counted                                                    |
| Pie dough    | 3 flour : 2 fat : 1 water            | parts by weight | confirmed                                    | excerpt | Ruhlman via NPR[^npr]                                                                                      | "3-2-1 dough"                                                               |
| Cookie dough | 3 flour : 2 fat : 1 sugar            | parts by weight | confirmed                                    | excerpt | Ruhlman, book page and NPR[^ss][^npr]                                                                      | Written 1 sugar : 2 fat : 3 flour                                           |
| Pound cake   | 1 flour : 1 butter : 1 sugar : 1 egg | parts by weight | confirmed                                    | excerpt | CooksInfo[^cooksinfo]                                                                                      | Equal weights; not checked as Ruhlman's own figure                          |
| Vinaigrette  | 3 oil : 1 acid                       | parts by weight | confirmed                                    | excerpt | Ruhlman, book page and NPR[^ss][^npr]                                                                      |                                                                             |
| Roux         | 1 flour : 1 fat                      | parts by weight | **corrected** to 1 : 1 – 3 : 2 (flour : fat) | excerpt | 1 : 1 Kitchen Numbers[^knroux]; 3 : 2 given as Ruhlman's in a book summary[^garden] and by Parisi[^parisi] | chef-practice attributed 1 : 1 to Ruhlman; his figure as reported is 3 : 2  |
| Custard      | 2 liquid : 1 egg                     | parts by weight | unverified                                   | excerpt | Book summary[^garden] gives 2 : 1                                                                          | Another excerpt (Food Network) gave the inverse; the book could not be read |

Also found, not in chef-practice: biscuit dough 3 flour : 1 fat : 2
liquid (Ruhlman, excerpt[^ss][^npr]).

# Baker's percentages

| Item               | Value in chef-practice | Basis     | Status                                                                          | Read    | Source                                 | Note                                                                                         |
| ------------------ | ---------------------- | --------- | ------------------------------------------------------------------------------- | ------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| Pizza hydration    | 60–65 %                | baker's % | **corrected**: Neapolitan (TSG) about 56 %; 60–65 % for other styles unverified | excerpt | Reg. (EU) 97/2010[^tsg]                | 1 l water to 1.8 kg flour, flour added "until the desired consistency": 1000 / 1800 = 55.6 % |
| Pizza salt (new)   | –                      | baker's % | added: about 2.8–3.1 % (Neapolitan)                                             | excerpt | Reg. (EU) 97/2010[^tsg]                | 50–55 g salt per 1.8 kg flour: 50 / 1800 = 2.78 %, 55 / 1800 = 3.06 %                        |
| Ciabatta hydration | 75–85 %                | baker's % | confirmed                                                                       | excerpt | King Arthur formula, 76 %[^kaciabatta] | One professional formula inside the range; the range itself is from secondary sites          |
| Bread salt         | about 2 %              | baker's % | confirmed, range 1.8–2 %                                                        | excerpt | King Arthur[^kasalt]                   |                                                                                              |

# Salt percentages

| Use                   | Value in chef-practice | Basis               | Status                                                        | Read                         | Source                                                                 | Note                                                                                                                                                                                         |
| --------------------- | ---------------------- | ------------------- | ------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soups and sauces      | 0.8–1.2 %              | % of food           | **corrected** for soups to about 0.4–0.5 %; sauces unverified | page (Zhang), excerpt (RIAL) | Zhang 2024[^zhang]; RIAL[^rial]                                        | Bone broth: 0.36 % NaCl was "a 20 % decrease", so the control was 0.36 / 0.8 = 0.45 %. Soups at 0.40 and 0.50 % NaCl scored highest in a test of 0–0.60 %. No source for 0.8–1.2 % was found |
| Bread                 | 2 %                    | baker's %           | confirmed, 1.8–2 %                                            | excerpt                      | King Arthur[^kasalt]                                                   | Same figure as above                                                                                                                                                                         |
| Ferments (sauerkraut) | 2–2.5 %                | % of food (cabbage) | **corrected** to 2–3 %                                        | page                         | FDA CPG 585.750[^fda]; 2.25 % used in a study[^zabat]                  | Food safety: from an authority. NCHFP gives volumes only (3 tbsp canning salt per 5 lb cabbage[^nchfpkraut]) and warns not to cut the salt[^nchfpgen]                                        |
| Wet brine (meat)      | 5–6 %                  | % of brine          | **corrected** to 5–9 %                                        | excerpt                      | America's Test Kitchen[^atk]                                           | Most moisture taken up at about 6 %; tasters preferred 9 % for flavour. Not a safety number                                                                                                  |
| Pasta water           | 1–2 %                  | % of water          | **corrected** to 0.5–2 %                                      | excerpt                      | Serious Eats tests as reported[^pastawater]; a 2026 study[^pastastudy] | Tests found 0.5–2 % acceptable; the study found 7 g/l (0.7 %) kept the pasta structure best                                                                                                  |

## Fermentation safety data from NCHFP (added)

| Item                    | Value                                                                                                                                    | Status                                       | Read | Source             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---- | ------------------ |
| Sauerkraut, salt        | 3 tbsp canning or pickling salt per 5 lb cabbage; brine top-up 1½ tbsp per quart water                                                   | confirmed (volumes, not converted to weight) | page | NCHFP[^nchfpkraut] |
| Sauerkraut, temperature | 70–75 °F, 3–4 weeks; 60–65 °F, 5–6 weeks; below 60 °F may not ferment; above 75 °F may soften                                            | confirmed                                    | page | NCHFP[^nchfpkraut] |
| Fermented dill pickles  | Per gallon: 4 lb cucumbers, ½ cup salt, ¼ cup 5 % vinegar, 8 cups water; 70–75 °F for 3–4 weeks, 55–65 °F for 5–6 weeks, not above 80 °F | confirmed (volumes)                          | page | NCHFP[^nchfpdill]  |
| Salt type               | Canning or pickling salt; flake salt varies in density and is not recommended                                                            | confirmed                                    | page | NCHFP[^nchfpgen]   |

The volumes are not turned into grams here: no reachable authority gave
the mass of a tablespoon of canning salt. Culina shows these recipes in
the units NCHFP uses.

# Other numbers

| Item                           | Value         | Status    | Read    | Source                          |
| ------------------------------ | ------------- | --------- | ------- | ------------------------------- |
| Allergens to declare in the EU | 14 (Annex II) | confirmed | excerpt | Reg. (EU) 1169/2011[^allergens] |

# Tally

17 numbers from chef-practice: 10 confirmed, 6 corrected, 1 unverified.
Only the corrections of the sauerkraut range (FDA) and the soup salt
(Zhang) rest on pages read in this session; all other confirmations and
corrections rest on search excerpts and must be re-read at the source
before they become seed data. The NCHFP rows are new and read from the
pages.

# Licences

The tables hold single numbers with attribution, not copied text. Of
the sources only Zabat et al. states a licence on the page read (CC BY
4.0[^zabat]); the licences of the other pages were not checked and are
recorded as unknown. Before a number becomes seed data, its entry names
the source and that source's licence or terms.

# Before this becomes data

1. Re-read every _excerpt_ row at its page when the host is reachable
   (King Arthur, EUR-Lex, America's Test Kitchen, NPR, Simon & Schuster)
   or in the book (_Ratio_: roux, custard, pound cake with page).
2. Find a source for the salt of sauces, or leave it out.
3. Each seed ratio carries its source and licence; a number is a range
   shown against the template, never a verdict.
