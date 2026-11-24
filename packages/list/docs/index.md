---
okf_version: '0.2'
---

# The list package: knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle of `packages/list`, the household's shopping list as
every app writes it. The name of the package is provisional
([rules](../AGENTS.md)). Change history is in [log.md](log.md).

# Specifications

- [The entry](entry.md) - The fields of an entry of the list, its origins, the record in the collection `list` of a space, what counts as an entry; moved from Emptio's data model on 2026-11-24.
- [Rules](rules.md) - The sort key of a name, rule 4 (category of a new entry) with the usual items, rule 5 (twice the same), putting something on the list as one plan, and the open weaknesses of rule 5; moved from Emptio's engine rules on 2026-11-24.
- [Test vector format](vectors.md) - The two kinds of this package (`new-entry-category`, `add-entry`).

# Reference

- [List orderings across apps](orderings.md) - Unlucky orders of events when more than one app writes the list (Culina's hand-over against Emptio, two tabs, a sync cycle, a failing store, Undo), with the test that pins each.
