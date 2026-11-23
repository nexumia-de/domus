---
type: Reference
title: Tooling
description: The shared build, smoke check, recorded-data runner and Broadway session of the native apps - what each does, what an app passes in, and what the Broadway session cannot drive.
tags: [gjs, tooling, build, smoke, broadway, playwright]
generated: { by: claude-code, at: 2026-11-21 }
---

# Tooling

Plain Node scripts in `tooling/`, exported by the package
(`@nexumia-de/gjs/tooling/<name>`). An app's own `build.mjs` and
`scripts/` are a few lines that pass in what differs.

| Script                | What it does                                                                                                                                                                                                                                      | What an app passes in                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `build.mjs`           | `bundle` and `buildApp`: esbuild makes one ES module for `gjs -m` of the app, its engine, the host package and the crypto libraries; `gi://` and GJS's own modules stay imports; `metainfoVersion` reads the version of the newest stable release | folder, app id, extra constants (`define`)           |
| `smoke.mjs`           | `runSmoke`: bundles `src/smoke.ts`, runs it in GJS against the fake of GitHub's API and checks the sealed file and the file mode                                                                                                                  | the collection the app keeps in a space              |
| `seed.mjs`            | `runSeed`: bundles an app's recorded-data script for Node and runs it with the caller's arguments                                                                                                                                                 | the script                                           |
| `interact-lib.mjs`    | `Session`: a Broadway display (`gtk4-broadwayd`), a private D-Bus session, the app and Chromium through Playwright; clicks by coordinates, typing, screenshots, activating `app.*` actions                                                        | app id, data folder variable, bundle, size, language |
| `interact-pixels.mjs` | Pixel helpers: a pixel's colour, the height of a coloured run, the share of pixels that differ between two screenshots                                                                                                                            | -                                                    |

The compile-time constants of an app (`__APP_ID__`, `__VERSION__`,
`__GITHUB_API__`, and the app's data such as Mixtura's seed) are
replaced by esbuild: the GitHub address is compiled in and never an
input of the running app.

# Smoke

`npm run smoke -w @<app>/linux` needs `gjs` and the libsoup typelib.
The Node side starts the fake GitHub and the GJS side talks to it, so
the run covers libsoup, the Web Crypto subset, GIO files and the sync
cycle in the real runtime.

# Broadway

The screen checks drive the app through GTK's Broadway backend. Broadway
draws a canvas, so widgets are clicked by coordinates found in
screenshots, and each step is verified in the app's data files. The
session finds the window as the surface with the most visible area (a
long list is drawn in full and clipped by the viewport, so only the
visible part counts) and maximizes it with a double click on the header,
because there is no window manager. `INTERACT_DEBUG=1` prints the found
window. Run with `PLAYWRIGHT_CHROMIUM_PATH` set when Chromium is not
Playwright's own.

Touches: `session.touch(x, y, toX, toY)` sends one finger's touchstart,
moves and touchend. The events are made in the page and sent to the
element of the window's surface, not through Chromium's input (CDP):
Chromium sends the moves of a touch to the element where it started, and
Broadway replaces that element when GTK redraws the spot under the
finger (a row that shows it is pressed), so a drag sent through CDP
stopped reaching GTK after a few pixels. The first finger is the one GTK
treats as the pointer, as on a phone. A touch after the double click
that maximizes the window is not eaten; a CDP touch was, by Broadway's
move-resize handling.

`interact-pixels.mjs` has `scrolledBy(session, before, after)`: how far
the content moved up between two screenshots (the shift at which a band
of the first matches the second best), for a step that proves a page
scrolled. `interact-spaces.mjs` has `createAndLeave(options)`, the steps
every native app runs on its preferences' Spaces group: create a space
against the fake GitHub (the app built with that address compiled in),
leave it, leave the last space (the app makes a new one on this device), and read the spaces file, the app's files and the fake's
files after each step; the coordinates are the app's.

Not driven: swipe back, the on-screen keyboard, a real compositor.
Broadway is not Phosh.
