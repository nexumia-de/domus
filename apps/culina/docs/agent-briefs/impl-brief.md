# Brief for an implementing agent on Culina

You work in the repository /home/user/domus on the app `apps/culina` ("Cook's Workbench", a
cooking PWA with a native Linux app). You are one of several agents; a lead commits your work
after another agent has reviewed it. Do NOT commit, push, or run git commands that change
anything.

## Read first (they are binding)

- /home/user/domus/AGENTS.md (root rules, especially "Fixes and reviews")
- /home/user/domus/apps/culina/AGENTS.md
- /home/user/domus/apps/culina/docs/design.md (layout rules, copy rules, the table "Pitfalls of
  an interface built by agents")
- the section of /home/user/domus/apps/culina/docs/behaviour.md for the screen you change
- for the native app also apps/culina/packages/linux/AGENTS.md

## How the project works

- English is canonical; every visible text exists in English (`src/strings-*.ts`) and German
  (`src/de/`). Short texts for an experienced cook, no tutorials, no exclamation marks, at most
  120 characters. No judging words about a dish.
- Phone first: designed at 360 px, one breakpoint at 720 px, touch targets at least 44 x 44,
  no horizontal scroll. Shared shell (header, navigation, toasts) is not rebuilt.
- The purpose of the app: the user opens it and finds quickly what they want to cook.
- Tests are vitest in `packages/*/test`, browser checks are Playwright scripts in
  `packages/app/e2e/*.mjs` run by `e2e/run.mjs`.
- `docs/` of Culina is updated in the same change: behaviour.md (what the screen does, with the
  tests that pin it), design.md if a design rule or the pitfalls table changes, one entry at the
  top of docs/log.md under a heading `## 2026-11-24 (<topic>)` in the style of the entries
  there. Docs state plainly what is not verified.

## Checks you must run and pass before you report

- From /home/user/domus: `npm run check:culina` (format, lint, typecheck, all tests). Format
  with `npx prettier --write <files>` run from /home/user/domus/apps/culina.
- From /home/user/domus/apps/culina:
  `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e > <scratch>/e2e-agent.log 2>&1; echo $?`
  (about 4 minutes; run it ALONE, never beside check:culina or a second e2e run, or a
  navigation check times out; it aborts at the first check that throws). Grep the log for
  `^FAIL` and count `^ok `; never print it whole.
- Look at your change in a browser yourself before you report: build with
  `npm run build -w @culina/app` (from apps/culina), serve `packages/app/dist` (for example
  `python3 -m http.server 8765 -d packages/app/dist`), and drive it with a Playwright script
  placed in `packages/app/e2e/` (so that it finds `playwright`; launch with
  `executablePath: '/opt/pw-browsers/chromium'`, viewport 360 x 720, locale `de-DE` and `en-US`,
  `serviceWorkers: 'block'`), take a screenshot and READ it with the Read tool. Delete the
  script afterwards. Say in your report what you saw.

## Rules for tests and checks

- A new behaviour gets a unit test and a browser check that would fail without it, with a
  control (a neighbouring case that passes before and after). Say next to a test what it does
  not prove.
- When an existing test or browser check fails because of your change, decide which is wrong.
  If the app is wrong, fix the app. Change a check only when it pinned the old behaviour that
  the task replaces, and say so in your report with the check's name. Never loosen a check,
  never skip or delete one to get green.
- Do not touch recipe data (`packages/app/data/classics`, `data/frames`), the catalogue, or
  the tools, unless your task says so.

## Report (your final message; short, plain)

1. What you built, in five lines at most, and the files that matter.
2. Tests added (names) and what each would catch; checks you changed, with the reason.
3. Results: the test counts of check:culina, the number of `ok` lines of the final e2e run,
   and what you saw in the browser.
4. What you did not verify, and anything you are unsure about or decided on your own.
