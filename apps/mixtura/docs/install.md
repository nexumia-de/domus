---
type: Guide
title: Install
description: How to open and install Mixtura (Drink Builder) on Android, Linux desktop and a Phosh phone, how updates arrive, offline use, where the data lives and how to remove it, plus what the owner must switch on for GitHub Pages.
tags: [install, pwa, pages, android, linux, owner]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: mdn-installing
    title: 'MDN, Installing and uninstalling web apps (mdn/content, files/en-us/web/progressive_web_apps/guides/installing/index.md, read 2026-11-17)'
    url: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing
  - id: mdn-installable
    title: 'MDN, Making PWAs installable, sections Installability, Browser support, Installing sites as apps (mdn/content, files/en-us/web/progressive_web_apps/guides/making_pwas_installable/index.md, read 2026-11-17)'
    url: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
  - id: mdn-storage
    title: 'MDN, Storage quotas and eviction criteria (mdn/content, files/en-us/web/api/storage_api/storage_quotas_and_eviction_criteria/index.md, read 2026-11-17)'
    url: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
  - id: pages
    title: 'Workflow .github/workflows/pages.yml and the e2e test packages/app/e2e/subpath.mjs in this repository'
---

# Install

Address: <https://nexumia-de.github.io/mixtura/>. Mixtura is a web app
that works offline after the first visit and can be installed
([decision](decisions/pwa-own-data.md)). There is no account, no server and
no store; the page is static files on GitHub Pages.

Statements marked **to be checked on a device** are not verified: the
author could read only the MDN pages in the sources, which do not name
menu entries. They are tracked in
[issue 57](https://github.com/nexumia-de/mixtura/issues/57).

## Which browsers can install it

From MDN[^mdn-installable][^mdn-installing]:

- Chromium-based browsers install a web app with a manifest on all
  supported desktop systems, Linux included; Chrome and Edge show an
  install icon in the address bar when the page can be installed. Mixtura's
  manifest has the members Chromium requires (name, 192 and 512 px icons,
  `start_url`, `display`).
- Chrome on Android and Samsung Internet on Samsung devices install it as
  a real app (WebAPK) with an entry in the app launcher and the system
  settings, if the device has Google Mobile Services. Firefox, Edge, Opera
  and Chrome without Google Mobile Services add a browser-badged shortcut
  on the home screen that opens the site in the browser instead.
- Desktop Firefox does not install web apps from a manifest. Mixtura still
  works in a Firefox tab, offline included. Firefox needs the extension
  "PWAs for Firefox" to install[^mdn-installing]; Mixtura does not depend on it and
  it was not tried.
- Whatever the browser: an installed app belongs to the browser that
  installed it. Installing from two browsers gives two apps with separate
  data.

## Android

1. Open <https://nexumia-de.github.io/mixtura/> in Chrome.
2. Open the browser menu and choose the install command. MDN says only
   that on mobile the command is "generally found in the menu of browser
   options" and that the install has to be confirmed.[^mdn-installing] The
   label (Install app or Add to Home screen) and the confirmation text:
   **to be checked on a device**.
3. Confirm. The icon appears among your apps and opens Mixtura without the
   browser's address bar.[^mdn-installable] **To be checked on a device.**

Firefox on Android: the same address and the browser menu; the result is a
home-screen shortcut that opens the site in Firefox, not an app of its
own.[^mdn-installable] Menu label **to be checked on a device**.

## Linux desktop

- **Chromium-based browsers** (Chrome, Chromium, Edge, Brave and the like,
  if they follow Chromium's rules[^mdn-installable]): open the address,
  select the install icon in the address bar and confirm.[^mdn-installing]
  The app gets its own window and an entry among your applications.
  The exact entry and window behaviour on Linux: **to be checked on a
  device**.
- **GNOME Web (Epiphany)**: it has an "Install as web app" function. The
  menu path and what it creates: **to be checked on a device**. No
  documentation of it could be read.
- **Firefox**: use it in a tab, or use a Chromium-based browser to install.

## Phosh phone

Use GNOME Web (Epiphany): open the address and install it as a web app,
which adds an icon to the home screen. The steps, the icon and the window
at 360 x 720 are **to be checked on a device**. A Chromium-based browser on
the phone follows the Linux desktop steps above.

## Offline use

The first visit stores all files of the app in the browser; afterwards it
starts and works without a network, also when opened from the installed
icon. The test `packages/app/e2e/subpath.mjs` checks this for the public
address: the page is served under `/mixtura/`, the service worker controls
it, and a reload and a deep link work with the network off.

## Updates

When a new version is published, the app notices it the next time it is
opened with a network connection, installs it in the background and shows
the banner "Update available". Nothing changes until you tap **Update**;
the app then reloads once with the new version. Details:
[development](development.md#app-shell).

## Where the data lives

Everything you enter stays on your device, in the browser's storage for the
address `https://nexumia-de.github.io`; nothing is sent anywhere. That has
consequences:[^mdn-storage]

- **Clearing site data for the address deletes your data.** So does
  removing the installed app if the browser clears its storage then
  (check this on a device before relying on it).
- Browsers store data in "best-effort" mode by default: it can be removed
  when the device is short of space, and Safari removes script data of
  sites not used for seven days if tracking prevention is on. MDN cites
  research by the Chrome team that browsers very rarely do this for sites
  that are visited regularly.
- The storage belongs to the whole origin `nexumia-de.github.io`, not to
  `/mixtura/` alone; other sites of the same account share its quota.
- An app installed from another browser has its own, separate data.

Make a backup with Export Everything (Settings, Data): one file with all
your specs, ingredients, stock and pairings, saved through the browser's
normal download. Import File on another device or after the data was
cleared brings it back, with Undo ([export format](export-format.md)). The
app reminds you calmly after 30 days with changes and no export.

## Remove it

- **Android:** like any app: long-press the icon or use the system's app
  settings.[^mdn-installing] A browser shortcut (Firefox) is removed like a
  shortcut. To delete the data as well, clear the site data of the address
  in the browser settings.
- **Desktop:** open the installed app and use its menu (an uninstall entry
  or a link to the browser's app settings); in Chrome the list is
  `chrome://apps`.[^mdn-installing] Epiphany: **to be checked on a device**.
- To also delete the data, clear the site data for the address in the
  browser settings (see above).

## What the owner must switch on

The workflow `.github/workflows/pages.yml` builds `packages/app` and
deploys `packages/app/dist` on every push to `main` and on manual start.
Pages cannot be enabled by a workflow, so the first run fails at
`configure-pages` until these steps are done (only the workflow `Pages`
fails, never the required check `check`):

1. Open the repository on GitHub, Settings.
2. Open Pages in the sidebar.
3. Under Build and deployment, set Source to GitHub Actions.
4. Open the Actions tab, select the workflow Pages, choose Run workflow on `main`.
5. After the run is green, open <https://nexumia-de.github.io/mixtura/>.
6. Optional: Settings, Environments, `github-pages`: the default rule lets
   only `main` deploy; keep it, and add no required reviewers if every
   merge should publish at once.
7. Branch protection: the required check names stay `check` (CI). `e2e`
   is not required yet ([development](development.md#ci)). The workflow
   `Pages` runs after the merge and is no pull request check, so it must
   not be required. No ruleset change is needed for this pull request.

If the repository is private, GitHub Pages needs a plan that supports it;
Pages sites are public even then unless the account has access control for
them. **Not verified**, check the plan before enabling.

[^mdn-installing]: [MDN, Installing and uninstalling web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing)

[^mdn-installable]: [MDN, Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

[^mdn-storage]: [MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
