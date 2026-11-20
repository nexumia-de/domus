---
type: Index
title: hospes knowledge bundle
description: Entry to the knowledge of hospes, the host code the household apps share - sync on spaces and the WebDAV and GitHub adapters.
tags: [index]
generated: { by: claude-code, at: 2026-11-19 }
---

# hospes

The host code shared by the household apps, as one workspace package
used from this repository. Rules for agents: [AGENTS.md](../AGENTS.md).

# Reference

- [Spaces on the host](spaces.md) - The secret and its HKDF derivation, the sealed file, the invite link, the Store port and the shared `domus` database, a space on this device only (`device.ts`), one sync cycle step by step, the loop and the limits.
- [WebDAV adapter](webdav.md) - What a WebDAV server must do for a browser page, the adapter on fetch only, the table of answers and failures, the connection test and the limits.
- [GitHub adapter](github.md) - The Contents API of one private repository from a browser page with a fine-grained token, the table of answers, cheap polling with ETags, the connection test, the repository list, the setup links, the storage registry and the limits; nothing verified against the live API.

- [Sync orderings](sync-orderings.md) - What the sync code does when events come in an unlucky order (a change during a cycle, two devices, an unreadable file, clocks, the loop, spaces coming and going, Mixtura's stock), each with the test that pins it and the orderings no test pins.

# History

- [Log](log.md) - What changed and when.
