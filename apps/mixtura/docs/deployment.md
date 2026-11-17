---
type: Guide
title: Deployment
description: Where Mixtura is deployed (Cloudflare Workers static assets at mixtura.nexumia.de, GitHub Pages until the move is confirmed), the headers and caching of the files, how the deploy job behaves with and without secrets, and the owner's one-time steps with the exact token permission.
tags: [deployment, cloudflare, headers, caching, service-worker, owner]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: cf-headers
    title: 'Cloudflare, Workers static assets: Headers (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/static-assets/headers/
  - id: cf-html
    title: 'Cloudflare, Workers static assets: HTML handling (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
  - id: cf-routing
    title: 'Cloudflare, Workers static assets: Routing, `not_found_handling` (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/static-assets/
  - id: cf-previews
    title: 'Cloudflare, Workers Previews and Previews examples (GitHub Actions) (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/previews/
  - id: cf-domains
    title: 'Cloudflare, Workers Custom Domains (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
  - id: cf-actions
    title: 'Cloudflare, Workers CI/CD with GitHub Actions (API token, account ID) (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
  - id: cf-permissions
    title: 'Cloudflare, API token permissions (read 2026-11-17)'
    url: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
  - id: cf-workersdev
    title: 'Cloudflare, workers.dev (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
  - id: cf-wrangler
    title: 'Cloudflare, Wrangler commands: deploy, preview (read 2026-11-17)'
    url: https://developers.cloudflare.com/workers/wrangler/commands/workers/
  - id: action
    title: 'cloudflare/wrangler-action, action.yml and README at the pinned commit (read 2026-11-17)'
    url: https://github.com/cloudflare/wrangler-action
---

# Deployment

The app is static files (`npm run build` writes `packages/app/dist`). Decision
and reasons: [hosting](decisions/hosting.md). Today it is on two hosts:

| Host                             | Address                                           | Status                                                                                                                    |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GitHub Pages (`pages.yml`)       | `https://nexumia-de.github.io/mixtura/`           | Present address. Stays unchanged until the owner confirms the Cloudflare address works, then it is removed (steps below). |
| Cloudflare Workers static assets | `https://mixtura.nexumia.de/` (owner attaches it) | Target. Worker `mixtura`, deployed by the job `deploy-cloudflare` once the secrets exist.                                 |

## What is in the repository

- `wrangler.jsonc`: worker `mixtura`, `assets.directory` `./packages/app/dist`, no
  `main` (no worker script: every request is answered from the files),
  `not_found_handling: "none"` and `"previews": {}`. No custom domain route:
  the owner attaches it in the dashboard.
- `packages/app/headers.mjs`: the one source of the Content-Security-Policy.
  `build.mjs` writes it into the `<meta>` tag of `index.html` (the
  source file has the placeholder `{{CSP}}`) and, with `frame-ancestors
'none'` added, into `dist/_headers`. The meta tag stays, so the app is
  protected on any other host too. The build test fails if the two differ.
- `tools/wrangler/package.json`: the one place that pins the wrangler version
  (`4.158.0`, the version of the owner's other web app; Previews need 4.135.0
  or later[^cf-previews]). The job reads it; Dependabot updates it weekly;
  nothing installs it in the workspace.
- `.github/workflows/ci.yml`, job `deploy-cloudflare`.

## `wrangler.jsonc`

- **404, not single-page-application.** Mixtura is a hash router: every screen
  is the one page `/` plus a `#/...` fragment that never reaches the server.
  `single-page-application` would answer every wrong path with `200` and the
  app; `none` (the documented default[^cf-routing]) answers `404`. With the
  service worker installed, a navigation to an unknown path is answered by the
  worker with the app anyway (it falls back to `index.html`).
- **HTML handling stays at the default** (`auto-trailing-slash`)[^cf-html]. `none`
  would stop `/` from serving `index.html`. The default redirects
  `/index.html` to `/` with a `307`, which mattered for the service worker, see
  below.
- `previews: {}` is required for `wrangler preview` and may be empty[^cf-previews].
  `assets` stays at the top level.

## Headers (`dist/_headers`)

`_headers` is read by Cloudflare, not served (a request for it is a `404`), and
applies to static asset responses only, not to worker responses (there is no
worker script)[^cf-headers]. Limits: 100 rules, 2,000 characters a line; the
build test checks both. Rules that match a request all apply, in file order.

```
/*
  Content-Security-Policy: <the page policy> frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: accelerometer=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), screen-wake-lock=(), serial=(), usb=()
  Cross-Origin-Opener-Policy: same-origin

/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
```

