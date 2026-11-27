---
type: Specification
title: Ratings
description: How a drink is rated per person, where ratings are kept, the rating filter and what is tested.
tags: [ratings, persons, spaces, browse]
generated: { by: claude-code/2.1, at: 2026-11-27 }
sources:
  - id: decision
    title: 'Decision: ratings per person'
    url: decisions/ratings.md
  - id: code
    title: src/ratings/, components/rating-card.ts, test/ratings.test.ts
    url: ../packages/app/src/ratings/source.ts
---

# Ratings

What and why: [decision](decisions/ratings.md)[^decision].

## Storage

Collection `ratings` of a space[^code]; key `<person id>/<lineage id>`,
value `{ rating }` with `favourite`, `good` or `not-for-me`; clearing
a rating writes a tombstone. Foreign fields and malformed records are
skipped. The space is picked like an app that shows one space
(`pickSpace`): the first shared space, else the one on this device. The
sync loop of the app also keeps `ratings` and `space` (for the persons)
in step.

## Person

In a space on this device only, the first rating makes the person "Me".
In a shared space the person is the one the Household app says this
device is; until it is chosen, the rating card says so and links to the
space in the Household app, and nothing is written.

## Screens

- Spec screen: card **Your rating** with three round icon chips (heart,
  thumbs up, thumbs down; each with its word as label and tooltip, the
  chosen word beside them); pressing the chosen one again clears it. Hidden while a swap is tried.
- Drinks list: filter group **Rating** (`rating=` in the address):
  Favourite, Good, Not for me, Not rated, All of us like it (at least two
  persons in the space, each rated it Good or Favourite).

## Tested

`test/ratings.test.ts` (records, "all of us"), the rating filter in
`test/browse-filters.test.ts`. Checked once in Chromium at 360 x 720:
rate, then the filter shows the drink. Not tested: two real devices,
the native Linux app (no ratings there yet).
