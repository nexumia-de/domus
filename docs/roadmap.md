---
type: Plan
title: Roadmap
description: The goals that concern the whole repository and their order - one address, the shared host package, spaces, the sync server, the apps on spaces, further storages; what each needs from the owner. The apps' own goals stay in their roadmaps.
tags: [plan, roadmap, origin, sync, spaces, server, storages]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Decision: one address, spaces, and the storages on offer'
    url: decisions/one-origin-spaces-storages.md
---

# Roadmap

What has to be built for the [decision](decisions/one-origin-spaces-storages.md)
of 2026-11-19, in order. Each goal is usable on its own and leaves the
checks green. The apps' own goals are in their roadmaps
([Mixtura](../apps/mixtura/docs/roadmap.md),
[Culina](../apps/culina/docs/roadmap.md),
[Emptio](../apps/emptio/docs/roadmap.md)).

0. **One repository.** Done on 2026-11-19
   ([decision](decisions/one-repository.md)).
1. **One address.** A test that separately installed apps on one
   address stay apart (Chrome, Epiphany); one build that puts every app
   into its folder with its own manifest and service worker; Domus as a
   page at the root that links the apps; one deploy to
   `domus.nexumia.de`; the old addresses forward.
   _Owner_: the DNS entry and route for `domus.nexumia.de`.
2. **Host package.** `packages/host`: the local store, the cipher and
   the sync cycle taken out of Mixtura, with their tests; Mixtura uses
   them from there and behaves as before.
3. **Spaces.** In `packages/model`: the space document, the invite, the
   logical clock and the dropping of old removal markers, each with
   vectors. In `packages/host`: key derivation, the shared database,
   the storage port with `watch`.
4. **Sync server.** `server/`: the contract, the Worker and the
   container from one code base, the setup link, push; an adapter for
   it in `packages/host`; tests that run the same suite against both.
   _Owner_: deploys the Worker to their Cloudflare account.
5. **Domus screens.** Storages, spaces, invites, joining by link and
   QR code, export and import, at the root address and reachable from
   every app.
6. **Mixtura on spaces.** Stock as a shared collection; the earlier
   sync code and screens removed.
7. **Emptio on spaces.** Its goals 1 and 2 (the list, shared) on the
   shared packages, with the short polling and push.
8. **Culina on spaces.** Stock shared with Mixtura's; its sync goal.
9. **Further storages.** WebDAV moved to the new port, then S3, then
   GitHub.
10. **Sign-in storages.** Dropbox, Google Drive, OneDrive.
    _Owner_: an app registration and client id with each provider.

Goals 6 to 8 can change places; 9 and 10 can start once goal 3 is done.
