---
type: Guide
title: Development
description: Setup, commands, layout and the engine's purity rule for Mixtura, the CI job name, and the network hosts the research needed.
tags: [development, tooling, ci, network]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Development

## Setup

Node 22 (`.nvmrc`, `engines.node` `>=22.12.0`), then:

```sh
npm ci
```

## Commands

| Command                      | What it does                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`              | format check, lint, typecheck, tests, build, in that order; stops at the first error                                              |
| `npm run format`             | Prettier writes all files                                                                                                         |
| `npm run format:check`       | Prettier checks all files                                                                                                         |
| `npm run lint`               | ESLint (flat config, typescript-eslint, purity rule for the engine)                                                               |
| `npm run typecheck`          | `tsc --noEmit` in both packages                                                                                                   |
| `npm test`                   | vitest in both packages                                                                                                           |
| `npm run build`              | `packages/engine/dist/` (`engine.mjs`, declarations, purity check) and `packages/app/dist/` (the app, see below)                  |
| `npm run seed -- <checkout>` | regenerates `packages/engine/data/seed/` from a local checkout of the Bar Assistant data ([seed data](seed-data.md#regenerating)) |
| `npm run e2e`                | builds, then walks the built app in Chromium at 360 x 720 and 1200 x 800                                                          |

## Layout

- `packages/engine` (`@mixtura/engine`): the pure engine. `src/index.ts` is
  its only public entry ([engine](engine.md)); `vectors/` for the test
  vectors of every rule and formula, `test/`. The app imports
  `@mixtura/engine` only, resolved to the engine's build (`dist/`): the app's
  `test` and `typecheck` scripts build the engine first, the root `build`
  does it in order, and a lint rule fails any deep import.
- `packages/app` (`@mixtura/app`): the web app, built with esbuild, no UI
  framework. The shell and its source layout are in [App shell](#app-shell).
- `scripts/seed/`: the seed data converter and its fixture ([seed data](seed-data.md#converter)); not engine code.
- `tsconfig.base.json` (strict) is extended by one `tsconfig.json` per package.
- Every dependency is pinned exactly; see [dependencies](dependencies.md).

## App shell

The shell (#17) is plain TypeScript building DOM; no framework. Source in
`packages/app/src/`:

| File or folder                              | Job                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `main.ts`                                   | Starts the app: preferences, store, navigation, service worker, redraw on change                |
| `state.ts`, `app-state.ts`                  | Generic store with subscribe; the app's one state object (route, theme, units, update)          |
| `router.ts`, `navigation.ts`                | Pure hash parsing; history glue (one entry per in-app link, Back, Escape)                       |
| `destinations.ts`                           | The four destinations with labels and icons                                                     |
| `screen.ts`, `screens/`                     | The screen contract and one folder per destination; `screens/index.ts` lists them               |
| `shell/`                                    | Navigation bar and rail, panes, update banner, not-found page, `render.ts`                      |
| `dom.ts`, `strings.ts`, `prefs.ts`          | DOM helpers (text nodes only), fixed texts, first-paint copy of theme and units                 |
| `store/`, `data.ts`, `seed/`                | Local IndexedDB store, its connection to the state, the read-only seed file ([store](store.md)) |
| `sw.ts`, `sw-register.ts`                   | Service worker; registration and the update flow                                                |
| `styles/`, `icons/`, `manifest.webmanifest` | The one stylesheet (tokens from the design), icons, web app manifest                            |

**Adding a screen (#18 to #20).** Make `screens/<name>/index.ts` that
exports `screens: Screen[]` (`match(route)` and `view(context)` returning
`{ title, body, actions?, list? }`), and add one line to
`screens/index.ts`. The shell never changes: `list` makes it a two-pane
screen from 840 px, `actions` replaces the bottom navigation with an
action bar on a pushed screen. Screens read `context.state` and write
with `context.store.set`; every change redraws the whole app, and a focused
element with a `data-focus` attribute keeps focus across the redraw.

**Running it.** `npm run build`, then serve `packages/app/dist/` over
localhost (a service worker needs `localhost` or HTTPS), for example
`npx --yes serve packages/app/dist` or `python3 -m http.server -d packages/app/dist 8080`
(not a dependency of the repository). `file://` shows the app without a
service worker.

**Service worker and updates.** `build.mjs` hashes all built files into the
cache name `mixtura-<16 hex>`; `sw.js` precaches them at install and
answers every GET from the cache (cache first, `index.html` for
navigations), never from the network. A new build installs in the
background and waits; the page shows the banner "Update available"; only
the Update button sends `skip-waiting`, and the page reloads when the new
worker takes over. The old cache is deleted on activation. Serve `sw.js`
with `Cache-Control: no-cache` so browsers see a new build at once.

**Theme.** `data-theme` on `<html>` overrides the system setting; a small
inline script in `index.html` sets it before first paint from the
copy of the preferences in `localStorage` (`mixtura.prefs-copy`); the
local store ([store](store.md)) owns them.

