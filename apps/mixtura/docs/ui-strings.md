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

| Where             | String                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Bottom navigation | Drinks · Templates · Stock · Settings                                                                   |
| Stock views       | Stock · Buy Next                                                                                        |
| Spec action bar   | Try a Swap · Riff · Edit                                                                                |
| Swap action bar   | Reset (Riff and Save when #27 and #25 are built)                                                        |
| Editor action bar | Cancel · Save Version                                                                                   |
| Overflow, spec    | Versions · Family · Export spec · Retire · Delete                                                       |
| Overflow, list    | Sort by name · Sort by recently changed · Sort by template                                              |
| Titles            | Not Found · Drinks · Templates · Stock · Settings · About · Edit {name} · New Drink · Versions · Family |

# Buttons

New Drink · Add Ingredient · Add by name (field, "Add by name, for example
Campari") · Create {text} · Filters · Clear Filters · Show {n} Drinks ·
Clear Search · Try Again · Reset · Save · Save Version · Save as My
Version · Cancel · Compare · Restore as New Version · Have It · Undo ·
Export Everything · Import File · Merge · Replace Everything · Delete
Import Backup · Discard Draft · Details · Open Source Link.

# Balance

| Situation                      | Short (beside the value)                                           | Full (accessible name, tooltip)                                                    |
| ------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Value inside the range         | Within (only when the range's evidence is better than assumption)  | Within the usual range                                                             |
| Value under the range          | Below                                                              | Below the usual range                                                              |
| Value over the range           | Above                                                              | Above the usual range                                                              |
| Footer, assumed range          | Assumed range {lo}–{hi} {unit}                                     | {Name} {v} {unit}, assumed range {lo} to {hi} {unit}, not checked against a source |
| Footer                         | Usual range {lo}–{hi} {unit}                                       | Usual range {lo} to {hi} {unit}                                                    |
| Swap mode, change row          | Was {before} → now {after} ({+1.4 points} or {no change})          |                                                                                    |
| No template or no range        | No usual range for this drink                                      |                                                                                    |
| A template without a range     | No usual range for this template                                   |                                                                                    |
| Figure cannot be computed      | No figure                                                          | No figure: {ingredient} has no {property}                                          |
| Volume line                    | Volume after dilution {n} ml                                       |                                                                                    |
| Panel title                    | Balance After {method}                                             | for example Balance After Shaking, After Stirring                                  |
| Unverified ranges (while true) | Ranges come from a model and are not yet checked against a source. |                                                                                    |
| Compact bar                    | ABV {v} {position} · Sugar {v} {position} · Acid {v} {position}    |                                                                                    |

Never used: good, bad, wrong, balanced, too sweet, too sour, perfect,
score, grade, warning, error (for a figure).

# Banners, tags, labels

| String                                                                                                                                                                                                                                                                                                                                                                                                                          | Where                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Trying a swap. Nothing is saved.                                                                                                                                                                                                                                                                                                                                                                                                | Swap banner                                                 |
| Trying a swap. Change a line to see the numbers.                                                                                                                                                                                                                                                                                                                                                                                | Swap banner before a change                                 |
| Changed, was {amount}                                                                                                                                                                                                                                                                                                                                                                                                           | Changed line                                                |
| Trying a swap. {n} lines are changed. Nothing is saved. · Changed, was {amount} {name} · Now matches the {name} template. Before: {name or no template}. · Now matches no template. Before: {name}. · Change {name} · Amount · Not understood: {text}. {reason} Try 45 ml, 1½ oz or 2 dashes. · Same class and role · Same class · Same role · Close in the tree · Show {n} more · Reset Line · Done · Saved: {name} · Selected | Swap mode, line sheet                                       |
| Draft kept                                                                                                                                                                                                                                                                                                                                                                                                                      | Editor tag                                                  |
| Makeable · Missing {name} · Missing {n}                                                                                                                                                                                                                                                                                                                                                                                         | Drinks and spec tags                                        |
| Riff of {name} · Version {n} · Draft · On menu · Retired                                                                                                                                                                                                                                                                                                                                                                        | Spec tags of the user's own drinks                          |
| One fewer drink · One more drink · {n} drinks · Batch · Open the batch · The figures are for one drink.                                                                                                                                                                                                                                                                                                                         | Servings stepper                                            |
| Batch of {n} drinks · Mix · Water to add · Total volume · Pour per serving · Yield · {n} servings · Shelf life · Unknown · {n} days, set by {name} · No shelf life stored for {names}                                                                                                                                                                                                                                           | Batch sheet                                                 |
| Water is the dilution of {method}: {n} % of the mix ({basis}). One drink is poured from the batch as it is. · Poured at the glass, not in the batch: {names}. · Not in the totals (no volume known): {names}. · not in the totals · rounded by {amount} · A batch needs a method the model knows. This drink has none. · Close the batch                                                                                        | Batch sheet notes                                           |
| Add Volume · Change · Clear · Set · Cancel · What-if, not saved · Top, {volume}                                                                                                                                                                                                                                                                                                                                                 | Top line what-if volume                                     |
| The figures above leave out these lines: · {amount} {name}: no volume given · no volume known per unit                                                                                                                                                                                                                                                                                                                          | Not counted in the figures                                  |
| Built-in                                                                                                                                                                                                                                                                                                                                                                                                                        | Spec tag of a built-in drink, instead of version and status |
| Base · Modifier · Sweet · Sour · Bitter · Accent · Texture · Lengthener                                                                                                                                                                                                                                                                                                                                                         | Role tags                                                   |
| optional                                                                                                                                                                                                                                                                                                                                                                                                                        | Optional line                                               |
| In {n} drinks · Opened {date} · Best before {date} · Past best before {date} · Out · Not tracked                                                                                                                                                                                                                                                                                                                                | Stock rows                                                  |
| Prepared · User                                                                                                                                                                                                                                                                                                                                                                                                                 | Ingredient tags                                             |
| Unknown ingredient                                                                                                                                                                                                                                                                                                                                                                                                              | A line whose ingredient is gone                             |
| Not in the current data                                                                                                                                                                                                                                                                                                                                                                                                         | Same, second line                                           |

# Empty states

| Screen                  | Text                                                                                                                   | Button        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- |
| Drinks, no hit          | No drink matches the search and filters.                                                                               | Clear Filters |
| Drinks, none            | No drinks yet.                                                                                                         | New Drink     |
| Makeable, empty stock   | Nothing in stock yet. Mark what you have to see what you can make.                                                     | Open Stock    |
| Templates, no hit       | No template matches.                                                                                                   | Clear Search  |
| Template without drinks | No drinks follow this template yet.                                                                                    | New Drink     |
| Stock, empty            | Nothing in stock yet. Add what you have to see what you can make.                                                      |               |
| Stock, no hit           | No ingredient matches.                                                                                                 | Create {text} |
| Buy Next, nothing       | Everything in your drinks is makeable or needs more than one ingredient.                                               |               |
| Buy Next, all makeable  | You can make every drink.                                                                                              |               |
| Buy Next, empty stock   | Based on an empty stock: only drinks made from one ingredient can be unlocked. Mark what you have for a closer answer. |               |
| Versions, one           | This is the first version.                                                                                             | Edit          |
| Versions, identical     | No differences.                                                                                                        |               |
| Family, none            | No related drinks yet.                                                                                                 | Riff          |
| Export, nothing         | Nothing to export yet. Seed data is not part of the file.                                                              |               |
| Ingredient picker       | No ingredient matches.                                                                                                 | Create {text} |

# Errors and offline

| Situation                | Title                                    | Text                                                              | Button      |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------- | ----------- |
| Not found (deep link)    | This drink is not here                   | The link points to a drink that was deleted or never existed.     | Open Drinks |
| Store cannot be opened   | Your data cannot be saved here           | {reason}. You can browse the drinks, but changes are not kept.    | Try Again   |
| Seed data failed to load | Data could not be loaded                 | The built-in data did not load. Nothing you entered is affected.  | Try Again   |
| Setting not saved        | Not saved                                | {reason}. The setting was not changed.                            |             |
| Save failed              | Not saved                                | {reason}. What you entered is still here.                         | Try Again   |
| Amount not understood    | (under the field)                        | Not understood: {text}. Try 45 ml, 1½ oz or 2 dashes.             |             |
| Name or line missing     | (under Save Version)                     | Add a name and one ingredient.                                    |             |
| Import, wrong file       | The file is not a Mixtura export.        | Nothing was imported.                                             |             |
| Import, newer format     | The file is from a newer version         | It is format {n}; this app reads up to {m}. Nothing was imported. |             |
| Import, damaged          | The file cannot be read                  | {reason}. Nothing was imported.                                   |             |
| Import, wrong format     | The file does not match the format       | {first problem} (and {n} more). Nothing was imported.             |             |
| Import, too large        | The file is too large                    | Files up to 10 MB are read. Nothing was imported.                 |             |
| Not found (any route)    | This page is not here                    | The link points to something that was deleted or never existed.   | Open Drinks |
| Offline (About)          | Updates are checked when you are online. |                                                                   |             |
| External link offline    | (accessible name)                        | {name}, needs a connection                                        |             |

No screen shows a special offline state: the app is local.

Reasons filling {reason} of "Your data cannot be saved here": This
browser blocks local storage here (no IndexedDB) · Another window still
uses an older version; close it · Your data was saved by a newer version
of the app · Your data could not be upgraded and was left as it was ·
The device storage is full. Shown as a banner with Try Again above the
read-only app ([store](store.md#failure)).

# Update

Banner at the top of the app, `role="status"`, not blocking: **Update
available** with the button **Update**. The app reloads only after the
tap ([development](development.md#app-shell)).

# Toasts (each with Undo)

Retired {name} · Deleted {name} · Removed {ingredient} · Added {name} to
stock · Marked {name} out of stock · Cleared stock · Copied to your
drinks · Swap dropped · Swap reset · Imported {counts} · Import undone · Exported {counts}
(Exported and Import undone have no Undo).

# Settings

| Row                                | Values                                                                                                                                                                                                                                                                                                | Description                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amounts shown in                   | Metric · US · Imperial                                                                                                                                                                                                                                                                                | Entry accepts any unit; this changes only what is shown.                                                                                                                           |
| Appearance                         | Follow System · Light · Dark                                                                                                                                                                                                                                                                          |                                                                                                                                                                                    |
| Without alcohol (calculated) means | Below 0.5 % · Up to 0.05 % · 0 %                                                                                                                                                                                                                                                                      | Lines for the alcohol filters on the drinks list, applied to the calculated ABV after dilution. They are not legal terms. Then: Basis of the chosen lines: {evidence}; {evidence}. |
| Low ABV means                      | Up to 1.2 % · Up to 10 % · Up to 15 %                                                                                                                                                                                                                                                                 |                                                                                                                                                                                    |
| Data                               | Export and Import                                                                                                                                                                                                                                                                                     | {n} changes since the last export.                                                                                                                                                 |
| About                              | Version, sources, notes                                                                                                                                                                                                                                                                               |                                                                                                                                                                                    |
| Storage                            | Checking · Not requested yet. Asked after you first save something. · Kept: the browser will not clear your data on its own. · Not guaranteed: the browser may clear your data when space is short. · This browser cannot promise to keep your data. · Not available while your data cannot be saved. | Answer to the persistent-storage request                                                                                                                                           |
| Backup reminder                    | (banner; buttons Export Everything and Dismiss)                                                                                                                                                                                                                                                       | You have {n} changes since your last export. Export Everything                                                                                                                     |

# Data

Screen `#/settings/data`: "Everything you entered goes into one file.
Built-in data is not part of it." · Last export: {date} · Not exported yet. ·
{n} changes since the last export. · The file has {counts}. · Merge: add
{a}, replace {r}, skip {s}. Your records stay unless the file has a newer
version of a drink. · Replace Everything: add, replace, remove, keep ·
The file was made by an older version (format {n}) and is converted. · The
file was made with other built-in data ({found}; this app has {own}). Some
references may not be found. · A copy of your data from before the last
import, kept so it can be undone. · Buttons: Export Everything · Import
File · Merge · Replace Everything · Cancel · Undo · Dismiss · Delete
Import Backup. Counts read "2 ingredients, 1 template, 2 specs, 2 stock
entries, 1 pairing".

# Accessible names

Icon-only buttons (visible tooltip on desktop, `aria-label` always):
Back · More actions · New drink · Search drinks · Search stock · Filters,
{n} active · Close filters · Fewer drinks · More drinks · More for this
line: move, optional, remove · Move line up · Move line down · How the
balance is computed. Check boxes: "{name}, in stock". Balance track: "{figure}
{value} {unit}, usual range {lo} to {hi} {unit}: {position}". Toasts and
banners have `role="status"`; sheets have `role="dialog"` and an
`aria-label`; the current navigation item has `aria-current="page"`.

# Browse and spec, as built (#18, #19)

Search drinks · Name, ingredient or tag · Search templates · Filters, {n}
active · Remove filter {label} · Show {n} Drink(s) · {name} template · Base:
{name} · No template · {n} % ABV · No ABV figure · {n} of {total} drinks ·
Show more drinks · Select a drink to read its spec. · Select a template to
read its slots and ranges. · Loading drinks · Strength ranges: Under 14 % ABV
· 14 to 22 % ABV · 22 to 30 % ABV · 30 % ABV and over. Templates: Slots ·
Usual ranges after dilution · Drinks that follow it · Show in Drinks ·
Variant of {name} · This template is not here. Spec: Ingredients · Notes ·
Method · Glass · Garnish · optional · or {ingredient} · Top · {name} template
(suggested) · This drink fits none of the templates. That is a normal state.
Balance: No figure: {ingredients} have no acid value · No figure after
dilution: the drink has no method the model knows · ABV before dilution ·
Sugar to acid · Units of alcohol · How the figures are computed. Texts of
the panel are scanned by a test for the words listed under "Never used".

# Alcohol filters, as built (#37)

Alcohol (filter group) · Without alcohol (calculated) · Low ABV · row ending
"· Without alcohol (calculated)" or "· Low ABV" · Sheet note: "Calculated ABV
after dilution, never a legal label. Without alcohol: {below 0.5 %}. Low ABV:
above that and up to {10 %}. Change the lines in Settings. With the lines in
Settings: {n} without alcohol, {n} low ABV, {n} not classified." · {n} could
not be classified · Why they are not in the result · "These drinks match the
search and the other filters, but their alcohol class cannot be calculated,
so they are in neither alcohol filter." · Reasons: The method gives no
dilution figure (muddled, layered or no method) · An ingredient has no ABV
figure · A line is left out of the figures and may hold alcohol · The lines in
Settings are not valid · The figures could not be computed. Never used:
alcohol-free, non-alcoholic (for a calculated class).

# Buy Next, as built (#33)

Ranked ingredient: {name} · Unlocks {n} drinks · {n} of them with a substitute
· tag **Type: any product of it works** (a type or category: buy any one
product of it) or **Product** · line **Products that count as {type}: {names}
and {n} more** (the products below that type that unlock exactly the same
drinks, so they are not ranked on their own; it used to read
"Any brand does the same", which did not say what was meant) · Have It ·
Show the drinks {name} unlocks · Show more ingredients.
