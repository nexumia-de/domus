# Log

## 2026-11-22

- **Fix and update** (the owner's three defects in the native apps): `rows.ts` (`editOnTap`: a text field in a list takes the focus on a tap, never on the touch that starts a scroll; [why](platform.md#text-fields-in-a-scrolling-list)), `create.ts` (`createFromForm`, pure, on the host package's new `createSpace`), `spaces.ts` (`spacesGroup`: show, leave and create a space in the preferences; [spaces](platform.md#spaces-in-the-preferences)), texts for creating and leaving in `texts.ts`. Tooling: `Session.touch`, `scrolledBy`, `interact-spaces.mjs` ([Broadway](tooling.md#broadway)). Tests: `test/create.test.ts` (6; 17 in the package now). All three native apps use the group and the rows.

- **Update** (2026-11-21, step 5 of the shared shell): Emptio's and Mixtura's native apps now take the style, spaces, join, status and support texts from `texts.ts`; their copies are gone. No change in this package.

## 2026-11-22 (report a problem)

- **Creation**: `keyring.ts` (`createKeyring` on libsecret, memory fallback, `DOMUS_TEST_KEYRING`) and `report-dialog.ts` (`installReport`, `reportIssueUrl`, the libadwaita Report a Problem dialog) for the three native apps ([feedback](../../../docs/feedback.md), [platform](platform.md)); the smoke check runs the keyring and the request on libsoup; the Broadway session sets `DOMUS_TEST_KEYRING=memory`.

## 2026-11-21 (Culina)

- **Update**: for Culina's native app, the third: `language.ts` (`navigator.languages` from the device's locale for web code that reads it at load, and `deviceLang()`), `texts.ts` (English and German texts of the style, spaces, joining and sync status that the native apps share), with `test/texts.test.ts` (2 tests; 11 in the package now); the licence texts of Ajv and fast-deep-equal moved here from Mixtura's `data/licenses/` (the manifests of both apps read them from here). Mixtura's and Emptio's code did not change; their strings still hold their own copies of the shared texts. [Platform pieces](platform.md), [Culina's native app](../../../apps/culina/docs/native-linux.md).

## 2026-11-21

- **Creation**: the package `packages/gjs` (`@nexumia-de/gjs`) for the native Linux apps, made when Mixtura's native app became the second that needs the platform pieces ([decision](../../../docs/decisions/native-linux-gjs.md)). Moved from Emptio's `packages/linux` without a change of code: `subtle.ts` (Web Crypto subset), `random.ts`, `soup-fetch.ts`, `gio-files.ts`, `gi.d.ts`, `join.ts`, with their tests (`subtle.test.ts`, `join.test.ts`: 9 tests), the licence texts of the two crypto libraries, the smoke check in GJS and the Broadway session. New or generalised: `prefs.ts` (the preferences file, from Emptio's `main.ts`), `style.ts` (`applyStyle`, from Emptio's preferences, and `addStyle`), `node-files.ts` (from Emptio's seed script), the shared `build`, `smoke` and `seed` tooling, and the Broadway session taking the app id, the data folder variable and the language. The smoke check takes the collection to use (`list` for Emptio, `stock` for Mixtura). The session finds the window by its visible area: Mixtura's long drink list is drawn in full and made the old rule pick the list. Both apps' checks ran: 9 tests here, Emptio 2 native tests of its own (texts) besides its engine and app tests, Mixtura 13 native tests; both smoke checks and Mixtura's screen check in real GJS 1.80 and Broadway. [Platform pieces](platform.md), [tooling](tooling.md).
