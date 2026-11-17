---
type: Specification
title: UI strings
description: Every fixed text of the Mixtura app in English - navigation, buttons, balance wording, empty, error and offline states, toasts, import and export messages and accessible names - under the copy rules of the design document.
tags: [copy, strings, ui, accessibility]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# UI strings

Rules in [design](design.md#copy-rules): header capitalisation for
titles and buttons, sentence capitalisation for descriptions, hints,
chips, tags, toasts and menu items; calm and factual; ranges, never
verdicts. `{x}` is a value filled in by the app. Strings are in one
module so they can be translated later; the first release is English
only. Screens are in [behaviour](behaviour.md).

# Navigation and bars

| Where             | String                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Bottom navigation | Drinks · Templates · Stock · Settings                                                       |
| Stock views       | Stock · Buy Next                                                                            |
| Spec action bar   | Try a Swap · Riff · Edit                                                                    |
| Swap action bar   | Reset · Riff · Save                                                                         |
| Editor action bar | Cancel · Save Version                                                                       |
| Overflow, spec    | Versions · Family · Export spec · Retire · Delete                                           |
| Overflow, list    | Sort by name · Sort by recently changed · Sort by template                                  |
| Titles            | Drinks · Templates · Stock · Settings · About · Edit {name} · New Drink · Versions · Family |

# Buttons

New Drink · Add Ingredient · Add by name (field, "Add by name, for example
Campari") · Create {text} · Filters · Clear Filters · Show {n} Drinks ·
Clear Search · Try Again · Reset · Save · Save Version · Save as My
Version · Cancel · Compare · Restore as New Version · Have It · Undo ·
Export Everything · Import File · Merge · Replace Everything · Delete
Import Backup · Discard Draft · Details · Open Source Link.

# Balance

| Situation                      | Short (beside the value)                                           | Full (accessible name, tooltip)                   |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------- |
| Value inside the range         | Within                                                             | Within the usual range                            |
| Value under the range          | Below                                                              | Below the usual range                             |
| Value over the range           | Above                                                              | Above the usual range                             |
| Footer                         | Usual range {lo}–{hi} {unit}                                       | Usual range {lo} to {hi} {unit}                   |
| Footer in swap mode            | adds · was {value} {unit}                                          |                                                   |
| No template or no range        | No usual range for this drink                                      |                                                   |
| A template without a range     | No usual range for this template                                   |                                                   |
| Figure cannot be computed      | No figure                                                          | No figure: {ingredient} has no {property}         |
| Volume line                    | Volume after dilution {n} ml                                       |                                                   |
| Panel title                    | Balance After {method}                                             | for example Balance After Shaking, After Stirring |
| Unverified ranges (while true) | Ranges come from a model and are not yet checked against a source. |                                                   |
| Compact bar                    | ABV {v} {position} · Sugar {v} {position} · Acid {v} {position}    |                                                   |

Never used: good, bad, wrong, balanced, too sweet, too sour, perfect,
score, grade, warning, error (for a figure).

# Banners, tags, labels

| String                                                                                           | Where                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------- |
| Trying a swap. Nothing is saved.                                                                 | Swap banner                     |
| Trying a swap. Change a line to see the numbers.                                                 | Swap banner before a change     |
| Changed, was {amount}                                                                            | Changed line                    |
| Draft kept                                                                                       | Editor tag                      |
| Makeable · Missing {name} · Missing {n}                                                          | Drinks and spec tags            |
| Riff of {name} · Version {n} · Draft · On menu · Retired                                         | Spec tags                       |
| Base · Modifier · Sweet · Sour · Bitter · Accent · Texture · Lengthener                          | Role tags                       |
| optional                                                                                         | Optional line                   |
| In {n} drinks · Opened {date} · Best before {date} · Past best before {date} · Out · Not tracked | Stock rows                      |
| Prepared · User                                                                                  | Ingredient tags                 |
| Unknown ingredient                                                                               | A line whose ingredient is gone |
| Not in the current data                                                                          | Same, second line               |

# Empty states

| Screen                  | Text                                                                     | Button        |
| ----------------------- | ------------------------------------------------------------------------ | ------------- |
| Drinks, no hit          | No drink matches the search and filters.                                 | Clear Filters |
| Drinks, none            | No drinks yet.                                                           | New Drink     |
| Makeable, empty stock   | Nothing in stock yet. Mark what you have to see what you can make.       | Open Stock    |
| Templates, no hit       | No template matches.                                                     | Clear Search  |
| Template without drinks | No drinks follow this template yet.                                      | New Drink     |
| Stock, empty            | Nothing in stock yet. Add what you have to see what you can make.        |               |
| Stock, no hit           | No ingredient matches.                                                   | Create {text} |
| Buy Next, nothing       | Everything in your drinks is makeable or needs more than one ingredient. |               |
| Buy Next, all makeable  | You can make every drink.                                                |               |
| Buy Next, empty stock   | Based on an empty stock; mark what you have for a closer answer.         |               |
| Versions, one           | This is the first version.                                               | Edit          |
| Versions, identical     | No differences.                                                          |               |
| Family, none            | No related drinks yet.                                                   | Riff          |
| Export, nothing         | Nothing to export yet. Seed data is not part of the file.                |               |
| Ingredient picker       | No ingredient matches.                                                   | Create {text} |

# Errors and offline

| Situation                | Title                                    | Text                                                              | Button      |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------- | ----------- |
| Not found (deep link)    | This drink is not here                   | The link points to a drink that was deleted or never existed.     | Open Drinks |
| Store cannot be opened   | Your data cannot be saved here           | {reason}. You can browse the drinks, but changes are not kept.    | Try Again   |
| Seed data failed to load | Data could not be loaded                 | The built-in data did not load. Nothing you entered is affected.  | Try Again   |
| Save failed              | Not saved                                | {reason}. What you entered is still here.                         | Try Again   |
| Amount not understood    | (under the field)                        | Not understood: {text}. Try 45 ml, 1½ oz or 2 dashes.             |             |
| Name or line missing     | (under Save Version)                     | Add a name and one ingredient.                                    |             |
| Import, wrong file       | The file is not a Mixtura export.        | Nothing was imported.                                             |             |
| Import, newer format     | The file is from a newer version         | It is format {n}; this app reads up to {m}. Nothing was imported. |             |
| Import, damaged          | The file cannot be read                  | {reason}. Nothing was imported.                                   |             |
| Offline (About)          | Updates are checked when you are online. |                                                                   |             |
| External link offline    | (accessible name)                        | {name}, needs a connection                                        |             |

No screen shows a special offline state: the app is local.

# Toasts (each with Undo)

Retired {name} · Deleted {name} · Removed {ingredient} · Added {name} to
stock · Marked {name} out of stock · Cleared stock · Copied to your
drinks · Swap dropped · Imported {counts} · Exported {counts}
(Exported has no Undo).

# Settings

| Row              | Values                       | Description                                                    |
| ---------------- | ---------------------------- | -------------------------------------------------------------- |
| Amounts shown in | Metric · US · Imperial       | Entry accepts any unit; this changes only what is shown.       |
| Appearance       | Follow System · Light · Dark |                                                                |
| Data             | Export and Import            | {n} changes since the last export.                             |
| About            | Version, sources, notes      |                                                                |
| Backup reminder  | (banner)                     | You have {n} changes since your last export. Export Everything |

# Accessible names

Icon-only buttons (visible tooltip on desktop, `aria-label` always):
Back · More actions · New drink · Search drinks · Search stock · Filters,
{n} active · Close filters · Fewer drinks · More drinks · More for this
line: move, optional, remove · Move line up · Move line down · How the
balance is computed. Check boxes: "{name}, in stock". Balance track: "{figure}
{value} {unit}, usual range {lo} to {hi} {unit}: {position}". Toasts and
banners have `role="status"`; sheets have `role="dialog"` and an
`aria-label`; the current navigation item has `aria-current="page"`.
