---
type: Reference
title: Report a problem from the apps
description: How the household apps let users report a problem or an idea as a GitHub issue in suitably/domus - the shared code in hospes and gjs, where each app has the entry, the issue forms and their field ids, where the token is kept (keyring on Linux, localStorage in the browser), what is sent, and what is and is not checked.
tags: [feedback, issues, github, keyring, about-dialog, ui]
generated: { by: claude-code/opus-5.5, at: 2026-11-22T23:30:00Z }
sources:
  - id: toolkit-feedback
    title: 'phosh-toolkit: Report a problem from the app (docs/feedback.md), the spec this follows'
    url: ../../phosh-toolkit/docs/feedback.md
  - id: toolkit-decision
    title: 'phosh-toolkit: decision In-app issue reports'
    url: ../../phosh-toolkit/docs/decisions/in-app-issue-reports.md
  - id: gh-issues-api
    resource: https://docs.github.com/en/rest/issues/issues#create-an-issue
    title: GitHub REST API, create an issue
  - id: gh-issue-url
    resource: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query
    title: GitHub Docs, creating an issue from a URL query
---

# Report a problem from the apps

Every household app lets the user report a problem or an idea as a
GitHub issue without leaving the app, the two ways of the toolkit's
spec[^toolkit-feedback] (owner's decision of 2026-11-22[^toolkit-decision]):

1. **Send**: with the user's own GitHub token the issue is created
   through the REST API[^gh-issues-api]; the dialog then says "Thank You"
   and offers **View Issue**.
2. **Open on GitHub**: without a token (and as the way out when sending
   fails) the browser opens the issue form of `suitably/domus`, filled
   in by its address[^gh-issue-url]; the user signs in there and submits.

The wording, the fields and the privacy rules are the toolkit's; the
code is this repository's own TypeScript, not a copy of the Python
module.

## Where it is

| App                                         | Entry                                                                                                             | Version sent                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Native Linux apps (Emptio, Mixtura, Culina) | main menu, **Report a Problem…** above About; the About dialog's **Report an Issue** opens the filled-in bug form | the release (`__VERSION__`) |
| Emptio, web                                 | Settings, under About                                                                                             | `web`                       |
| Mixtura, web                                | Settings › About                                                                                                  | the build's `APP_VERSION`   |
| Culina, web                                 | Settings, at the end                                                                                              | `web`                       |
| Household, web                              | home page, at the end (it has no settings or About)                                                               | `web`                       |

The web apps have no build identifier yet; `web` and the device field
(`Phone (browser)` or `Desktop (browser)`) tell the owner which app ran.

## Shared code

- `packages/host/src/feedback/` (exported from `@nexumia-de/hospes`):
  `report.ts` (the issue body as GitHub renders the form, the labels,
  the filled-in form address with the text shortened to stay under
  7000 characters, the About link, the token link), `github-issue.ts`
  (`createIssue` on an injected `fetch`: `no-access` for 401, 403 and
  404, `offline` when there is no answer, `failed` otherwise) and
  `texts.ts` (English and German words of the dialog). Pure, no
  `URLSearchParams` and no `URL`: GJS has neither.
- `packages/host/src/frame/report-dialog.ts` and `report-dialog.css`
  (`@nexumia-de/hospes/frame`, `@nexumia-de/hospes/report-dialog.css`):
  the web dialog, a modal `<dialog>` that fills the screen at 360 px and
  is a centred sheet from 36rem; main action on the right, every control
  at least 44 px; a failed send is said in a neutral banner (Culina has
  no error colours) with **Open on GitHub**.
- `packages/gjs/src/report-dialog.ts` and `keyring.ts`
  (`@nexumia-de/gjs`): `installReport(application, …)` adds the action
  `app.report-problem` with the libadwaita dialog (as phosh_toolkit's);
  `reportIssueUrl(app, version)` is the About dialog's `issue_url`.

## The issue forms

`.github/ISSUE_TEMPLATE/bug.yml` and `feature.yml` were added with the
toolkit's field ids plus one for the app, because one repository holds
four apps:

| Kind    | Form          | Label         | Fields filled                      |
| ------- | ------------- | ------------- | ---------------------------------- |
| Problem | `bug.yml`     | `bug`         | `what`, `app`, `version`, `device` |
| Idea    | `feature.yml` | `enhancement` | `problem`, `app`                   |

`app` is a dropdown with the English visible names (Drink Builder,
Cook's Notebook, Shopping List, Household), `device` one with
`Phone (Phosh)`, `Desktop`, `Phone (browser)`, `Desktop (browser)` and
`Other`. The apps send exactly these options; a renamed option or id
has to change `report.ts` and the apps' `REPORT_APP` / `app:` values in
the same pull request. Through the API the body has the same
`### Heading` sections, so both ways read alike.

## The token

A classic personal access token with the `public_repo` scope ("Create
a Token" opens GitHub's form with it ticked). A fine-grained token only
writes to repositories of its resource owner, so it works only for
members of `suitably`. The token is kept only after GitHub accepted it;
**Forget** removes it.

- **Linux**: in the keyring through libsecret (`gi://Secret`, part of
  the GNOME runtime; in the Flatpak through the Secret portal, no extra
  permission). Without libsecret or a keyring daemon it is kept in
  memory for the session. `DOMUS_TEST_KEYRING=memory` keeps the real
  keyring out of checks and screenshots; the Broadway session sets it.

### The token in the browser

A browser has no keyring. The web apps keep the token in `localStorage`
under `domus.feedback.github-token`, one key for all apps of the
address (they report to the same repository). It is the same
device-local place the apps keep their settings in, readable by any
script of the address, which is why the apps load no third-party
script and their policy allows `script-src 'self'` only. Every access
is guarded: in private mode or with blocked storage nothing is kept and
the dialog asks again next time. The alternative, IndexedDB `domus`,
holds the spaces' secrets the same way and would not be safer.

## What is sent

Only what the user typed (title and text), the app, the version and the
kind of device. No account data, no space, storage address or file
contents, no logs; the dialog says so. Nothing in this code logs, and
no result carries the token, title or text.

## Checked and not checked

- `packages/host/test/feedback.test.ts` (17 tests): body, labels, form
  address, shortening, About link, token link, both languages, the
  request against a fake `fetch` and the web token store on a fake
  storage.
- The smoke check of each native app (`npm run smoke -w @<app>/linux`)
  runs the keyring in memory and without a daemon, and `createIssue` on
  libsoup against the fake GitHub (refused) and a closed port
  (offline), in real GJS 1.80.
- Emptio's screen check (`npm run interact -w @emptio/linux`) opens the
  native dialog at 360 × 720 in Broadway; Emptio's browser check
  (`e2e/report-scenario.mjs`) runs the web dialog at 360 × 720 in
  English and German and at 1200 × 800: tap targets and overflow, the
  filled-in form address, a refused token (banner, not kept), an
  accepted token (issue created, kept), Forget. GitHub's API is answered
  by `page.route`.
- Not checked: the live GitHub API, which fields GitHub really fills in
  from the address, a real keyring or the Secret portal, a screen
  reader, a phone. Mixtura's, Culina's and Household's web entries are
  only covered by their existing checks (they pass), not by a report
  scenario of their own.
