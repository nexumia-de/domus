---
type: Plan
title: Deployment
description: Culina is not deployed yet (no app to serve); the planned address is culina.nexumia.de on Cloudflare Workers static assets, with the same setup as Mixtura, and the owner steps that will be needed.
tags: [deployment, cloudflare, plan, owner]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mixtura
    title: 'Mixtura, docs/deployment.md (the setup Culina will follow)'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/deployment.md
  - id: hosting
    title: 'Mixtura, decision record: Hosting on Cloudflare Workers static assets'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/decisions/hosting.md
---

# Deployment

**Not deployed.** `packages/app` holds only a tooling placeholder until the
shared-model decision (issue #2) allows engine and app code, so there is
nothing to put online and `culina.nexumia.de` does not answer.

## Plan

Culina starts on the host Mixtura uses[^mixtura][^hosting]: Cloudflare Workers
static assets, worker `culina`, custom domain `culina.nexumia.de`, deployed by
a CI job after `check` and `e2e` (`wrangler deploy` on `main`, a preview per
pull request). The job comes after the editor (issue 16), when the first build
is worth showing.

The host is an adapter, not a base ([hosting decision](decisions/hosting.md)):
the product is the static folder `packages/app/dist/`, the configuration file
and the job live in this repository and are not shared code, and no feature
uses a host service. Another static host or a self-hosted web server with
HTTPS can serve the same folder.

## State on 2026-11-17

- `nexumia.de` resolved to Cloudflare addresses, so the zone is on Cloudflare.
- `culina.nexumia.de` had no DNS record; nothing stands in the way of the
  Custom Domain.

## Owner steps (when the deploy job exists)

The same as Mixtura's owner steps[^mixtura], with the worker `culina` and the
domain `culina.nexumia.de`. If `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` are organisation secrets that include this
repository, steps 1 and 2 are already done. Agent sessions need the host
`culina.nexumia.de` allowed to check the address.

[^mixtura]: [Mixtura, Deployment](https://github.com/nexumia-de/mixtura/blob/main/docs/deployment.md)

[^hosting]: [Mixtura, Hosting decision](https://github.com/nexumia-de/mixtura/blob/main/docs/decisions/hosting.md)
