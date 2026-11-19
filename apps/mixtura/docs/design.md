---
type: Specification
title: Design
description: Layout, colour tokens with computed contrast, type scale, spacing, how balance ranges are drawn, copy rules and the review checklist for every screen of Mixtura; the accent colour is a proposal for the owner.
tags: [design, ui, accessibility, tokens]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: wcag
    title: "WCAG 2.1: contrast ratios (SC 1.4.3 text 4.5:1, SC 1.4.11 non-text 3:1) and focus visible (SC 2.4.7); the 44 px target is this project's own rule"
  - id: tokens
    title: 'docs/mockups/mockup.css: the tokens below as working CSS'
---

# Design

One calm look for a working tool: system fonts, one accent, no
decoration. The screens and flows are in [behaviour](behaviour.md); the
fixed texts in [UI strings](ui-strings.md). The mock-ups in
[`mockups/`](mockups/index.html) implement this file; where they differ,
this file wins and the mock-up is fixed.

# Layout rules

- **360 × 720 first.** Every screen is designed at 360 px wide, then
  widened. Minimum width 320 px must not break (text wraps, nothing is
  cut). No horizontal scrolling of the page or of any list; chip rows
  wrap.
- **Two layouts, one breakpoint at 840 px.** Below: one pane at a time,
  bottom navigation. From 840 px: a rail (88 px) on the left, the list
  pane (380 px) and the detail pane side by side; screens that have no
  list (stock, settings) centre their content at most 720 px wide.
- **Touch targets at least 44 × 44 px** for everything tappable,
  including icon buttons, chips, checkboxes, toggles and list rows
  (rows are at least 56 px high). Targets are 8 px apart. Elements that
  are not interactive (tags) may be smaller and must not look tappable
  (no pressed state, no chevron).
- **Thumb reach.** The most used actions sit in a bottom bar (a screen
  shows either the navigation bar or an action bar, never both): the
  spec screen has Try a Swap, Riff, Edit; the editor Cancel and Save
  Version; the swap mode Reset, Riff, Save. The top bar keeps back,
  title and one overflow menu. Destructive actions are never in the
  bottom bar and never one tap from a primary action.
