# Brief: own recipes for Culina (writer)

You work in the repository /home/user/domus, app `apps/culina` (a cooking app; read
`apps/culina/AGENTS.md` first). Shipped recipes are JSON dish files in
`apps/culina/packages/app/data/classics/<country>/<id>.json`. You fix some and write some new
ones, as "own recipes": written from general cooking knowledge, the usual modern way, every
amount given, for a stated number of persons.

## Read first

- `apps/culina/docs/classic-format.md`, at least the sections "The rules that hold for every
  file", "A dish file" (all of it, incl. lines, steps), "An own recipe" and "A base".
- Two finished examples in the same folder tree: `mx/pico-de-gallo.json` (a base, course
  sauce) and one file of your own countries that is a dish (`"kind"` absent or `dish`).

## Rules

- `source` is exactly `{ "own": true, "year": 2026 }`; `persons.basis` is `stated`; `settled`
  is `[]`; no `original`, no `sourceNote`, no `wanted` line unless the catalogue truly lacks
  the food (see below).
- Every ingredient line points at the catalogue by `ref: { kind: "ingredient", id }`. Find ids
  with: `node <scratch>/find.mjs <word> [<word>]` (searches English and German names; prints
  whether a piece weight or a density exists). Use `count` only if the row has a piece weight,
  spoons/cups/ml only if it has a density; otherwise grams. Prefer the plain, usual row (for
  example "Onions", not "Onions, sweet"); look at how the example files point at salt, onion,
  garlic, oil, butter, flour, sugar, water and reuse those ids.
- New in the catalogue today (use them, they were missing before): soy sauce, yogurt, Greek
  yogurt, feta, cheddar, olives, avocado, lemon, lime juice, cumin seed, dried oregano,
  cardamom, dried hot chilli, ancho, prepared mustard, ketchup, Worcestershire, brown sugar,
  peanut butter, fish sauce, oyster sauce, hoisin, miso, firm tofu, sake, laver (nori),
  pak-choi, Chinese cabbage, lemon grass, chicken breast skinless boneless, chicken thigh meat
  only, chicken stock, beef stock, vegetable broth, pinto beans, capers, cashews, walnuts,
  raisins, dark chocolate, sweet potato, aubergine, broccoli, fresh dill, chives, sour cream,
  mozzarella, Romano (pecorino romano).
- If a food the dish really needs is still not in the catalogue (after trying synonyms in
  English and German), do NOT substitute something else silently. For a minor thing keep the
  recipe honest and usual with what there is; for an essential one, write the line as the
  format's `wanted` line (see the format doc) and list it in your report under
  "catalogue gaps" with the USDA SR Legacy food name you would expect. Do not edit the
  catalogue or anything under `tools/`.
- Both languages (en, de) for every text; German with real umlauts, natural kitchen German.
  Method in plain imperative steps, each with the kit's `technique` or `action` and `uses`
  as the format demands; times and temperatures where a cook needs them.
- Proportions must be the usual ones a careful home cook would recognise; amounts must add up
  for the persons stated. Do not invent exotic variants.
- `check` stays `{ "method": "second-reader", "note": "second reading pending, to be done by another agent" }`.
  You are not the reader of your own files.
- Touch only the files named in your task (and create only the new ones named). Do not edit
  tests, docs, tools or other countries' files. Do not commit, do not run git commands that
  change anything.

## Validate

From `/home/user/domus/apps/culina`, for every file you changed or created:
`npm run validate:content -- packages/app/data/classics/<country>/<id>.json`
It must pass. Then `npx prettier --write <the files>` (from `apps/culina`).

## Report (your final message, short)

Per file: what you changed or wrote in one line (persons, the main proportions). Then
"catalogue gaps" (may be empty) and anything you are unsure about. No prose beyond that.
