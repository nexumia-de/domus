---
type: Decision Record
title: The daily flow, without an inventory
description: Decided by the owner on 2026-11-28. Culina is the daily driver of a cook who wants to get better and more varied and has ingredients without knowing what goes together. One flow - today's ideas without input (proven, new but close, in season), "I have" and "Cooking now" with what fits and what it can become, one learning point per dish, a ten-second verdict after cooking. No inventory is kept except the staples, set up once; dated stock and "Use up first" leave the daily flow. Work items are issues 19 to 23, 25 and 38 to 43 under tracking issue 26.
tags: [decision, purpose, daily-flow, stock, staples, inspiration, learning, repertoire]
generated: { by: openhands, at: 2026-11-28 }
sources:
  - '[^owner]: the owner in the session of 2026-11-28, in German, translated here'
---

# The daily flow, without an inventory

**Status: decided by the owner on 2026-11-28.** It builds on the
[building kit](building-kit.md) (open the app and find quickly what to
cook) and the [daily helper](daily-helper.md) (inspiration and what
fits); neither is undone. What the owner said is under "Decision"; what
the agent concluded is under "What follows" and marked as the agent's.

## Context

Asked what Culina is for, the agent summed up the building kit record.
The owner asked whether that is sensible and how cooks find ideas. The
agent answered that cooks start from an ingredient, a repertoire varied
one element at a time, structures, pairings known from experience, and
a craving or occasion; that a building kit answers "what goes together"
better than "I have no idea"; and that computed taste profiles rest on
weak ground. The owner then said what they want:

> But it is boring to always cook from the same repertoire; how does
> one widen it?[^owner]

> What would be best as a daily driver? I mean, I want to get better at
> cooking and more varied. I also have ingredients but don't know
> whether they go together, and so on.[^owner]

The agent proposed a daily flow with an idea slot "uses what must go
first". The owner:

> I think the "what must go" is crap, because then you have to keep an
> inventory after all.[^owner]

> Good, so no inventory to keep, except maybe what you always have,
> spices, flour, sugar and so on?[^owner]

The agent wrote the flow below, with staples set up once; the owner
agreed ("Ok, fine") and asked for the documents and the issues to follow
it.[^owner]

## Decision

1. **Purpose.** Culina is the daily driver of a cook who wants to **get
   better at cooking and more varied**, and who has ingredients without
   knowing whether they go together. The purpose of the
   [building kit](building-kit.md) (open the app and find quickly what
   to cook) stands inside it.
2. **One daily flow.**
   1. **Today**: three ideas when the app opens, without any input:
      **proven** (a favourite or a dish that went well, not cooked for a
      long time), **new, but close** (a dish never cooked that is like
      one the cook knows: the same technique, frame or base with one
      thing changed), **in season**.
   2. **I have … / Cooking now**: tick what is at hand or in the pan;
      the app says what fits (bands, [daily helper](daily-helper.md)),
      when to add it, what it still needs, and **what dish it can
      become** (a frame or dish that uses the ticked ingredients).
   3. **One learning point per dish**, practised while cooking; once it
      sits it is marked as learned and not taught again.
   4. **After cooking**: ten seconds, good / okay / not for me and an
      optional line; it feeds today's ideas.
3. **No inventory to keep.** No idea and no screen of the daily flow
   asks for stock with amounts or dates. What is ticked in "I have …"
   is never written to the stock.
4. **Staples are the one stock kept**: what is always there (spices,
   flour, sugar, oil …), set up once from a preselected list, assumed
   there afterwards; touched only when something is gone, which puts it
   on the shopping list.
5. **The building kit stays**, as the way to vary a dish rather than as
   the first thing the app offers.

## What follows (agent)

Each is the agent's reading, for the owner's review.

- **Dated stock and "Use up first" leave the daily flow.** They stay as
  built ([behaviour](../behaviour.md#stock)) and are not developed
  further; the stock screen leads with the staples. Today's ideas as
  first planned (issue 23 under the daily helper: "uses what must go
  first") are changed accordingly.
- **Staples build on the flag `always`** the stock item already has
  ([data model](../data-model.md#stock-item)); the two staples of
  2026-11-21 (salt, pepper) become a preselected list. "It's gone" puts
  the staple on the shopping list through the existing hand-over, and a
  bought entry brings it back, through the shared collections only.
- **Shipped dishes keep the day they were cooked.** "New for me" needs
  to know what was cooked; this answers the owner question left open on
  2026-11-24 ([data model](../data-model.md#date-a-dish-was-cooked)).
  Still one day per dish and no history; the verdict is one record per
  dish, the latest only. No food diary ([AGENTS.md](../../AGENTS.md)).
- **The season table is written by an AI model**, read by a second
  agent and marked as the app's judgement, as the stage and taste-effect
  tables are ([daily helper](daily-helper.md), point 2 and 3), for one
  region (Germany, central Europe) and without a region setting. A
  measured or official source may replace rows later. This lifts "waits
  for a source" of the [plan](../feel-like-plan.md), item 6.
- **Taste profiles computed from shared flavour compounds** are not the
  way to "what goes together" on their own: the bands of the daily
  helper stay, and "what it still needs" comes from the marked
  taste-effect table, as decided on 2026-11-27.
- **The learning point is the first technique of a dish's steps that is
  not learned**, so it needs no new data; dishes whose steps name no
  technique get none.

## Consequences

- Work items under the tracking issue
  [26](https://github.com/nexumia-de/domus/issues/26), in lanes that
  agents can take at the same time: what fits
  ([19](https://github.com/nexumia-de/domus/issues/19),
  [20](https://github.com/nexumia-de/domus/issues/20),
  [21](https://github.com/nexumia-de/domus/issues/21),
  [22](https://github.com/nexumia-de/domus/issues/22),
  [38](https://github.com/nexumia-de/domus/issues/38) what it can
  become); today
  ([23](https://github.com/nexumia-de/domus/issues/23) today's ideas,
  [41](https://github.com/nexumia-de/domus/issues/41) season);
  learning ([42](https://github.com/nexumia-de/domus/issues/42));
  after cooking ([43](https://github.com/nexumia-de/domus/issues/43));
  staples ([39](https://github.com/nexumia-de/domus/issues/39),
  [40](https://github.com/nexumia-de/domus/issues/40)); the native app
  last ([25](https://github.com/nexumia-de/domus/issues/25)).
- The rules stand: no language model in the running app, help sourced
  or marked as a judgement, own local data, no meal plans, no food
  diary, no shopping list inside Culina.
- Not verified by anyone: that this flow makes a cook better or more
  varied; no cook has used it.
