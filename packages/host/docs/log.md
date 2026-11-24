# Log

## 2026-11-24 (status per collection)

- **Update**: `CollectionSync.status(spaceId, collection?)`: with a collection, the status of that one collection (its own last good cycle and failure); without, as before. Asked for by a review of Culina's hand-over: Culina syncs `list` beside `stock`, and its stock screen said "never synced" after the update until `list` had a good cycle, and "failed" for a broken list file. Mixtura, Emptio and Household call it without a collection and see no change. Tests: `collection-sync.test.ts` › 'the status of one collection is its own: another collection that fails does not fail it', › 'a collection added to an app keeps the last good cycle of the others it had'.

## 2026-11-22 (report a problem)

- **Creation**: issue reports ([feedback](../../../docs/feedback.md)): `src/feedback/` (`formUrl`, `issueBody`, `issueUrl`, `createIssue`, `feedbackEn`/`feedbackDe`, exported from the main entry) and in the frame the web dialog `openReportDialog` with `report-dialog.css` (new export `./report-dialog.css`) and `browserTokenStore` (localStorage). New exports only. 17 tests in `test/feedback.test.ts`.

## 2026-11-22

- **Fix** (of a check): `test/collection-sync.test.ts`, "every collection of an app gets its own file in one run", waited a fixed 30 ms after `refresh` for the start cycle, which `refresh` does not wait for; under load the second collection was not stored yet (1 failure in 12 parallel runs, and once in a full `npm run check`). It now waits for a whole cycle with `syncSpace` (24 of 24 parallel runs pass). The sync was not changed: `refresh` starts loops and is documented so. Not changed: 16 more waits on `settle` in that file and 13 in `test/watch.test.ts` rest on the same fixed 30 ms and can race the same way under load.
- **Update** [making a space](spaces.md#making-a-space): `space-setup.ts` with `createSpace`, `cleanSpaceName`, `SPACE_COLLECTION`, `SPACE_NAME_KEY`, `SPACE_NAME_MAX`, `isRepository`, `isWebdavAddress` and `githubVerdict`, moved from the Household app (`createSpace`, `cleanName`, `isRepository`, `verdictOf` there now use them) because the native apps create spaces too. New exports only. Tests: `test/space-setup.test.ts` (8).
- **Fix** (an ordering): the file store drops a write for a space it removed until the space is put again, so leaving a space in a native app while a cycle or an action for it is running leaves no collection file behind ([orderings](sync-orderings.md#spaces-coming-and-going)). Tests: two in `test/store.test.ts`, both fail without the guard; the other 32 store tests pass before and after. The shared database (IndexedDB) is unchanged.
- **Update** [GitHub](github.md): `setupLinks` fills in the new-token form too (name, description, a year's expiry, Contents: read and write) by GitHub's documented query parameters, at the owner's request; the setup and join screens list only the steps left (choose the repository, generate). Test: `setupLinks` in `test/github-connection.test.ts`.

* **Manual loops**: `createSyncLoop` and `createCollectionSync` take `manual: true` (cycles only when asked: no start cycle, no interval, no watch); the loop has `runNow()` and the collection sync `syncSpace(spaceId)`, both waited for, so an app can put its own work between two cycles of a space. New options and exports only; Mixtura and Culina are unchanged. First user: Emptio, which syncs its storage before and after each KitchenOwl cycle. [Spaces](spaces.md#the-loops-of-an-app-collection-syncts), [orderings](sync-orderings.md). Three tests in `watch.test.ts`, one in `collection-sync.test.ts`.

## 2026-11-21 (frame, Mixtura)

- **Frame extended for Mixtura**: `back` of the header may run a handler (`{ run }`) instead of linking, and header actions take attributes and any app-drawn icon; icon `add`; `worstStatus` for an app that shows several spaces; `--toast-bottom` and `--toast-z` tokens; `hidden` wins over the display of the banner, icon button and subtitle (before, a hidden banner showed in an app without a global `[hidden]` rule). Emptio unchanged in use. [Frame](frame.md). `test/frame.test.ts` pins `worstStatus`.

## 2026-11-21 (frame)

- **The frame**: `src/frame/` with `createHeader`, `headerLink`, `headerButton`, `createSyncIndicator`, `syncDisplay`, `createToaster` and `frame.css`, as entries `@nexumia-de/hospes/frame` and `/frame.css`, written with Emptio's new frame (the first user; Mixtura and Culina follow). New exports only. [Frame](frame.md). `test/frame.test.ts`.

## 2026-11-21 (later)

- **Sync status in words**: `status-text.ts` with `statusText`, `ago` and `StatusWords`, moved from Emptio's `list/status.ts` when Mixtura's native app needed the same line; the words stay each app's (Emptio's `strings.status`, Mixtura's native texts). Emptio re-exports it. New exports only. `test/status-text.test.ts` pins the kinds, the age steps, the unknown failure and offline with words of its own.

## 2026-11-20

- **The loops of an app** (roadmap goal 7): `collection-sync.ts` with `createCollectionSync`, `CollectionSync`, `CollectionSyncOptions` and `SyncStatus`, moved from Mixtura (`stock/sync.ts`, `createStockSync`) when Emptio needed the same, and widened: several collections per run, each failing alone, and `intervalMs`. Mixtura uses it with `['stock']`; its test moved to `test/collection-sync.test.ts` with three new cases. [Spaces](spaces.md#the-loops-of-an-app-collection-syncts).
- **Which space an app shows**: `space-choice.ts` with `pickSpace`, `viewOf` and `SpaceView`, written for Emptio and placed here because Culina needs it too. `test/space-choice.test.ts`.
- **A store on files**: `file-store.ts` with `createFileStore`, `createMemoryFiles`, `Files` and `StoreFileError`, for a native app without IndexedDB; the store suite runs against it. No change to the database `domus`.
- **Service worker**: `service-worker.ts` (`serveFromCache`, `shouldRegister`) as the second entry `@nexumia-de/hospes/service-worker`, used by Emptio. [Service worker](service-worker.md).
- **Testing helpers** as entries `@nexumia-de/hospes/testing/browser` and `/testing/fake-github`: the browser harness and the fake of GitHub's REST API, moved from the Household app's `e2e/` when Emptio's browser checks needed them. Not part of an app's bundle. The static server also serves `.png`, `.json` and `.webmanifest`.

- **Sync orderings** (documentation only): [sync-orderings](sync-orderings.md), a table per class of unlucky order with its intended behaviour and the test that pins it; unpinned and unhandled orderings are listed as such. No code changed.
- **A space on this device only**: `device.ts` with `DEVICE_ONLY`, `deviceOnlyStorage`, `isDeviceOnly` and `ensureSpace`: a space with a secret and an id but the storage type `device`, where an app keeps a shared collection (Mixtura's `stock`) before sync is set up; connecting a storage later keeps id, secret and data. New exports only. Tested in `test/device.test.ts`. See [spaces](spaces.md#a-space-on-this-device-only).
- **Passphrase cipher removed** ([roadmap](../../../docs/roadmap.md) goal 6): with Mixtura on spaces no app used the version 1 envelope any more, and materia removed it the same day. Removed from the public entry: `createCipher`, `DEFAULT_ITERATIONS`, `CipherOptions` (`cipher.ts`) and `WrongPassphrase`, `UnsupportedEnvelope` (`errors.ts`); gone with them `test/cipher.test.ts`, `test/fixtures/envelope.json` and `docs/cipher.md`. A file sealed with a passphrase is not read any more (`openCollection` answers `not-sealed`). `base64.ts` stays: the sealed file and Mixtura's share link use it.

## 2026-11-19

- **`adapterFor` takes `apiBase`** in its deps, for a `github` storage (default `https://api.github.com`): the Household app (`apps/domus`) compiles its API address in and passes it, so the browser checks can use a fake API without any run-time switch. Never read from a stored space or an invite. Tested in `test/storage.test.ts`; documented in [GitHub adapter](github.md#the-registry-storagets).
- **GitHub storage** (roadmap goal 4): `github.ts` (`createGithubAdapter`), `github-http.ts`, `github-connection.ts` (`testGithub`, `findRepositories`, `setupLinks`) and `storage.ts` (`adapterFor`, `UnknownStorage`). New exports only. Written without access to GitHub's documentation or API: nothing is verified against the live service. See [GitHub adapter](github.md).
- **Sync on spaces, host side** (roadmap goal 3): `space.ts` (secret, HKDF derivation of id, content key and access token), `seal.ts` (one file of a space), `invite-link.ts` (the invite as `#/join/<data>`), `store.ts` with `memory-store.ts` and `idb-store.ts` (the shared database `domus`, version 1), `cycle.ts` (`syncCollection`, `localChange`) and `watch.ts` (`createSyncLoop`). New exports only; the version 1 cipher and the WebDAV adapter are unchanged. Dev dependency `fake-indexeddb` 6.2.8. See [spaces](spaces.md).
- **Package created** (roadmap goal 2, [roadmap](../../../docs/roadmap.md)): `@nexumia-de/hospes` 0.1.0 with the sync cipher (`cipher.ts`, `errors.ts`, `base64.ts`) and the WebDAV adapter (`webdav.ts`, `webdav-url.ts`, `webdav-connection.ts`), moved with their history and tests from Mixtura's `packages/app/src/sync/`; the types come from materia directly. The code is unchanged; the one fixed envelope vector moved to `test/fixtures/envelope.json`. The probe file is still named `.mixtura-probe`. See [WebDAV adapter](webdav.md) and [sync cipher](cipher.md).
