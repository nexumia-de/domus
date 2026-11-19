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
2. **Host package.** Done on 2026-11-19, in part. `packages/host`
   (`@nexumia-de/hospes`, TypeScript source, no build step) holds what
   Mixtura's sync code has that does not depend on its store, state or
   screens and that spaces still need: the cipher (`cipher.ts`,
   `errors.ts`, `base64.ts`) and the WebDAV adapter (`webdav.ts`,
   `webdav-url.ts`, `webdav-connection.ts`), moved with their tests and
   history; Mixtura imports them from the package and behaves as before.
   Not moved, on purpose: Mixtura's local store, sync cycle, scheduler,
   bindings, invites, the passphrase and the screens. They are tied to
   its place model (place, library and profile with a passphrase each),
   which goal 3 replaces by spaces with one random secret; moving them
   now would move code that is deleted next. They are rebuilt for spaces
   in the host package in goal 3 and 6, not moved. The integration test
   against the Docker server and the browser script `e2e/webdav.mjs`
   stay in Mixtura.
3. **Spaces.** Done on 2026-11-19, as libraries without a user yet. In
   `packages/model` ([sync](../packages/model/docs/sync.md)): the
   collection document, the sealed file, the invite, stamps that never
   go backwards, dropping removal markers after 90 days and the rule
   for a device that was away longer, each with vectors. In
   `packages/host` ([spaces](../packages/host/docs/spaces.md)): the
   secret and what is derived from it, sealing and opening a file, the
   invite as a link, the shared database `domus`, one sync cycle for a
   collection against any storage, and the loop that decides when to
   run one. Tested with two simulated devices and a fake storage; not
   yet run in a browser or against a real storage, which comes with
   goals 4 to 6.
4. **GitHub storage.** The adapter is built (2026-11-19,
   [github](../packages/host/docs/github.md)): reading and writing the
   files of a space in one private repository with a token, conflicts
   by the file's version, cheap polling, a connection test, finding the
   repository from the token, the links for the setup screen. **Nothing
   of it was run against GitHub**, and GitHub's documentation could not
   be read from the session; what it assumes is listed in its document.
   The first real use is the owner's, through the screens of goal 5.
   _Owner_: a private repository (created on 2026-11-19) and a
   fine-grained token for it.
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
