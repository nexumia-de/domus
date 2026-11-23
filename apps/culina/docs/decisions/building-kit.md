---
type: Decision Record
title: Open the app and find what to cook, from a building kit
description: Decided by the owner on 2026-11-23. Culina is opened to find quickly what one wants to cook or can cook; a dish is put together from a building kit (bases, components, ingredients), and a recipe is a notebook entry of what was put together; the two problems it answers are having no idea and not knowing what goes together, so ingredients are to get taste profiles from which the app says what a dish still needs and what fits; skills stay so that abilities can be learned. Sharpens the purpose of the recipe app decision; what it leaves open is listed for the owner.
tags: [decision, scope, purpose, building-kit, taste, skills]
generated: { by: claude-code, at: 2026-11-23 }
sources:
  - '[^owner]: the owner in the session of 2026-11-23, in German, translated here'
---

# Open the app and find what to cook, from a building kit

**Status: decided by the owner on 2026-11-23.** The points under
"Decision" are the owner's words read closely; what the agent concluded
from them is under "What follows" and marked as the agent's; what nobody
decided is under "Open, for the owner".

## Context

Culina's purpose changed three times in a week: a notebook for
experienced cooks (2026-11-16, [how chefs work](../chef-practice.md)), a
helper that teaches until it is no longer needed (2026-11-18,
[helper](mentor.md)), a recipe app with history, ideas and bases
(2026-11-22, [recipe app](scope-recipe-app.md)). The documents followed
only in part, so the README, the roadmap and the decisions named
different purposes side by side. Asked on 2026-11-23 to sharpen the goal
so that every document can say the same, the owner answered:

> The goal is that I open the app and can quickly find out what I want
> to cook or can cook. That means we want to put something together from
> a building kit, and recipes themselves are then rather notebook
> entries. My problem is, for one, that I have no ideas, and for the
> other, that I do not know what goes together and what does not. So we
> probably want to give our ingredients taste profiles too, and then one
> can find what still has to go in or what fits. The skills are there so
> that one can learn abilities.[^owner]

## Decision

1. **Purpose.** The user opens the app and finds quickly what they want
   to cook or can cook. Culina is measured by that: how fast the open
   app leads to a dish the user then cooks.
2. **Two problems it answers.** Having no idea what to cook, and not
   knowing what goes together and what does not.
3. **A building kit.** A dish is put together from parts: a base or
   frame, components that fill its slots, ingredients. The kit is the
   way to an idea; a finished recipe is not what the app is built
   around.
4. **Recipes are notebook entries.** What the user put together and
   cooked is kept in the notebook, with its versions and tasting notes.
   A recipe is the record of a dish that was built, not the unit the
   app offers first.
5. **Taste profiles on ingredients** (the owner: "probably"). Ingredients
   get a taste profile, and from the profiles of what is in a dish the
   app says what the dish still needs and what fits it.
6. **Skills are for learning.** The skills with their sourced notes stay
   so that the user can learn abilities. Marking a skill as learned
   stays.

## What follows (agent)

Each is the agent's reading, for the owner's review.

- **This sharpens the [recipe app decision](scope-recipe-app.md), it
  does not undo it.** Its bases (point 2 there), the import of the
  user's own recipes (point 4) and teaching as help (point 5) stand. Its
  purpose (point 1, "the user's recipe app") is replaced by point 1
  here: the notebook is where a built dish is kept, no longer what the
  app is.
- **What exists and serves the purpose**: the one Cook screen with the
  one filter, "Only with what I have" and "Use up first"
  ([cook screen](cook-screen.md)); slots filled by components, Swap and
  the random pick ([one dish list](one-dish-list.md)); the characters
  computed from a dish ([dish characters](../dish-characters.md));
  versions and tasting notes; the technique notes, handling rules and
  substitutes with learned skills.
- **What is missing for it**: the frames the kit is meant to have
  (tacos, burrito, pizza, bowl, curry) do not exist; none of the 17
  bases has an alternative ([bases and the pack](bases-and-pack.md));
  the catalogue has no taste data ([plan](../feel-like-plan.md), item 5);
  affinities have a schema and neither data nor code
  ([data model](../data-model.md)).
- **Taste profiles move from "Later" to a goal of their own** in the
  [roadmap](../roadmap.md), before the sync of the library. They cover
  what three closed issues of the old repository asked for separately:
  the correction checklist ("tastes flat, try acid"), suggestions from a
  tasting check, and curated affinities ("goes with").
- **The order in the app follows the purpose**: finding and building
  first (Cook), the record second (Notebook). Nothing is rebuilt by this
  record; it names the direction for the next changes.

## Answered by the owner on 2026-11-23

Asked the open points one by one in a later session of the same day,
the owner chose[^answers]:

1. **A frame is the project's own composition.** A frame such as tacos
   or a bowl says that the project put it together; each component in it
   keeps its own named source. The rule "one source" stands for a base
   and its alternatives ([bases and the pack](bases-and-pack.md),
   point 4), not for a frame.
2. **The classics that are no base are taken apart into components**
   for the kit. What cannot be taken apart goes to the optional pack
   (agent: the owner chose the option worded so; which of the 31 dishes
   falls on which side is not yet worked out).
3. **The notebook keeps when a dish was cooked, and no more.** The date
   only; no food diary, which stays not planned. The owner asked whether
   a diary could be had by taking in
   github.com/TheMorpheus407/morphhealth-benchmark; read on the same
   day, that repository holds twelve Flutter apps for Android built by
   language models to one specification (a food diary on Open Food
   Facts, a cycle tracker, weight, symptoms), no module a TypeScript app
   could use. Told so, the owner chose the date only.
4. **The visible name is Cook's Workbench.** See the
   [app name](app-name.md) record.

## Open, for the owner

1. **Where taste profiles come from.** The rules say every pairing and
   data set names its source and licence, nothing is written from
   memory, and FlavorDB is excluded (`AGENTS.md`). No data set with a
   usable licence has been found for taste effects
   ([plan](../feel-like-plan.md), item 5), and the correction rules wait
   for Nosrat's book, which no session can read
   ([owner's list](../../../../docs/owner-checks.md)). The choices: a
   table filled by the project with each row marked as a judgement (as
   the character table is), a table read from books the owner supplies,
   or waiting for a source. Until this is chosen, point 5 cannot be
   built under the rules.

   The owner asked on 2026-11-23 why not FlavorDB, and whether the
   licence could be changed or split, since the apps are not meant to be
   commercialised, "except perhaps a Play Store app that costs
   once"[^answers]. The agent's answer, a judgement and no legal advice:
   FlavorDB is CC BY-NC-SA 3.0 ([existing tools](../existing-tools.md)).
   Changing Culina's licence does not help, since the data would have to
   stay NC-SA; a split (code AGPL, the data as a separate file under
   NC-SA) is possible, but a paid store app is the commercial use that
   licence forbids, FlavorDB offers a download per molecule only, and
   its data says which ingredients share aroma molecules, not what a
   dish lacks. The agent recommends the project's own table of basic
   tastes. **Not decided.**

## Consequences

- `AGENTS.md` and the README of Culina, the root README and `AGENTS.md`,
  the [roadmap](../roadmap.md) and the [index](../index.md) state this
  purpose. The [recipe app](scope-recipe-app.md) and
  [helper](mentor.md) records carry a dated note.
- Not changed by this record, and still worded for an earlier purpose:
  the texts inside the app (the manifest's description, the summary and
  release notes of the Linux metainfo). They are product texts with
  tests and translations and change with the first build under this
  record.

[^answers]: the owner in a session of 2026-11-23, answering questions put in German; translated here.
