---
type: Decision Record
title: Licence of the sources of the notes
description: Decided by the owner on 2026-11-19. Culina is non-commercial, a hobby project, so sources under CC BY-NC-SA 4.0 and CC BY-NC 4.0 fit; every source entry of a shipped note carries its licence in the data as an SPDX identifier, so that a later commercial variant could leave out what is non-commercial; that variant is not built now. Facts and amounts are taken, methods written in our own words; not legal advice.
tags: [decision, licences, sources, notes, evidence-levels]
generated: { by: claude-code, at: 2026-11-19 }
---

# Licence of the sources of the notes

**Status:** decided by the owner on 2026-11-19.

## Context

The shipped notes (36 technique notes, 19 handling rules and 9 substitutes, 64 in all) each rest on one or more source entries: the work, the place in it, the page read, the licence, and the one sentence of at most 25 words that the note was written from ([data model](../data-model.md#technique)). The first audit counted 149 source entries. Most are open vocational textbooks on `workforce.libretexts.org`, which carry a Creative Commons licence with a non-commercial clause. The agents who wrote the notes left the question open ([log](../log.md), "Decided by the agent", item 6): whether the non-commercial clause matters for Culina is the owner's call.

## Decision

1. **Culina is non-commercial**, a hobby project. Sources under CC BY-NC-SA 4.0 and CC BY-NC 4.0 fit that, and the current notes stay as they are.
2. **A commercial variant may come later.** It would leave out what is non-commercial. It is not built now, and nothing in the code, the build or the app is prepared for it beyond the next point.
3. **Every source entry carries its licence in the data, as an SPDX identifier.** The field `licence` of a source of a technique note, a handling rule and a substitute holds an identifier such as `CC-BY-NC-SA-4.0`, not free text; the schemas refuse a value with spaces. The field stays optional in the schema (the fictional examples of the test vectors have none); the shipped data is held to it by a test.
4. **Facts and amounts are taken, methods written in our own words**, as the [project rule](../../AGENTS.md) says: an amount, a temperature or a ratio is a fact; the wording of a method is ours; a note quotes at most one sentence of 25 words from its source, for the reviewer, and the note itself is not that sentence.

## What is in the data

The counts of the 149 source entries by licence (`test/source-licences.test.ts` reads this table and fails when the data and the table differ; a new licence is added here and in the test):

| Licence (SPDX identifier) | Entries | Meaning                                       |
| ------------------------- | ------- | --------------------------------------------- |
| `CC-BY-NC-SA-4.0`         | 128     | Attribution, non-commercial, share-alike, 4.0 |
| `CC-BY-4.0`               | 16      | Attribution, 4.0 (open for commercial use)    |
| `CC-BY-NC-4.0`            | 5       | Attribution, non-commercial, 4.0              |

By kind: technique notes 96 entries (88 NC-SA, 3 BY, 5 BY-NC), handling rules 31 (all NC-SA), substitutes 22 (9 NC-SA, 13 BY). 133 entries carry NC, 16 do not.

## What it means for a later commercial variant

- A build for commercial use would drop every source entry whose licence has the `NC` part (identifiers matching `-NC-` or ending in `-NC`), and with it every note that then has no source left, because a note without a source is not shipped ([technique schema](../data-model.md#technique)). Today that is 133 of the 149 entries; the 16 entries under CC-BY-4.0 stay, and what they carry would be the starting point.
- The notes themselves are written in our own words, so what is non-commercial is the source relation, not our text; whether a note written from a non-commercial source may be used commercially is a legal question this record does not answer.
- Share-alike (`SA`) would also need a look in that case. The sources of the classics (old cookbooks, one wiki page) are a separate matter: their `licence` is free text where the source states one, and four French dishes say "rights reserved, to be checked by the owner" ([classic dishes](../classic-dishes.md)). They are not part of the 149 and are not normalised here.
- The ingredient catalogue (USDA, CC0 1.0 Universal), the Wikidata names (CC0) and the own German names (AGPL-3.0-or-later) are not affected.

## Not decided here

- This record is **not legal advice**. If the project ever becomes commercial, the licences are read again by someone who can judge them.
- **Books (since 2026-11-20).** A source that is a printed book is entered with the `isbn` of the edition read and without `url` and `licence`; the test counts these entries apart (`BOOK_ENTRIES` in `test/source-licences.test.ts`, 0 today) and they are not part of the table above. A citation of a fact from a book is not a reuse of the book, so a commercial variant would keep them; that, too, is a judgement and not legal advice.
- Where the two new evidence levels (`tested`, `authority`) bring sources that are copyrighted books or official pages, their licence is entered the same way when the note is written; for a book without an open licence there is none to enter, and the note rests on a quoted sentence only ([source books](../source-books.md)).
