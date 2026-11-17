---
type: Reference
title: Screenshots
description: Overview of the current app screens at 360x720 and 1200x800 in light and dark, how they are generated, and the separate mock-up screenshots from the design phase.
tags: [screenshots, ui, testing]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: e2e
    title: 'packages/app/e2e/*.mjs with --docs: Playwright, headless Chromium, scale 2, seed data only'
---

# Screenshots

The screens of the built app, taken by the end-to-end scripts on the seed
data only (no real data). Every file is `docs/screenshots/<name>-<width>x<height>.png`
at scale 2, the phone size 360x720 first and the desktop size 1200x800
second; click an image for the full file. The mock-up pictures from the
design phase are not the app and live apart, see
[Mock-ups](#mock-ups-not-the-app).

## Regenerate

Build first (`npm run build`), then in `packages/app`, with
`MIXTURA_CHROMIUM` set where the cloud image needs it
([development](development.md)):

```sh
for s in walk exchange browse list-keys stock swap editor alcohol dark; do for size in "360 720" "1200 800"; do node e2e/$s.mjs $size --docs; done; done
```

A script writes only the files it names, so a file that no script
writes is stale: add its screen to a script or delete it, and keep this
page complete. `e2e/breakpoint.mjs` (839 and 840 px in dark) writes to
`dist/walk/` only.

## Shell and navigation

Bottom bar at 360 px, rail from 840 px, the update banner and the theme setting.

| Screen                | 360x720                                                                                                                                                            | 1200x800                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell`               | <a href="screenshots/shell-360x720.png"><img src="screenshots/shell-360x720.png" alt="shell at 360x720" width="180"></a>                                           | <a href="screenshots/shell-1200x800.png"><img src="screenshots/shell-1200x800.png" alt="shell at 1200x800" width="400"></a>                                           |
| `shell-update`        | <a href="screenshots/shell-update-360x720.png"><img src="screenshots/shell-update-360x720.png" alt="shell-update at 360x720" width="180"></a>                      | <a href="screenshots/shell-update-1200x800.png"><img src="screenshots/shell-update-1200x800.png" alt="shell-update at 1200x800" width="400"></a>                      |
| `shell-settings-dark` | <a href="screenshots/shell-settings-dark-360x720.png"><img src="screenshots/shell-settings-dark-360x720.png" alt="shell-settings-dark at 360x720" width="180"></a> | <a href="screenshots/shell-settings-dark-1200x800.png"><img src="screenshots/shell-settings-dark-1200x800.png" alt="shell-settings-dark at 1200x800" width="400"></a> |

## Templates

| Screen                | 360x720                                                                                                                                                            | 1200x800                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-templates`       | <a href="screenshots/app-templates-360x720.png"><img src="screenshots/app-templates-360x720.png" alt="app-templates at 360x720" width="180"></a>                   | <a href="screenshots/app-templates-1200x800.png"><img src="screenshots/app-templates-1200x800.png" alt="app-templates at 1200x800" width="400"></a>                   |
| `app-template-detail` | <a href="screenshots/app-template-detail-360x720.png"><img src="screenshots/app-template-detail-360x720.png" alt="app-template-detail at 360x720" width="180"></a> | <a href="screenshots/app-template-detail-1200x800.png"><img src="screenshots/app-template-detail-1200x800.png" alt="app-template-detail at 1200x800" width="400"></a> |

## Drinks list and filters

| Screen                     | 360x720                                                                                                                                                                           | 1200x800                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app-drinks-list`          | <a href="screenshots/app-drinks-list-360x720.png"><img src="screenshots/app-drinks-list-360x720.png" alt="app-drinks-list at 360x720" width="180"></a>                            | <a href="screenshots/app-drinks-list-1200x800.png"><img src="screenshots/app-drinks-list-1200x800.png" alt="app-drinks-list at 1200x800" width="400"></a>                            |
| `app-drinks-filtered`      | <a href="screenshots/app-drinks-filtered-360x720.png"><img src="screenshots/app-drinks-filtered-360x720.png" alt="app-drinks-filtered at 360x720" width="180"></a>                | <a href="screenshots/app-drinks-filtered-1200x800.png"><img src="screenshots/app-drinks-filtered-1200x800.png" alt="app-drinks-filtered at 1200x800" width="400"></a>                |
| `app-sort-menu`            | <a href="screenshots/app-sort-menu-360x720.png"><img src="screenshots/app-sort-menu-360x720.png" alt="app-sort-menu at 360x720" width="180"></a>                                  | <a href="screenshots/app-sort-menu-1200x800.png"><img src="screenshots/app-sort-menu-1200x800.png" alt="app-sort-menu at 1200x800" width="400"></a>                                  |
| `app-filters`              | <a href="screenshots/app-filters-360x720.png"><img src="screenshots/app-filters-360x720.png" alt="app-filters at 360x720" width="180"></a>                                        | <a href="screenshots/app-filters-1200x800.png"><img src="screenshots/app-filters-1200x800.png" alt="app-filters at 1200x800" width="400"></a>                                        |
| `app-filters-availability` | <a href="screenshots/app-filters-availability-360x720.png"><img src="screenshots/app-filters-availability-360x720.png" alt="app-filters-availability at 360x720" width="180"></a> | <a href="screenshots/app-filters-availability-1200x800.png"><img src="screenshots/app-filters-availability-1200x800.png" alt="app-filters-availability at 1200x800" width="400"></a> |
| `app-alcohol-sheet`        | <a href="screenshots/app-alcohol-sheet-360x720.png"><img src="screenshots/app-alcohol-sheet-360x720.png" alt="app-alcohol-sheet at 360x720" width="180"></a>                      | <a href="screenshots/app-alcohol-sheet-1200x800.png"><img src="screenshots/app-alcohol-sheet-1200x800.png" alt="app-alcohol-sheet at 1200x800" width="400"></a>                      |
| `app-alcohol-low`          | <a href="screenshots/app-alcohol-low-360x720.png"><img src="screenshots/app-alcohol-low-360x720.png" alt="app-alcohol-low at 360x720" width="180"></a>                            | <a href="screenshots/app-alcohol-low-1200x800.png"><img src="screenshots/app-alcohol-low-1200x800.png" alt="app-alcohol-low at 1200x800" width="400"></a>                            |
| `app-alcohol-none`         | <a href="screenshots/app-alcohol-none-360x720.png"><img src="screenshots/app-alcohol-none-360x720.png" alt="app-alcohol-none at 360x720" width="180"></a>                         | <a href="screenshots/app-alcohol-none-1200x800.png"><img src="screenshots/app-alcohol-none-1200x800.png" alt="app-alcohol-none at 1200x800" width="400"></a>                         |
| `app-alcohol-settings`     | <a href="screenshots/app-alcohol-settings-360x720.png"><img src="screenshots/app-alcohol-settings-360x720.png" alt="app-alcohol-settings at 360x720" width="180"></a>             | <a href="screenshots/app-alcohol-settings-1200x800.png"><img src="screenshots/app-alcohol-settings-1200x800.png" alt="app-alcohol-settings at 1200x800" width="400"></a>             |
| `app-drinks-makeable`      | <a href="screenshots/app-drinks-makeable-360x720.png"><img src="screenshots/app-drinks-makeable-360x720.png" alt="app-drinks-makeable at 360x720" width="180"></a>                | <a href="screenshots/app-drinks-makeable-1200x800.png"><img src="screenshots/app-drinks-makeable-1200x800.png" alt="app-drinks-makeable at 1200x800" width="400"></a>                |
| `app-drinks-missing-one`   | <a href="screenshots/app-drinks-missing-one-360x720.png"><img src="screenshots/app-drinks-missing-one-360x720.png" alt="app-drinks-missing-one at 360x720" width="180"></a>       | <a href="screenshots/app-drinks-missing-one-1200x800.png"><img src="screenshots/app-drinks-missing-one-1200x800.png" alt="app-drinks-missing-one at 1200x800" width="400"></a>       |

## Spec screen

| Screen                  | 360x720                                                                                                                                                                  | 1200x800                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-spec`              | <a href="screenshots/app-spec-360x720.png"><img src="screenshots/app-spec-360x720.png" alt="app-spec at 360x720" width="180"></a>                                        | <a href="screenshots/app-spec-1200x800.png"><img src="screenshots/app-spec-1200x800.png" alt="app-spec at 1200x800" width="400"></a>                                        |
| `app-spec-balance`      | <a href="screenshots/app-spec-balance-360x720.png"><img src="screenshots/app-spec-balance-360x720.png" alt="app-spec-balance at 360x720" width="180"></a>                | <a href="screenshots/app-spec-balance-1200x800.png"><img src="screenshots/app-spec-balance-1200x800.png" alt="app-spec-balance at 1200x800" width="400"></a>                |
| `app-spec-batch`        | <a href="screenshots/app-spec-batch-360x720.png"><img src="screenshots/app-spec-batch-360x720.png" alt="app-spec-batch at 360x720" width="180"></a>                      | <a href="screenshots/app-spec-batch-1200x800.png"><img src="screenshots/app-spec-batch-1200x800.png" alt="app-spec-batch at 1200x800" width="400"></a>                      |
| `app-spec-batch-volume` | <a href="screenshots/app-spec-batch-volume-360x720.png"><img src="screenshots/app-spec-batch-volume-360x720.png" alt="app-spec-batch-volume at 360x720" width="180"></a> | <a href="screenshots/app-spec-batch-volume-1200x800.png"><img src="screenshots/app-spec-batch-volume-1200x800.png" alt="app-spec-batch-volume at 1200x800" width="400"></a> |
| `app-spec-servings`     | <a href="screenshots/app-spec-servings-360x720.png"><img src="screenshots/app-spec-servings-360x720.png" alt="app-spec-servings at 360x720" width="180"></a>             | <a href="screenshots/app-spec-servings-1200x800.png"><img src="screenshots/app-spec-servings-1200x800.png" alt="app-spec-servings at 1200x800" width="400"></a>             |
| `app-spec-no-template`  | <a href="screenshots/app-spec-no-template-360x720.png"><img src="screenshots/app-spec-no-template-360x720.png" alt="app-spec-no-template at 360x720" width="180"></a>    | <a href="screenshots/app-spec-no-template-1200x800.png"><img src="screenshots/app-spec-no-template-1200x800.png" alt="app-spec-no-template at 1200x800" width="400"></a>    |
| `app-spec-not-counted`  | <a href="screenshots/app-spec-not-counted-360x720.png"><img src="screenshots/app-spec-not-counted-360x720.png" alt="app-spec-not-counted at 360x720" width="180"></a>    | <a href="screenshots/app-spec-not-counted-1200x800.png"><img src="screenshots/app-spec-not-counted-1200x800.png" alt="app-spec-not-counted at 1200x800" width="400"></a>    |

## Swap mode

| Screen                  | 360x720                                                                                                                                                                  | 1200x800                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `swap-start`            | <a href="screenshots/swap-start-360x720.png"><img src="screenshots/swap-start-360x720.png" alt="swap-start at 360x720" width="180"></a>                                  | <a href="screenshots/swap-start-1200x800.png"><img src="screenshots/swap-start-1200x800.png" alt="swap-start at 1200x800" width="400"></a>                                  |
| `swap-sheet-ingredient` | <a href="screenshots/swap-sheet-ingredient-360x720.png"><img src="screenshots/swap-sheet-ingredient-360x720.png" alt="swap-sheet-ingredient at 360x720" width="180"></a> | <a href="screenshots/swap-sheet-ingredient-1200x800.png"><img src="screenshots/swap-sheet-ingredient-1200x800.png" alt="swap-sheet-ingredient at 1200x800" width="400"></a> |
| `swap-sheet-amount`     | <a href="screenshots/swap-sheet-amount-360x720.png"><img src="screenshots/swap-sheet-amount-360x720.png" alt="swap-sheet-amount at 360x720" width="180"></a>             | <a href="screenshots/swap-sheet-amount-1200x800.png"><img src="screenshots/swap-sheet-amount-1200x800.png" alt="swap-sheet-amount at 1200x800" width="400"></a>             |
| `swap-changed`          | <a href="screenshots/swap-changed-360x720.png"><img src="screenshots/swap-changed-360x720.png" alt="swap-changed at 360x720" width="180"></a>                            | <a href="screenshots/swap-changed-1200x800.png"><img src="screenshots/swap-changed-1200x800.png" alt="swap-changed at 1200x800" width="400"></a>                            |
| `swap-amount`           | <a href="screenshots/swap-amount-360x720.png"><img src="screenshots/swap-amount-360x720.png" alt="swap-amount at 360x720" width="180"></a>                               | <a href="screenshots/swap-amount-1200x800.png"><img src="screenshots/swap-amount-1200x800.png" alt="swap-amount at 1200x800" width="400"></a>                               |
| `swap-keyboard`         | <a href="screenshots/swap-keyboard-360x720.png"><img src="screenshots/swap-keyboard-360x720.png" alt="swap-keyboard at 360x720" width="180"></a>                         | <a href="screenshots/swap-keyboard-1200x800.png"><img src="screenshots/swap-keyboard-1200x800.png" alt="swap-keyboard at 1200x800" width="400"></a>                         |
| `swap-no-role`          | <a href="screenshots/swap-no-role-360x720.png"><img src="screenshots/swap-no-role-360x720.png" alt="swap-no-role at 360x720" width="180"></a>                            | <a href="screenshots/swap-no-role-1200x800.png"><img src="screenshots/swap-no-role-1200x800.png" alt="swap-no-role at 1200x800" width="400"></a>                            |
| `swap-no-template`      | <a href="screenshots/swap-no-template-360x720.png"><img src="screenshots/swap-no-template-360x720.png" alt="swap-no-template at 360x720" width="180"></a>                | <a href="screenshots/swap-no-template-1200x800.png"><img src="screenshots/swap-no-template-1200x800.png" alt="swap-no-template at 1200x800" width="400"></a>                |

## Stock and Buy Next

| Screen               | 360x720                                                                                                                                                         | 1200x800                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app-stock`          | <a href="screenshots/app-stock-360x720.png"><img src="screenshots/app-stock-360x720.png" alt="app-stock at 360x720" width="180"></a>                            | <a href="screenshots/app-stock-1200x800.png"><img src="screenshots/app-stock-1200x800.png" alt="app-stock at 1200x800" width="400"></a>                            |
| `app-stock-tree`     | <a href="screenshots/app-stock-tree-360x720.png"><img src="screenshots/app-stock-tree-360x720.png" alt="app-stock-tree at 360x720" width="180"></a>             | <a href="screenshots/app-stock-tree-1200x800.png"><img src="screenshots/app-stock-tree-1200x800.png" alt="app-stock-tree at 1200x800" width="400"></a>             |
| `app-stock-in-stock` | <a href="screenshots/app-stock-in-stock-360x720.png"><img src="screenshots/app-stock-in-stock-360x720.png" alt="app-stock-in-stock at 360x720" width="180"></a> | <a href="screenshots/app-stock-in-stock-1200x800.png"><img src="screenshots/app-stock-in-stock-1200x800.png" alt="app-stock-in-stock at 1200x800" width="400"></a> |
| `app-stock-empty`    | <a href="screenshots/app-stock-empty-360x720.png"><img src="screenshots/app-stock-empty-360x720.png" alt="app-stock-empty at 360x720" width="180"></a>          | <a href="screenshots/app-stock-empty-1200x800.png"><img src="screenshots/app-stock-empty-1200x800.png" alt="app-stock-empty at 1200x800" width="400"></a>          |
| `app-buy-next`       | <a href="screenshots/app-buy-next-360x720.png"><img src="screenshots/app-buy-next-360x720.png" alt="app-buy-next at 360x720" width="180"></a>                   | <a href="screenshots/app-buy-next-1200x800.png"><img src="screenshots/app-buy-next-1200x800.png" alt="app-buy-next at 1200x800" width="400"></a>                   |
| `app-buy-next-open`  | <a href="screenshots/app-buy-next-open-360x720.png"><img src="screenshots/app-buy-next-open-360x720.png" alt="app-buy-next-open at 360x720" width="180"></a>    | <a href="screenshots/app-buy-next-open-1200x800.png"><img src="screenshots/app-buy-next-open-1200x800.png" alt="app-buy-next-open at 1200x800" width="400"></a>    |

## Spec editor

| Screen                   | 360x720                                                                                                                                                                     | 1200x800                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `editor-daiquiri`        | <a href="screenshots/editor-daiquiri-360x720.png"><img src="screenshots/editor-daiquiri-360x720.png" alt="editor-daiquiri at 360x720" width="180"></a>                      | <a href="screenshots/editor-daiquiri-1200x800.png"><img src="screenshots/editor-daiquiri-1200x800.png" alt="editor-daiquiri at 1200x800" width="400"></a>                      |
| `editor-error`           | <a href="screenshots/editor-error-360x720.png"><img src="screenshots/editor-error-360x720.png" alt="editor-error at 360x720" width="180"></a>                               | <a href="screenshots/editor-error-1200x800.png"><img src="screenshots/editor-error-1200x800.png" alt="editor-error at 1200x800" width="400"></a>                               |
| `editor-restored`        | <a href="screenshots/editor-restored-360x720.png"><img src="screenshots/editor-restored-360x720.png" alt="editor-restored at 360x720" width="180"></a>                      | <a href="screenshots/editor-restored-1200x800.png"><img src="screenshots/editor-restored-1200x800.png" alt="editor-restored at 1200x800" width="400"></a>                      |
| `editor-ingredient-form` | <a href="screenshots/editor-ingredient-form-360x720.png"><img src="screenshots/editor-ingredient-form-360x720.png" alt="editor-ingredient-form at 360x720" width="180"></a> | <a href="screenshots/editor-ingredient-form-1200x800.png"><img src="screenshots/editor-ingredient-form-1200x800.png" alt="editor-ingredient-form at 1200x800" width="400"></a> |
| `editor-prepared`        | <a href="screenshots/editor-prepared-360x720.png"><img src="screenshots/editor-prepared-360x720.png" alt="editor-prepared at 360x720" width="180"></a>                      | <a href="screenshots/editor-prepared-1200x800.png"><img src="screenshots/editor-prepared-1200x800.png" alt="editor-prepared at 1200x800" width="400"></a>                      |
| `editor-copy`            | <a href="screenshots/editor-copy-360x720.png"><img src="screenshots/editor-copy-360x720.png" alt="editor-copy at 360x720" width="180"></a>                                  | <a href="screenshots/editor-copy-1200x800.png"><img src="screenshots/editor-copy-1200x800.png" alt="editor-copy at 1200x800" width="400"></a>                                  |
| `editor-refused`         | <a href="screenshots/editor-refused-360x720.png"><img src="screenshots/editor-refused-360x720.png" alt="editor-refused at 360x720" width="180"></a>                         | <a href="screenshots/editor-refused-1200x800.png"><img src="screenshots/editor-refused-1200x800.png" alt="editor-refused at 1200x800" width="400"></a>                         |

## Data: export and import

| Screen                | 360x720                                                                                                                                                            | 1200x800                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-exported`       | <a href="screenshots/data-exported-360x720.png"><img src="screenshots/data-exported-360x720.png" alt="data-exported at 360x720" width="180"></a>                   | <a href="screenshots/data-exported-1200x800.png"><img src="screenshots/data-exported-1200x800.png" alt="data-exported at 1200x800" width="400"></a>                   |
| `data-import-preview` | <a href="screenshots/data-import-preview-360x720.png"><img src="screenshots/data-import-preview-360x720.png" alt="data-import-preview at 360x720" width="180"></a> | <a href="screenshots/data-import-preview-1200x800.png"><img src="screenshots/data-import-preview-1200x800.png" alt="data-import-preview at 1200x800" width="400"></a> |
| `data-imported`       | <a href="screenshots/data-imported-360x720.png"><img src="screenshots/data-imported-360x720.png" alt="data-imported at 360x720" width="180"></a>                   | <a href="screenshots/data-imported-1200x800.png"><img src="screenshots/data-imported-1200x800.png" alt="data-imported at 1200x800" width="400"></a>                   |
| `data-import-error`   | <a href="screenshots/data-import-error-360x720.png"><img src="screenshots/data-import-error-360x720.png" alt="data-import-error at 360x720" width="180"></a>       | <a href="screenshots/data-import-error-1200x800.png"><img src="screenshots/data-import-error-1200x800.png" alt="data-import-error at 1200x800" width="400"></a>       |
| `data-reminder`       | <a href="screenshots/data-reminder-360x720.png"><img src="screenshots/data-reminder-360x720.png" alt="data-reminder at 360x720" width="180"></a>                   | <a href="screenshots/data-reminder-1200x800.png"><img src="screenshots/data-reminder-1200x800.png" alt="data-reminder at 1200x800" width="400"></a>                   |
| `settings-data-row`   | <a href="screenshots/settings-data-row-360x720.png"><img src="screenshots/settings-data-row-360x720.png" alt="settings-data-row at 360x720" width="180"></a>       | <a href="screenshots/settings-data-row-1200x800.png"><img src="screenshots/settings-data-row-1200x800.png" alt="settings-data-row at 1200x800" width="400"></a>       |

## Dark mode

The same screens as in light; `e2e/dark.mjs`.

| Screen                | 360x720                                                                                                                                                            | 1200x800                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dark-drinks`         | <a href="screenshots/dark-drinks-360x720.png"><img src="screenshots/dark-drinks-360x720.png" alt="dark-drinks at 360x720" width="180"></a>                         | <a href="screenshots/dark-drinks-1200x800.png"><img src="screenshots/dark-drinks-1200x800.png" alt="dark-drinks at 1200x800" width="400"></a>                         |
| `dark-templates`      | <a href="screenshots/dark-templates-360x720.png"><img src="screenshots/dark-templates-360x720.png" alt="dark-templates at 360x720" width="180"></a>                | <a href="screenshots/dark-templates-1200x800.png"><img src="screenshots/dark-templates-1200x800.png" alt="dark-templates at 1200x800" width="400"></a>                |
| `dark-template`       | <a href="screenshots/dark-template-360x720.png"><img src="screenshots/dark-template-360x720.png" alt="dark-template at 360x720" width="180"></a>                   | <a href="screenshots/dark-template-1200x800.png"><img src="screenshots/dark-template-1200x800.png" alt="dark-template at 1200x800" width="400"></a>                   |
| `dark-spec`           | <a href="screenshots/dark-spec-360x720.png"><img src="screenshots/dark-spec-360x720.png" alt="dark-spec at 360x720" width="180"></a>                               | <a href="screenshots/dark-spec-1200x800.png"><img src="screenshots/dark-spec-1200x800.png" alt="dark-spec at 1200x800" width="400"></a>                               |
| `dark-swap`           | <a href="screenshots/dark-swap-360x720.png"><img src="screenshots/dark-swap-360x720.png" alt="dark-swap at 360x720" width="180"></a>                               | <a href="screenshots/dark-swap-1200x800.png"><img src="screenshots/dark-swap-1200x800.png" alt="dark-swap at 1200x800" width="400"></a>                               |
| `dark-stock`          | <a href="screenshots/dark-stock-360x720.png"><img src="screenshots/dark-stock-360x720.png" alt="dark-stock at 360x720" width="180"></a>                            | <a href="screenshots/dark-stock-1200x800.png"><img src="screenshots/dark-stock-1200x800.png" alt="dark-stock at 1200x800" width="400"></a>                            |
| `dark-buy-next-empty` | <a href="screenshots/dark-buy-next-empty-360x720.png"><img src="screenshots/dark-buy-next-empty-360x720.png" alt="dark-buy-next-empty at 360x720" width="180"></a> | <a href="screenshots/dark-buy-next-empty-1200x800.png"><img src="screenshots/dark-buy-next-empty-1200x800.png" alt="dark-buy-next-empty at 1200x800" width="400"></a> |
| `dark-settings`       | <a href="screenshots/dark-settings-360x720.png"><img src="screenshots/dark-settings-360x720.png" alt="dark-settings at 360x720" width="180"></a>                   | <a href="screenshots/dark-settings-1200x800.png"><img src="screenshots/dark-settings-1200x800.png" alt="dark-settings at 1200x800" width="400"></a>                   |

## Mock-ups (not the app)

Pictures of the static pages in [mockups/](mockups/index.html) from the
design phase, kept for the decisions that were made on them
([behaviour](behaviour.md)). The app differs from them where the screen
documents say so.

| Mock-up       | 360x720                                            | 1200x800                                             |
| ------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `drinks-list` | [360](screenshots/mockups/drinks-list-360x720.png) | [1200](screenshots/mockups/drinks-list-1200x800.png) |
| `filters`     | [360](screenshots/mockups/filters-360x720.png)     | [1200](screenshots/mockups/filters-1200x800.png)     |
| `spec`        | [360](screenshots/mockups/spec-360x720.png)        | [1200](screenshots/mockups/spec-1200x800.png)        |
| `swap`        | [360](screenshots/mockups/swap-360x720.png)        | [1200](screenshots/mockups/swap-1200x800.png)        |
| `editor`      | [360](screenshots/mockups/editor-360x720.png)      | [1200](screenshots/mockups/editor-1200x800.png)      |
| `stock`       | [360](screenshots/mockups/stock-360x720.png)       | [1200](screenshots/mockups/stock-1200x800.png)       |
| `buy-next`    | [360](screenshots/mockups/buy-next-360x720.png)    | [1200](screenshots/mockups/buy-next-1200x800.png)    |
