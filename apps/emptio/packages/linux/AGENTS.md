@../../../../../phosh-toolkit/agents/gtk-app.md

# Emptio, native Linux app

Shopping List as a GTK 4 and libadwaita app on GJS
([docs](../../docs/native-linux.md),
[decision](../../../../docs/decisions/native-linux-gjs.md)). The rules of
[Emptio](../../AGENTS.md) and of the [root](../../../../AGENTS.md) apply
too; the toolkit's GTK rules above apply to this package only.

## Rules

- **Screens only.** Rules, records, texts and sync come from
  `@emptio/engine`, the list package (`@nexumia-de/list`),
  `@emptio/app/core` and the host package; nothing of
  them is written a second time here. A text only the native app needs
  is in `src/strings.ts`, English and German.
- **What GJS lacks is in `@nexumia-de/gjs`**
  ([`packages/gjs`](../../../../packages/gjs)), shared with Mixtura's
  native app: Web Crypto subset, `fetch` on libsoup, files, joining by
  link, the build and the checks. Nothing of it is copied here; a bug in
  it is fixed there and both native apps are checked.
- **Recorded data for checks and screenshots** (`scripts/seed.mjs`,
  `EMPTIO_DATA_DIR`), never a person's.
- Releases come from `changelog.d/` through the toolkit's `release.py`
  (`release.toml`) and a tag `emptio-v<version>`
  ([releases](../../docs/native-linux.md#releases)). Not set up, unlike a
  toolkit app repository: REUSE and the toolkit's reusable Flatpak
  workflow.

## Before committing

`npm run check:emptio` from the root, then `npm run smoke -w @emptio/linux`
and, after a change to a page, `npm run interact -w @emptio/linux` and a
look at the screenshots at 360 × 720.
