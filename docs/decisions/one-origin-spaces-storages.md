---
type: Decision Record
title: One address, spaces, and the storages on offer
description: Decided by the owner on 2026-11-19. All apps are served from domus.nexumia.de with a folder per app and stay separately installable; sync is rebuilt on spaces (one random secret, one invite, one file per collection) without reading the earlier format; the household's own sync server (Worker and container, with push) and WebDAV are joined by S3, GitHub, Dropbox, Google Drive and OneDrive; no existing data has to be carried over.
tags: [decision, origin, pwa, sync, spaces, storage, server, adapters]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: one-repo
    title: 'Decision: one repository (where these points were left open)'
    url: one-repository.md
  - id: mixtura-sync
    title: 'Mixtura: stock sync over storage the user configured (the model this replaces)'
    url: ../../apps/mixtura/docs/decisions/stock-sync.md
  - id: culina-sync
    title: 'Culina: sync in three units'
    url: ../../apps/culina/docs/decisions/sync.md
  - id: emptio-plan
    title: 'Emptio: how it is built (a file per app in the place, hand-over by link)'
    url: ../../apps/emptio/docs/architecture.md
---

# One address, spaces, and the storages on offer

**Status: decided by the owner on 2026-11-19**, as answers to four
questions of the agent after the repositories were joined[^one-repo].
What the owner chose is in the numbered points; everything under
"Agent's choices" is a proposal that the owner can change, and nothing
of it is built yet. The order of work is the [roadmap](../roadmap.md).

## Context

Three apps on three addresses cannot read each other's local data, so
storage credentials are entered once per app, hand-over goes through
links, and each app writes its own file into a shared place[^emptio-plan].
Sync had three kinds of unit with a passphrase each[^mixtura-sync][^culina-sync],
and the only storage was a WebDAV server that answers CORS, which is
hard to set up and hard to share with a second person. The owner wants
sync that is simple to set up, offers as many storages as possible and
is the same thing in all apps.

## Decision

1. **One address: `domus.nexumia.de`.** Each app is served from its own
   folder and stays a PWA of its own, installable alone. Domus itself
   (sync, spaces, invites, export) is at the root. The earlier addresses
   forward to the new ones.
2. **Sync is built on spaces.** A space is a group of people and their
   things. It has one random secret; the invite is one link or QR code
   and asks for no user name or password; each collection of a space is
   a file of its own. The earlier model (place, library and profile
   with a passphrase each) is not continued and its files are not read.
3. **Storages on offer.** The household's own sync server (one code
   base, run as a Cloudflare Worker or as a container, with push) and
   WebDAV were given; added by the owner: S3 (Cloudflare R2, Backblaze
   B2), GitHub (a private repository), and Dropbox, Google Drive and
   OneDrive.
4. **Nothing has to be carried over.** The owner is the only user and
   the existing data does not matter: no migration of local data to the
   new address, no reading of existing sync files.

## Agent's choices

Proposals to make the points above concrete.

### Address and installation

- Folders by the repository names: `/mixtura/`, `/culina/`, `/emptio/`.
  Each app has its own manifest (`id`, `scope` and `start_url` are its
  folder) and its own service worker for that scope.
- Domus at `/`. If a browser the owner uses (Epiphany on Phosh, Chrome
  on Android) does not keep an app installed at `/` apart from the apps
  below it, Domus moves to `/home/`; this is tested before the apps
  move.
- One deploy: one Cloudflare Worker with static assets serves the
  whole address. The Workers of `mixtura.nexumia.de` and Culina's
  address answer with a redirect to the same path under the new one.
- Local data hangs on the address, so all apps share it. Each app keeps
  its own database for what only it knows; what is shared (spaces,
  storages, stock, the list) is in one database of the shared host
  package. Clearing site data clears all apps together.

### Spaces

- **Secret**: 32 random bytes. From it, with HKDF-SHA-256 and distinct
  labels: the content key (AES-256-GCM, a fresh nonce per write), the
  space id, and the access token for the sync server. The server sees
  id and token, never the secret. PBKDF2 is no longer needed because
  the secret is not chosen by a person.
- **Invite**: storage type, address and the secret; for storages that
  need an account, the person signs in to it themselves. Whoever holds
  an invite reads and writes everything in the space; removing a person
  means a new secret and new invites.
- **Kinds**: a shared space (a household) and a personal one (a
  person's own devices) are the same thing with different members. A
  person can be in several.
- **Files**: `<space id>/<collection>.json`, one envelope each, for
  example `stock`, `list`, `stores`, `recipes`, `settings`. A
  collection belongs to the shared packages, not to one app: stock is
  one collection, whoever writes it.
- **Merge** stays per record and pure, with vectors. Two additions:
  a logical clock beside the wall clock, so a device with a wrong clock
  does not win every conflict; and removal markers older than 90 days
  are dropped, with the stated risk that a device offline for longer
  brings an entry back.
- **Freshness**: sync when an app opens or comes to the front and every
  15 to 30 seconds while a shared collection is on screen, reading with
  `If-None-Match`; a storage that can push (`watch`) replaces the
  polling.

### Sync server

- One contract: read a file, write it with a condition on its version,
  and be told when it changed. `GET` and `PUT` on
  `/s/<space id>/<file>` with a bearer token, `ETag`, `If-Match`,
  `If-None-Match`; server-sent events for changes; CORS for the
  configured app address built in.
- The first write to a space id needs the server's setup token and
  stores the hash of the space's access token; later requests need only
  the space's token. The server keeps ciphertext only.
- One code base in `server/`, run on Cloudflare (Worker with a Durable
  Object per space) or as a container (Node, files on disk). On first
  start the container prints a setup link; the Worker shows it once
  after deploy.
- This is still no server of ours: the household runs it.

### Storages

| Storage                  | Shares with other people                | Push | Needs                              |
| ------------------------ | --------------------------------------- | ---- | ---------------------------------- |
| Sync server              | yes, by invite alone                    | yes  | the household deploys it once      |
| WebDAV                   | only with an account on the same server | no   | a server that answers CORS         |
| S3 (R2, B2)              | only with a key for the bucket          | no   | a bucket with a CORS rule          |
| GitHub                   | only with access to the repository      | no   | a token for one repository         |
| Dropbox, Drive, OneDrive | only through a folder both can open     | no   | sign-in; an app registration by us |

- The adapters are in the shared host package; an app does not know
  which storage a space uses.
- Dropbox, Google Drive and OneDrive sign in with OAuth and PKCE in
  the browser, without a server. Each needs a client id that the owner
  registers with the provider; until one exists, that storage is not
  offered. This is an account of the project with the provider, not of
  the user with us.

## Consequences

- The rules "a place is the same place in every app, with a file per
  app" and "hand-over by link" are replaced: apps on one address write
  the shared collections directly.
- Mixtura's sync code is taken apart: the general part moves to shared
  packages, and its screens for storages and invites become Domus's.
- The decisions of the parts about sync describe the time before; each
  gets a note when its code changes.
- A later Android package has its own storage; one package for all
  apps would keep them together. Not decided.
