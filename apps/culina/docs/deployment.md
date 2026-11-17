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

Culina gets the setup Mixtura uses[^mixtura][^hosting]: Cloudflare Workers
static assets, worker `culina`, custom domain `culina.nexumia.de`, deployed by
a CI job after `check` (`wrangler deploy` on `main`, `wrangler preview` per
pull request). It is added together with the first app build that is worth
showing. What both apps need for deploying (`wrangler.jsonc` shape, the job,
the `_headers` file) moves into shared code first instead of being copied.

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
