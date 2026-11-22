---
type: Reference
title: Deployment
description: Culina is deployed from main to culina.nexumia.de on Cloudflare Workers static assets by the CI job deploy; the host is an adapter of two small files, and the same static folder runs on any other static host or an own web server.
tags: [deployment, cloudflare, hosting, owner]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: cf-domains
    title: 'Cloudflare, Workers: Custom Domains (read 2026-11-18)'
    url: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
  - id: cf-assets
    title: 'Cloudflare, Workers static assets: Get started (read 2026-11-18)'
    url: https://developers.cloudflare.com/workers/static-assets/get-started/
  - id: mixtura
    title: 'Mixtura, docs/deployment.md (the redirect of index.html and its effect on a service worker)'
    url: ../../mixtura/docs/deployment.md
---

# Deployment

**Replaced on 2026-11-19.** Culina is no longer deployed on its own. It
is served from `domus.nexumia.de/culina/` together with the other apps,
and `culina.nexumia.de` redirects there
([deployment of the repository](../../../docs/deployment.md)). The
worker `culina`, its `wrangler.jsonc` and the deploy job below describe
the time before.

Every push to `main` that passed `check` and `e2e` is deployed to
`culina.nexumia.de` by the job `deploy` of `.github/workflows/ci.yml`. The
host is Cloudflare Workers static assets[^cf-assets]; it is an adapter, not a
base ([hosting decision](decisions/hosting.md)).

**State on 2026-11-18:** the first run of `deploy` (merge of pull request 61)
succeeded and `https://culina.nexumia.de/` answers. Checked from an agent
session with a browser at 360 px: the start page, `/index.html` (answered
with `307` to `/`) and `#/components` open with the service worker in
control, and a reload works offline.

**Found there:** Cloudflare adds its Web Analytics script
(`static.cloudflareinsights.com/beacon.min.js`) to the page it serves. The
page's Content Security Policy refuses it, so nothing is loaded or sent, but
the browser console shows one error per page load, and the app's rule is no
telemetry. It is a setting of the Cloudflare zone, not of this repository;
see the owner steps.

## What is deployed

`packages/app/dist/`, the folder `npm run build` writes: static files, no
server code. It needs HTTPS (service workers require a secure context) and
works at the root of a domain or below a sub-path.

## The Cloudflare adapter

- `wrangler.jsonc`: worker `culina`, `assets.directory`
  `./packages/app/dist`, the Custom Domain `culina.nexumia.de`
  (`routes` with `custom_domain: true`[^cf-domains]). No worker script, no
  binding, no `_headers` file. `npx wrangler deploy --dry-run` reads it
  without credentials (tried with wrangler 4.158.0: 11 files read).
- `tools/wrangler/package.json`: the one place that pins the wrangler
  version. It is not a workspace, so `npm ci` does not install wrangler;
  the job runs `npx wrangler@<that version> deploy`. Dependabot watches
  the folder.
- Job `deploy`: needs `check` and `e2e`, runs only for a push to `main`,
  one deploy at a time. It builds and deploys with the repository secrets
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Wrangler's usage
  telemetry is switched off (`WRANGLER_SEND_METRICS=false`). There are no
  preview deployments per pull request.

`deploy` is skipped on pull requests, so it is not a required status check;
the ruleset keeps `check` and `e2e`.

## The redirect of `index.html`

Cloudflare answers `/index.html` with a redirect to `/`[^mixtura]. The
service worker precaches `index.html`, so the stored copy is marked as
redirected, and a browser refuses such a response for a navigation
(`net::ERR_FAILED`): after the first visit the start page itself would no
longer open. `src/sw.ts` answers with the same content in a new response
when the stored one carries the mark. This is not Cloudflare-specific: any
host with that redirect is covered. **Test:** `e2e/host-redirect.mjs` serves
`dist/` with a `307` for `index.html` and opens `/`, `/index.html` and an
unknown path under the worker, online and offline; without the fix all
three fail.

## Another host, or self-hosting

Build, then serve `packages/app/dist/` as static files over HTTPS. Nothing
else is required:

- The Content Security Policy is in `index.html`, not in host headers.
- The service worker fetches and caches the files itself; the host should
  not cache `sw.js` and `index.html` for long (revalidation, `no-cache`),
  so that a new build is seen.
- An unknown path may answer `404`; the app routes by hash and never asks
  the server for a screen.
- To move: replace `wrangler.jsonc`, `tools/wrangler/` and the job
  `deploy` by the new host's way of taking a folder, and change the DNS
  record. Nothing in `packages/` changes.

Tried here: the browser tests serve `dist/` with the plain Node server in
`e2e/serve.mjs`, at the root and below `/apps/cook/`.

## Owner steps

1. The secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are
   available to this repository (the owner added them on 2026-11-18). The
   token needs the right to edit Workers scripts and, for the Custom
   Domain, to edit Workers routes of the zone `nexumia.de`.
2. Done on 2026-11-18: the first `deploy` created the Custom Domain with
   its DNS record and certificate[^cf-domains].
3. Open: switch off the automatic Web Analytics script for
   `culina.nexumia.de` in the Cloudflare dashboard (Web Analytics of the
   account, the entry of the site), so that no beacon script is added to
   the page.

## Open

- Headers a page cannot set for itself (`frame-ancestors`,
  `X-Content-Type-Options`, `Referrer-Policy`) are not sent. On Cloudflare
  a `_headers` file would add them; each other host has its own way.

[^cf-domains]: [Cloudflare, Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

[^cf-assets]: [Cloudflare, Workers static assets](https://developers.cloudflare.com/workers/static-assets/get-started/)

[^mixtura]: [Mixtura, Deployment](../../mixtura/docs/deployment.md)