- **Undo instead of confirm.** A destructive action acts at once and
  shows a toast with Undo for 8 seconds; there is no confirm dialog.
  Where the action cannot be reversed by the app itself (import), the
  app first keeps a copy and Undo restores it
  ([import](screens-stock-settings.md#export-and-import)).
- **Back everywhere.** Every pushed screen has a back button at the top
  left, answers the browser back button and the system back gesture, and
  never traps the user (see [navigation](behaviour.md#navigation)).
- **Forms scroll.** The page scrolls so the focused field stays above
  the on-screen keyboard; bottom bars stay visible; nothing is focused
  when a screen opens.
- **Visible focus.** Every focusable element shows a 3 px outline in
  `--focus` with 2 px offset; never removed. Tab order follows reading
  order.
- **Labels.** Every icon-only button has an accessible name and a
  tooltip on desktop; icons are `aria-hidden`.
- **Colour never carries information alone.** State is always text plus
  a shape (see [balance](#drawing-balance)); selected chips add a check
  mark and bold; makeable shows a check and the word.
- **Motion.** None needed; any transition is under 150 ms and off with
  `prefers-reduced-motion`.

# Colour

Colours exist only as CSS custom properties on `:root`: a light set, a
dark set under `@media (prefers-color-scheme: dark)` guarded by
`:root:not([data-theme='light'])`, and the same dark set under
`:root[data-theme='dark']`. The setting System / Light / Dark writes
`data-theme` (System removes it). Components use `var(--…)` only; a
hex value outside the token block is a review failure.

| Token           | Light     | Dark      | Use                                     |
| --------------- | --------- | --------- | --------------------------------------- |
| `--bg`          | `#FAF8F5` | `#16130F` | Page background                         |
| `--surface`     | `#FFFFFF` | `#211D18` | Cards, bars, list pane                  |
| `--surface-2`   | `#F3EFE9` | `#2A251F` | Group headings, compact balance bar     |
| `--text`        | `#1F1B16` | `#F2EDE6` | Text                                    |
| `--text-muted`  | `#5C544A` | `#B5ABA0` | Secondary text, hints                   |
| `--border`      | `#8C8478` | `#8A8175` | Outlines of controls (non-text, 3:1)    |
| `--divider`     | `#E2DCD2` | `#3A342C` | Hairlines between rows (decorative)     |
| `--accent`      | `#9A4A12` | `#F0A468` | Primary button, selected state, markers |
| `--on-accent`   | `#FFFFFF` | `#1F1206` | Text on `--accent`                      |
| `--accent-soft` | `#F6E7DA` | `#3A2616` | Selected rows and chips, ranges         |
| `--focus`       | `#1F1B16` | `#F2EDE6` | Focus outline                           |

## Accent colour: proposal for the owner

**Copper** (`#9A4A12` light, `#F0A468` dark): a bar-copper that is not
the green or blue of most tools and is not read as an error or success
colour. It is a proposal; the owner decides
([open questions](#open-questions)). Changing it means changing the
four accent tokens and re-checking the contrast table.

Contrast ratios, WCAG relative luminance, computed from the hex values
above (assumption: sRGB, no alpha):

| Pair                              | Light | Dark  | Needed |
| --------------------------------- | ----- | ----- | ------ |
| `--text` on `--bg`                | 16.15 | 15.90 | 4.5    |
| `--text` on `--surface`           | 17.12 | 14.38 | 4.5    |
| `--text-muted` on `--bg`          | 7.02  | 8.20  | 4.5    |
| `--text-muted` on `--surface`     | 7.44  | 7.42  | 4.5    |
| `--text-muted` on `--surface-2`   | 6.50  | 6.72  | 4.5    |
| `--text-muted` on `--accent-soft` | 6.15  | 6.33  | 4.5    |
| `--text` on `--accent-soft`       | 14.15 | 12.28 | 4.5    |
| `--accent` on `--bg` (text)       | 5.89  | 9.01  | 4.5    |
| `--accent` on `--surface` (text)  | 6.25  | 8.15  | 4.5    |
| `--accent` on `--accent-soft`     | 5.16  | 6.96  | 4.5    |
| `--on-accent` on `--accent`       | 6.25  | 8.90  | 4.5    |
| `--border` on `--bg` (outline)    | 3.48  | 4.83  | 3      |
| `--border` on `--surface`         | 3.69  | 4.37  | 3      |
| `--focus` on `--bg`               | 16.15 | 15.90 | 3      |

All pairs pass WCAG AA (text 4.5:1, non-text 3:1). `--divider` is
decorative and is not relied on.

# Type and spacing

System font stack `system-ui, -apple-system, 'Segoe UI', Roboto,
'Helvetica Neue', Arial, sans-serif`; no web fonts, nothing loaded.
Numbers use `font-variant-numeric: tabular-nums` so columns align.

| Token     | Size             | Use                            |
| --------- | ---------------- | ------------------------------ |
| `--fs-xs` | 0.75rem (12 px)  | Hints, tags, range footers     |
| `--fs-sm` | 0.875rem (14 px) | Secondary text, buttons, chips |
| `--fs-md` | 1rem (16 px)     | Body, list titles, inputs      |
| `--fs-lg` | 1.25rem (20 px)  | Screen titles, balance values  |
| `--fs-xl` | 1.5rem (24 px)   | Only the empty-state headline  |

Sizes are in `rem`, so the system's text-size setting scales them; no
font size outside this scale. Inputs are at least 16 px so mobile
browsers do not zoom on focus. Weights: 400 body, 600 list titles and
buttons, 700 headings and values.

Spacing `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 24,
`--sp-6` 32 px. Page gutter `--sp-4`. Radius `--radius` 12 px,
`--radius-sm` 8 px. `--target` 44 px.

# Components

Names used by the mock-ups and the app: app bar, bottom navigation
(four destinations), action bar, list row (title, one line of detail,
one end tag), card, tag, chip (filter, toggles with a check when on),
segmented control, input, text area, toggle row (a check box, not a
switch, so the on state has a shape), stepper, banner, toast with
Undo, sheet (filters, ingredient picker, batch), status page
(empty and error states, [strings](ui-strings.md)). Style classes
come before custom CSS; one `app.css` holds the tokens and components.

# Drawing balance

The balance panel ([spec screen](screens-browse.md#spec)) shows one
block per figure (ABV, sugar, acid, in this order); the volume after
dilution is one line below. Numbers are ranges, never verdicts
([AGENTS.md](../AGENTS.md)).

Each block has, from top to bottom:

1. **Name, value, position word.** Value in `--fs-lg` bold with its unit
   (`18.3 %`, `10.8 g/100 ml`, `1.03 %`). At the right the position:
   a filled circle and **Within**, a down arrow and **Below**, an up
   arrow and **Above**. The full sentence ("Within the usual range")
   is the accessible name of the track and appears in the tooltip.
2. **Track.** A thin line, the usual range as a band with a solid bar at
   each end, the value as a diamond: filled when within the band,
   outlined (hollow) when below or above. The scale runs from one range
   width below the band to one range width above it, so the band is the
   middle third; values beyond the scale sit at the edge. In swap mode a
   dotted tick marks the saved value.
3. **Footer.** "Usual range 17.6–19.0 %". In swap mode a row below it
   reads "Was 18.3 % → now 19.7 % (+1.4 points)". Never a score, grade, red
   or green.

Position is therefore carried by words, arrow shape, diamond fill and
place on the track, and by no colour. The band uses `--accent-soft`
only as an aid. Without a usual range (template without `usual`, or a
spec without a template) the block shows the value and the line "No
usual range for this drink" and no band. A figure that cannot be
computed (an ingredient lacks ABV, sugar or acid) shows "No figure" and
names the ingredient; it is never shown as 0.

**Assumed ranges.** While the evidence of a range is `assumption` (or not
stated) the block shows the value, the band dashed, the footer "Assumed
range 17.6–19.0 %" and **no position word**; the diamond is always filled
and the accessible name says "assumed range ..., not checked against a
source". Position word, "Usual range" and the hollow diamond come back
with evidence `derived`, `secondary` or `verified`
([why](balance.md#how-precise-a-range-is-shown)).

While the template ranges are not yet verified against a source
([balance](balance.md#evidence)), the panel carries the line "Ranges
come from a model and are not yet checked against a source." This line
goes when the evidence table says verified.

# Copy rules

- **Header capitalisation for titles and buttons** ("Try a Swap", "Save
  Version", "Buy Next", "Balance After Shaking"); **sentence
  capitalisation for descriptions**, hints, chips, tags, toasts and
  menu items inside sheets ("Makeable now", "Retired Gimlet"). Small
  words (a, the, of, after) stay lower case except at the start.
- Calm, factual, second person only where needed. No exclamation marks,
  no emoji, no "oops", no praise, no streaks, no promotion.
- The reader is an experienced bartender: no tutorials, no
  step-by-step instructions in the main flow, no explaining what a
  jigger is. Help is a single line under a field or a link to the notes
  ("How this is computed"), never a first-run tour.
- Numbers are shown against a range, never judged: **Within / Below /
  Above the usual range**, never "good", "bad", "wrong", "balanced",
  "too sweet".
- Errors say what happened and what stays safe, then one action: "The
  file is not a Mixtura export. Nothing was imported." Never blame.
- No confirm dialogs: do it, then "Retired Gimlet"
  with Undo.
- Units, ingredient names and amounts are shown as the user entered them
  where possible ([units](units.md#display-and-rounding)).

# Open questions

For the owner; each has a proposal and nothing is decided silently.

| #   | Question                 | Proposal                                                                                                                                                                                                         |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Accent colour            | Copper, `#9A4A12` / `#F0A468` (above).                                                                                                                                                                           |
| Q2  | Navigation structure     | Bottom navigation with four destinations (Drinks, Templates, Stock, Settings), rail from 840 px; see [navigation](behaviour.md#navigation). Alternative: drinks list only as the home and Templates as a filter. |
| Q3  | Default unit system      | Metric, as the [decision](decisions/units-and-display.md) proposes; the Settings screen asks nothing at first start.                                                                                             |
| Q4  | Where Buy Next lives     | As a second view of the Stock destination (Stock / Buy Next), not a fifth destination.                                                                                                                           |
| Q5  | Hash URLs (`#/drinks/…`) | Yes: static hosting on GitHub Pages needs no server rewrite and the installed app works the same.                                                                                                                |

# Review checklist

Used by the screenshot issue ([#21](https://github.com/nexumia-de/mixtura/issues/21))
and before every pull request that changes a screen. Every item is
checked at 360 × 720 and at 1200 × 800, in light and in dark.

- [ ] No horizontal scrolling at 360 px and at 320 px; no clipped or
      overlapping text; titles, labels and names wrap, they are not
      truncated with an ellipsis.
- [ ] Text scaling and reflow (WCAG 1.4.4, 1.4.10): with the root font size
      at 200 % the screen still reflows at 360 px and at 320 px without
      sideways scrolling; sizes around text are `rem` or `min-height`
      (never a fixed height), flex and grid children have `min-width: 0`,
      long words break (`overflow-wrap: anywhere`), the bottom bar's labels
      wrap. `e2e/reflow.mjs` checks every route.
- [ ] Every tappable element is at least 44 × 44 px with 8 px between
      neighbours.
- [ ] The most used actions are in the bottom bar; destructive ones are
      not.
- [ ] Back works: header button, browser back, system gesture; the
      back stack does not trap or loop.
- [ ] A reload keeps the screen and its parameters
      ([state](behaviour.md#state-and-reload)).
- [ ] Nothing is focused on open; the focused field stays visible above
      the keyboard; focus outline visible on every control.
- [ ] Every icon-only button has an accessible name and a tooltip.
- [ ] No colour is the only carrier of information (check with a
      greyscale screenshot).
- [ ] Colours are tokens only; contrast is at least the values above in
      both themes; no hard-coded font size or colour.
- [ ] Type is on the scale; numbers are tabular.
- [ ] Balance shows ranges and words from the
      [strings](ui-strings.md), never a verdict; the unverified-range
      line is present while ranges are unverified.
- [ ] Empty, error and offline states exist and use the strings.
- [ ] Destructive actions act with an Undo toast; there is no confirm
      dialog.
- [ ] Texts follow the copy rules; no tutorial text in the main flow.
- [ ] Offline: the screen works with the network off.
- [ ] Desktop: keyboard operation complete, two panes from 840 px.

# App icons

Placeholder icons, replaced when the owner decides the look (open question
on the accent). Source `packages/app/src/icons/icon.svg` (white coupe glass on the proposed copper
`#9a4a12`, rounded square) and `icon-maskable.svg` (full-bleed square, glass inside the 80 %
safe zone) and `icon-monochrome.svg` (the glass alone, black on transparent, same
safe zone, for themed icons: manifest purpose `monochrome`). `node
packages/app/e2e/make-icons.mjs` renders `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png` and `icon-monochrome-512.png` with Playwright; the PNGs are committed. The manifest's
`theme_color` and `background_color` are `--bg` of the light theme (`#faf8f5`); `index.html`
adds `theme-color` meta tags for light and dark.
