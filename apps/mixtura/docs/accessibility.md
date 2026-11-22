---
type: Reference
title: Accessibility pass
description: What the browser accessibility pass checks on every screen at 360x720 and 1200x800 in light and dark, how each check is made without a library, what it found and fixed, and the findings left open as issues.
tags: [accessibility, testing, e2e, wcag]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: wcag
    title: 'WCAG 2.2 success criteria named below (1.4.3, 1.4.4, 1.4.10, 1.4.11, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.5.8, 4.1.2), W3C'
---

# Accessibility pass

`packages/app/e2e/a11y.mjs` (with `a11y-audit.mjs` and `a11y-focus.mjs`)
runs in the CI job `e2e` as `node e2e/a11y.mjs 360 720` and `... 1200 800`.
It opens 27 screens (drinks list, filters sheet, spec, batch sheet, share
sheet of a drink, share preview, swap, swap sheet, editor, editor with an
error, ingredient form, templates, template, stock, Spaces sheet, Buy Next,
settings, data, about, not found; the count of 27 dates from before
2026-11-20 and included the Sync page and its six sheets, which were
removed with Mixtura's own sync, so 20 remain) in light and
dark and fails on any finding. No library: the rules are hand-written, so
nothing has to be licensed, pinned or fetched and the pass runs offline.
`axe-core` was not evaluated; the hand-written checks cover the list of
issue #21 and can be replaced if a library earns its place
([dependencies](dependencies.md)).

| Check                                       | How it is made                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every control and dialog has a name (4.1.2) | Playwright's `ariaSnapshot` of the page: a control or dialog role without a quoted name fails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Visible focus, not covered (2.4.7, 2.4.11)  | Tab through the page; outline of at least 2 px or a shadow on every focused element, and `elementFromPoint` at its centre is the element itself once the scroll animation has ended                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| No keyboard trap, order (2.1.2, 2.4.3)      | Tab moves on every press and follows the document order, no positive `tabindex`; a dialog closes with Escape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Label in name (2.5.3)                       | Axe's `label-content-name-mismatch`, written by hand: a button, link or summary with one plain text label and an `aria-label` must have that text inside the name (the summary "Details" was named "How the balance is computed"; now "Details: how the balance is computed"). Composite rows (a name plus counts) are not judged. The variant link "Start a Riff as ..." was named "Start a riff on ... as ...: ..." and was allowed in the audit until 2026-11-22; its name now begins with the visible text ("Start a Riff as ..., from ...: ...", `screens/spec/variant-strings.ts`) and the audit has no exception left |
| Headings (1.3.1)                            | One `h1` per visible pane, no skipped level, at least one heading                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Landmarks                                   | A `main` and a navigation (or header on a pushed phone screen); every control inside a landmark or dialog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fields and errors (3.3.1, 3.3.2)            | Names as above; every `aria-describedby` and `aria-labelledby` points at an element that exists; `aria-invalid` has its error; the editor and the ingredient form are opened in error                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Targets of 44 x 44 px (2.5.8 and own rule)  | Bounding boxes of every visible control; a checkbox counts by its label row; a link inside running text is exempt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Contrast (1.4.3, 1.4.11)                    | Rendered colours of every text node over the composited backgrounds of its ancestors, 4.5:1 (3:1 for large text), fields and placeholders, field edges 3:1; light and dark                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Not by colour alone (1.4.1)                 | Links in running text are underlined; the rest is a review of the design (balance numbers sit beside every bar, status words beside every colour, [design](design.md))                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Reduced motion                              | With `prefers-reduced-motion: reduce` no element has a transition, an animation or smooth scrolling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Zoom to 200 % (1.4.4, 1.4.10)               | At 1200x800: a 600x400 window at twice the pixel ratio; at both sizes: `html { font-size: 200% }`; no sideways scrolling and no clipped pane or navigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

The slow-device options of `e2e/browser.mjs` apply to this script too (about 3 minutes at 360x720, so it is not in `e2e:slow`). The Tab walk ends at the "Show more drinks" button, where the list loads more rows. A page is looked at when it has stopped changing (no DOM change for 500 ms), and a focused element is looked at when its scroll has ended.

## Found and fixed

- **Focus escaped from modal sheets.** With the batch sheet, the swap
  sheet, the ingredient picker or the ingredient form open, Tab reached
  the page behind the sheet (and the focus ring was drawn under the
  backdrop). `shell/modal.ts` makes everything outside an open
  `aria-modal` dialog `inert` after each draw, the toast excepted.
- **Tab left the filters sheet** ([#75](screens-browse.md#as-built-75)): the page behind was inert, so Tab went to the browser's own controls. `shell/focus-trap.ts` wraps Tab and Shift+Tab inside every open modal dialog; focus returns to the Filters button when the sheet closes (`e2e/list-keys.mjs`).
- **"Show more drinks" took keyboard focus away.** The new rows come in above the button, which then stood sixty rows below the focus; `screens/drinks/rows.ts` moves focus from the button to the first new row.
- **Placeholders in dark mode** were 3.64:1 (the browser's grey); one rule
  in `styles/base.css` sets them to `--text-muted`.

- **Text at 200 %** ([#99](https://github.com/nexumia-de/mixtura/issues/99)):
  the navigation labels (fixed pill and minimum width, so four labels were
  wider than the bar), the app bar title, the servings stepper row, the
  action-bar buttons and long words in rows and notes made the page scroll
  sideways or cut text with an ellipsis. Labels, titles, row titles and
  buttons now wrap (`overflow-wrap: anywhere`, `min-width: 0`), the stepper
  row wraps. `e2e/reflow.mjs` walks 17 routes (including versions and
  family) at 360 px with text at 200 %, and at 320 px with text at 100 % and
  200 %, and fails on sideways scrolling (`scrollWidth > clientWidth`) or
  clipped titles, labels and row titles.
- **Save reason line over the focused field** ([#100](https://github.com/nexumia-de/mixtura/issues/100)):
  the reason under Save appears and goes while the user types, which shrank
  the scroll area under the focused Notes field. `shell/keep-focus-visible.ts`
  scrolls the focused element back into view when the scroll area shrinks,
  and the area has `scroll-padding-block`; `e2e/editor.mjs` asserts the
  focused field is clear of the bar, also when the reason line grows.

Nothing is open: the known-findings list of `a11y.mjs` is empty (it prints
`known (#n)` and does not fail for an entry; delete the entry with its fix).

## Dark mode and the breakpoint

`e2e/breakpoint.mjs` walks all four destinations and a drink in dark at
839 px (bottom bar, one pane) and 840 px (rail, two panes) and checks
the navigation's place, the dark tokens and no sideways scrolling;
`e2e/dark.mjs` writes the dark screenshots
([screenshots](screenshots.md)).
