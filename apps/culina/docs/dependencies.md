---
type: Reference
title: Dependencies
description: Every dependency of Culina with exact version, licence and use.
tags: [dependencies, licences]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Dependencies

Versions are pinned exactly in `package.json` and equal Mixtura's, so
both repositories stay aligned; the lockfile pins the rest. Licences read
from each package's `package.json` in `node_modules`. Culina itself is
AGPL-3.0-or-later ([LICENSE](../LICENSE)). Nothing third-party is shipped;
all dependencies are development only and MIT or Apache-2.0, compatible
with it.

## Development only

| Package             | Version | Licence    | Use                             |
| ------------------- | ------- | ---------- | ------------------------------- |
| `typescript`        | 6.0.3   | Apache-2.0 | Type checking                   |
| `vitest`            | 5.1.0   | MIT        | Tests                           |
| `eslint`            | 10.14.0 | MIT        | Lint                            |
| `@eslint/js`        | 10.0.1  | MIT        | Lint rules                      |
| `typescript-eslint` | 8.72.2  | MIT        | Lint for TypeScript             |
| `globals`           | 17.14.0 | MIT        | Lint globals for scripts        |
| `prettier`          | 3.9.10  | MIT        | Formatting                      |
| `@types/node`       | 22.20.5 | MIT        | Types for tests (Node 22 in CI) |

## GitHub Actions

| Action               | Version | Use                      |
| -------------------- | ------- | ------------------------ |
| `actions/checkout`   | v7.0.1  | Checkout in CI           |
| `actions/setup-node` | v7.1.0  | Node and npm cache in CI |

Both are pinned to a commit SHA in `.github/workflows/ci.yml`.
