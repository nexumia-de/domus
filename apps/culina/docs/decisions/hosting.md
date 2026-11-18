---
type: Decision Record
title: Hosting stays portable, no walled garden
description: Decided by the owner on 2026-11-18. The app is a folder of static files that any static host or a self-hosted web server can serve; Cloudflare is the first host and only a thin adapter in this repository, with no shared deploy code in phosh-toolkit.
tags: [decision, deployment, hosting, portability]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
---

# Hosting stays portable, no walled garden

## Context

[Deployment](../deployment.md) planned Cloudflare Workers static assets
like Mixtura and wanted the deploy setup of both apps in shared code
first. Asked where that shared code should live, the owner answered on
2026-11-18: no walled garden; moving to another host or to self-hosting
must stay easy.

## Decision

1. **The product is `packages/app/dist/`**, a folder of static files
   built by `npm run build`. It runs from any static host and from a
   sub-path (`e2e/smoke.mjs` serves it below `/apps/cook/`), and needs
   no server code, no edge function and no host API.
2. **Nothing the app needs may exist only in a host's configuration.**
   The Content Security Policy is in `index.html`; the service worker
   handles caching and offline use. Host files (a `wrangler.jsonc`, a
   `_headers` file) may add to that, never carry it alone.
3. **The host is an adapter**: one small configuration file and one CI
   job in this repository. Changing the host replaces those two and the
   DNS record, nothing in `packages/`.
4. **No shared deploy code** in phosh-toolkit or materia. A reusable
   workflow would bind both apps to one host in one more place; a dozen
   lines per app are cheaper than that coupling. This replaces the plan
   in [deployment](../deployment.md) to share the setup first.
5. **No host service becomes a dependency of a feature**: no Workers
   KV, D1, R2, Pages Functions, host analytics or host authentication.
   Sync writes to storage the user configures
   ([sync decision](sync.md)), not to the host.
6. Cloudflare Workers static assets at `culina.nexumia.de` is the first
   host. The deploy job comes after the editor (issue 16), when the
   first build is worth showing.

## Consequences

- [Deployment](../deployment.md) documents, beside the Cloudflare job,
  how to serve `dist/` elsewhere (any static host; a self-hosted web
  server with HTTPS, which service workers require).
- A check that the build works without host files stays part of the
  browser tests: they serve `dist/` with the plain server in
  `e2e/serve.mjs`.
