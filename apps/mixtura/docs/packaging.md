---
type: Study
title: Packaging for Android and Linux
description: Comparison of ways to ship the Mixtura PWA as an Android app and as a Linux or Phosh app (installed web app, Trusted Web Activity, Capacitor, Tauri, Electron, WebKitGTK shell in a Flatpak), with what each needs, licences, offline and storage behaviour, signing and store policy, maintenance cost, risks, a device test plan and a recommendation.
tags: [packaging, android, apk, twa, capacitor, flatpak, phosh, f-droid, study]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mdn-installing
    title: 'MDN, Installing and uninstalling web apps (mdn/content, files/en-us/web/progressive_web_apps/guides/installing/index.md, read 2026-11-17)'
    url: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing
  - id: mdn-storage
    title: 'MDN, Storage quotas and eviction criteria (mdn/content, files/en-us/web/api/storage_api/storage_quotas_and_eviction_criteria/index.md, read 2026-11-17)'
    url: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
  - id: applinks
    title: 'Android Developers, Verify Android App Links (read 2026-11-17)'
    url: https://developer.android.com/training/app-links/verify-android-applinks
  - id: bubblewrap
    title: 'GoogleChromeLabs/bubblewrap at commit 364d82f (2026-11-16): README.md, LICENSE, packages/cli/README.md (read 2026-11-17)'
    url: https://github.com/GoogleChromeLabs/bubblewrap
  - id: cloudapk
    title: 'pwa-builder/CloudAPK at commit ef262af (2025-10-06): README.md, LICENSE.txt (read 2026-11-17)'
    url: https://github.com/pwa-builder/CloudAPK
  - id: capacitor
    title: 'ionic-team/capacitor at commit b2ce3a0 (2026-11-16): LICENSE, cli/src/declarations.ts, android/.../CapConfig.java (read 2026-11-17)'
    url: https://github.com/ionic-team/capacitor
  - id: tauri
    title: 'tauri-apps/tauri at commit b422143 and tauri-apps/tauri-docs (2026-11-17): README.md, LICENSE-MIT, LICENSE-APACHE-2.0, docs on prerequisites, webview versions, Google Play and Android signing (read 2026-11-17)'
    url: https://github.com/tauri-apps/tauri
  - id: electron
    title: 'electron/electron at commit caffe33 (2026-11-17): LICENSE, docs/api/command-line-switches.md (read 2026-11-17)'
    url: https://github.com/electron/electron
  - id: epiphany
    title: 'GNOME Epiphany at commit 989b052 (2026-11-16): lib/ephy-web-app-utils.c, NEWS (read 2026-11-17)'
    url: https://gitlab.gnome.org/GNOME/epiphany
  - id: epiphany-flatpak
    title: 'flathub/org.gnome.Epiphany manifest, runtime 51 (read 2026-11-17)'
    url: https://github.com/flathub/org.gnome.Epiphany
  - id: fdroid-policy
    title: 'F-Droid Inclusion Policy (read 2026-11-17 through the fetch tool, which returns a summary, not the page text)'
    url: https://f-droid.org/docs/Inclusion_Policy/
  - id: devverif
    title: 'Android Developer Verification: overview, FAQ and open-source registration guide (read 2026-11-17)'
    url: https://developer.android.com/developer-verification
  - id: toolkit-repo
    title: 'phosh-toolkit docs: app-repository.md, flatpak-workflow.md, phosh.md (read 2026-11-17, local checkout)'
  - id: questarc
    title: 'QuestArc decision: the standalone app is a third host (docs/decisions/standalone-app.md, read 2026-11-17, local checkout)'
---

# Packaging for Android and Linux

