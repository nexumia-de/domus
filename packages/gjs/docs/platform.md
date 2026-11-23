---
type: Reference
title: Platform pieces
description: What GJS lacks (Web Crypto, random bytes, fetch, files, structuredClone) and how src/ fills each behind the interface the host package already takes, joining, creating and leaving a space, text fields in a list that scrolls by touch, the preferences file and the style helpers, with what the checks prove and what nobody verified.
tags: [gjs, platform, crypto, fetch, files, native]
generated: { by: claude-code, at: 2026-11-21 }
sources:
  - id: noble
    title: '@noble/ciphers and @noble/hashes 2.4.0 (MIT), licence read from their LICENSE files'
    url: https://github.com/paulmillr/noble-ciphers
  - id: emptio
    title: 'Emptio: native Linux app (where these pieces were first built)'
    url: ../../../apps/emptio/docs/native-linux.md
---

# Platform pieces

Built for Emptio's native app on 2026-11-20[^emptio] and moved here on
2026-11-21, when Mixtura's native app became the second that needs them
([decision](../../../docs/decisions/native-linux-gjs.md)). The code is
unchanged by the move.

GJS 1.80 has no `crypto`, `fetch`, `structuredClone` and no IndexedDB.
The host package takes each as an interface, so each piece fills one:

| Missing                    | File            | Filled by                                                                                                                                         |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Crypto                 | `subtle.ts`     | The subset the host package calls (HKDF-SHA-256, AES-256-GCM) on `@noble/hashes` and `@noble/ciphers`[^noble]; anything else throws               |
| Random bytes, `randomUUID` | `random.ts`     | `/dev/urandom` through GIO; `installWebPlatform(randomBytes)` puts `crypto` and `structuredClone` on the global object where the host has none    |
| `fetch`, `Response`        | `soup-fetch.ts` | libsoup 3, no cookies, no cache; a request with no answer rejects with a `TypeError` as in a browser, which the adapters turn into "unreachable"  |
| IndexedDB                  | `gio-files.ts`  | The host package's file store (`createFileStore`) on JSON files in a folder, written atomically and readable by the user only (they hold secrets) |
| `structuredClone`          | `subtle.ts`     | A JSON copy: what the stores copy is JSON                                                                                                         |

`node-files.ts` is the same `Files` on Node's `fs`, for the recorded
data of the checks and for tests; it is a separate entry
(`@nexumia-de/gjs/node-files`) because the main entry imports `gi://`.

# Around the pieces

- **`join.ts`**: `joinByLink(store, text, token)` stores a space from a
  pasted invitation link (the link carries the storage, the secret and,
  when the inviting person included it, the access). The Household app
  also tests the storage before it stores the space; here the first sync
  cycle says whether it works. Results: `ok` with the space id and name,
  or one of `empty`, `not-an-invitation`, `needs-token`, `already-here`.
- **`prefs.ts`**: `filePrefs(files)`, the `get` and `set` of an app's
  small preferences (`prefs.json` beside the data).
- **`language.ts`** (entry `@nexumia-de/gjs/language`): defines
  `navigator.languages` from the device's locale, because GJS has none and
  a web app's shared code (Culina's) chooses its texts and decimal mark from
  it when its modules load. Imported first in an app's `main.ts`. Also
  `deviceLang()`, German or English.
- **`texts.ts`** (entry `@nexumia-de/gjs/texts`, pure): the texts the
  native apps have in common in English and German: the style choice, the
  spaces' headings, joining by link and its errors, the sync status words,
  the retry and support words. All three native apps use it (Emptio and
  Mixtura since step 5 of the [shared shell](../../../docs/decisions/shared-shell.md));
  an app spreads `sharedEn` / `sharedDe` and adds only its own texts.
