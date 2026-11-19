# hospes

The host code that the household apps share: the sync cipher on Web
Crypto and the WebDAV storage adapter on `fetch`. One npm package,
`@nexumia-de/hospes`, used from this repository
([decision](../../docs/decisions/one-origin-spaces-storages.md)); the
rules of the [root](../../AGENTS.md) apply too. Knowledge of this part:
[docs/index.md](docs/index.md).

hospes is a library, not an app; the GTK rules do not apply. Its sister
package is [materia](../model), the pure model.

## Rules

- **Host code that two apps need.** What touches the browser (`fetch`,
  Web Crypto, IndexedDB, the online flag) and is not specific to one app. Nothing of
  one app's domain, store, state or screens; the package imports no app,
  and `npm run boundaries` checks it.
- **Every external effect sits behind an injectable function.** The
  WebDAV adapter takes `fetch`, `online` and `delay` as options, so a
  test runs without a network and without waiting. New code does the
  same; no global is read where an option could carry it.
- **One database `domus`, shared by all apps.** Spaces and the state of
  the shared collections live in the IndexedDB database `domus` of this
  package; an app keeps what only it knows in a database of its own. A
  change to its layout needs a new database version and a line in the log.
- **No runtime dependency** except
  [materia](../model), for the types and helpers of the envelope and the
  storage port. Development tools come from the root.
- **Requests only to storage the user configured.** The package never
  chooses an address; the caller gives it. No telemetry, no logging.
- **TypeScript source is the entry.** `src/index.ts` is exported as it
  is; there is no build step. The apps bundle it.
- **Every rule has a test** in `test/`; a fixed vector pins the envelope
  format.
- **Code moves here when a second app needs it, never in advance**, and
  it moves with its users changed in the same commit.
- **The public entry is a contract.** A removed or changed export is
  changed in the apps in the same commit and gets a line in
  `docs/log.md`.

## Before committing

1. From the root, `npm run check:host` passes (format, lint, typecheck,
   tests), and `npm run check` when an app uses what you changed.
2. `docs/` updated in the same commit.