(`build.mjs` writes the real file; the policy is in
[development](development.md#content-security-policy).) The app uses none of
the denied browser features. `bluetooth=()` is left out: Chromium
reported "Unrecognized feature" for it. The headers also apply to `sw.js` and
`rank-worker.js`, so the workers run under the same policy.

### Caching: what each file gets, and why

The files have fixed names (`main.js`, `app.css`, `seed/seed.json`), not
content hashes, so nothing may be `immutable` and nothing gets a `max-age`.

- **`/`, `/index.html`, `/sw.js`, the manifest: `no-cache`.** The browser may
  store them but must ask the server before each use. A new build is seen at
  the next check: `sw.js` is what tells the browser that a new version exists, so
  it must never be served stale.
- **Everything else** (`main.js`, `rank-worker.js`, `theme-init.js`, `app.css`,
  `seed/seed.json`, icons, screenshots) keeps Cloudflare's default, `public,
max-age=0, must-revalidate` with an `ETag`[^cf-headers]: also revalidated on
  every use, answered with `304` when unchanged. Same effect as `no-cache`,
  and a changed file can never be served from the HTTP cache.
- **The service worker's own fetches.** `sw.js` precaches every file with
  `cache: 'reload'` (`src/sw.ts`), which skips the HTTP cache, so even a host
  with a `max-age` could not hand the new worker an old file. The page is
  answered from the worker's cache, never from the network, so after the first
  visit the HTTP headers matter only for the install fetches and the
  `sw.js` check. `e2e/update.mjs` covers the `max-age` case (it serves with
  GitHub Pages' header).

### The `/index.html` redirect and the service worker

Cloudflare answers `/index.html` with a `307` to `/`[^cf-html]. The worker
precaches `index.html`, so the stored copy is a redirected response; a
navigation answered with such a response fails in the browser
(`net::ERR_FAILED`). Reproduced against the local asset server of wrangler
4.158.0: opening `/index.html` or an unknown path with the worker in control
failed. `src/sw.ts` now rebuilds a redirected copy without the flag before it
answers (`plain`). `e2e/index-redirect.mjs` serves the app with that redirect
and fails without the fix.

## The deploy job

`deploy-cloudflare` is a job of `ci.yml`, not a new workflow, so that it gets
the build of the same run: the job `check` uploads `packages/app/dist` as the
artifact `dist`, and `deploy-cloudflare` (`needs: check`) downloads it. It
starts only when `check` passed. `check`, `e2e` and `e2e-slow` keep their names,
so the required checks do not change; the new job is not required.

- **Triggers.** Push to `main`: `wrangler deploy` (production). Pull request
  from this repository: `wrangler preview --name pr-<number>` (the
  pull request's merge ref has no branch name, which the preview name would
  otherwise default to)[^cf-wrangler]. Skipped (not failed) for fork pull
  requests and Dependabot, which get no secrets.
- **Without the secrets** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
  the job ends green: it writes the notice "Cloudflare secrets are not set,
  deploy skipped" into the job summary and the log and skips the steps below.
- **With them:** `cloudflare/wrangler-action` (commit and version as in the
  owner's other app) deploys with the pinned wrangler version. Then a smoke
  check requests the deployed address (the `deployment-url` of the action:
  the `workers.dev` address of the production worker, or the stable Preview
  URL[^action]), with retries and a descriptive `User-Agent` (workers.dev refuses
  default library ones[^cf-workersdev]), and fails unless the page has `id="app"`
  and a `Content-Security-Policy` header with `frame-ancestors 'none'`. The
  address goes to the job summary. On `main` one more step reports in the
  summary whether `https://mixtura.nexumia.de` answers; it never fails.
- `permissions: contents: read` only, `persist-credentials: false`, actions
  pinned to commit SHAs. No pull request comment and no cleanup script: the
  address is in the job summary, and shared workflow code is a later issue
  for phosh-toolkit.
- Closed pull requests leave their Preview behind (the oldest are deleted by
  Cloudflare at 100 Previews on the free plan[^cf-previews]).

## Owner steps (once)

1. **API token.** Cloudflare dashboard, Account API tokens, Create Token,
   custom token[^cf-actions]. Permission: **Account, Workers Scripts, Edit** (the
   documented "Workers Scripts Edit" / "Grants write access to Cloudflare
   Workers scripts"[^cf-permissions]; Previews need the same: "edit Workers
   Scripts and the resources used by the Preview", and this worker has no
   bindings[^cf-previews]). Account resources: include only the one account.
   No zone permission, no other account permission. Do not use the template
   "Edit Cloudflare Workers": it is broader. **Unverified:** that this one
   permission is enough for `wrangler deploy` and `wrangler preview` (needs a
   real token); if the first run reports a missing permission, add the one it
   names and correct this file.
2. **Secrets.** In the repository (Settings, Secrets and variables, Actions) or
   the organisation, add `CLOUDFLARE_API_TOKEN` (the token) and
   `CLOUDFLARE_ACCOUNT_ID` (Find account and zone IDs in the Cloudflare docs).
   As organisation secrets with access for the selected repositories they
   also serve Culina later ([Culina deployment](https://github.com/nexumia-de/culina/blob/main/docs/deployment.md)).
   Re-run `deploy-cloudflare` of the last CI run on `main` or push to `main`.
3. **First deploy.** The first push to `main` after step 2 creates the worker
   `mixtura` and its `workers.dev` address
   `mixtura.<account subdomain>.workers.dev`[^cf-workersdev]. The smoke check
   must be green.
4. **Custom domain.** Dashboard, Workers & Pages, the worker `mixtura`,
   Settings, Domains & Routes, Add, Custom Domain, enter `mixtura.nexumia.de`.
   Needs the zone `nexumia.de` active in the account and no existing CNAME
   for that hostname; Cloudflare creates the DNS record and the
   certificate[^cf-domains]. Check `https://mixtura.nexumia.de/` and the
   `Content-Security-Policy` header.
5. **Move the data.** Stored data belongs to the address ([install](install.md#where-the-data-lives)):
   on the old address Export Everything, on the new one Import File.
6. **Remove Pages** once the new address works: delete `.github/workflows/pages.yml`
   in a pull request, switch Pages off in the repository settings (Source
   to None), and change the present address in [install](install.md) to the new one.

## State on 2026-11-17

Checked from an agent session before the owner steps:

- `nexumia.de` resolved to Cloudflare addresses (`104.21.33.74`,
  `172.67.159.253`), so the zone is on Cloudflare and step 4 needs no
  nameserver change. Not checked in the dashboard.
- `mixtura.nexumia.de` and `culina.nexumia.de` had no DNS record: no CNAME
  stands in the way of the Custom Domain, and neither address answers yet.
- The secrets were not set; `deploy-cloudflare` skips. Steps 1 to 6 are open.
- Agent sessions cannot reach `mixtura.nexumia.de` (the session proxy refused
  the connection). To let an agent check the address after step 4, allow the
  host `mixtura.nexumia.de` in the session environment.

## Verified and not verified

Verified on 2026-11-17: `npm run check`; the build writes `_headers` and the
test compares its policy with the meta tag; `wrangler@4.158.0 deploy
--dry-run` accepts `wrangler.jsonc` and reads `packages/app/dist` without
credentials; wrangler's local asset server (`wrangler dev`) applied every
rule of `_headers` as listed above (including `no-cache`, the `307` of
`/index.html`, `404` for unknown paths and for `/_headers`); `e2e/csp.mjs`
(the test server applies `_headers`), `e2e/index-redirect.mjs`,
`e2e/update.mjs`, `e2e/subpath.mjs`, `e2e/walk.mjs`; the workflow with
`actionlint`; the no-secrets branch and the smoke script run locally.

**Unverified (needs credentials or the real service):** `wrangler deploy` and
`wrangler preview` against Cloudflare; the token permission above; the
`deployment-url` output for `preview`; the custom domain; whether the edge
sends exactly what the local asset server sends.

[^cf-headers]: [Cloudflare, Headers](https://developers.cloudflare.com/workers/static-assets/headers/)

[^cf-html]: [Cloudflare, HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)

[^cf-routing]: [Cloudflare, Static assets, routing behavior](https://developers.cloudflare.com/workers/static-assets/)

[^cf-previews]: [Cloudflare, Previews](https://developers.cloudflare.com/workers/previews/), [Get started](https://developers.cloudflare.com/workers/previews/get-started/), [Examples](https://developers.cloudflare.com/workers/previews/examples/)

[^cf-domains]: [Cloudflare, Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

[^cf-actions]: [Cloudflare, GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)

[^cf-permissions]: [Cloudflare, API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)

[^cf-workersdev]: [Cloudflare, workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

[^cf-wrangler]: [Cloudflare, Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

[^action]: [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action), `action.yml` outputs `deployment-url`, `preview-url`
