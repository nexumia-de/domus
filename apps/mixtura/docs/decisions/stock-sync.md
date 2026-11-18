---
type: Decision Record
title: Stock sync over storage the user configured
description: Stock is kept per place and a person's own data in a library; each can be synced to a WebDAV folder the user chose, encrypted in the browser with a passphrase per place; several storages at once; places can be combined; a second person joins by invite link or QR code; the general parts live in materia; what "no server" means now and the order of work.
tags: [decision, sync, webdav, stock, places, encryption, materia]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: spike
    title: 'Spike: WebDAV from the browser'
    url: ../webdav-spike.md
  - id: own-data
    title: 'Decision: a PWA with its own local data'
    url: pwa-own-data.md
  - id: shared
    title: 'Decision: where the shared model lives'
    url: shared-model.md
---

# Stock sync over storage the user configured

**Status: decided by the owner on 2026-11-18**, in the task, a change
of plan and the answers to the spike the same day. Points the agent chose are
marked "agent". What kind of storage is supported is in
[Bring your own backend](#bring-your-own-backend).

## Context

Stock was one record per ingredient on one device. People keep bottles
in more than one place and share a place with others: a flat with a
flatmate, the parents' house. Mixtura has no server and no
accounts[^own-data], so sharing has to go through storage the people
already have. The example that must work: my flat's stock syncs with my
flatmate over my Nextcloud, my parents' stock syncs with me over
theirs, and a third place stays local only.

## Decision

1. **Places.** A place is a stored entity (id, name). Stock is keyed by
   (place, ingredient) and each record carries `updatedAt`. Existing
   stock migrates into one default place.
2. **Places can be combined.** The user ticks the places that count;
   makeable, Buy Next and shelf life derive from the union of the
   ticked places. The ticks are a device setting. How the same
   ingredient in two places is shown: [below](#the-same-ingredient-in-two-places).
3. **Storages (backends).** A device-local list of configured storages
   (id, label, type, address, credentials). Several exist at once.
   Credentials never enter the export file, a sync file or an invite.
4. **Bindings.** Device-local: place to { storage, folder, passphrase }.
   The place record does not know where it is stored. A place without a
   binding is local only and causes no request.
5. **Adapter interface.** `read(path)` gives { body, etag };
   `write(path, body, ifMatch)`. WebDAV is the first implementation;
   the code above it does not know about WebDAV.
6. **Sync file.** One document per place: the place name, the stock
   records with `updatedAt`, tombstones for removals, and the custom
   ingredients the stock refers to (seed ingredients have stable ids
   and are not embedded). Nothing computed is written.
7. **Encrypted from the first version.** The document is encrypted in
   the browser with a passphrase per place before it leaves the device;
   the storage never sees readable stock. Details:
   [below](#encryption).
8. **Sync cycle.** Read, decrypt, merge, encrypt, write with
   `If-Match`, retry on a conflict. The merge is a pure function, per
   record, newest wins, with test vectors for every case; the clock is
   passed in. Because Nextcloud keeps the ETag on writes within one
   second[^spike], correctness does not rest on `If-Match`: every
   device keeps all its records and tombstones and merges again at the
   next sync, so an overwritten file delays convergence and loses
   nothing.
9. **Moving a place** to another storage: write the file there, switch
   the binding, leave a "moved" marker in the old file so other members
   are told to join again.
10. **Joining.** A second person joins through an invite link or QR
    code that carries storage type, address, folder, place and
    passphrase, and never the storage user name or password. Entering
    the same by hand stays possible. Details: [below](#invites).
11. **Where the code lives.** In materia[^shared]: places and combining
    them, the record merge with its vectors, the sync file format with
    its envelope, the adapter interface. In Mixtura: the WebDAV adapter,
    encryption with the browser's Web Crypto, the device-local storages
    and bindings, the sync cycle's side effects and the screens. Nothing
    drink-specific goes into materia.
12. **The rule changes.** "No network request the user did not start"
    becomes: the only requests to another host go to storage the user
    configured; sync is off by default; local data works offline as
    before. [AGENTS.md](../../AGENTS.md) and the
    [PWA decision](pwa-own-data.md) say so.
13. **Not now.** The Android APK (not decided), further adapters,
    changing a place's passphrase.

## The same ingredient in two places

Agent's choice, to be checked on the screen:

- **Derived views count an ingredient as there when any ticked place
  has it.** Makeable and Buy Next need one bottle, not which one.
- **The Stock list shows the ingredient once**, with the names of the
  ticked places that have it beside it ("My flat · Parents"). With one
  place ticked no place name is shown, so the screen looks as it does
  today.
- **Dates stay per place.** Opened-on and best-before belong to a
  bottle, and each place has its own. Shelf life lists each record
  separately with its place; an ingredient counts as fresh for a drink
  when at least one ticked place has a record that is not past its
  date.
- **Edits go to one place.** Marking an ingredient as there or gone, or
  setting a date, changes the record of one place. With one place
  ticked it is that place; with several, the row's place names are the
  controls, and a new entry goes to the place chosen in the add
  control (the last one used).
- Nothing merges records across places: two places never share a
  record, so combining is a view and not a sync.

## Encryption

Agent's choice of the scheme; the requirement is the owner's.

- **Web Crypto only, no dependency.** Key from the passphrase with
  PBKDF2-HMAC-SHA-256, 600,000 iterations, a random 16-byte salt per
  place; content with AES-256-GCM and a fresh random 12-byte nonce on
  every write. Argon2 would resist guessing better but is not in Web
  Crypto and would be a dependency shipped in the app.
- **Envelope.** The file is JSON: format name, format version, the key
  derivation parameters, the nonce and the ciphertext. Format name and
  version are bound to the ciphertext as additional data. Everything
  else, including the place name and the "moved" marker with the new
  address, is inside the ciphertext.
- **What the storage and its admin can see**: that a file exists, its
  size, when it changes and from which address. Not the place name,
  not the stock.
- **Where the passphrase is kept.** With the binding on each device, in
  the browser's storage, readable there like the storage password. It
  is not in the export file. The local stock itself is not encrypted on
  the device.
- **The app generates the passphrase** (the user may replace it): a
  generated one has enough entropy for PBKDF2, a chosen one often has
  not.

### When the passphrase is lost

- A device that is still bound has the passphrase and can show it again
  as an invite. Losing it means: no bound device is left, or the
  browser storage of all of them was cleared.
- The file in the storage then cannot be read by anyone. There is no
  recovery, no reset and no copy with us.
- Nothing local is lost: every device still has the stock of that place
  in clear. The way back is to bind the place again from one device,
  which writes a new file with a new passphrase, and to invite the
  others again.
- A wrong passphrase is reported as such (the authentication tag does
  not match) and never overwrites the file.

## Invites

- The invite is a link to the app whose data is in the URL fragment
  (`#…`), which browsers do not send to the server that hosts the app.
  The QR code encodes the same link, so a phone's camera opens it; the
  app needs no camera permission.
- It carries: format version, storage type, address, folder, place id
  and the passphrase. Never the storage user name or password: each
  member signs in to the storage with their own account, and the folder
  is shared between them in the storage itself.
- Address and folder are a proposal. The shared folder can sit at
  another path in the invited person's account (on Nextcloud the
  address contains the user name), so the join screen shows both for
  editing and asks which configured storage to use, or to add one.
- Whoever has the invite and access to the folder can read and change
  the place's stock. The screen says so where the invite is shown.

## Bring your own backend

Decided by the owner on 2026-11-18, after the spike[^spike] showed that
a browser page cannot reach a Nextcloud whose administrator does not
add CORS headers, and that the owner administers neither of the
Nextcloud instances in the example.

1. **The user brings the backend, Mixtura offers none.** No relay and
   no storage of ours. What the user brings can be a WebDAV provider, a
   WebDAV server of their own (for example in Docker), or a small
   service they deploy themselves (for example a Cloudflare Worker in
   their own account).
2. **What a backend must do** to work with the app in a browser: keep
   one file per place, answer `GET` and `PUT` with an `ETag`, honour
   `If-Match`, and answer CORS requests from the app's origin
   (`Access-Control-Allow-Origin`, the preflight without credentials,
   `Access-Control-Expose-Headers: ETag`). An unmodified Nextcloud does
   not; its public share links do not either (tested, see the spike).
3. **Mixtura ships setup guides, not services**: the CORS configuration for
   a web server in front of WebDAV, a Docker setup of a WebDAV server
   that answers CORS (the one the tests use), and later a Worker the
   user deploys in front of storage that does not answer CORS.
4. **The Content-Security-Policy is widened** from `connect-src 'self'`
   to `connect-src 'self' https:` plus `http://localhost:*` and
   `http://127.0.0.1:*`, because the backend's address is the user's.
   That requests go only to configured storages then rests on the code
   and a test that records every request, not on the browser. A backend
   in the local network without TLS stays unreachable from the hosted
   app (mixed content); `localhost` is the exception browsers make.
5. **Later, not in the first version**: a native transport in a wrapped
   app (a Flatpak shell on Linux, an APK on Android), where CORS does
   not apply and a plain Nextcloud works; a Bar Assistant adapter for
   people who run one. Both are further adapters or transports behind
   the same interface.

Because the file is encrypted with the place's passphrase, a backend,
whoever runs it, sees only ciphertext.

## A person's own data: the library

Added by the owner on 2026-11-18: a user has several devices and wants
everything of theirs on all of them, in the first version. The design is
the agent's (#143).

1. **Two synced units.** A _place_ is shared with other people and
   holds stock. The _library_ is one person's own data, meant for their
   own devices: specs with all versions and riffs, own templates, custom
   ingredients, affinities, the list of places, and preferences.
2. **The same mechanism.** One encrypted file on a backend the user
   chose, with its own passphrase; the same adapter, merge and cycle; a
   second device joins by invite link or QR code.
3. **One join brings everything.** The library carries, per place, the
   backend address, the folder and the passphrase, so a second device
   of the same person gets every place by joining the library once.
   Storage user names and passwords are never in it; they are entered
   once per device.
4. **Preferences that sync**: units, the alcohol thresholds, the Buy
   Next options, theme. **Device-only**: storage credentials, which
   places are ticked and which one new entries go to, the backup
   reminder state, editor drafts.
5. **Every user entity gets a change time and removal markers**, as
   stock did with places (#131). A removal carries over; an edit made
   later on another device wins over an earlier removal.
6. **Versions.** A version is written once and never changed, so
   versions merge by id. Two devices that both created the same version
   number of one drink while offline: both are kept, and the one created
   later gets the next free number at merge, by a rule that gives the
   same result on every device.
7. **Not in the first version**: sharing a library or single drinks
   with other people (#142). Each device makes its own default place
   before it joins; joining a library offers to fold that place into one
   of the library's places.

## Consequences

- The migration to places is a store schema change and an export format
  change; the import keeps reading the old format.
- Clocks: "newest wins" compares device clocks. A device with a wrong
  clock can win or lose wrongly; the merge is deterministic on equal
  times, and the limit is documented with the merge.
- Tests need a WebDAV server; which one is chosen and justified with
  the adapter.
- A general change to sync is a pull request in materia, a tag by the
  owner, then a bump here.

## Order of work

1. Record the decisions (this file, the roadmap, the issues).
2. Mixtura: cut the unit table out of the general modules (step 6 of
   the [extraction order](../shared-model.md#extraction-order), #118).
3. materia: set up the repository and move the general model there
   (step 8). The owner tags `v0.1.0`.
4. Mixtura: the engine depends on materia at `v0.1.0`; public API and
   tests unchanged (#43).
5. materia: places and combining, the record merge with vectors, the
   sync file format with its envelope, the adapter interface. The owner
   tags `v0.2.0`.
6. Mixtura, one pull request each: places with migration and combined
   places; encryption; WebDAV adapter with storages, bindings and the
   policy change; sync cycle with moving; screens; invite link and QR
   code; the end-to-end test of the roadmap's "done when".
7. The owner makes Mixtura and Culina public.

[^spike]: [Spike: WebDAV from the browser](../webdav-spike.md)

[^own-data]: [A PWA with its own local data](pwa-own-data.md)

[^shared]: [Where the shared model lives](shared-model.md)
