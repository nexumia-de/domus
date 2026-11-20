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
5. **Domus screens.** First usable version built on 2026-11-19: the
   Household app at the root of the address ([screens](../apps/domus/docs/screens.md)).
   Home with the apps and the spaces on the device; create a space (name,
   GitHub with the three guided steps, or WebDAV, create with a cycle on its
   own collection `space`); a space (rename, Sync now, remove from this
   device); invite by link and QR code with the storage access as an option
   that is off by default; join by link; change the storage access; every
   failure in words, English and German, phone first. Tested by unit tests and
   by browser checks with two devices against a fake of GitHub's REST API.
   **Not done**: it is **not installable** (no manifest or service worker
   until the scope test of [deployment](deployment.md)); **the apps do not
   link to it** and keep their own sync screens; **export and import are
   not built**; **nothing was run against the real GitHub** (the first real
   use is the owner's) and WebDAV only against a fake; **no collection of the
   apps is synced** (only `space` with the space's name), no sync loop runs
   and the code was not scanned with a camera.
6. **Mixtura on spaces.** Done on 2026-11-20
   ([decision](../apps/mixtura/docs/decisions/stock-in-spaces.md)).
   Stock is the collection `stock` of a space: the key is the
   ingredient id, the value says whether it is at hand, with optional
   dates and a note, and keeps fields of other apps. Mixtura reads and
   writes it in the shared database and runs one loop of the host
   package per shared space; its own places, storages, passphrases,
   invites, sync code and Sync page are removed, and "place" is "space"
   everywhere. A device without a space gets **a space on this device
   only** (`packages/host`, storage type `device`), so stock has a home
   before sync is set up; the Household app shows it and can **connect a
   storage** to it, which keeps its id, secret and data. The earlier sync
   model left the shared packages too: the place document, the envelope,
   units and the passphrase cipher. Mixtura's export file no longer
   holds stock (format version 3).
   **Not done**: the user's own ingredients and drinks are not synced, so
   a mark for an own ingredient shows only where that ingredient exists;
   a backup of a space (Household's export) is not built, so the stock of
   a space on this device only has none; **nothing was run against the
   real GitHub**; the Docker WebDAV server, the CORS fronts and the
   integration test left with Mixtura's sync code and come back with
   goal 10.
7. **Emptio on spaces.** Done on 2026-11-20
   ([behaviour](../apps/emptio/docs/behaviour.md)). The shopping list is
   built: entries with priority and category, suggestions from earlier
   entries, ticking, clearing with Undo, categories, English and German,
   installable and offline under `/emptio/`. The list is the collections
   `list` and `list-categories` of a space; a shared one is read again
   every 15 seconds. What two apps need moved to the host package with
   it: the loops of an app (`createCollectionSync`, from Mixtura), the
   choice of the shown space, a service worker, and the browser harness
   with the fake of GitHub's API (from the Household app).
   **Not done**: adding from a food catalogue (there is no shared
   catalogue yet), export and import, **nothing was run against the real
   GitHub**.
8. **Culina on spaces.** Stock done on 2026-11-20
   ([decision](../apps/culina/docs/decisions/stock-in-spaces.md)).
   Culina's stock is the collection `stock` of a space, the same one
   Mixtura writes: the key is the ingredient id or a component's family
   id, the value `{ present, … }` with the shared names `openedOn`,
   `bestBefore` and `note` and Culina's own `amount`, `state`, `always`,
   `storage` and `batches`; fields of other apps are kept. Items from
   before are moved into the space once. One loop of the host package
   per shared space; Culina's export no longer holds stock (format
   version 2). **How the catalogues meet** (the agent's choice, open to
   the owner): the ids of the two apps do not overlap, each app shows
   the records whose key it knows, and a table of equal things will live
   with the shared catalogue package (cibus), which is not built.
   **Not done**: Culina's libraries and profile (recipes, settings) are
   not synced; nothing was run against a real storage; a shared space
   was never seen in Culina in a browser.
9. **Sync server.** `server/`: the contract, the Worker and the
   container from one code base, the setup link, push; its adapter;
   tests that run the same suite against both. For households that
   want push or no GitHub account.
10. **Further storages.** WebDAV against a real server again (the
    adapter is on the new port and offered by the Household app, but
    since goal 6 tested against a fake only; the Docker server, the
    nginx and Caddy fronts and the setup guide are in the history of
    `apps/mixtura`), then S3.

11. **Native Linux apps.** Decided on 2026-11-20
    ([decision](decisions/native-linux-gjs.md)): libadwaita screens in
    GJS for Phosh that reuse the engines and the sync code. **Emptio is
    built** ([native Linux app](../apps/emptio/docs/native-linux.md)):
    the list, an entry, categories, preferences, joining a space by
    invitation link, a Flatpak manifest and CI jobs. **Not done**: the
    Flatpak bundles CI builds were never installed and nothing ran on a
    phone; Mixtura and Culina
    follow, each in a session of its own; the platform pieces move to a
    shared package with the second app.

Not planned: Dropbox, Google Drive and OneDrive. They need an app
registration with each provider that the owner does not want to hold;
the storage port leaves room for someone else to add them.

Goals 6 to 8 can change places; 9 to 11 can start once goal 3 is done.
