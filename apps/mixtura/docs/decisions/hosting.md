---
type: Decision Record
title: Hosting on Cloudflare Workers static assets
description: Proposed on the owner's direction of 2026-11-17 (host like LocalGameGalaxy), accepted when the owner merges it. The app is hosted on Cloudflare Workers static assets at mixtura.nexumia.de instead of GitHub Pages, for real headers, correct caching, a preview per pull request and one pattern with the owner's other web app.
tags: [decision, hosting, cloudflare, pwa, headers]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: deployment
    title: 'Deployment (how it is built, the headers, the owner steps)'
    url: ../deployment.md
---

# Hosting on Cloudflare Workers static assets

**Status: proposed.** The owner gave the direction on 2026-11-17 (host on
Cloudflare as LocalGameGalaxy does); merging this change accepts it.

## Context

The app is static files and was set up for GitHub Pages (`pages.yml`); Pages
was never switched on in the repository settings, so it was never published
there. Pages cannot set response headers: the
Content-Security-Policy is only a meta tag, which cannot carry
`frame-ancestors` ([development](../development.md#content-security-policy)),
and every file is served with `max-age=600`, which the service worker works
around with `cache: 'reload'`. The owner's other web app already runs on
Cloudflare Workers static assets.

## Decision

Host Mixtura on Cloudflare Workers static assets, worker `mixtura`, at
`mixtura.nexumia.de` (custom domain attached in the dashboard). Deploy from
CI: `wrangler deploy` on `main`, `wrangler preview` for pull requests from
this repository. The Pages workflow is removed (2026-11-18: never published,
see Context). Details: [deployment](../deployment.md)[^deployment].

## Reasons

- **Real headers and correct caching for a PWA:** the policy as a header with
  `frame-ancestors 'none'`, `nosniff`, referrer, permissions and opener
  policies, and `no-cache` for the files that announce a new version.
- **A preview per pull request** at its own address.
- **One pattern with the owner's other web app:** same wrangler pinning,
  same job shape, same account.
- **Room for a worker route later** without moving the site (a `main` script
  and `run_worker_first` for some paths), although the architecture
  rules (no server, no account, no request the user did not start) do not call
  for one.

## Costs

- An API token to look after (rotate, scope to one account, keep out of
  forks); the deploy job skips quietly while it is missing.
- DNS and hosting at one provider.
- A deploy tool (wrangler) that is not in the workspace, pinned in
  `tools/wrangler/package.json` and updated by Dependabot.

## Consequences

The Meta policy stays, so the app is protected on any host; both policies come
from one source in the build. The service worker rebuilds the redirected copy
of `index.html` that Cloudflare's default HTML handling produces.
