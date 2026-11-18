---
type: Reference
title: Dependencies
description: Every dependency of Emptio with exact version, licence and use; none at run time yet.
tags: [dependencies, licences]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Dependencies

Versions are pinned exactly in `package.json` and equal Culina's, so
the repositories stay aligned; the lockfile pins the rest. Licences read
from each package's `package.json` in `node_modules`. Emptio itself is
AGPL-3.0-or-later ([LICENSE](../LICENSE)); all dependencies are
development only and MIT or Apache-2.0, compatible with it.

## Runtime

None. materia follows with the first code that uses it
([development](development.md#layout)).

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
