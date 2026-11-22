# gjs

What the native Linux apps of this repository share: a Web Crypto subset
on audited pure JavaScript, `fetch` on libsoup, a file store folder,
joining a space by invitation link, the preferences file, and the build,
smoke and screen-check tooling. TypeScript source and plain scripts, no
build step. Not published; the native packages of the apps use it from
this repository.

```ts
import { gioFiles, installWebPlatform, joinByLink, soupFetch } from '@nexumia-de/gjs';
```

What is in it: [docs/index.md](docs/index.md). Rules for agents:
[AGENTS.md](AGENTS.md). Check: `npm run check:gjs` from the root.

## Licence

AGPL-3.0-or-later, see [LICENSE](../../LICENSE). The two bundled crypto
libraries are MIT; their texts are in [licenses/](licenses/).