**End-to-end test.** `npm run e2e` (`packages/app/e2e/walk.mjs`) loads the
built app from a local static server in a fresh Chromium profile at both
sizes and checks the four destinations, back navigation, touch targets, no
horizontal overflow, the theme, a reload and a deep link with the network
off, no request outside the origin, and the update flow with a second
"build". `e2e/store.mjs` covers the local store in the same way ([store](store.md#tests)); `e2e/exchange.mjs` covers export, import, Undo and the reminder ([export format](export-format.md#tests)). `node e2e/walk.mjs 360 720 --docs` also writes the screenshots in
`docs/screenshots/` at scale 2. Playwright (pinned, see
[dependencies](dependencies.md)) uses its own browser; where that is not
installed and another Chromium build is, set `MIXTURA_CHROMIUM` to its
binary (the cloud image has headless shell build 1243:
`/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`).
CI runs it as the job `e2e` after `npx playwright install --with-deps chromium`.

## The engine is pure

`packages/engine/src/**` may not use the clock (`Date`, `performance`),
randomness (`Math.random`, `crypto`), `console`, DOM or host globals
(`window`, `document`, `navigator`, `indexedDB`, `fetch`, `localStorage`,
`process`) or import from `packages/app`; time and random numbers come in
as input. ESLint enforces it in `eslint.config.js`;
`packages/engine/test/purity.test.ts` lints fixture files that must fail,
so the rule cannot be removed silently
([two apps, one engine](decisions/two-apps-one-engine.md)).

## CI

`.github/workflows/ci.yml` runs `npm ci` and `npm run check` on pull
requests and pushes to `main`. The job is named `check`; this is the
required status check name for the branch-protection ruleset. A second
job `e2e` runs the browser walk; it is not required until issue #21 settles it. Actions are
pinned to a commit SHA, Dependabot updates npm and GitHub Actions weekly.

`.github/workflows/pages.yml` (job `build`, then `deploy`) publishes
`packages/app/dist` to GitHub Pages on pushes to `main` and manual start; it
is not a required check. The app uses only relative URLs, so the same build
works at `/` and under `/mixtura/`; `npm run e2e` serves it under
`/mixtura/` (`e2e/subpath.mjs`) and the build test rejects root-absolute
URLs. Owner steps: [install](install.md#what-the-owner-must-switch-on).

## Network hosts

The Pages workflow runs on GitHub's runners and needs only GitHub itself
(`github.com`, `api.github.com`, the Pages service and the npm registry for
`npm ci`, which GitHub-hosted runners reach). The install guide was checked
against `raw.githubusercontent.com/mdn/content` because `developer.mozilla.org`,
`support.google.com`, `web.dev`, `help.gnome.org` and `support.mozilla.org`
answered 403 through the session proxy on 2026-11-17.

Needed to check the facts in [existing tools and data](existing-tools.md);
reachable on 2026-11-16:

```
www.thecocktaildb.com
docs.barassistant.app
bar-assistant.github.io
cosylab.iiitd.edu.in
apps.gnome.org
```

`bar-assistant.github.io` only redirects to `docs.barassistant.app`.
For the seed data ([seed data](seed-data.md#network-hosts)), reachable
through the session proxy on 2026-11-17 (`git clone` of
`bar-assistant/data` and raw file download; the web page and API of
`github.com` answered 403 for curl):

```
github.com
raw.githubusercontent.com
```

`foodb.ca` answers automated requests with 403 itself, so FooDB's
licence stays unverified.

Needed to verify the numbers of [balance](balance.md) and [units](units.md),
blocked on 2026-11-17 (`curl` to each gave a proxy tunnel failure, and
Wikipedia also failed to resolve):

```
cookingissues.com
www.cookingissues.com
www.diffordsguide.com
cocktail-society.com
fashioned.deathandcompany.com
www.nhs.uk
www.nist.gov
en.wikipedia.org
archive.org
books.google.com
```

Needed for [non-alcoholic](non-alcoholic.md), reachable on 2026-11-17
(PubMed, PMC and E-utilities; the page of each paper):

```
pubmed.ncbi.nlm.nih.gov
pmc.ncbi.nlm.nih.gov
eutils.ncbi.nlm.nih.gov
www.who.int
www.europarl.europa.eu
```

Blocked on 2026-11-17 (`curl` tunnel failure, and the fetch tool could not
resolve them); each would have settled an open point there (legal texts
of the EU, Germany, UK and US, food-safety limits, product data):

```
eur-lex.europa.eu
www.gesetze-im-internet.de
www.legislation.gov.uk
www.gov.uk
www.ecfr.gov
www.govinfo.gov
www.fda.gov
www.ttb.gov
www.law.cornell.edu
www.food.gov.uk
nchfp.uga.edu
www.fsis.usda.gov
extension.psu.edu
www.efsa.europa.eu
www.bfr.bund.de
www.verbraucherzentrale.de
www.reading.ac.uk
www.cdc.gov
europepmc.org
```
