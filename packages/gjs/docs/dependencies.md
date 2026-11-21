---
type: Reference
title: Dependencies
description: Every dependency of gjs with exact version, licence and use; two MIT crypto libraries at run time, bundled into each native app.
tags: [dependencies, licences]
generated: { by: claude-code, at: 2026-11-21 }
---

# Dependencies

Versions are pinned exactly in `package.json`; the lockfile pins the
rest. Licences read from each package's `package.json` and `LICENSE` in
`node_modules`. The package is AGPL-3.0-or-later
([LICENSE](../../../LICENSE)); all dependencies are MIT or Apache-2.0,
compatible with it.

## Runtime

| Package          | Version | Licence | Use                                                    |
| ---------------- | ------- | ------- | ------------------------------------------------------ |
| `@noble/ciphers` | 2.4.0   | MIT     | AES-256-GCM, where GJS has no Web Crypto (`subtle.ts`) |
| `@noble/hashes`  | 2.4.0   | MIT     | HKDF-SHA-256 for the same                              |

Both are bundled into each native app; their licence texts are in
`licenses/` and each app's Flatpak manifest installs them under
`/app/share/licenses/<app id>/noble-ciphers` and `noble-hashes`. The
package also uses the repository's [hospes](../../host) and
[materia](../../model). The native apps run on GJS, GTK 4, libadwaita
and libsoup 3 of the GNOME runtime (LGPL), which they use and do not
ship.

## Development only

From the root, the same versions as the other parts: `typescript`,
`vitest`, `eslint`, `@eslint/js`, `typescript-eslint`, `globals`,
`prettier`, `@types/node`, `esbuild` (MIT, the bundler) and
`playwright` (Apache-2.0, the screen checks). See the root
`package.json`.
