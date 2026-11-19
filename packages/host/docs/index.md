---
type: Index
title: hospes knowledge bundle
description: Entry to the knowledge of hospes, the host code the household apps share - the sync cipher, the WebDAV and GitHub adapters and sync on spaces.
tags: [index]
generated: { by: claude-code, at: 2026-11-19 }
---

# hospes

The host code shared by the household apps, as one workspace package
used from this repository. Rules for agents: [AGENTS.md](../AGENTS.md).

# Reference

- [Spaces on the host](spaces.md) - The secret and its HKDF derivation, the sealed file, the invite link, the Store port and the shared `domus` database, one sync cycle step by step, the loop and the limits.
- [WebDAV adapter](webdav.md) - What a WebDAV server must do for a browser page, the adapter on fetch only, the table of answers and failures, the connection test and the limits.
- [GitHub adapter](github.md) - The Contents API of one private repository from a browser page with a fine-grained token, the table of answers, cheap polling with ETags, the connection test, the repository list, the setup links, the storage registry and the limits; nothing verified against the live API.
- [Sync cipher](cipher.md) - PBKDF2-HMAC-SHA-256 into AES-256-GCM on Web Crypto, the envelope it reads and writes, the typed errors and the limits of the scheme.

# History

- [Log](log.md) - What changed and when.
