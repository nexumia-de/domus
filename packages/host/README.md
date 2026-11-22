# hospes

The host code the household apps share: sync on spaces (the secret and
what is derived from it, the sealed file with AES-256-GCM on Web Crypto,
local data in IndexedDB, the sync cycle and its loop) and the WebDAV and
GitHub storage adapters on `fetch`.
TypeScript source, no build step, no dependency but
[materia](../model). Not published; the apps use it from this
repository.

```ts
import { adapterFor, createIdbStore, ensureSpace, syncCollection } from '@nexumia-de/hospes';
```

What is in it: [docs/index.md](docs/index.md). Rules for agents:
[AGENTS.md](AGENTS.md). Check: `npm run check:host` from the root.

## Licence

AGPL-3.0-or-later, see [LICENSE](../../LICENSE).
