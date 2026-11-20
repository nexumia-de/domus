---
type: Guide
title: Development
description: Layout, commands, the build with its test build against a fake GitHub, the content policy, the unit tests and browser checks of the Household app and how to read them, the screenshots, and how to add a failure or a language.
tags: [development, build, tests, e2e, csp, i18n]
generated: { by: claude-code, at: 2026-11-19 }
---

# Development

## Layout

`apps/domus` is one workspace, `@domus/app`; its tooling files (`tsconfig.json`,
`eslint.config.js`) are its own, Prettier is the root's.

| Path                                  | What                                                                                                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build.mjs`                           | esbuild into `dist/`: `index.html`, `app.css`, `main.js`, `theme-init.js`, `icon.svg`; `buildApp()`                                                                                                             |
| `src/main.ts`                         | starts the app: language, shell, hash router                                                                                                                                                                    |
| `src/router.ts`                       | the hash routes                                                                                                                                                                                                 |
| `src/env.ts`                          | the GitHub API address, a constant of the build                                                                                                                                                                 |
| `src/deps.ts`                         | the real effects: the IndexedDB store, the clock, the adapters                                                                                                                                                  |
| `src/logic/`                          | what decides, without a DOM: `actions.ts` (create, join, rename, change access, connect a storage, the cycle), `invite.ts`, `github-setup.ts`, `status.ts`, `failures.ts`, `words.ts`, `storage.ts`, `names.ts` |
| `src/screens/`                        | one file per screen and the parts they share (`storage-steps.ts` and `wizard.ts` for Create and Connect)                                                                                                        |
| `src/qr.ts`                           | the invite's QR code as an inline svg                                                                                                                                                                           |
| `src/strings.ts`, `src/strings-de.ts` | every visible text, English and German                                                                                                                                                                          |
| `src/styles/`                         | `tokens.css` (the only colours and sizes), `base.css`, `components.css`                                                                                                                                         |
| `test/`                               | vitest: flows with the memory store and a fake storage, wording, invite, router, build                                                                                                                          |
| `e2e/`                                | Playwright: `run.mjs`, `scenario.mjs`, `fake-github.mjs`, `harness.mjs`, `seed-entry.mjs`                                                                                                                       |

## Commands

From the root: `npm run check:domus` (format, lint, typecheck, tests); inside
`apps/domus` the same scripts are `npm run format:check`, `lint`, `typecheck`,
`test`, `build`, `e2e`.

`npm run build -w @domus/app` writes `apps/domus/dist`. `npm run build:site` builds
it with the apps into the root `dist` ([deployment](../../../docs/deployment.md)).

## The build, and the test build

The production build has `https://api.github.com` compiled in as `__GITHUB_API__`.
`buildApp({ outdir, githubApi })` can compile another address in, and then also
adds that origin to `connect-src` of the page's policy; the browser checks use it
for a fake API on localhost. The command line does this only when
`DOMUS_GITHUB_API` and `DOMUS_OUT` are both set (a test build into a folder of its
own); `npm run build` never does, and one variable without the other is an error.
`test/build.test.ts` builds both and checks: the production bundle names no host
but GitHub, the QR encoder's XML namespace and nothing local; no code reads a URL
parameter for an address; localStorage is touched only by `prefs.ts`; the policy
is exactly the intended one; the files are `app.css`, `icon.svg`, `index.html`,
`main.js`, `theme-init.js` (no manifest, no service worker); every URL is
relative.

## The content policy

