---
type: Decision Record
title: One shared app shell
description: Decided by the owner on 2026-11-21 - the parts of an app's frame that every app has (header, navigation, settings, sync display, toasts, error banner) live once in the host package, for the web apps, and once in packages/gjs, for the native apps; apps bring only their pages, navigation entries, texts and accent; why the apps had their own until then and the plan to move them over.
tags: [decision, shell, frame, ui, host, gjs, web, native]
generated: { by: claude-code, at: 2026-11-21 }
sources:
  - id: one-repo
    title: One repository for the apps and what they share
    url: one-repository.md
  - id: frame
    title: 'hospes: the shared frame, packages/host/docs/frame.md (pull request 19)'
---

# One shared app shell

## Why the apps had their own

The owner asked on 2026-11-21 why every app has its own header,
navigation, toasts and sync display. Three reasons:

- Mixtura, Culina and Emptio were separate repositories until
  2026-11-19[^one-repo]; each had to build its own shell.
- The rule "share when a second app needs it, never in advance" was
  followed for the logic (model, sync, file store moved to
  `packages/model` and `packages/host`) but not for the screens: every
  agent worked on one app and nobody moved the shell.
- Nothing checks for it: `npm run boundaries` stops imports between
  apps, not three versions of one thing.

## Decision

- **The shell is shared.** What every app's frame has lives once:
  for the web apps in `packages/host` (`@nexumia-de/hospes/frame`, the
  first piece, built with Emptio[^frame]), for the native apps in
  `packages/gjs`. An app brings its pages, its navigation entries, its
  texts and its accent (tokens); it builds no header, navigation,
  settings page, sync display, toast or banner of its own.
- **Frame rules, same in every app:** the header shows the page title
  with back on subpages and the actions (settings, a small sync icon);
  the body is content only; toasts with Undo instead of bars; a slim
  banner only for an error. Navigation entries beyond settings stay in
  a bottom bar (a rail on wide screens) where an app has several
  destinations; settings moves to the header.
- **New shell pieces go into the shared package**, never into an app; a
  review that finds an app-own copy treats it as a defect.

## Plan (one session per step)

1. Emptio's web app on the frame: done (pull request 19).
2. Mixtura's web app: **done** (2026-11-21, branch `mixtura-frame`): header, toast and sync on the frame first (its
   store-driven toast calls `createToaster`), then its navigation and
   settings; its browser checks adapted (the app is fixed, not the
   checks).
3. Culina's web app, the same way.
4. Shared navigation and settings page in `packages/host` once steps 2
   and 3 show what the two have in common; Emptio adopts it.
5. Native apps: the texts each app still copies (join, status, style)
   come from `@nexumia-de/gjs/texts`; the frame pieces of the three
   native apps move into `packages/gjs`.

## Still app-own after the unification of 2026-11-21

Toast timing (5 s, 8 s with Undo, held while hovered or focused) and the
header title rule (four lines, then an ellipsis) are now the frame's and
the same in every app; step 5 is done for the texts of Emptio's and
Mixtura's native apps. What is left, as steps:

6. **Mixtura's update banner** (`apps/mixtura/packages/app/src/shell/banner.ts`)
   and its storage-failure banners (`store/errors.ts`, `app-state.ts`)
   use Mixtura's own `.banner` markup; they go into the frame next to
   the sync banner, and Emptio's service-worker update (`sw-register.ts`)
   uses the same piece.
7. **Navigation and settings** (step 4 above): Mixtura's `shell/nav.ts`,
   `panes.ts` and settings screen, Emptio's `screens/settings.ts` and
   `router.ts` are still per app.
8. **Mixtura's modal sheets** (`shell/modal.ts`, `focus-trap.ts`) are
   Mixtura's; a second app that needs a sheet moves them.
9. **Emptio's web status words** (`strings.ts`, `status`) still copy the
   host's `StatusWords` with other wording ("Synced …", "Sync failed.");
   the web apps should share one set of words like the native apps do.
10. **The frame of the native apps** (header, toasts, banners in
    `packages/gjs`): the three native apps still build their own
    `Adw.Toast` (the same copy in each `main.ts`: 4 s, 10 s with Undo,
    which differs from the web frame's 5 s / 8 s) and banners; one helper
    in `packages/gjs`, with the web timing, replaces the three copies.
11. **Culina** is not covered here: its web app is step 3, done in
    another session.

## Not decided

- Whether a check can find copies (for example a list of shell module
  names an app may not define).
- Where Mixtura's and Culina's other navigation entries go exactly; the
  owner decides it with step 2.
