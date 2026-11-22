---
type: Reference
title: Dependencies
description: Every dependency of Emptio with exact version, licence and use; at run time two MIT crypto libraries in the native app only.
tags: [dependencies, licences]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Dependencies

Versions are pinned exactly in `package.json` and equal Culina's, so
the repositories stay aligned; the lockfile pins the rest. Licences read
from each package's `package.json` in `node_modules`. Emptio itself is
AGPL-3.0-or-later ([LICENSE](../LICENSE)); all dependencies are
MIT or Apache-2.0, compatible with it.

## Runtime

| Package          | Version | Licence | Use                                                                                               |
| ---------------- | ------- | ------- | ------------------------------------------------------------------------------------------------- |
| `@noble/ciphers` | 2.4.0   | MIT     | AES-256-GCM for the native app, where GJS has no Web Crypto ([native Linux app](native-linux.md)) |
| `@noble/hashes`  | 2.4.0   | MIT     | HKDF-SHA-256 for the same                                                                         |

Both are bundled into the native app only; they are a dependency of the
shared package `packages/gjs` now
([dependencies](../../../packages/gjs/docs/dependencies.md)), whose
`licenses/` holds their texts, installed by the Flatpak manifest. The web app has no runtime dependency outside this repository
(hospes and materia). The native app runs on GJS, GTK 4, libadwaita and
libsoup 3 of the GNOME runtime (LGPL), which it uses and does not ship.

## Development only

| Package             | Version | Licence    | Use                       |
| ------------------- | ------- | ---------- | ------------------------- |
| `typescript`        | 6.0.3   | Apache-2.0 | Type checking             |
| `vitest`            | 5.1.0   | MIT        | Tests                     |
| `eslint`            | 10.14.0 | MIT        | Lint, and the purity test |
| `@eslint/js`        | 10.0.1  | MIT        | Lint rules                |
| `typescript-eslint` | 8.72.2  | MIT        | Lint for TypeScript       |
| `globals`           | 17.14.0 | MIT        | Lint globals for scripts  |
| `prettier`          | 3.9.10  | MIT        | Formatting                |
| `@types/node`       | 22.20.5 | MIT        | Types for Node in tests   |

`npm ci` reports 13 advisories (7 moderate, 6 high) in the development
tree on 2026-11-18; none of these packages ships in the app. They are
left to the weekly update pull requests.
