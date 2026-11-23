@../../../../../phosh-toolkit/agents/gtk-app.md

# Culina, native Linux app

Cook's Workbench as a GTK 4 and libadwaita app on GJS
([docs](../../docs/native-linux.md),
[decision](../../../../docs/decisions/native-linux-gjs.md)). The rules of
[Culina](../../AGENTS.md) and of the [root](../../../../AGENTS.md) apply
too; the toolkit's GTK rules above apply to this package only.

## Rules

- **Screens only.** The amounts, the steps, the finder, the stock edits
  and the sync come from `@culina/engine`, `@culina/app/core` and the host
  package; nothing of them is written a second time here. What a second
  shell needs from the web app is exported from
  `packages/app/src/core.ts` (no DOM there). `src/session.ts` only joins
  them and has no `gi://` import, so Node tests run it. A text only the
  native app needs is in `src/strings.ts`; dish, step and finder texts are
  the web app's own `strings`; the texts the three native apps share are
  in `@nexumia-de/gjs/texts`.
- **The language module is imported first** in `src/main.ts`
  (`@nexumia-de/gjs/language`): the web code reads
  `navigator.languages` when it loads.
- **The platform pieces are shared**, in
  [`@nexumia-de/gjs`](../../../../packages/gjs). Nothing of them is copied
  here; a bug in them is fixed there and all native apps are checked.
- **The shipped content is compiled in** (`__CONTENT__`, `__CATALOGUE__`
  in `build.mjs`: the web app's `classics.json` and catalogue). The native
  app has no dishes of its own making; the notebook of the web app is not
  here. No language model, and every note keeps its sources
  ([Culina](../../AGENTS.md)).
- **Stock is switches**: a switch writes the stock record of the shown
  space at once with the web app's edits (`tickEdit`, `untickEdit`); the
  fields of other apps in a record are kept.
- **Own accent colour** (Beet) only through `@define-color` and
  `--accent-*` in the stylesheet in `src/main.ts`
  ([design](../../docs/design.md)); controls a finger taps are at least
  44 px, Back and Next while cooking 56 px.
- **Recorded data for checks and screenshots** (`scripts/seed.mjs`,
  `CULINA_DATA_DIR`), never a person's.
- Releases come from `changelog.d/` through the toolkit's `release.py`
  (`release.toml`) and a tag `culina-v<version>`
  ([releases](../../docs/native-linux.md#releases)).

## Before committing

`npm run check:culina` from the root, then
`npm run smoke -w @culina/linux` and, after a change to a page,
`npm run interact -w @culina/linux` and a look at the screenshots at
360 x 720 (`SHOTS=<folder>`). Metadata: `appstreamcli validate --no-net`
and `desktop-file-validate` on `data/`.
