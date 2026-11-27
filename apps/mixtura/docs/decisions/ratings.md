---
type: Decision Record
title: Ratings per person for the drink as a whole
description: A drink gets one rating per person (Favourite, Good, Not for me), kept in the space; a version gets no rating but a preferred mark and a tasting note, not built yet.
tags: [decision, ratings, persons, versions]
generated: { by: claude-code/2.1, at: 2026-11-27 }
---

# Ratings per person for the drink as a whole

## Context

The owner wants to filter drinks by whether they like them, built-in or
their own, without making a version, and to compare versions. Two people
in a household do not like the same drinks.

## Decision

- **One rating per drink and person**: Favourite, Good, Not for me, or
  none, shown as a heart, thumbs up and thumbs down. It belongs to the drink (its lineage), not a version; a built-in
  drink is rated without a copy. Filtering uses only this.
- **Kept in the space**, collection `ratings`, key
  `<person id>/<lineage id>`, so the filter "All of us like it" works.
  Persons are the host's ([persons](../../../../packages/host/docs/persons.md)).
- **Versions**: instead of a rating or better/worse per version, one
  version is marked as the preferred one (shared by the household, the
  household's recipe) and each version can carry a tasting note with its
  author. Not built yet; issues hold it.

## Alternatives

- Rating per version, the drink's rating derived: three levels cannot tell
  two good versions apart, more taps.
- Better/Same/Worse against the previous version: compares neighbours only.
- A finer scale (stars, 1 to 10), or a scale the user sets: not offered
  (owner, 2026-11-27). The filter needs "do I like it", three icons fit
  one row on a phone, and two persons' 7s do not compare, so "All of us
  like it" would mislead. Finer differences go into the tasting note. The
  value \`{ rating }\` could take another scale later without a migration.
- One rating for the household: the last to rate overwrites the other.
- Ratings in each person's own space: the other person's ratings are
  invisible, so no "All of us like it".
