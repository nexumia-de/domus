# Brief: second reading of own recipes for Culina (reader)

You work in /home/user/domus, app `apps/culina` (a cooking app; read `apps/culina/AGENTS.md`
first). Shipped recipes are JSON dish files in
`apps/culina/packages/app/data/classics/<country>/<id>.json`. The "own recipes" (those with
`"source": { "own": true, "year": 2026 }`) were written by another AI agent from general
cooking knowledge. Nobody cooked them. You are the second reader: the rule of the project is
that each is read once more by an agent that did not write it. Read them as an experienced,
sceptical cook and editor would; your reading is the only check they get before they ship.

Read `apps/culina/docs/classic-format.md` sections "A dish file", "An own recipe", "A base".

## For each file named in your task

Read the whole file and check, and FIX in the file what is wrong:

1. **Proportions**: are the amounts the usual ones for the persons stated (salt, liquid to
   starch, fat, acid, spices, leavening)? Work them out: salt in % of the total, water to rice,
   hydration of a dough, a sensible portion per person (roughly 100-200 g of meat or fish,
   60-100 g dry rice or pasta, 150-300 g vegetables as a side). Anything a cook would call a
   mistake is corrected to the usual value.
2. **Times, temperatures, order**: steps in an order that works, every ingredient line used
   in some step (`uses`), nothing used that has no line, times and heat a cook can follow,
   food-safe (chicken cooked through, dried beans boiled, and so on).
3. **The right ingredient**: each `ref` id is the food meant. Look ids up with
   `node <scratch>/find.mjs <word>` (prints id, English and German name, whether a
   piece weight or density exists). Some files were first written when the catalogue lacked
   foods (soy sauce, cumin, oregano, yogurt, skinless chicken, pecorino and others; they
   exist now) and used stand-ins or left things out: if a stand-in or a telltale note is still
   there and the right food is now in the catalogue, put the usual ingredient in. A unit must
   fit the row: `count` only with a piece weight, spoons/cups/ml only with a density.
4. **Both languages**: German and English say the same; natural kitchen German with umlauts;
   `originalName` is the usual name in the cuisine's language in Latin letters; names fit.
5. **Honesty**: the recipe is the usual modern way, no exotic variant; a note that claims
   more than the recipe is ("authentic", "the original") goes.

Then set `check` to:
`{ "method": "second-reader", "note": "<one or two English sentences: that a second agent session read the recipe for proportions, times and order on 2026-11-24, and what it changed, or that it changed nothing>" }`
(look at whether the format wants `note` as plain text or as en/de; keep the shape the file has.)

## Rules

- Touch only the files named in your task. Do not edit tests, docs, tools, the catalogue or
  other files. No git commands that change anything.
- Do not rewrite a recipe that is fine. Change what is wrong and say what you changed.
- After editing, from `/home/user/domus/apps/culina`:
  `npm run validate:content -- packages/app/data/classics/<country>/<id>.json` must pass for
  each file, then `npx prettier --write <the files>`.

## Report (final message, short)

A table: file | verdict (unchanged / changed) | what you changed and why (one line). Then:
anything you doubt but did not change, and foods a recipe needs that the catalogue lacks.