- **`create.ts`** (pure): `createFromForm(form, deps, { publicAllowed })`
  creates a space from the native form: a name, and a GitHub repository
  with a token or a WebDAV folder (https address, user name and password
  optional). The fields are checked with the host package's rules
  (`cleanSpaceName`, `isRepository`, `isWebdavAddress`, which reads the
  address without `URL`, which GJS lacks); a GitHub repository is looked
  at first, as the Household app does (`testGithub`, `githubVerdict`): a
  read-only token is refused, a public repository is used only after the
  person agreed. Then the host package's `createSpace`, the same as the
  Household app's, stores the space, writes its name in the collection
  `space` and runs one cycle; when that cycle fails nothing stays on the
  device. Results: `ok` with id and name, a field (`name`, `repository`,
  `token`, `address`), `readonly`, `public`, or `failed` with the
  storage's failure code. The token is asked for like joining asks for
  one, in a password row, and is kept with the space in the private
  spaces file, as a joined space's token is. A WebDAV folder is not
  tested before: the first cycle is the test, as in the Household app's
  `createSpace`.
- **`spaces.ts`** (GTK): `spacesGroup(options)`, the preferences' Spaces
  group of every native app: a row per space with a check button to show
  it and a button to leave it, and a row **Create a Space** that pushes a
  page onto the preferences dialog (swipe back leaves it; Create sits in
  the bottom bar, within reach of the thumb).
  [Spaces in the preferences](#spaces-in-the-preferences).
- **`rows.ts`** (GTK): `editOnTap(row)`.
  [Text fields in a scrolling list](#text-fields-in-a-scrolling-list).
- **`style.ts`**: `applyStyle('system' | 'light' | 'dark')` for
  libadwaita's colour scheme, and `addStyle(css)` for the app's one
  stylesheet (its accent colour and the 44 px controls).
- **`keyring.ts`**: `createKeyring({ appId, labels, memoryEnv })`,
  secrets by kind in the keyring through libsecret (loaded with
  `imports.gi`, so a missing typelib does not stop the app; in the
  Flatpak through the Secret portal). Without libsecret or a daemon a
  secret is kept in memory for the session.
- **`report-dialog.ts`**: `installReport(application, options)` adds
  `app.report-problem` with the Report a Problem dialog, and
  `reportIssueUrl(app, version)` is the About dialog's `issue_url`
  ([feedback](../../../docs/feedback.md)). The token is the keyring's
  kind `github-token`; `DOMUS_TEST_KEYRING=memory` keeps checks off the
  real keyring.

# Spaces in the preferences

Leaving is the Household app's **Remove from this device**
(`apps/domus/src/screens/space.ts`): the space is taken out of the
store with `removeSpace`, which deletes the space, its secret, the
storage access and every collection the store kept of it. A native app
has a store of its own (`$XDG_DATA_HOME/<app>`), so leaving in one
native app leaves the others and the other devices as they are; the
files in the storage stay. An `AdwAlertDialog` asks first, with Leave as
the destructive answer and Cancel as the default, and says this; for a
space on this device only it says that nothing of it exists anywhere
else and it is gone for good. Afterwards the app reads its spaces again;
with none left it makes a new one on this device (`ensureSpace`), and a
choice that named the left space falls back (`pickSpace`). A cycle or an action that is still running when the space is left
writes no file for it again: the host's file store drops writes for a
space it removed ([ordering](../../host/docs/sync-orderings.md#spaces-coming-and-going));
the storage write of a cycle already under way still happens.

Creating is `createFromForm` (above). Inviting someone stays in the
Household app in a browser: the native apps make no invitation link.

# Text fields in a scrolling list

The owner could not scroll a list of text fields on Phosh (Emptio's
categories, an entry's fields, the join and create rows of the
preferences). GTK's text widget takes the keyboard focus the moment a
finger touches it (GTK 4.14 `gtk/gtktext.c`,
`gtk_text_click_gesture_pressed`: `gtk_widget_grab_focus`, then the
touch is claimed), and libadwaita's entry row does the same for a touch
on its edges (1.5 `src/adw-entry-row.c`, `pressed_cb`). So a drag that
starts on a field focuses it before the scrolled window can tell the
drag from a tap: on Phosh the on-screen keyboard comes up, the window
shrinks and the list is scrolled back to the focused field. Every row of
Emptio's categories is a field, so nearly every drag started on one.
That chain is read from the sources; it was not seen on a phone.

`editOnTap(row)` changes this for touch only. A controller in the
capture phase sees every press before the row's widgets do: for a touch
(`TOUCH_BEGIN`) it turns the text widget's `focus-on-click` off
(unfocused, its press handler then returns before it focuses or claims
the touch) and sets the row's own click gesture to no phase; for a mouse
or a pen (`BUTTON_PRESS`) it puts both back, so a click puts the cursor
where it is, a press and drag selects and the context menu is there, as
in GTK. After a touch, a click gesture of the row focuses the field on
the **release** of a tap that did not become a scroll (the scrolled
window claims a drag past the threshold and cancels the tap), unless the
tap was on a button or switch of the row; the cursor is put at the end
of the text. A focused field behaves as GTK's own. Every `AdwEntryRow`
and `AdwPasswordEntryRow` of the native apps is made through it.

Not treated, because no drag in a scrolling area can start on them: the
add field of Emptio's list (`list-page.ts`) and the search fields of
Mixtura's drinks and bottles and Culina's stock are in the bottom bar of
their page (`AdwToolbarView`), outside the scrolled window.

What proves it: Emptio's interaction check, step 13, at 360 × 720. A
touch drag starts on a category name; then a key and Enter are pressed,
and the check reads that no category was renamed. That check, "the drag
focused no field", is the proof of the fix: on the code before, it
fails, because the touch focused the field under the finger. The scroll
distance is a control, not the proof: in Broadway the list moved before
the fix too (the scrolled window claims the drag after the focus was
taken), and Broadway has no on-screen keyboard, so the keyboard coming
up and the window shrinking, which is what stopped the owner, are not
reproduced here. The control asks for at least 100 px (a row is 55 px)
for a drag of 350 px; the list moved 216 to 486 px in the runs (kinetic scrolling carries it on). Step 13b
clicks an unfocused name with the mouse at 1000 × 700 and reads that the
text typed lands where it was clicked, not at the end. No phone was
used.

# What the checks prove

- `test/subtle.test.ts`: the subset against Node's real Web Crypto, the
  same derivations and files sealed by one opened by the other, through
  the host package's own code, in both directions, plus the fixed vector
  of the host package. Proves the bytes; not GJS.
- `test/join.test.ts`: joining against the shared database in memory,
  with links made by the host package's own code.
- `test/create.test.ts`: creating from the form against the shared
  database in memory, a small adapter and a fake look at GitHub: each
  wrong field, a public repository only when agreed, a read-only token
  never, a failed look or cycle leaves nothing behind. The rules
  themselves are tested in the host package (`space-setup.test.ts`).
- The GTK parts (`spaces.ts`, `rows.ts`) are checked by each app's
  interaction check: create a space against the fake GitHub, leave it,
  and Emptio's scroll step ([tooling](tooling.md#broadway)).
- `src/smoke.ts` (run by each app, [tooling](tooling.md#smoke)): in real
  GJS, the fixed vector, random bytes, the file store, and two folders as
  two devices through sync cycles against the fake of GitHub's API on
  localhost; the sealed file holds none of the record's text; the spaces
  file is private (mode 600).

# Not verified

- The `gi://` calls have no types (`gi.d.ts`); the smoke run and the
  apps' screen checks are what checks them.
- A second process on the same folder: the file store expects one.
- The real GitHub and a WebDAV server; a phone. Creating a WebDAV space
  is tested in Node only.
- At 360 × 720, with a mouse, Broadway took no further click in the
  preferences after the create page was pushed (GTK warned "Broken
  accounting of active state"); touches worked, and at 1000 × 700 mouse
  clicks worked. Whether a real compositor with a mouse at that width
  shows the same was not tried.
- `installWebPlatform` leaves a global `crypto` alone if one exists, so
  a future GJS with Web Crypto would use its own; nobody tried one.
