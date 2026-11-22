---
type: Plan
title: Helper build plan
description: How Culina is rebuilt from a notebook into a helper that teaches in four stages; the owner's answers of 2026-11-18, the data that is added, the work packages with their order, who does each (which model), the checks, and when the work ends. Written to be carried out without the owner.
tags: [plan, helper, classics, techniques, delegation]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
---

# Goal and end

Culina leads a learner to what a chef needs
([decision](decisions/mentor.md)). **The work ends when the classics of
Germany, Italy, France and Spain are in the app with their techniques
described, and a dish can be cooked from the app step by step**, in
English and German, at 360 × 720 and at desktop size. The extras below
follow only after that.

**State (2026-11-19):** carried out; what is done, what is not and what
the agent decided is at the top of the [log](log.md).

# The owner's answers (2026-11-18)

| Question              | Answer                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Sources of dishes     | Old public-domain books, institutions, and one good modern recipe per dish; "no scraping" is obsolete   |
| Language of content   | English (canonical) and German for every dish, step and note                                            |
| Cooking view          | Step by step, one step on the screen; the whole recipe one tap away                                     |
| Dishes per country    | 12                                                                                                      |
| Exclusions            | Nothing excluded; mostly vegetarian. Read as: at least 7 of 12 per country without meat and fish        |
| Default portions      | 2                                                                                                       |
| Extras after the core | Handling rules, substitutes with effect, nutrition per portion                                          |
| Emptio                | Not in this work                                                                                        |
| Knowledge             | Every statement from a source read in the session, in our own words; nothing from a model's memory      |
| Merging               | Without CI while the account has no Actions minutes, on local checks ([development](development.md#ci)) |

# Stages of the app

1. **Follow**: pick a classic, cook it step by step, notes on new
   techniques.
2. **Understand**: the dish shows its components and ratio; substitutes.
3. **Vary**: change, taste, correct, keep a version.
4. **Free**: ratios, components, what is there (built).

Rules against overload: the user moves per dish and per skill and the
app only proposes; one thing on the screen at a time; a note is one or
two sentences with reason and source behind a tap; the start screen
asks what to cook, and the chef tools sit behind it.

# Data that is added

Defaults for the one who builds it; a better shape may be chosen and is
then recorded in [data model](data-model.md) with the reason.

- **Technique** (shipped, read-only, beside `templates.json`): `id`,
  `name`, `watch` (the short note), `why`, `level` (`studied`,
  `textbook`, `tradition`; since 2026-11-19 also `tested` and `authority`, see [data model](data-model.md#evidence-levels)), `sources` (title, place, url, licence where
  one is stated). Texts are `{ en, de }`.
- **Steps** on a component: ordered objects with `text { en, de }`,
  optional `technique`, the lines the step uses, optional time and
  temperature as given by the source. `method` (text) stays valid.
- **Classic**: a dish and its components in the existing shapes, shipped
  read-only and never written to the store. Added: `country`,
  `vegetarian`, `source` (author, title, year, place, url), the amounts
  **as the source gives them** (unit, number of persons) and a list of
  what was settled where the source is vague. Amounts for 2 portions are
  derived by the engine (units, scaling), not typed in. Cooking a
  classic copies it into the notebook as version 1 with its origin.
- **Skill state** (stored, personal, sync record like every row): the
  technique id and `learned`. Nothing else is stored; what is shown
  follows from it.
- **Handling rule**: target ingredient or group, text, optional
  technique, level, sources. **Substitute effect**: from, to, optional
  factor, what changes, level, sources. Both extend what the catalogue
  and the finder have.
- **Nutrition**: energy, protein, fat, carbohydrate, fibre and salt per
  100 g from the USDA data the catalogue is generated from
  ([evaluation](nutrition-evaluation.md)); per portion computed by the
  engine and shown rounded with its coverage, never as a verdict. The
  reference for a portion's size per course comes from a source.

# Rules for content

- A recipe follows **one** named source. Amounts and ingredients are
  facts taken from it; the method is written in our own words; no text,
  image or layout is copied. From one modern site at most three dishes
  (a judgement, to stay clear of taking a substantial part of a
  collection). Each dish is read by hand; no crawler.
- A technique note, handling rule or substitute effect names what was
  read. No source found: it ships as `tradition` if kitchens' sources
  state it, otherwise it is left out. A model's memory is never a
  source; whoever writes a statement returns the sentence it rests on
  (at most 25 words) and the URL, for the review.
- Old scans are machine-read: every number is checked a second time by
  someone who did not transcribe it, against the page image where one
  can be opened, otherwise against a second edition or scan; the dish
  records which check it had.
- Wording never judges a dish (the test over every `strings*.ts`
  stays, and covers the new texts).

# Work packages

Order matters where a package names one before it. "Small" is the
cheapest model, "mid" the middle one; the lead reviews and merges.

| No. | Package                                                                                                                            | After | Who                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| 1   | Issues: one epic for goal 5 with a sub-issue per package below                                                                     |       | lead                                |
| 2   | Format: schemas, validators, engine functions and vectors for technique, steps, classic, skill state; docs                         | 1     | mid                                 |
| 3   | Pilot: one German dish without meat from Davidis through the whole chain, source to data, with its techniques                      | 2     | small transcribes, small checks     |
| 4   | Screens: start screen, classics by country, dish view, step-by-step view with fading notes, marking a skill, settings; e2e         | 2     | mid                                 |
| 5   | Selection: 12 dishes per country, 7 or more without meat and fish, covering the country's core techniques, each with a source      | 1     | small, one per country, in parallel |
| 6   | Transcription per country in the pilot's format, each dish checked by a second agent                                               | 3, 5  | small, one per country, in parallel |
| 7   | Techniques: the set used by the steps; note, reason, level and sources for each, English and German                                | 6     | mid writes, lead reviews each       |
| 8   | Finder and catalogue: classics in "What can I cook", filter by country, missing ingredients added to the generator, the role table | 4, 6  | mid                                 |
| 9   | Extra: handling rules for the ingredients of the shipped dishes                                                                    | 7     | mid                                 |
| 10  | Extra: substitutes with their effect                                                                                               | 7     | mid                                 |
| 11  | Extra: nutrition per ingredient and per portion, the sourced portion reference                                                     | 6     | mid                                 |
| 12  | German texts of the app (issue 74), as far as the new screens need them                                                            | 4     | small                               |
| 13  | Close: full check, e2e, screenshots, docs, the state and the open points for the owner at the top of [log](log.md)                 | all   | lead                                |

Packages 3 and 4, the four agents of 5, and the four of 6 run in
parallel, one git worktree each. The pilot is reviewed by the lead
before package 6 starts: a wrong format copied into 48 dishes is the
dearest mistake of this plan.

# Checks

- Per package: the narrowest test while working; before a merge
  `npm run check`, and for a change to the app
  `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`, on
  the branch with main merged in.
- Per dish: schema valid; every line matched to a catalogue
  ingredient; every step that names a technique names one that exists;
  the second check recorded.
- Per technique: the lead reads the returned sentence and URL; a note
  that says more than its source is cut back.
- Three dishes per country are read by the lead against the source.

# Sources known to open

[Classic dishes by country](classic-dishes.md) lists the cookbooks and
the hosts. For techniques: the open cook textbooks on
`workforce.libretexts.org` (licence read per book before use), papers
on `pmc.ncbi.nlm.nih.gov`, USDA and NCHFP. `opentextbc.ca` and
`europepmc.org` answer with a bot check that is not worked around.

# What the owner does afterwards

Cooks, and says what was wrong or missing. Until the Actions minutes
return, the live site is not updated by a merge.
