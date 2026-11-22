@../../../../../phosh-toolkit/agents/gtk-app.md

# Mixtura, native Linux app

Drink Builder as a GTK 4 and libadwaita app on GJS
([docs](../../docs/native-linux.md),
[decision](../../../../docs/decisions/native-linux-gjs.md)). The rules of
[Mixtura](../../AGENTS.md) and of the [root](../../../../AGENTS.md) apply
too; the toolkit's GTK rules above apply to this package only.

## Rules

- **Screens only.** The drinks, the balance, what the stock allows, the
  stock records and the sync come from `@mixtura/engine`,
  `@mixtura/app/core` and the host package; nothing of them is written a
  second time here. `src/session.ts` only joins them and has no `gi://`
  import, so Node tests run it. A text only the native app needs is in
  `src/strings.ts`, English and German (the web app has English only).
- **The platform pieces are shared**, in
  [`@nexumia-de/gjs`](../../../../packages/gjs) (Web Crypto subset,
  `fetch` on libsoup, files, joining by link, the build and the checks).
  Nothing of them is copied here; a bug in them is fixed there and both
  native apps are checked.
- **The built-in data is compiled in** (`__SEED__` in `build.mjs`, the
  web app's `assembleSeed`). The native app has no drinks or ingredients
  of its own making; the user's own specs live in the browser's
  database and are not here ([native Linux app](../../docs/native-linux.md)).
- **Stock is taps** ([AGENTS](../../AGENTS.md)): a switch writes a stock
  record of the shown space at once; the fields of other apps in a record
  are kept (`writeStock` does it).
- **Own accent colour** only through `@define-color` and `--accent-*`
  in the stylesheet in `src/main.ts` ([design](../../docs/design.md));
  controls a finger taps are at least 44 px.
- **Recorded data for checks and screenshots** (`scripts/seed.mjs`,
  `MIXTURA_DATA_DIR`), never a person's.
- Releases come from `changelog.d/` through the toolkit's `release.py`
  (`release.toml`) and a tag `mixtura-v<version>`
  ([releases](../../docs/native-linux.md#releases)). Not set up, unlike a
  toolkit app repository: REUSE and the toolkit's reusable Flatpak
  workflow.

## Before committing

`npm run check:mixtura` from the root, then
`npm run smoke -w @mixtura/linux` and, after a change to a page,
`npm run interact -w @mixtura/linux` and a look at the screenshots at
360 × 720 (`SHOTS=<folder>`). Metadata:
`appstreamcli validate --no-net` and `desktop-file-validate` on
`data/`.
