---
type: Specification
title: Persons of a space
description: Who is in a household and which person a device is - records of the collection space, the device's choice on the stored space, and what apps keep per person.
tags: [spaces, persons, ratings]
generated: { by: claude-code/2.1, at: 2026-11-27 }
sources:
  - id: code
    title: src/persons.ts and test/persons.test.ts
    url: ../src/persons.ts
  - id: decision
    title: 'Decision: ratings per person (Mixtura)'
    url: ../../../apps/mixtura/docs/decisions/ratings.md
---

# Persons of a space

A space knows no accounts. Apps that keep something personal (Mixtura's
ratings[^decision]) need to know who uses a device, so a space has
**persons**[^code]:

- A person is a record of the collection `space` with the key
  `person:<id>` and the value `{ name }`; the id is 12 random bytes as
  base64url. Every device that syncs `space` learns the persons with the
  space's name. A removed person is a tombstone like any record.
- Which person this device is lives in `personId` of the stored space:
  on the device, never synced. A device can be a different person in each
  space. A `personId` whose person is gone counts as none.
- Names are cleaned like a space's name (1 to 60 characters).
- In a space on this device only there is no question: an app makes one
  person (its word for "Me") with the first personal record
  (`ensureDevicePerson`). Connecting a storage keeps that person.
- In a shared space the Household app asks on the space's screen: pick a
  person or add yourself. An app does not make persons in a shared space.

## Limits

- No access rights: anyone with the invite can rename any person or
  write records under another person's id.
- Not built yet: removing and merging persons, moving personal records
  when a device joins another space. Not tested on a real device.
