---
type: Reference
title: Platform pieces
description: What GJS lacks (Web Crypto, random bytes, fetch, files, structuredClone) and how src/ fills each behind the interface the host package already takes, joining a space by invitation link, the preferences file and the style helpers, with what the checks prove and what nobody verified.
tags: [gjs, platform, crypto, fetch, files, native]
generated: { by: claude-code, at: 2026-11-21 }
sources:
  - id: noble
    title: '@noble/ciphers and @noble/hashes 2.4.0 (MIT), licence read from their LICENSE files'
    url: https://github.com/paulmillr/noble-ciphers
  - id: emptio
    title: 'Emptio: native Linux app (where these pieces were first built)'
    url: ../../../apps/emptio/docs/native-linux.md
---

# Platform pieces

Built for Emptio's native app on 2026-11-20[^emptio] and moved here on
2026-11-21, when Mixtura's native app became the second that needs them
([decision](../../../docs/decisions/native-linux-gjs.md)). The code is
unchanged by the move.

GJS 1.80 has no `crypto`, `fetch`, `structuredClone` and no IndexedDB.
The host package takes each as an interface, so each piece fills one:

| Missing                    | File            | Filled by                                                                                                                                         |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Crypto                 | `subtle.ts`     | The subset the host package calls (HKDF-SHA-256, AES-256-GCM) on `@noble/hashes` and `@noble/ciphers`[^noble]; anything else throws               |
| Random bytes, `randomUUID` | `random.ts`     | `/dev/urandom` through GIO; `installWebPlatform(randomBytes)` puts `crypto` and `structuredClone` on the global object where the host has none    |
| `fetch`, `Response`        | `soup-fetch.ts` | libsoup 3, no cookies, no cache; a request with no answer rejects with a `TypeError` as in a browser, which the adapters turn into "unreachable"  |
| IndexedDB                  | `gio-files.ts`  | The host package's file store (`createFileStore`) on JSON files in a folder, written atomically and readable by the user only (they hold secrets) |
| `structuredClone`          | `subtle.ts`     | A JSON copy: what the stores copy is JSON                                                                                                         |

`node-files.ts` is the same `Files` on Node's `fs`, for the recorded
data of the checks and for tests; it is a separate entry
(`@nexumia-de/gjs/node-files`) because the main entry imports `gi://`.

# Around the pieces

- **`join.ts`**: `joinByLink(store, text, token)` stores a space from a
  pasted invitation link (the link carries the storage, the secret and,
  when the inviting person included it, the access). The Household app
  also tests the storage before it stores the space; here the first sync
  cycle says whether it works. Results: `ok` with the space id and name,
  or one of `empty`, `not-an-invitation`, `needs-token`, `already-here`.
- **`prefs.ts`**: `filePrefs(files)`, the `get` and `set` of an app's
  small preferences (`prefs.json` beside the data).
- **`style.ts`**: `applyStyle('system' | 'light' | 'dark')` for
  libadwaita's colour scheme, and `addStyle(css)` for the app's one
  stylesheet (its accent colour and the 44 px controls).

# What the checks prove

- `test/subtle.test.ts`: the subset against Node's real Web Crypto, the
  same derivations and files sealed by one opened by the other, through
  the host package's own code, in both directions, plus the fixed vector
  of the host package. Proves the bytes; not GJS.
- `test/join.test.ts`: joining against the shared database in memory,
  with links made by the host package's own code.
- `src/smoke.ts` (run by each app, [tooling](tooling.md#smoke)): in real
  GJS, the fixed vector, random bytes, the file store, and two folders as
  two devices through sync cycles against the fake of GitHub's API on
  localhost; the sealed file holds none of the record's text; the spaces
  file is private (mode 600).

# Not verified

- The `gi://` calls have no types (`gi.d.ts`); the smoke run and the
  apps' screen checks are what checks them.
- A second process on the same folder: the file store expects one.
- The real GitHub and a WebDAV server; a phone.
- `installWebPlatform` leaves a global `crypto` alone if one exists, so
  a future GJS with Web Crypto would use its own; nobody tried one.
