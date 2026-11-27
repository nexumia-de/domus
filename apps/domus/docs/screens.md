---
type: Specification
title: Screens
description: The routes and screens of the Household app with the intent of their texts - Home, Create a space (four steps, the three GitHub steps, WebDAV), a space, Invite with a QR code, a space on this device only and Connect a storage, Join, Change access - the sentence for every failure, what was decided where the brief was open, and what is not done or not verified.
tags: [screens, spaces, sync, invite, github, webdav, device-only, qr, i18n]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Decision: one address, spaces, and the storages on offer'
    url: ../../../docs/decisions/one-origin-spaces-storages.md
  - id: spaces
    title: 'Spaces on the host (what the screens call)'
    url: ../../../packages/host/docs/spaces.md
  - id: github
    title: 'GitHub adapter (the table of answers behind the failure sentences)'
    url: ../../../packages/host/docs/github.md
  - id: mixtura-sync
    title: 'Mixtura: Sync screens (the wording of the WebDAV failures and the invite is theirs)'
    url: ../../mixtura/docs/screens-sync.md
---

# Screens

Phone first (320 to 360 px, touch targets of at least 44 px, no horizontal
scroll), the same at desktop width (a column of 36 rem). English and German;
the language follows the browser, a select in the footer of every page
overrides it (`Follow device`, `English`, `Deutsch`; a change reloads the
page) next to a theme select (`Follow device`, `Light`, `Dark`). The form of
address in German is "du". Every text is in `src/strings.ts` and
`src/strings-de.ts`. The words "space" and "storage" are _Raum_ and _Speicher_
in German; app names stay as they are.

## Routes

