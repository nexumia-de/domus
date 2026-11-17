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
cache name `mixtura-<16 hex>`; `sw.js` precaches them (among them `rank-worker.js`, the Buy Next ranking worker) at install and
answers every GET from the cache (cache first, `index.html` for
navigations), never from the network. A new build installs in the
background and waits; the page shows the banner "Update available"; only
the Update button sends `skip-waiting`, and the page reloads when the new
worker takes over. The old cache is deleted on activation. The install
fetches every file with `cache: 'reload'` (`new Request(file, { cache:
'reload' })`), so a host that serves the fixed names with `max-age` (GitHub
Pages: 600 s) cannot hand the new worker an old file to store under the
new cache name; `e2e/update.mjs` publishes a changed `main.js` under
`max-age=600` and checks the new cache holds it (it fails without the
option). Serve `sw.js` and `index.html` with `Cache-Control: no-cache` if
the host allows headers, so browsers see a new build at once.

**Theme.** `data-theme` on `<html>` overrides the system setting;
`theme-init.js` (from `src/theme-init.ts`, a blocking script in `<head>`,
precached) sets it before first paint from the copy of the preferences in `localStorage` (`mixtura.prefs-copy`); the
local store ([store](store.md)) owns them.

**End-to-end test.** `npm run e2e` (`packages/app/e2e/walk.mjs`) loads the
built app from a local static server in a fresh Chromium profile at both
sizes and checks the four destinations, back navigation, touch targets, no
horizontal overflow, the theme, a reload and a deep link with the network
off, no request outside the origin, and the update flow with a second
"build". `e2e/browse.mjs` covers the browse screens ([screens](screens-browse.md#as-built-18-19)) and prints the list numbers below; `e2e/alcohol.mjs` covers the alcohol filters and their presets ([screens](screens-browse.md#as-built-37-alcohol-filters)); `e2e/store.mjs` covers the local store in the same way ([store](store.md#tests)); `e2e/exchange.mjs` covers export, import, Undo and the reminder ([export format](export-format.md#tests)); `e2e/editor.mjs` covers the spec editor ([as built](screens-specs.md#as-built-25)); `e2e/versions.mjs` covers versions, notes, status, riffs, the family and their export and import ([as built](screens-specs.md#as-built-26)); `e2e/shelf-variants.mjs` covers batch dates (host clock set with Playwright's fixed time) and variant riffs ([as built](non-alcoholic.md#as-built-37)); `e2e/substitutes.mjs` covers substitutes, the in-stock mark and the storage text ([as built](screens-specs.md#as-built-89)); `e2e/spec-stock.mjs` covers the stock panel on the spec screen ([as built](screens-browse.md#as-built-82-stock-panel-on-the-spec-screen)); `e2e/save-interrupt.mjs` cuts a save off at four points and checks that the edit survives ([as built](screens-specs.md#as-built-25)); `--throttle=N` (CPU slowed N times) and `--slow-frames=MS` (animation frames delayed) on `editor.mjs` and `exchange.mjs` show the races a fast machine hides. `node e2e/walk.mjs 360 720 --docs` also writes the screenshots in
`docs/screenshots/` at scale 2. Playwright (pinned, see
[dependencies](dependencies.md)) uses its own browser; where that is not
installed and another Chromium build is, set `MIXTURA_CHROMIUM` to its
binary (the cloud image has headless shell build 1243:
`/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`).
`e2e/a11y.mjs` is the [accessibility pass](accessibility.md); `e2e/breakpoint.mjs` walks dark mode at 839 and 840 px; `e2e/dark.mjs` takes the dark screenshots ([overview](screenshots.md)). CI runs it as the job `e2e` after `npx playwright install --with-deps chromium`.

**Slow-device pass.** Every script takes `--throttle=N` and
`--slow-frames=MS`; `npm run e2e:slow -w @mixtura/app` runs all of them at
both sizes with `--throttle=4 --slow-frames=100` (about 5 minutes; CI job
`e2e-slow`). It found no race when it was added (2026-11-17). Timing
budgets (the swap redraw under 50 ms) are only printed in that run, because
`--slow-frames` delays the frame they wait for. A failure there is a race
to fix at its cause with a wait for a specific condition: no retry, sleep or
skip.

**List numbers** (`node e2e/browse.mjs 360 720`, headless Chromium on the
cloud host; the 360 run throttles the CPU 4x as a rough phone stand-in, so
read them as order of magnitude): 60 rows in the page after about 0.6 s from
navigation start (1200 run: 0.13 s) including the 470 kB seed and the model;
scrolling through all 635 rows 0.4 s (0.3 s); typing "gin" to 177 results
0.34 s including the 200 ms debounce (0.26 s); a cold start on a strength
filter, which computes the balance of all 635 drinks, rows after 0.28 s (0.09 s;
served from the service worker cache). The engine computes all 635 balances in
about 13 ms on the host.

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
job `e2e` runs the browser scripts (including the accessibility pass); a third, `e2e-slow`, the slow-device pass below. Neither is required yet. Actions are
pinned to a commit SHA, Dependabot updates npm and GitHub Actions weekly.

`.github/workflows/pages.yml` (job `build`, then `deploy`) publishes
`packages/app/dist` to GitHub Pages on pushes to `main` and manual start; it
is not a required check. The app uses only relative URLs, so the same build
works at `/`, under `/mixtura/` and under a deep path, and when the page
is opened as `index.html`; `npm run e2e` serves it under `/`, `/mixtura/`
and `/apps/drinks/v1/` (`e2e/subpath.mjs`) and the build test rejects
root-absolute URLs. Where a native wrapper has no service worker or no
storage API (a custom scheme, a WebView), the app registers nothing, ignores
a refused registration and reports persistence as unsupported;
`e2e/no-sw.mjs` removes both APIs and checks browse, a spec and the store. Owner steps: [install](install.md#what-the-owner-must-switch-on).

## Web app manifest

`src/manifest.webmanifest` (copied by `build.mjs`) has `id`, `scope`,
`start_url`, `display`, `categories` (`food`, `lifestyle`), icons (any,
maskable and monochrome, [icons](design.md#app-icons)), three `shortcuts`
(New Drink `./#/drinks/new`, Stock, Buy Next; relative to the manifest, so
they stay inside the sub-path) and `screenshots` for the install dialog:
`form_factor` `narrow` (720x1440, the drinks list and a spec) and `wide`
(2400x1600, the same two). They are the recorded-data screenshots of
[screenshots](screenshots.md) (`app-drinks-list-*`, `app-spec-*`, seed data
only, scale 2), copied by `build.mjs` to `screenshots/`; when those
screens change, regenerate them there and rebuild. They are deliberately
not precached (about 750 kB, twice the rest of the app, and only the
install dialog needs them): `sw.js` passes a request under `/screenshots/`
that is not in the cache to the network, and offline it fails, which only
costs the richer dialog. `test/build.test.ts` checks the members, the
declared sizes against the PNG headers and the form factors;
`e2e/subpath.mjs` that every icon, screenshot and shortcut resolves under
the sub-path. `index.html` has a `description` meta tag.

## Content Security Policy

`index.html` carries a meta policy (read at the source: MDN's CSP guide in
`mdn/content`, Ajv's `docs/standalone.md` in `ajv-validator/ajv`):

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'
```

No `unsafe-inline`, no `unsafe-eval`, no external host. What each part is
for: `script-src 'self'` covers `main.js`, `theme-init.js` and the ranking
worker's script (`worker-src 'self'`); `style-src 'self'` is why the page
has no inline style: `dom.ts` applies a `style` prop through the style
object (CSSOM, not governed by the policy) instead of a style attribute;
`connect-src 'self'` is the seed file; `manifest-src 'self'`; `img-src
'self'` (icons; no `data:` is used); `form-action 'none'`. The export
download is a `blob:` link and needs no entry. A meta policy cannot carry
`frame-ancestors`, `sandbox` or a report endpoint; if the host later allows
headers, send the same policy as a header with `frame-ancestors 'none'`.

The schemas are compiled at build time: `compile-schemas.mjs` turns every
`packages/engine/schemas/*.schema.json` into plain validator functions with
Ajv standalone (same options as before: `allErrors`, `strict`; generic
over the files, so a new schema or field needs no change) and writes
`src/store/schema-validators.generated.mjs` (git-ignored; `build`, `pretest`
and `pretypecheck` run it). The bundle contains no `new Function` and no
Ajv compiler, only Ajv's two tiny run-time helpers (`equal`, `ucs2length`).
`ajv` is a development dependency (this script and the tests).

Checks: `test/build.test.ts` (no `new Function(`/`eval(` in the scripts, no
inline script, style or handler in `index.html`, the policy's directives,
the theme script blocking in `<head>`), `test/import-crafted.test.ts`
(`__proto__` and `constructor` keys in an import file), `e2e/csp.mjs`
(14 routes online and offline with the service worker and the ranking
worker running; any `securitypolicyviolation` event or policy message in
the console fails; an injected inline script must be blocked).

## Network hosts

The Pages workflow runs on GitHub's runners and needs only GitHub itself
(`github.com`, `api.github.com`, the Pages service and the npm registry for
`npm ci`, which GitHub-hosted runners reach). The install guide was checked
against `raw.githubusercontent.com/mdn/content` because `developer.mozilla.org`,
`support.google.com`, `web.dev`, `help.gnome.org` and `support.mozilla.org`
answered 403 through the session proxy on 2026-11-17. For the policy work
(#107) `curl -sS -m 15 https://<host>/` gave no answer (status 000) for
`developer.mozilla.org`, `web.dev` and `ajv.js.org` on 2026-11-17; the pages
were read from `mdn/content` (`files/en-us/web/http/guides/csp/index.md`)
and `ajv-validator/ajv` (`docs/standalone.md`) through
`raw.githubusercontent.com`.

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

For the template bands and juice acid (#70) and Arnold's dilution
equations (#48), blocked on 2026-11-17 (`curl -sS -m 15 -o /dev/null
https://<host>/` gave `CONNECT tunnel failed, response 403`; `WebFetch`
of `cookingissues.com` did not resolve):

```
cookingissues.com
www.cookingissues.com
www.liquidintelligence.com
fdc.nal.usda.gov
api.nal.usda.gov
www.mdpi.com
aj.tubitak.gov.tr
vinepair.com
www.themixer.com
punchdrink.com
www.seriouseats.com
www.diffordsguide.com
bookshop.org
www.penguinrandomhouse.com
www.google.com
scholar.google.com
www.jstor.org
```

`www.sciencedirect.com` answers 403 itself. Reachable on the same day
and used for the juice acid values (the PMC pages answered a captcha to
scripted requests, Europe PMC's REST API served the open-access full
text):

```
pubmed.ncbi.nlm.nih.gov
pmc.ncbi.nlm.nih.gov
eutils.ncbi.nlm.nih.gov
www.ebi.ac.uk
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

Reachable on 2026-11-17 in the second pass of the legal and food-safety
check (issue #67; `curl` through the session proxy, each page or API
answered 200 unless noted):

```
eur-lex.europa.eu
www.legislation.gov.uk
www.gov.uk
www.ecfr.gov
www.fda.gov
www.ttb.gov
www.food.gov.uk
nchfp.uga.edu
www.bfr.bund.de
www.gesetze-im-internet.de
```

Limits found while reading them:

- `eur-lex.europa.eu` answered HTTP 202 with an empty body (a CloudFront
  bot challenge, header `x-amzn-waf-action: challenge`) after the first
  two documents, and kept doing so for the rest of the session.
- `www.ecfr.gov` serves the versioner API
  (`/api/versioner/v1/full/<date>/title-<n>.xml?part=..&section=..`) only
  with `curl --compressed`; without it the API answers 406.
- `www.food.gov.uk` redirects most guidance to `www.gov.uk`.
- `www.gesetze-im-internet.de` answered, but with intermittent
  `Connection reset` errors; wrong statute slugs return 404.
- `www.gov.uk` pages are reachable; the PDFs they link are on
  `assets.publishing.service.gov.uk`, which the proxy refused (403).
- `nchfp.uga.edu/search` and `www.efsa.europa.eu` search answer 403;
  `www.efsa.europa.eu` topic pages tried gave 404 or 429.

Still failing on 2026-11-17 or not tested:

```
assets.publishing.service.gov.uk
europepmc.org
www.govinfo.gov
www.law.cornell.edu
www.fsis.usda.gov
extension.psu.edu
www.verbraucherzentrale.de
www.reading.ac.uk
www.cdc.gov
```

`europepmc.org` answers 403 from the site itself. Of the others only
`assets.publishing.service.gov.uk` was tried again (403); the rest were
blocked in the first pass and not retried.

## Hosts for the packaging study and the name check

Tested on 2026-11-17 with `curl -sS -m 15 -o /dev/null -w '%{http_code}' https://<host>/`.
Reachable and used (`git clone` for source and docs repositories, API
calls for the registries):

```
github.com
api.github.com
gitlab.com
gitlab.gnome.org
f-droid.org
developer.android.com
flathub.org
registry.npmjs.org
pypi.org
hub.docker.com
pkgs.alpinelinux.org
```

Blocked (403 from the proxy or no resolution) and not retried; each would
have settled an open point:

```
developer.chrome.com
docs.github.com
www.pwabuilder.com
capacitorjs.com
v2.tauri.app
www.electronjs.org
webkitgtk.org
wiki.gnome.org
play.google.com
apps.apple.com
tmsearch.euipo.europa.eu
tmview.europa.eu
register.dpma.de
tmsearch.uspto.gov
branddb.wipo.int
rdap.org
whois.denic.de
packages.debian.org
packages.ubuntu.com
aur.archlinux.org
repology.org
snapcraft.io
search.f-droid.org
```

`developer.chrome.com` has the Trusted Web Activity pages, `docs.github.com`
the Pages, secrets and fork rules, the trademark and store hosts the name
check ([name check](name-check.md#not-checked)). `crates.io` answered 403
and `search.nixos.org` 401. Tool documentation was read from the tools'
source repositories instead; `f-droid.org/docs/Inclusion_Policy/` came
through the fetch tool as a summary.