Study for [issue 42](https://github.com/nexumia-de/mixtura/issues/42). The
owner wants Drink Builder as PWA and also as an Android and a Linux app
([decision](decisions/pwa-own-data.md)). This file compares the ways;
the proposal is in [the decision record](decisions/packaging.md), which
the owner confirms or changes. Nothing was built or published for this
study, and nothing here was run on a device.

## Starting point

- The app is static files with a service worker and a manifest
  (`packages/app/src/manifest.webmanifest`: `id`, `start_url` and `scope`
  all `./`, `display: standalone`, 192 and 512 px icons, one maskable).
  It is published at `https://mixtura.nexumia.de/`
  ([install](install.md)).
- Data lives in IndexedDB of the browser profile that opened the app
  ([store](store.md)); the export file is the only bridge between
  profiles ([export format](export-format.md)).
- MDN: an installed web app is a feature of the browser that installs it,
  and two browsers give two apps with separate data.[^mdn-installing]
  Data survives unless the user clears it; persistent mode protects it
  from eviction under storage pressure.[^mdn-storage] The app already
  asks for persistence ([store](store.md#persistent-storage)).

## Evidence status

What was read is cited with the commit or date. Many documentation hosts
answered 403 or did not resolve through the session proxy
([development](development.md#network-hosts)); where only the source code
of a tool could be read, the documentation claim is marked
**unverified**. Everything about a real device (menus, keyboard, storage
after uninstall) is **on device** and listed in the
[test plan](#test-plan-on-device).

## Android

| Option                                     | What it needs                                                                                                                                                                                                                                                                              | Offline                                                                                                                                                                                           | Storage of the user's data                                                                                                             | Licence (read from the files)        | Maintenance                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| A1. Install from the browser (works today) | Nothing; the owner's Pages site                                                                                                                                                                                                                                                            | Yes, service worker ([install](install.md#offline-use))                                                                                                                                           | The browser profile that installed it. Chrome with Google Mobile Services makes a real app, other browsers a shortcut[^mdn-installing] | no tool                              | None                                                                             |
| A2. Trusted Web Activity with Bubblewrap   | Bubblewrap CLI, JDK and Android SDK (the README names only Node 18 or newer; the rest **unverified**), a signing key, Digital Asset Links at the origin root, a browser on the phone that supports TWA (**unverified**: the TWA documentation on `developer.chrome.com` could not be read) | Yes, through the browser's service worker                                                                                                                                                         | Browser storage of the origin (**unverified**, expected to be shared with the browser version; check on device)                        | Bubblewrap: Apache-2.0[^bubblewrap]  | Low code, but a key, an origin file and an Android project to keep current       |
| A3. PWABuilder                             | Hosted service at `pwabuilder.com` (not reachable from the session, so **unverified**). Its packaging service CloudAPK uses Bubblewrap to build and sign the package and is archived in favour of the main PWABuilder repository[^cloudapk]                                                | as A2                                                                                                                                                                                             | as A2                                                                                                                                  | CloudAPK: MIT (Microsoft)[^cloudapk] | Same result as A2 with a GUI; not scriptable in CI without running its service   |
| A4. Capacitor with the web build bundled   | Node, JDK, Android SDK, a signing key; the web build copied into the Android project. No origin file                                                                                                                                                                                       | Yes, files are in the APK; the WebView loads them from a local origin (`https://localhost` by default: `androidScheme` default `https`, `hostname` default `localhost` in the source[^capacitor]) | Storage of that WebView origin, **separate from the browser**; the export file is the bridge                                           | Capacitor: MIT[^capacitor]           | An Android project and npm plugins to update; the web build stays the one source |
| A5. Tauri 2 mobile                         | Rust, JDK, Android SDK and NDK; Android 8 or newer; uses the system Android WebView[^tauri]                                                                                                                                                                                                | Yes, bundled                                                                                                                                                                                      | Separate, as A4                                                                                                                        | MIT or Apache-2.0[^tauri]            | Largest toolchain; only worth it if it also replaces the Linux wrapper           |

### Digital Asset Links and a project page

Android verifies a site by fetching
`https://<hostname>/.well-known/assetlinks.json`, where the hostname is
the host name only[^applinks]; Bubblewrap generates the file from the
signing fingerprints (`bubblewrap fingerprint generateAssetLinks`) and
its `host` setting is "the origin that will be opened".[^bubblewrap] The
Android page describes App Links; that a TWA uses the same file is
**unverified** here (the TWA page is blocked) but is how Bubblewrap names
it.

For Mixtura this means: the app has its own origin,
`https://mixtura.nexumia.de` ([deployment](deployment.md)), so the file
would be `https://mixtura.nexumia.de/.well-known/assetlinks.json` and could
be built into `packages/app/dist` by this repository. That Cloudflare's
static assets serve a dot-directory is **unverified**. Each re-signing of
the app changes its fingerprint list. Android re-checks the file only periodically or at
install[^applinks]. Without a verified file a TWA falls back to a browser
tab with an address bar (**unverified**, standard behaviour of the
technique, not read here).

### Store and distribution policy

| Channel                     | What it needs                                                                                                                                                                                                                                                                                                                  | Fit                                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Releases, signed APK | A keystore kept as a repository secret, `apksigner` in CI, a checksum file; users sideload                                                                                                                                                                                                                                     | Fits the organisation's pattern (one signed artefact per tag, key in a secret, never committed; compare `FLATPAK_GPG_KEY` in [app repository](#sources))                                                                                                                          |
| F-Droid                     | Builds from published source with a free toolchain; no proprietary tracking or Play Services; a wrapper "should provide native features and enhancements when it wraps a website" (policy as summarised by the fetch tool)[^fdroid-policy]. Dependencies "built from source or provided in a trusted Maven repo" (same caveat) | A TWA is a thin wrapper of a hosted site and the least likely to pass; a Capacitor app with bundled data and its own file handling is a better candidate. **Not tested**: no application was made. Whether Capacitor's npm dependencies pass F-Droid's source build rules is open |
| Google Play                 | Developer account; the registration fee for the Android console is USD 25 and Play is documented as similar[^devverif]                                                                                                                                                                                                         | Not needed for the owner's goal; later                                                                                                                                                                                                                                            |

**Android developer verification** changes the sideloading story and
must be planned for[^devverif]:

- Since 2026-09-30, apps installed from participating stores in Brazil,
  Indonesia, Singapore and Thailand on certified devices (Android 8 or
  newer) need a registered package name and developer; the check is
  extended to all certified devices in 2027.
- Direct sideloading and other stores are not enforced yet, but Google
  recommends registering before 2027. Users can turn on an "advanced
  flow" (one-time, with a one-day wait) to install unregistered apps;
  `adb install` is not affected.
- Registering needs an Android Developer Console or Play Console account
  (Full Distribution costs USD 25 and needs government ID; a Limited
  Distribution account for students and hobbyists is free but limited to
  20 devices), the package name and the SHA-256 fingerprint of the signing
  key. A lost key means the package cannot be registered again.
- Open-source repositories (F-Droid) that re-sign need their key
  registered too; a guide for this exists.

Consequence: a signed APK on GitHub Releases is possible, but each user
of a phone with the protections either installs through the advanced flow
or the owner registers the package name with a verified account. The
owner decides whether to register (cost, identity, key custody).

### Signing key handling in CI

- Generate the keystore once on the owner's machine (`keytool`, as in the
  Tauri signing page[^tauri]); never commit it; store keystore (base64)
  and passwords as repository secrets; the release job decodes it, signs
  with `apksigner` and deletes it.
- Only tag builds sign. Pull requests build an unsigned or debug-signed
  APK with no secret access (fork pull requests do not receive secrets,
  **unverified**, GitHub documentation blocked).
- Back the keystore up outside GitHub: the key identifies the app for
  updates and for developer verification[^devverif].
- Pin every action and tool exactly ([core rules](#sources)).

## Linux desktop and Phosh

| Option                                                      | What it needs                                                                                                                                                                                                                                                                                 | Offline                                                 | Where data lives                                                                                                                                   | Phosh at 360 x 720                                                                                                                                                                          | Licence                                                                       | Maintenance                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| L1. Installed web app, Chromium-based browser               | The browser; install icon in the address bar on desktop[^mdn-installing]                                                                                                                                                                                                                      | Yes                                                     | The browser profile                                                                                                                                | Depends on the browser's UI on a phone: **on device**                                                                                                                                       | no tool                                                                       | None                                                                                 |
| L2. Epiphany (GNOME Web) web app                            | Epiphany "Install as web app"; no documentation could be read, the source was                                                                                                                                                                                                                 | Yes                                                     | One profile directory per web app, `<user-data-dir>/<gapplication-id>`, so separate from the browser's own data and from other web apps[^epiphany] | The generated `.desktop` file contains `X-Purism-FormFactor=Workstation;Mobile;`[^epiphany], so Phosh shows it in mobile mode without work; window, keyboard and install flow **on device** | LGPL-3.0-or-later in the Epiphany tree (`COPYING`, not compared line by line) | None                                                                                 |
| L3. Own Flatpak: small GTK4/libadwaita shell with WebKitGTK | Python or similar shell, the GNOME runtime (Epiphany's manifest adds no WebKit module, so the runtime carries it[^epiphany-flatpak]), manifest `de.nexumia.Mixtura.yml`, `.desktop`, metainfo, icon, licence texts, REUSE, the reusable workflow and the phosh-apps repository[^toolkit-repo] | Yes, files in the Flatpak; no network permission needed | Flatpak app data of `de.nexumia.Mixtura`, separate from every browser                                                                              | Full control: libadwaita window, `X-Purism-FormFactor`, GNOME Software install and update; on-screen keyboard behaviour in WebKitGTK **on device**                                          | Own code under the repository's licence plus the runtime                      | A shell and a manifest per GNOME runtime bump; the web build stays the only app code |
| L4. Tauri 2                                                 | Rust; on Linux the system WebKitGTK, documented for GTK3 and `webkit2gtk-4.1`[^tauri]                                                                                                                                                                                                         | Yes                                                     | Own app data                                                                                                                                       | Not libadwaita, so the GTK rules for Phosh apps do not hold; whether the GNOME runtime carries webkit2gtk 4.1 is **unverified**                                                             | MIT or Apache-2.0[^tauri]                                                     | Rust toolchain and crates in CI and in `docs/dependencies.md`                        |
| L5. Electron                                                | Bundles Chromium; Wayland needs `--ozone-platform=wayland`[^electron]                                                                                                                                                                                                                         | Yes                                                     | Own app data                                                                                                                                       | Touch and keyboard on Phosh **unverified**; size not measured, expect far above L3                                                                                                          | MIT[^electron]                                                                | Chromium security updates                                                            |

What a Flatpak in this organisation must provide (from the toolkit docs,
read 2026-11-17)[^toolkit-repo]: manifest named after the app id on the GNOME runtime;
the `finish-args` `--share=ipc`, `--socket=wayland`,
`--socket=fallback-x11`, `--device=dri`; `.desktop`, metainfo and icon
installed under the app id; the `.desktop` key
`X-Purism-FormFactor=Workstation;Mobile;` with the trailing semicolon
(Phosh hides the app otherwise); licence texts of every module under
`/app/share/licenses/<app id>/<module>/`; `reuse lint`; bundles for
x86_64 and aarch64 attached to a GitHub Release, which phosh-apps imports
into the signed repository when the repository is listed in `apps.txt`.
A shell without own modules has no third-party modules to list.

### Shell design (L3), if it is ever built

- Serve the build from the Flatpak through a custom URI scheme or from
  `file://`; the service worker is then not needed, and whether WebKitGTK
  supports service workers on a custom scheme is **unverified**. The
  build must run from any base path, not only `/mixtura/`
  ([follow-up](decisions/packaging.md#follow-up-issues)); done in #92:
  relative URLs only, hash routes, a refused or missing service worker
  and a missing storage API are ignored, tested at three base paths and
  without service worker (`e2e/subpath.mjs`, `e2e/no-sw.mjs`).
- No network permission: the app makes no request the user did not start
  ([decision](decisions/pwa-own-data.md)). Since 2026-11-20 this holds
  only without a shared space: the stock of a shared space is synced with
  its storage, which needs the network
  ([stock in spaces](decisions/stock-in-spaces.md)); a shell without
  network permission would keep such a space out of step. Not tested. Export and import go through
  the file chooser portal, which a download link inside WebKitGTK may not
  trigger by itself: **on device**.
- Navigation is outside the shell's control, so the shell must refuse to
  load other origins.

## Do QuestArc's reasons apply?

QuestArc chose "a PWA on GitHub Pages first, then an APK; no Flatpak"
because Day Planner is already the Flatpak home of the journeys and Linux
desktop users can install the PWA.[^questarc]

- The first reason **does not apply**: Mixtura has no GTK sister app; its
  sister Culina is a PWA as well ([two apps, one engine](decisions/two-apps-one-engine.md)).
- The second applies to the desktop (Chromium and Epiphany install it)
  and partly to the phone: Epiphany's web apps carry the Phosh form-factor
  key, so a Phosh phone gets an icon without any Flatpak. What is open is
  how it behaves at 360 x 720 on a real device.
- The order "PWA, then APK" applies unchanged.

## Data between the forms

Each form has its own storage: browser profile, Epiphany web-app profile,
WebView, Flatpak data directory. The export file is the bridge in every
case: Export Everything in one form, Import File in the other, with
Undo ([export format](export-format.md)). Consequences:

- Moving from the PWA to an APK or back is a manual export and import.
  Say so in [install](install.md) when a package exists.
- Clearing storage, uninstalling an APK or removing a Flatpak with its
  data deletes the data of that form only. The backup reminder after 30
  days with changes is the safety net; a package must not weaken it.
- WebView and WebKitGTK shells must prove that the export download and
  the import file chooser work, because browsers handle these two
  differently from embedded views (**unverified**, device test T6).
- Persistent storage: whether a WebView grants
  `navigator.storage.persist()` is **unverified**; the app's own request
  is harmless there.

## Updates

| Form               | How a new version arrives                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| PWA in any browser | Service worker notices, banner "Update available", user taps Update ([install](install.md#updates))                                    |
| TWA                | Web content updates with the site; the Android shell rarely changes                                                                    |
| Capacitor APK      | A new APK per web release; no automatic update from GitHub Releases (an update checker app or F-Droid would be needed, **unverified**) |
| Flatpak            | GNOME Software from the phosh-apps repository, a new bundle per tag                                                                    |

## Testing: CI versus device

| Check                                                                                       | CI                                             | Only on a device                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Web build runs at another base path and offline                                             | Playwright: `e2e/subpath.mjs`, `e2e/no-sw.mjs` |                                                     |
| APK builds, is signed in a tag run, checksum matches                                        | GitHub runner with Android SDK                 |                                                     |
| APK installs, starts, works offline on an emulator                                          | Possible with an emulator action (not tried)   | Real phone for touch and keyboard                   |
| Export download and import chooser in WebView or WebKitGTK                                  | Partly (emulator)                              | Final check                                         |
| `desktop-file-validate`, `appstreamcli validate`, `reuse lint` for a Flatpak                | Yes                                            |                                                     |
| Flatpak launches headless                                                                   | `flatpak run` under Xvfb/Wayland in CI         |                                                     |
| Install flow of Epiphany or Chrome web apps, icon, window size, on-screen keyboard on Phosh | No                                             | Yes                                                 |
| Data after uninstall or clearing storage                                                    | No                                             | Yes                                                 |
| Digital Asset Links verification of a TWA                                                   | File reachable: yes                            | `adb shell pm get-app-links` on a device[^applinks] |

## Test plan on device

For the owner. Nothing here has been run. Record each result in
[issue 57](https://github.com/nexumia-de/mixtura/issues/57) or in
[install](install.md).

Phosh phone (GNOME Web / Epiphany first, a Chromium-based browser second):

1. T1 Install the app from the address; note the menu path and the icon on the home screen; open it at 360 x 720: bottom navigation visible, no horizontal scroll.
2. T2 Check the desktop file: `grep -Eiq '^X-Purism-FormFactor=.*mobile;' ~/.local/share/applications/*WebApp*.desktop` succeeds ([Phosh](#sources), toolkit docs).
3. T3 Tap a text field (Stock, search): the on-screen keyboard opens, the field stays visible, the form scrolls.
4. T4 Airplane mode, force-close, open from the icon: starts and shows data.
5. T5 Add a stock item, close, reopen: it is still there.
6. T6 Export Everything: a file is saved where you can find it; Import File with that file after clearing the app's data in the browser: data returns, Undo works.
7. T7 Remove the web app from Epiphany: is the profile directory under `~/.local/share` gone? (the source deletes it[^epiphany]; confirm)

Android phone:

8. T8 Install from Chrome; note menu label and whether it is a WebAPK (appears in the app list) or a shortcut.
9. T9 Repeat T4 to T6 in the installed app and in a second browser: confirm that data is separate.
10. T10 For a future APK: install it, then run T3 to T6; check that Import opens the system file picker and Export produces a file.

## Risks

| Risk                                               | Effect                                                                      | Mitigation                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Signing key lost or leaked                         | Updates impossible or forged; package cannot be registered again[^devverif] | Key only in secrets and in an offline backup, never committed                     |
| Android developer verification widens in 2027      | Unregistered APKs need the advanced flow                                    | Decide on registration before the first APK; F-Droid or Play are the other routes |
| Wrapper rejected by F-Droid                        | One channel less                                                            | Do not offer a TWA; ship bundled data and file handling; ask early                |
| Origin-root file for a TWA                         | Needs a second repository or a domain, shared origin                        | Avoid TWA, or use a custom domain                                                 |
| Separate storage per form                          | Users think data is lost after switching                                    | Say so in install; export and import tested in every form                         |
| WebView or WebKitGTK handles downloads differently | Export fails silently                                                       | Test T6 and T10 before any release; use a native save path if needed              |
| Phosh keyboard or window issues in browsers        | Epiphany web app unusable at 360 px                                         | Device test first; only then a shell (L3)                                         |
| Chromium or runtime updates                        | Shell or APK breaks                                                         | Pinned versions, bot pull requests, CI build per tag                              |

## Recommendation (proposal)

See [the decision record](decisions/packaging.md): keep the PWA as the
main form; Android: a Capacitor APK from the same build, signed on tags
and attached to GitHub Releases, after the device test; Linux and Phosh:
no Flatpak for now, Epiphany and Chromium web apps first, a WebKitGTK
Flatpak shell only if the device test fails. The owner confirms.

<a id="sources"></a>

[^mdn-installing]: [MDN, Installing and uninstalling web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing), read 2026-11-17 from `mdn/content`.

[^mdn-storage]: [MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), read 2026-11-17 from `mdn/content`.

[^applinks]: [Android Developers, Verify Android App Links](https://developer.android.com/training/app-links/verify-android-applinks), read 2026-11-17.

[^bubblewrap]: [GoogleChromeLabs/bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) at commit 364d82f, `README.md`, `LICENSE` (Apache-2.0), `packages/cli/README.md`.

[^cloudapk]: [pwa-builder/CloudAPK](https://github.com/pwa-builder/CloudAPK) at commit ef262af, `README.md` (archived) and `LICENSE.txt` (MIT, Microsoft).

[^capacitor]: [ionic-team/capacitor](https://github.com/ionic-team/capacitor) at commit b2ce3a0, `LICENSE` (MIT), `cli/src/declarations.ts` (`androidScheme`, default `https`), `CapConfig.java` (`hostname` default `localhost`). The documentation site could not be read.

[^tauri]: [tauri-apps/tauri](https://github.com/tauri-apps/tauri) at commit b422143 (`README.md`, dual licence files) and the docs source `tauri-apps/tauri-docs` (prerequisites, webview versions, Google Play, Android signing), read 2026-11-17.

[^electron]: [electron/electron](https://github.com/electron/electron) at commit caffe33, `LICENSE` (MIT), `docs/api/command-line-switches.md` (`--ozone-platform`).

[^epiphany]: GNOME Epiphany at commit 989b052, `lib/ephy-web-app-utils.c` (profile directory per web app, desktop file with `X-Purism-FormFactor`), `NEWS` ("Also add X-Purism-FormFactor to web app desktop files").

[^epiphany-flatpak]: [flathub/org.gnome.Epiphany](https://github.com/flathub/org.gnome.Epiphany), `org.gnome.Epiphany.json`, runtime-version 51.

[^fdroid-policy]: [F-Droid Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/), read 2026-11-17 through the fetch tool (summary, not verbatim page).

[^devverif]: [Android developer verification](https://developer.android.com/developer-verification), its [FAQ](https://developer.android.com/developer-verification/guides/faq.md.txt) and the [open-source registration guide](https://developer.android.com/developer-verification/guides/open-source-app-registration.md.txt), read 2026-11-17.

[^toolkit-repo]: phosh-toolkit `docs/app-repository.md`, `docs/flatpak-workflow.md`, `docs/phosh.md` and `agents/core.md`, local checkout, read 2026-11-17.

[^questarc]: QuestArc `docs/decisions/standalone-app.md`, point 5, local checkout, read 2026-11-17.
