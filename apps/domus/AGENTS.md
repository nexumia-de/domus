# Household (Domus)

The app at the root of `domus.nexumia.de` where sync is set up once for
all apps on the address: create a space, connect a storage, invite
someone, join by link or QR code. Visible name: **Household**. Knowledge
of this part: [docs/index.md](docs/index.md); the repository's rules are
in the root `AGENTS.md`, which also applies here.

It is a web app (PWA in the making) and not a GTK app; the GTK rules do
not apply.

## Rules

- **Only the shared packages.** The app uses `@nexumia-de/hospes` (spaces,
  store, adapters, the sync cycle) and `@nexumia-de/materia`, and no
  other app. If a screen needs something they lack, it is added there,
  small and tested, never worked around here. No code copied from an app.
- **No manifest and no service worker yet.** An installable page at `/`
  has a scope that covers the apps' folders, and that is not tested on
  the owner's devices ([deployment](../../docs/deployment.md)).
  `test/build.test.ts` and `npm run e2e:site` keep it so.
- **The GitHub API address is a constant of the build** (`src/env.ts`,
  `build.mjs`), never a URL parameter, setting or part of an invite: a
  token must not be sendable to another host. Only the browser checks'
  test build compiles another address in.
- **A token is a secret.** It lives in a password field, then in a
  variable until the space is stored in the shared database `domus`; it
  is never put into an address, `localStorage`, a log or page text, and
  `console` is not used at all (lint).
- **An invite carries the storage access only when the box is ticked**,
  and the screen says what that gives. The secret is always in it.
- **Every failure has a sentence in both languages**: `Failure` in
  `src/logic/failures.ts` is checked by the compiler against
  `src/strings.ts` and `src/strings-de.ts`, and by `test/failures.test.ts`.
  A raw code is never the whole message.
- **Phone first**: 320 to 360 px, touch targets of at least 44 px, no
  horizontal scroll, light and dark, English and German (the language
  follows the browser).
- **Logic apart from screens.** What decides (the flows, the wording, the
  state of a cycle, the invite) is in `src/logic/`, tested without a
  browser, with every effect passed in.

## Before committing

1. From the root: `npm run check:domus`; `npm run e2e -w @domus/app` when
   a screen or a flow changed; `npm run e2e:site` when the root files
   or the site build changed.
2. `docs/` of this part updated in the same commit.
