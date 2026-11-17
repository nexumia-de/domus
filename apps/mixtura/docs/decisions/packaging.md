---
type: Decision Record
title: Packaging for Android and Linux (proposal)
description: Proposal, needs decision by the owner. The PWA stays the main form; Android gets a Capacitor APK from the same build on GitHub Releases after a device test; Linux and Phosh use Epiphany or Chromium web apps first, a WebKitGTK Flatpak only if the device test fails; no Trusted Web Activity.
tags: [decision, packaging, android, flatpak, phosh, needs-decision]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: study
    title: 'Packaging for Android and Linux (the study with all evidence)'
    url: ../packaging.md
---

# Packaging for Android and Linux (proposal)

**Status: proposal, `needs decision`.** Nothing below is decided until the
owner confirms or changes it. The evidence is in the
[study](../packaging.md)[^study]; no package was built.

## Context

The owner wants Drink Builder as PWA and also as an Android and a Linux
app ([PWA with own local data](pwa-own-data.md)). The PWA installs from the
browser today ([install](../install.md)). Every form has its own storage
and the export file is the bridge. QuestArc decided "PWA first, then an
APK; no Flatpak"; its Flatpak reason does not apply here because Mixtura
has no GTK sister app, its desktop reason does
([study](../packaging.md#do-questarcs-reasons-apply)).

## Options

1. **PWA only.** No cost; already works. The owner's wish for an "app"
   is met by the browser's install.
2. **Android: Trusted Web Activity** (Bubblewrap or PWABuilder). Small, and
   content updates with the site, but needs Digital Asset Links at the
   origin root (a second repository or a custom domain for a project
   page), a signing key, and is a thin wrapper that F-Droid's policy
   discourages.
3. **Android: Capacitor with the build bundled.** Offline without the
   origin, no origin file, MIT licence, a better F-Droid candidate; costs
   an Android project, a signing key and separate storage.
4. **Android: Tauri.** Same result as 3 with Rust and the NDK on top; only
   sensible if it also replaced the Linux wrapper, which it does not fit
   (GTK3 stack, not libadwaita).
5. **Linux: web apps from Epiphany or Chromium.** No cost; Epiphany's web
   apps already carry `X-Purism-FormFactor=Workstation;Mobile;` and have
   their own profile.
6. **Linux: Flatpak with a GTK4/libadwaita and WebKitGTK shell**, through
   the organisation's pipeline and repository. Best integration (GNOME
   Software, no network permission), but a shell and a manifest to keep
   current for a web app that already installs.
7. **Linux: Electron or Tauri.** Heavy or off the Phosh rules; not pursued.

## Recommendation (proposal)

1. The PWA remains the main form and the only one to be released first.
2. **Android: option 3**, in this order: base-path check
   ([#92](https://github.com/nexumia-de/mixtura/issues/92)), spike with a
   debug APK in CI and an export/import check
   ([#93](https://github.com/nexumia-de/mixtura/issues/93)), signed release
   APK on tags attached to GitHub Releases
   ([#94](https://github.com/nexumia-de/mixtura/issues/94)), F-Droid
   readiness check ([#95](https://github.com/nexumia-de/mixtura/issues/95)).
   No TWA.
3. **Linux and Phosh: option 5 now.** The owner runs the device test of
   the [study](../packaging.md#test-plan-on-device) (tracked in
   [#57](https://github.com/nexumia-de/mixtura/issues/57)). Option 6 is built
   ([#96](https://github.com/nexumia-de/mixtura/issues/96)) only if an
   Epiphany web app fails one of: appears on the Phosh home screen, fits
   360 x 720, brings up the on-screen keyboard, keeps data across restarts,
   can export and import a file.
4. Owner decisions that go with it: whether to register the Android package
   name for developer verification (account, ID, USD 25, key custody,
   [study](../packaging.md#store-and-distribution-policy)) and the Android
   package name (`de.nexumia.mixtura`, lower case, proposed).

## Consequences

- **Data safety.** Every form keeps its own data; removing an APK, clearing
  an app's storage or removing a Flatpak with its data deletes that form's
  data only. Export Everything and the 30-day reminder stay the safety net;
  a bundled form must pass the export and import check before release
  (issue 93). The install guide gains a paragraph on moving data between
  forms when the first package exists.
- **Keys.** One Android signing key as a repository secret plus an offline
  backup by the owner; never committed. A lost key blocks updates and
  registration.
- **No origin dependency.** The APK does not need `nexumia-de.github.io`
  root files or a custom domain, so the Pages address can still change.
- **Cost.** One Android project and a tag-only signing job; no Linux
  package to maintain unless the device test demands it.
- **Open points, unverified.** TWA documentation, GitHub secret and Pages
  documentation, F-Droid build pages and all device behaviour could not be
  read or tested; see [development](../development.md#network-hosts) for the
  hosts that would settle them.

[^study]: [Packaging for Android and Linux](../packaging.md)
