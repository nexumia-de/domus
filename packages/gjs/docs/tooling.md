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

Not driven: swipe back, the on-screen keyboard, a real compositor.
Broadway is not Phosh.
