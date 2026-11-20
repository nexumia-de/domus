@../../../../../phosh-toolkit/agents/gtk-app.md

# Emptio, native Linux app

Shopping List as a GTK 4 and libadwaita app on GJS
([docs](../../docs/native-linux.md),
[decision](../../../../docs/decisions/native-linux-gjs.md)). The rules of
[Emptio](../../AGENTS.md) and of the [root](../../../../AGENTS.md) apply
too; the toolkit's GTK rules above apply to this package only.

## Rules

- **Screens only.** Rules, records, texts and sync come from
  `@emptio/engine`, `@emptio/app/core` and the host package; nothing of
  them is written a second time here. A text only the native app needs
  is in `src/strings.ts`, English and German.
- **What GJS lacks is in `src/platform/`**, each piece behind the
  interface the shared code already takes (`crypto`, `fetch`, `Files`).
  It moves to a shared package when a second native app needs it.
- **No Web Crypto beyond the subset.** `subtle.ts` has what the host
  package calls and throws for anything else; a new call there gets a
  test against Node's Web Crypto.
- **Recorded data for checks and screenshots** (`scripts/seed.mjs`,
  `EMPTIO_DATA_DIR`), never a person's.
- Not set up in this repository, unlike a toolkit app repository: REUSE,
  releases from changelog fragments, the toolkit's reusable Flatpak
  workflow. `changelog.d/` is kept for when they are.

## Before committing

`npm run check:emptio` from the root, then `npm run smoke -w @emptio/linux`
and, after a change to a page, `npm run interact -w @emptio/linux` and a
look at the screenshots at 360 × 720.
