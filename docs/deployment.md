---
type: Guide
title: Deployment
description: How the one address domus.nexumia.de is built and deployed - the layout of the site, why the root page has no manifest, the headers per folder, the browser check that the apps stay apart, the deploy job, and what the owner has to do; the addresses of the single apps still exist beside it.
tags: [deployment, cloudflare, pwa, origin, service-worker, headers, owner]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Decision: one address, spaces, and the storages on offer'
    url: decisions/one-origin-spaces-storages.md
  - id: mixtura
    title: 'Mixtura: deployment (headers, caching, the token permission)'
    url: ../apps/mixtura/docs/deployment.md
  - id: culina
    title: 'Culina: deployment'
    url: ../apps/culina/docs/deployment.md
---

# Deployment

All apps are served from one address, `domus.nexumia.de`
([decision](decisions/one-origin-spaces-storages.md)), goal 1 of the
[roadmap](roadmap.md). State on 2026-11-19: the build, the browser
check and the deploy job exist and pass here; **whether the address
answers is not confirmed** until the first run of `site-deploy` on
`main` (see [owner](#owner)).

## The site

`npm run build:site` builds every app and writes `./dist`:

| Path        | From                                      |
| ----------- | ----------------------------------------- |
| `/`         | `apps/domus` (a page that lists the apps) |
| `/mixtura/` | `apps/mixtura/packages/app/dist`          |
| `/culina/`  | `apps/culina/packages/app/dist`           |

The list is `scripts/site.mjs`. Emptio is added there when it has a
build. Both apps already used relative addresses for every file, their
manifest (`id`, `scope`, `start_url` are `./`) and their service worker,
so each is a PWA of its own in its folder and installs alone.

**The root page has no manifest and no service worker.** An installable
page at `/` would have a scope that covers the apps' folders; whether
the browsers the owner uses keep such an app apart from the apps below
it is not tested. Domus becomes installable with its screens (goal 5),
after that test.

**Headers.** `scripts/build-site.mjs` writes one `_headers` file. An
app's own `_headers` (Mixtura) is taken with every path moved into its
folder; a folder without one (Culina) and the root page get a baseline
(`frame-ancestors 'none'`, `nosniff`, `no-referrer`, same-origin opener
policy) and `no-cache` for the files with fixed names. The rules of two
folders never overlap, because Cloudflare joins the values when two
rules set the same header.

## What sharing an address means

Local data belongs to the address, not to an app. Checked by
`npm run e2e:site` (`scripts/site-e2e.mjs`, Chromium, 360 x 720), which
serves `./dist` the way Cloudflare does:

- every app is controlled by the service worker of its own folder, and
  there is one scope per app and none above them;
- every app's cache is still there after the others activated, in both
  orders. This found a defect: Mixtura's worker deleted every cache but
  its own on activation, which was right on its own address and would
  have removed Culina's offline copy here; it now deletes only caches
  named `mixtura-…`;
- the database names differ (`mixtura`, `culina`);
- every app loads offline;
- no console error and no request to another host.

Not checked by a script: installing two apps on a phone or on Phosh and
seeing two separate apps; `localStorage` keys (they are prefixed with
the app's name today, by reading the code, with no test); the storage
quota, which the apps now share; "clear site data", which clears all
apps together.

## Deploy

One Cloudflare Worker with static assets, `domus` (`wrangler.jsonc` at
the root, `not_found_handling: "none"`, custom domain
`domus.nexumia.de`). The CI job `site-deploy` runs on `main` after
`site-check`, `mixtura-check` and `culina-check`: it builds the site,
deploys with the wrangler version pinned in `tools/wrangler/package.json`
and then asks the address for `/`, `/mixtura/` and `/culina/`. Without
the secrets it says so and stays green.

The earlier deploys still run: `mixtura.nexumia.de`
([Mixtura](../apps/mixtura/docs/deployment.md)) and Culina's
([Culina](../apps/culina/docs/deployment.md), which waits for
`culina-e2e`). They are turned into forwards to the new address once it
answers; until then both exist.

## Owner

- The secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are
  set (2026-11-19).
- **The custom domain.** `wrangler.jsonc` asks Cloudflare to attach
  `domus.nexumia.de`. Mixtura's token has the permission "Workers
  Scripts, Edit" only and its domain was attached by hand. If
  `site-deploy` fails at the deploy step or at "Check the address",
  attach it in the dashboard: Workers & Pages, the worker `domus`,
  Settings, Domains & Routes, Add, Custom Domain.
- **Test on your devices**: install Drink Builder and Cook's Notebook
  from the new address on the phone and on Phosh and see that they are
  two apps with their own windows.
