# Log

## 2026-11-19

- **Creation**: the app, as the first usable version of roadmap goal 5 ([roadmap](../../../docs/roadmap.md)). It replaces the static page at the root of the address (`index.html`, `home.css`, `icon.svg`): Home with the apps and the spaces on this device, Create a space (name, storage, access, create), a space, Invite with a locally drawn QR code, Join by link, and a screen to change the storage access; English and German, light and dark; on `@nexumia-de/hospes` and `@nexumia-de/materia` only, plus `qrcode-generator` 2.0.4. One collection of its own, `space`, with the record `name`, makes a space real and is the end-to-end test of a connection. Tests: unit tests, and browser checks at 360 x 720 and 1200 x 800 in both languages against a fake of the GitHub REST endpoints. Not installable, no manifest and no service worker; nothing run against the real GitHub. [Screens](screens.md), [development](development.md).