A meta tag in `src/index.html`:
`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://api.github.com https:; base-uri 'none'; form-action 'none'`.
`https:` is there because a WebDAV storage is a server of the household's own
choosing, at an address that cannot be listed (as in Mixtura's policy); plain
http is not allowed, so the app refuses a WebDAV address that is not https. The QR
code is inline `<svg>` built from DOM calls, so no `data:` image is needed. The
root page also gets `frame-ancestors 'none'` and the other baseline headers from
`scripts/build-site.mjs`.

## Unit tests

- `flows.test.ts`: create (the space stored, the name written, the cycle run, the
  file sealed; a failing cycle takes the space off again; a bad name; a storage
  the host cannot use), join with and without the access, join twice, a wrong
  token, a read-only token, a public repository, a cycle that fails, a storage
  with no data yet, a secret that is none, rename in both directions between two
  simulated devices, a rename kept when the cycle fails, change access, WebDAV;
  a space on this device only (made with the host's `ensureSpace`, with a record
  in `stock`): rename without a cycle, connect a storage (the id and secret
  kept, the name written, a second device joins), a refused storage, a failing
  cycle that puts the space back with its data, a file of the same space
  already in the storage.
- `invite.test.ts`: the token is in the link only when asked for; every way a
  pasted link can be wrong has its error.
- `failures.test.ts`: every failure has a sentence in both languages; the two
  languages have the same keys; no German text is left in English.
- `small.test.ts`: routes, the GitHub decisions, the storage in words, the state
  of a cycle, language and theme, names.
- `build.test.ts`, `qr.test.ts`.

## Browser checks

`npm run e2e -w @domus/app`, with `PLAYWRIGHT_CHROMIUM_PATH` for a Chromium you
already have (never `playwright install` where the network is limited). It starts
`e2e/fake-github.mjs` on a free port, builds the app against it into a temporary
folder, serves it, and runs `scenario.mjs` four times: 360 x 720 and 1200 x 800,
English and German (the browser's locale decides the language). Each run:

- device A creates a space on GitHub through every branch of the token step (a
  wrong token, a token that reaches nothing, a read-only one, a public
  repository, several repositories), opens the invite, ticks the box, copies the
  link; device B (a second browser context: separate storage) joins from the link
  and shows the name A gave, renames it, A syncs and shows the new name; device C
  joins from an invite without access and is asked for the token, a wrong token
  gives the sentence for `unauthorised`; changing the access; removing a space
  from a device; joining twice; bad links; the storage made to fail with a 500, a
  rate limit, a 401, a 404 and a dropped connection, each told in words; the same
  again with WebDAV (a fake server inside the browser's routing at
  `https://dav.example`);
- `deviceOnly` in `scenario.mjs`: a space on this device only, made in the page
  by `e2e/seed-entry.mjs` (the host package's `ensureSpace` and a record in
  `stock`, bundled by `run.mjs` and run with `page.evaluate`, because this app
  never makes such a space): Home and the space's page, rename, the remove
  text, the invite and access routes, nothing sent; Connect a storage at 320 px
  and the run's width, a cycle made to fail (the space is as it was, without
  the token, with its record), then the connection, and a second device that
  joins and renames;
- on every screen: no horizontal scroll, every tap target at least 44 px;
- at 320 x 640 a walk over the forms;
- over the whole run: no console error and no security-policy violation, no
  request to any host but the page's own, the fake API and the fake WebDAV; no
  token in an address, in the browser's storage, the page text or a field after
  the token step (the invite page with the box ticked carries the token inside the
  encoded link by design, and is checked for the clear text only).

`E2E_SHOTS=<folder>` also writes a full-page screenshot of every screen of the
German run at 360 x 720 (and two in dark mode) to that folder.

A failed request is logged by the browser as "Failed to load resource"; the checks
that make one on purpose expect it, so that message alone is not a problem, any
other console error is.

## Adding

- **A failure**: add the name to `Failure` and to `FAILURES`, then a sentence in
  `strings.ts` and `strings-de.ts` (`failures.generic`; the compiler stops
  otherwise).
- **A language**: a third strings file of type `Strings`, a choice in `prefs.ts`
  and `lang.ts`, a select option in `screens/display.ts`.
- **A storage type**: the host package's `adapterFor` first; then its fields in
  the create flow, `validAddress` and `storageWords`, and its sentences.
