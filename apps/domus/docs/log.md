# Log

## 2026-11-22 (report a problem)

- **Update**: **Report a Problem…** ([feedback](../../../docs/feedback.md)) at the end of the home page (the app has no settings or About); the dialog is the shared one.

## 2026-11-20

- **Emptio on the home page**: the list of apps has a third card, Shopping List (`emptio/`). The browser harness and the fake of GitHub's API moved to the host package (`@nexumia-de/hospes/testing/*`), because Emptio's browser checks use them too; `e2e/run.mjs` and `scenario.mjs` import them from there.
- **A space on this device only** (roadmap goal 6, [roadmap](../../../docs/roadmap.md)): the app handles the space an app makes before sync is set up (storage type `device` of `@nexumia-de/hospes`). Home and the space's page say "On this device only" in place of a storage and a sync state; no cycle, invite or access change for it; rename is local; removing it says that its data is deleted for good. New route `#/spaces/<id>/connect`, **Connect a storage**: the storage and access steps of Create a space, now shared code (`screens/storage-steps.ts`, `screens/wizard.ts`), then `connectStorage` in `logic/actions.ts` (check, store, name into `space`, one cycle); a failing cycle puts the space back on this device only with its data. `storageWords` takes the texts. Tests: flows for connect (success, refused storage, failing cycle, a file already there) and rename without a cycle; the browser checks seed such a space with the host package's code, connect it to the fake GitHub and join it from a second device. [Screens](screens.md#a-space-on-this-device-only).

## 2026-11-19

- **Creation**: the app, as the first usable version of roadmap goal 5 ([roadmap](../../../docs/roadmap.md)). It replaces the static page at the root of the address (`index.html`, `home.css`, `icon.svg`): Home with the apps and the spaces on this device, Create a space (name, storage, access, create), a space, Invite with a locally drawn QR code, Join by link, and a screen to change the storage access; English and German, light and dark; on `@nexumia-de/hospes` and `@nexumia-de/materia` only, plus `qrcode-generator` 2.0.4. One collection of its own, `space`, with the record `name`, makes a space real and is the end-to-end test of a connection. Tests: unit tests, and browser checks at 360 x 720 and 1200 x 800 in both languages against a fake of the GitHub REST endpoints. Not installable, no manifest and no service worker; nothing run against the real GitHub. [Screens](screens.md), [development](development.md).
