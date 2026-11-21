---
type: Reference
title: Frame
description: The frame the household apps share (entry @nexumia-de/hospes/frame and frame.css) - the header with the place and the actions, the small sync icon with its error banner, the toast with Undo - the tokens it reads, and what is and is not tested.
tags: [frame, header, toast, sync, ui]
generated: { by: claude-code, at: 2026-11-21 }
---

# Frame

`src/frame/`, exported as `@nexumia-de/hospes/frame` (TypeScript) and
`@nexumia-de/hospes/frame.css`. Principle: header = place and actions,
body = the content, bottom = the input. Each app keeps its own navigation
entries, accent and tokens; what is here is the logic and the CSS of the
pieces that were the same in every app.

- `createHeader()`: `show({ title, back?, subtitle?, actions })`. The one
  `h1` of the page lives here; a subpage gets a back arrow on the left
  (`back` is a link, `{ href }`, or a button that runs the app's own
  history, `{ run }`; both take `attrs`, for example a focus key).
  `headerLink` and `headerButton` make icon-only actions (44 px, tooltip
  and accessible name; an icon the app drew gets the frame's icon class;
  an optional last argument adds attributes).
- `createSyncIndicator({ words, now, bannerText, retryLabel, say, retry })`:
  a small icon button for the state of the shown space, whose tap says
  the details (`statusText`) through `say`, and a slim banner with Retry
  that is shown only on an error (`syncDisplay`: offline is not an
  error). `worstStatus(statuses)` picks the one status to show when an app
  counts several spaces (Mixtura's stock): failed, syncing, never, in
  step, device only.
- The title wraps to at most four lines and then ends in an ellipsis
  (`-webkit-line-clamp: 4`), in every app: a long title stays whole at
  the large text sizes (WCAG 1.4.4, 1.4.10) without a tall header (two and three lines cut "Daiquiri: versions" at 320 px and 200 % text, where the title column is 148 px wide and needs four, found by Mixtura's `e2e/reflow.mjs`). Mixtura's own
  override (unlimited wrapping) is gone.
- `createToaster()`: one toast at a time, in the colours of the theme,
  gone after 5 s (8 s when it has an action), with an optional Undo.
  The same in every app. It stays while focus is in it and the time
  starts again afterwards (WCAG 2.2.1: a keyboard user on Undo is not
  cut off; 8 s is the time for a hand to reach Undo, where Emptio's
  former 3 s / 4.5 s were too short on a phone). A resting pointer does
  not hold it: a toast under it would cover the button below for good.
  Timers are options.
- Icons are own line drawings (`FRAME_ICONS`, `drawIcon`).

## Tokens

`frame.css` has no colours. It reads `--surface`, `--surface-2`,
`--text`, `--text-muted`, `--accent`, `--accent-soft` (optional),
`--border`, `--divider`, `--error-bg`, `--error-text`, `--target`,
`--header-h`, `--radius`, `--radius-sm`, `--sp-1` to `--sp-4`, `--fs-xs`
to `--fs-lg`; `--content-w`, `--toast-bottom` (the toast's distance from the lower
edge, for an app with a bottom bar) and `--toast-z` are optional. An app puts the toast in a
positioned container at the lower edge of its content.

## Tested

`test/frame.test.ts` pins `syncDisplay` and `worstStatus`. The DOM is checked in the apps'
browser checks (Emptio's: header per page, sync icon, banner with Retry,
toast in both colour schemes with Undo and its timing), in Chromium only.
Not proven: a screen reader, real touch, another browser.

## Used by

Emptio (step 1) and Mixtura (step 2 of the
[shared shell](../../../docs/decisions/shared-shell.md)). Mixtura redraws
the whole page from its store, so it makes the frame once and puts the
same nodes into every redraw (a toast keeps its timer); a modal sheet
makes the header `inert` for the time it is open.
