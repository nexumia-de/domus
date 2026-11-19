---
type: Plan
title: Roadmap
description: The goals that concern the whole repository and their order - one address, the shared host package, spaces, GitHub as the first storage, the Domus screens, the apps on spaces, the sync server, further storages; what each needs from the owner and what is not planned. The apps' own goals stay in their roadmaps.
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
1. **One address.** Done on 2026-11-19
   ([deployment](deployment.md)): one build with every app in its
   folder, a page at the root, the browser check that the apps stay
   apart, the deploy, the old addresses redirecting; the owner
   installed the apps from the new address and they are separate apps.
2. **Host package.** `packages/host`: the local store, the cipher and
   the sync cycle taken out of Mixtura, with their tests; Mixtura uses
   them from there and behaves as before.
3. **Spaces.** In `packages/model`: the space document, the invite, the
   logical clock and the dropping of removal markers after 90 days,
   each with vectors. In `packages/host`: key derivation, the shared
   database, the storage port with `watch`.
4. **GitHub storage.** The adapter for a private repository with a
   token, collecting writes, the invite that may carry the token. The
   owner's storage, so it comes before the server.
   _Owner_: a private repository and a fine-grained token for it.
5. **Domus screens.** Storages, spaces, invites, joining by link and
   QR code, export and import, at the root address and reachable from
   every app; Domus installable after the test of goal 1.
6. **Mixtura on spaces.** Stock as a shared collection; the earlier
   sync code and screens removed.
7. **Emptio on spaces.** Its goals 1 and 2 (the list, shared) on the
   shared packages, with the short polling.
8. **Culina on spaces.** Stock shared with Mixtura's; its sync goal.
9. **Sync server.** `server/`: the contract, the Worker and the
   container from one code base, the setup link, push; its adapter;
   tests that run the same suite against both. For households that
   want push or no GitHub account.
10. **Further storages.** WebDAV moved to the new port, then S3.

Not planned: Dropbox, Google Drive and OneDrive. They need an app
registration with each provider that the owner does not want to hold;
the storage port leaves room for someone else to add them.

Goals 6 to 8 can change places; 9 and 10 can start once goal 3 is done.