| Hash                    | Screen                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `#/`                    | Home                                                                                                     |
| `#/spaces/new`          | Create a space                                                                                           |
| `#/spaces/<id>`         | A space (the id is the 32 hex characters derived from the secret)                                        |
| `#/spaces/<id>/invite`  | Invite                                                                                                   |
| `#/spaces/<id>/connect` | Connect a storage, for a space on this device only                                                       |
| `#/spaces/<id>/access`  | Change the storage access (not in the brief, see [decisions](#decisions))                                |
| `#/join/<data>`         | Join; `<data>` is the fragment an invite link carries; `#/join` alone says "Paste the invite link first" |

An unknown hash is Home. The back stack is the browser history; Create has its
own Back button for each step.

## Home

The apps first (`.apps`: Drink Builder at `mixtura/`, Cook's Workbench at
`culina/`, as before), then **Sync**: one sentence on what it is for, then the
spaces on this device. Each is a card that links to the space: its name, its
storage in words (`GitHub: owner/name`, `WebDAV: host/path`, never a user name
or token), and the state of its last cycle:

| State   | Text                                                   | Derived from                                                                    |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| never   | Never synced                                           | no `syncedAt` stored for the collection `space`                                 |
| in step | In step · 5 min ago (German: Abgeglichen · vor 5 Min.) | `syncedAt` of the collection, the time of the last successful cycle             |
| failed  | Last sync failed, and the failure in words below       | the last failure this page saw, when newer than `syncedAt`; kept in memory only |

A space **on this device only** (made by an app before sync was set up, see
[below](#a-space-on-this-device-only)) shows its name and **On this device
only** (German: _Nur auf diesem Gerät_) in place of the storage words and the
state: it has no cycle, so no state and no failure.

Without a space the empty state says in two sentences what a space is (a group
of people and what they share; every device that knows the secret keeps the same
data in step, through a storage chosen by the person, encrypted, and nothing
leaves the device until a space is created or joined) and offers **Create a
space** and **Join with a link**. The second button moves to the field of the
same name that is always below: a text field for the pasted invite link (the
whole link, the `#/join/…` end of it, or what the address bar showed). A text
that is no invite is refused on the spot with the sentence of its error.

## Create a space

One decision per step, **Step n of 4**, Back always possible (the first Back
leaves for Home). Typed values stay when going back.

1. **Name.** Default suggestion `Home` / `Zuhause`; 1 to 60 characters; an empty
   name is refused in words.
2. **Storage.** Two choices, each with one sentence on what it needs: GitHub (a
   private repository, a GitHub account and a token for that one repository)
   and WebDAV (a folder on a server such as Nextcloud, an account, and CORS on
   the server). The household's own sync server and S3 are later goals and are
   not listed.
3. **Access.**
   - **GitHub**, three guided steps on one page, as in the
     [decision](../../../docs/decisions/one-origin-spaces-storages.md#storages):
     1. a button that opens GitHub's "new repository" form in a new tab with
        the name and `visibility=private` in the address (`setupLinks`), and
        the note that an existing private repository works too;
     2. a button that opens the "new token" form in a new tab, with a numbered
        list of what to click (a name and a lifetime; Repository access, Only
        select repositories, the repository; Permissions, Repository
        permissions, Contents, Read and write; Generate token and copy it);
     3. the token field (`type=password`, `autocomplete=off`, a Show/Hide button),
        with the line that it stays on the device, goes only to GitHub and is
        never put into an address.

     **Continue** calls `findRepositories`. One repository the token may write
     to is used without asking; several are listed to pick from (read-only ones
     are not offered); none, or none writable, says what to change in the
     token; a failure is told with the sentence of its kind. Then `testGithub`
     looks at the chosen repository: a **public** repository is warned about
     ("the files are encrypted, but anyone can see that they exist and how often
     they change"; Use it anyway / Use another repository), a repository the
     token **cannot write to** is blocked with the instruction to make the token
     again with Contents set to Read and write. The token's input is gone from
     the page as soon as the step is left.

   - **WebDAV**: address (https only, no user name or password inside),
     user name, password (Show/Hide), **Test connection** (the host package's
     probe) and **Continue** (tests, then goes on). The failures are the WebDAV
     sentences below.
4. **Create.** A summary (name, storage), then **Create space**: `newSecret`,
   `deriveSpace`, `putSpace`, the name written with `localChange`, one cycle on
   the collection `space`. On success the space's page opens with "The space is
   created. Its first file was written to the storage and read back." On failure
   the space is taken off the device again (nothing is kept, the secret is
   thrown away), the failure is told in words, and the person can fix the cause
   and press Create again.

## A space

The name as the heading, then a card with the storage in words, the state of
the last cycle and **Sync now**; a rename field (**Rename** saves at once,
writes the name with a cycle, and keeps it even if the cycle fails); **Invite
someone**; **Change storage access**; **Remove from this device**, which opens
a confirmation first: the space, its secret and the storage access are deleted
from this device only, the files in the storage stay, other devices are not
affected, and if this is the only device that knows the secret nobody can open
the files again. After a cycle the stored name follows the collection, so the
name another device wrote becomes the heading.

Card **Who uses this device** (on both kinds of space): the persons of the
space as buttons, the chosen one marked, and a field **New person** with
**Add me**. Apps keep what is personal, like Mixtura's ratings, under this
person ([persons](../../../packages/host/docs/persons.md)). Adding a person
syncs a shared space at once. Renaming, removing and merging persons are
not built.

## A space on this device only

An app that keeps a shared collection (first: Mixtura's stock) makes a space
when the device has none, so it has somewhere to put it before the household
set up sync ([spaces](../../../packages/host/docs/spaces.md)): a space with a
secret and an id like any other, but with the storage type `device`, for which
there is no adapter. This app never makes one; it shows it and gives it a
storage.

Its page has the name as the heading and a card that says **On this device
only** and one sentence: "This space and what the apps keep in it, for example
the stock, are on this device only. Nothing is sent anywhere.", with the primary
button **Connect a storage** (German: _Speicher verbinden_). There is no Sync
now, no state of a last cycle, no Invite someone and no Change storage access.
**Rename** stores the name and writes it to the collection `space` with
`localChange`, without a cycle; it is sent when a storage is connected.
**Remove from this device** stays, and its confirmation says what is true here:
the space is on this device only and no copy exists anywhere else; the space,
its secret and everything the apps keep in it are deleted for good and cannot be
brought back.

`#/spaces/<id>/invite` and `#/spaces/<id>/access` of such a space lead to its
page (the address bar entry is replaced): there is nothing to invite to and no
access to change. No function of `src/logic/actions.ts` runs a cycle for it;
one that is asked for all the same answers `bad-storage` and sends nothing.

## Connect a storage

`#/spaces/<id>/connect`, **Step n of 3**: the storage and the access steps of
[Create a space](#create-a-space) (steps 2 and 3 there: the choice of GitHub or
WebDAV, GitHub's three guided steps with the pick, the public warning and the
read-only block, WebDAV with its test), from the same code
(`src/screens/storage-steps.ts`, `src/screens/wizard.ts`). No name is asked
for; a line above the steps says which space this is and that the space, its
secret and its data stay as they are. Back on the first step leaves for the
space's page.

3. **Connect.** A summary (space, storage), then **Connect storage**
   (`connectStorage`): the storage is looked at once more (`checkStorage`), the
   space is stored with the new storage, the collection `space` is made to hold
   the name if it does not yet, and one cycle runs on `space`. The id and the
   secret never change. On success the space's page opens with "The space is
   now kept in step through GitHub: owner/name. Open the apps once so they send
   what they keep.": the apps sync their own collections themselves when they
   are opened; this app sends only `space`. On failure **the space goes back to
   this device only** (the storage and its access are taken off again, nothing
   of the space or of what the apps keep in it is removed), the failure is told
   in words under "The storage was not connected", followed by "The space stays
   on this device only and nothing of it was removed. Fix the cause and try
   again.", and Connect can be pressed again.

If the storage already holds a `space.json` of the same space id (not possible
with a fresh secret; possible when the same secret is on two devices), the
cycle merges it as any cycle does: the later name wins on both sides.

The route of a space that already has a storage leads to the space's page.

## Invite

A QR code drawn on the page (`qrcode-generator`, inline `<svg>`, dark on white
with a quiet zone in both themes; nothing is requested from anywhere), the
link in a read-only text area, **Copy link** (clipboard; when that fails the
text is selected and the sentence says to copy by hand), **Share…** where the
Web Share API exists. A link that is too long for a QR code says so and the
link remains.

**Include the storage access** is **off** by default. Ticking it puts the token
(GitHub) or user name and password (WebDAV) into the invite, redraws the code
and the link, and shows what that gives: for GitHub, read and write everything
in that one repository in the name of whoever made the token, no GitHub account
needed; for WebDAV, everything the user name may do on the server; in both,
anyone who gets the link gets the same. Unticked, the text says the other person
brings their own access. Below, always: **What the invite always contains**:
the space's secret, whoever has it reads and changes everything in the space,
the link is like a key and cannot be taken back, only replaced by a new space.

## Join

`#/join/<data>` is parsed with `inviteFromFragment` and the checks of
`src/logic/invite.ts`. The screen shows the space's name and storage. An
invite with access asks for nothing more (one sentence says so). An invite
without it asks for the access: for GitHub the three steps for the token and a
token field; for WebDAV a user name and password (both may stay empty for a
server that needs none). **Join** then looks at the storage (`testGithub` or
the WebDAV probe), stores the space, runs a cycle on `space`, which reads the
name the other device wrote, and goes to the space's page; **the address bar
entry is replaced** (`history.replaceState`), so the secret does not stay in
the history. A failed join stores nothing.

Messages, each its own: no data; not an invite link; damaged or cut off (not
JSON, not an invite, a broken field); made by an older version; made by a newer
version (reload to update); a storage type this app does not know; a storage
address that is not valid (not `owner/name`, or WebDAV not https); the space is
**already on this device** (with a button to open it); a token that is refused,
that may not write, a storage that does not answer, and so on, as below.

If the storage holds no data for the space yet (the first device never
synced), the join succeeds with the invite's name and says so.

## Change access

For a token that expired or a password that changed: the same fields as Join,
tested first and stored only when they work, then a cycle.

## Failures in words

Every failure of the storage port and of the cycle is a `Failure`
(`src/logic/failures.ts`): the host's `CycleFailure` (`conflict`, `unauthorised`,
`not-found`, `unreachable`, `blocked`, `server`, `not-sealed`, `newer-version`,
`wrong-key`, `bad-document`, `other-space`, `other-collection`, `bad-now`) and
the app's own (`bad-storage`, `bad-secret`, `store-unavailable`, `store-blocked`,
`unexpected`). The compiler requires a sentence for each in both languages;
`test/failures.test.ts` checks that none is empty, ends in a full stop and is
not the code. A failure that means something more specific for GitHub or for
WebDAV has a sentence of that kind (`unauthorised`, `not-found`, `blocked`).
`server` adds what the host says: `HTTP 502` becomes "(answer 502)";
`rate-limited until <time>` becomes "GitHub says there were too many requests.
Sync again after 14:30." (the time in the device's own format); any other detail
is not repeated, because it could hold anything. Wording never blames the person
and ends in what can be done:

| Failure                                                                      | What the sentence says (English, short)                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unauthorised`                                                               | GitHub refused the token: copy all of it, check it did not expire; a new token with Contents Read and write for this repository fixes it. WebDAV: the user name or password was refused. |
| `not-found`                                                                  | GitHub does not know the repository, or the token does not reach it. WebDAV: the folder was not found or made, check the address.                                                        |
| `blocked`                                                                    | The page may not read the answer: for WebDAV usually CORS; for GitHub a content blocker or network filter may be in the way.                                                             |
| `unreachable`                                                                | No connection; try again when online.                                                                                                                                                    |
| `server`                                                                     | An error from the storage, with the status or the rate-limit time.                                                                                                                       |
| `conflict`                                                                   | Another device wrote at the same time; nothing lost; Sync now tries again.                                                                                                               |
| `wrong-key`, `not-sealed`, `bad-document`, `other-space`, `other-collection` | The file cannot be used with this space; nothing was overwritten.                                                                                                                        |
| `newer-version`                                                              | Files from a newer version; reload to update.                                                                                                                                            |
| `bad-now`                                                                    | The device's clock is not a valid time.                                                                                                                                                  |
| `bad-storage`, `bad-secret`                                                  | Remove the space from this device and join it again with an invite.                                                                                                                      |
| `store-unavailable`, `store-blocked`                                         | The browser keeps no data (private window?); another tab holds the data back.                                                                                                            |
| `unexpected`                                                                 | Reload and try again.                                                                                                                                                                    |

## What is stored, and where

| What                                                                                                    | Where                                                  | Why                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| spaces (id, secret, name, storage with its access) and the collection `space`                           | IndexedDB `domus` (the host package's shared database) | the secret and the access must be there to sync; stored in clear, as [spaces](../../../packages/host/docs/spaces.md#limits) says |
| language and theme                                                                                      | `localStorage` keys `domus.lang`, `domus.theme`        | the only things kept there; a unit test checks that no other file touches storage                                                |
| a space on this device only: the same, with the storage `{ type: 'device', address: '' }` and no access | IndexedDB `domus`                                      | made by an app; what the apps keep in it is in the same database and nowhere else                                                |
| the last failure of a space                                                                             | memory                                                 | a statement about now                                                                                                            |
| the token while it is typed and until the space is stored                                               | an input, then a variable                              | never in an address, `localStorage`, a log or the page text                                                                      |

## Decisions

Where the brief was open, wrong or silent:

- **The API base for the browser checks** is not an `adapterFor` workaround:
  `StorageDeps` of the host package got an optional `apiBase` (tested), the app
  passes its build constant to `adapterFor`, `findRepositories` and `testGithub`.
  It is never read from a stored space or an invite.
- **QR code**: drawn with a few lines of our own on `qrcode-generator`'s matrix.
  Mixtura has an equivalent; by the repository's rule ("what two apps need moves
  to a shared package, never as a copy") the two should become one function in
  the host package. Not done here, because Mixtura is not part of this change.
- **A failed create or join removes the space again**, so no half-made space
  with a secret nobody has is left on the device.
- **A failed connect does the opposite**: the space was there before and holds
  what the apps keep, so it is never removed; it goes back to this device only,
  and the access that did not work is not kept.
- **Connect refuses a space that already has a storage** (`unexpected`; the
  screen leads to the space's page before that). Moving a space to another
  storage is not built.
- **The state of a failed connect is not kept as a "last failure"**: a space on
  this device only shows no failure; the sentence is on the Connect screen.
- **`storageWords` takes the texts**, because "On this device only" is a
  sentence of the language; `GitHub:` and `WebDAV:` stay as they are.
- **A rename is kept when its cycle fails** (the name is local first); the state
  says so.
- **Change access** (`#/spaces/<id>/access`) was added: without it an expired
  token has no remedy in the app other than removing the space and joining
  again with a new invite.
- **Join does not warn about a public repository** (it was not the joiner's
  choice); it blocks only a token that cannot write.
- **The empty state's second button** moves focus to the paste field, which is
  always on the page.
- **Public repository check on creating only**; **WebDAV needs https** (the
  content policy allows no plain http, and a browser blocks mixed content).
- **The link carries the token encoded** when the box is ticked, so it is not
  in the page text or the text area in the clear, but anyone who has the link
  has it; the screen says so.

## Not done, not verified

- **Nothing was run against the real GitHub.** The browser checks use a fake of
  the REST endpoints the adapter uses; GitHub's real behaviour (CORS, the
  filled-in "new repository" link, whether a first write to an empty repository
  works, `/user/repos` for a token limited to one repository) is still
  [unverified](../../../packages/host/docs/github.md#what-was-verified). The
  steps' wording ("Repository access", "Only select repositories", "Repository
  permissions", "Contents") is from memory of GitHub's form and has to be read
  against the real page.
- **WebDAV** was run against a fake in the browser (routing of the browser
  itself), not against a real server.
- **Not installable**: no manifest, no service worker ([deployment](../../../docs/deployment.md)).
- **The apps do not link to Household yet**, and their own sync screens are
  still the earlier ones.
- **Export and import** are not built.
- **No camera**: the code is shown and scanned by the other person's camera
  app; scanning a drawn code was not tested with a phone.
- Only the `space` collection is synced here; the apps sync their own
  collections. After Connect a storage, what an app keeps in the space reaches
  the storage only when that app is opened; this app does not look whether it
  did.
- A space on this device only is made by an app, in the browser checks by the
  host package's own code run in the page (`e2e/seed-entry.mjs`), not by
  Mixtura itself. No sync loop runs (a cycle runs on create, join, rename and Sync
  now), no polling.
- The household's own sync server and S3 are not offered.
