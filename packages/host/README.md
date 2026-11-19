# hospes

The host code the household apps share: the sync cipher on Web Crypto
(PBKDF2 into AES-256-GCM) and the WebDAV storage adapter on `fetch`.
TypeScript source, no build step, no dependency but
[materia](../model). Not published; the apps use it from this
repository.

```ts
import { createCipher, createWebdavAdapter, testConnection } from '@nexumia-de/hospes';
```

What is in it: [docs/index.md](docs/index.md). Rules for agents:
[AGENTS.md](AGENTS.md). Check: `npm run check:host` from the root.

## Licence

AGPL-3.0-or-later, see [LICENSE](../../LICENSE).
