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
| Swap action bar   | Reset · Save as Riff                                                                                    |
| Editor action bar | Discard · Save (Cancel is the back button); the sheet: Save Version · Save Without Note                 |
| Overflow, spec    | Versions · Family · Export spec · Retire · Delete                                                       |
| Sort menu, list   | Sort drinks by: Name · Recently changed · Template; button "Sort, {choice}"; line "Sorted by {choice}"  |
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

| String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Where                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Trying a swap. Nothing is saved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Swap banner                                                 |
| Trying a swap. Change a line to see the numbers.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Swap banner before a change                                 |
| Changed, was {amount}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Changed line                                                |
| Trying a swap. {n} lines are changed. Nothing is saved. · Changed, was {amount} {name} · Now matches the {name} template. Before: {name or no template}. · Now matches no template. Before: {name}. · Change {name} · Amount · Not understood: {text}. {reason} Try 45 ml, 1½ oz or 2 dashes. · Same class and role · Same class · Same role · Close in the tree · Show {n} more · Reset Line · Done · Saved: {name} · Selected                                                                         | Swap mode, line sheet                                       |
| Draft kept                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Editor tag                                                  |
| Makeable · Missing {name} · Missing {n}                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Drinks and spec tags                                        |
| Riff of {name} · Version {n} · Draft · On menu · Retired                                                                                                                                                                                                                                                                                                                                                                                                                                                | Spec tags of the user's own drinks                          |
| One fewer drink · One more drink · {n} drinks · Batch · Open the batch · The figures are for one drink.                                                                                                                                                                                                                                                                                                                                                                                                 | Servings stepper                                            |
| Batch of {n} drinks · Batch of {volume} · Make a batch for · Drinks · Volume · Number of drinks · A whole number from 1 to 200. · Target volume · Milliliters, or add a unit: 1 l, 32 oz. The batch is as many servings as fit. · Servings · {n} of {pour} · That is less than one serving. One drink is {pour}; enter at least that. · Mix · Water to add · Total volume · Pour per serving · Yield · {n} servings · Shelf life · Unknown · {n} days, set by {name} · No shelf life stored for {names} | Batch sheet                                                 |
| Water is the dilution of {method}: {n} % of the mix ({basis}). One drink is poured from the batch as it is. · Poured at the glass, not in the batch: {names}. · Not in the totals (no volume known): {names}. · not in the totals · rounded by {amount} · A batch needs a method the model knows. This drink has none. · Close the batch                                                                                                                                                                | Batch sheet notes                                           |
| Add Volume · Change · Clear · Set · Cancel · What-if, not saved · Top, {volume}                                                                                                                                                                                                                                                                                                                                                                                                                         | Top line what-if volume                                     |
| The figures above leave out these lines: · {amount} {name}: no volume given · no volume known per unit                                                                                                                                                                                                                                                                                                                                                                                                  | Not counted in the figures                                  |
| Built-in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Spec tag of a built-in drink, instead of version and status |
| Base · Modifier · Sweet · Sour · Bitter · Accent · Texture · Lengthener                                                                                                                                                                                                                                                                                                                                                                                                                                 | Role tags                                                   |
| optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Optional line                                               |
| In {n} drinks · Opened {date} · Best before {date} · Past best before {date} · Out · Not tracked                                                                                                                                                                                                                                                                                                                                                                                                        | Stock rows                                                  |
| Prepared · User                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Ingredient tags                                             |
| Unknown ingredient                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | A line whose ingredient is gone                             |
| Not in the current data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Same, second line                                           |

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
The device storage is full · Another window updated the app or its data (button Reload instead of Try Again). Shown as a banner with Try Again above the
read-only app ([store](store.md#failure)).

# Update

Banner at the top of the app, `role="status"`, not blocking: **Update
available** with the button **Update**. The app reloads only after the
tap ([development](development.md#app-shell)).

# Toasts (each with Undo)

Retired {name} · Deleted {name} · Removed {ingredient} · Added {name} to
stock · Marked {name} out of stock · Created {name} and marked it in stock · Cleared stock · Copied to your
drinks · Swap dropped · Swap reset · Imported {counts} · Import undone · Exported {counts}
(Exported and Import undone have no Undo).

# Settings

| Row                                | Values                                                                                                                                                                                                                                                                                                | Description                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amounts shown in                   | Metric · US · Imperial                                                                                                                                                                                                                                                                                | Entry accepts any unit; this changes only what is shown.                                                                                                                           |
| Keyboard shortcuts                 | Yes · No (hint: Single keys on the Drinks list: / searches, n starts a new drink. Turn them off if they get in the way of assistive technology.)                                                                                                                                                      |                                                                                                                                                                                    |
| Appearance                         | Follow System · Light · Dark                                                                                                                                                                                                                                                                          |                                                                                                                                                                                    |
| Without alcohol (calculated) means | Below 0.5 % · Up to 0.05 % · 0 %                                                                                                                                                                                                                                                                      | Lines for the alcohol filters on the drinks list, applied to the calculated ABV after dilution. They are not legal terms. Then: Basis of the chosen lines: {evidence}; {evidence}. |
| Low ABV means                      | Up to 1.2 % · Up to 10 % · Up to 15 %                                                                                                                                                                                                                                                                 |                                                                                                                                                                                    |
| Data                               | Export and Import                                                                                                                                                                                                                                                                                     | {n} changes since the last export.                                                                                                                                                 |
| About                              | Version, sources, notes                                                                                                                                                                                                                                                                               |                                                                                                                                                                                    |
| Storage                            | Checking · Not requested yet. Asked after you first save something. · Kept: the browser will not clear your data on its own. · Not guaranteed: the browser may clear your data when space is short. · This browser cannot promise to keep your data. · Not available while your data cannot be saved. | Answer to the persistent-storage request                                                                                                                                           |
| Backup reminder                    | (banner; buttons Export Everything and Dismiss)                                                                                                                                                                                                                                                       | You have {n} changes since your last export. Export Everything                                                                                                                     |

# Places

`strings.places`. **Home** is the name of the place made for existing stock by the migration to schema version 4 and on a fresh install (`store/places.ts` keeps the same text for the migration and a test keeps them equal). Places screen text (#131), header capitalisation for buttons and titles, sentence capitalisation for descriptions:

| Where         | Text                                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stock line    | {names joined with " · "} · Places (button)                                                                                                                                                                                            |
| Sheet         | Places · Close · Stock is kept per place. The places that count decide what you can make. · Places (list label)                                                                                                                        |
| Row           | {name} counts (check box) · New entries go here (radio) · Rename ("Rename {name}") · Remove ("Remove {name}") · New name of {name} (field label)                                                                                       |
| Add           | Add a place · Name of the new place · Add Place                                                                                                                                                                                        |
| Notes         | The only place cannot be removed. · Places cannot be changed while your data cannot be saved.                                                                                                                                          |
| Refusals      | At least one place has to count. · New entries go to {name}, so it has to count. Choose another place for new entries first. · Enter a name for the place. · A place called {name} exists already. · The last place cannot be removed. |
| Toasts        | Removed {name} and its {n} stock entry/entries (Undo) · Still in stock at {names} · {n} still in stock at other places · Marked {name} in stock / out of stock (existing)                                                              |
| Batches sheet | {name}: in stock (the check box of a place's block; its words are In stock, Out, Not tracked)                                                                                                                                          |

# Sync (#135)

`screens/sync/strings.ts` (`syncStrings`, `problemTexts`, `connectionTexts`); the
address of the setup guide, `SETUP_URL`, is kept there and nowhere else. Header
capitalisation for titles and buttons, sentence capitalisation for descriptions.
Settings has a row **Sync** ("Storages, places and sharing", title `strings.titles.sync`);
the Places sheet on Stock has **Open Sync** with "Storages, passphrases and sharing are on the Sync page."

| Where                | Text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                 | Sync · Keep the stock of a place in step on your devices, or share it with another person. Each place has one encrypted file in a storage you choose. Nothing leaves this device until you add a storage and sync a place. · Loading · Sync cannot be changed while your data cannot be saved.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Storages             | Storages · No storage yet. A storage is a WebDAV folder, for example on Nextcloud or on a server of your own. · Add Storage · Remove ("Remove {label}") · User {name}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Remove               | Toast: Removed storage {label} (Undo). Refusal: {label} is used by {places}. Stop syncing that place/those places or move it/them first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Add Storage sheet    | Add Storage · The address, user name and password stay on this device. They are never exported or synced. · Name · Anything that helps you tell storages apart · Address · The WebDAV address of a folder that exists. On Nextcloud it ends in /remote.php/dav/files/ and your user name. · User name · Password · Show / Hide ("Show password" / "Hide password") · Test Connection · Testing… · Add Storage                                                                                                                                                                                                                                                                                                                                             |
| Add Storage refusals | Enter a name for the storage. · Enter the address of the storage. · The address has to start with https:// or http:// and have no spaces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Test Connection      | Reachable: Connected. The storage answered and this app can read the answer. · Unauthorised: The storage refused the user name or password. Check both and try again. · Blocked: The storage did not answer in a way a browser may read, usually because it does not allow requests from this app (CORS). Check the address too. + link Setup guide · ETag hidden: The storage answered, but the browser may not read its ETag header, which sync needs to avoid overwriting changes. The server has to send Access-Control-Expose-Headers: ETag. · Unreachable: No connection. This device is offline; try again when it is online. · Server error: The storage answered with an error. Check the address and that the folder exists. + link Setup guide |
| Places               | Places · No place yet. · Sync All · Join a Place…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| State line           | On this device only · In sync · {just now / n min ago / n h ago / date} · Changes waiting · Syncing… · Waiting for connection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| State line, problems | Wrong passphrase, or the file was changed · The storage refused the sign-in · Storage not reachable · the Blocked text above (+ Setup guide) · The storage hides its ETag header from this app, so changes cannot be written safely (+ Setup guide) · The folder could not be found or made · The storage answered with an error · This place moved to other storage · The file is from a newer version of the app. Update the app · The file is not one this app can read · The file belongs to another place · Gave up after several tries. Sync Now tries again · Something went wrong while syncing                                                                                                                                                   |
| Place actions        | Sync This Place… · Sync Now · Share… · Move… · Stop Syncing · Show Passphrase · Join Again… (each with the place name in its accessible name: "Sync Now, {name}", "Share {name}", …) · {storage} · {folder}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Stop Syncing         | Toast: Stopped syncing {name}. Its stock on this device and the file in the storage stay (Undo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Sync This Place      | Sync {name} · The stock of this place is kept in an encrypted file in the storage you choose. Whoever has the passphrase and access to the folder can read and change it. · Storage · Folder · The file is <folder>/{place id}.json · Passphrase · Write it down. It is kept on this device, and without it nobody can open the file again, not even you on a new device. · Add a storage first. · Start Syncing · Starting…                                                                                                                                                                                                                                                                                                                              |
| Share                | Share {name} · Another person enters these four values under Sync, Join a Place. · Storage address · Folder · Place code · Passphrase · Whoever has these values and access to the folder can read and change this place's stock. · Copy ("Copy {value}") · Copied · Copying failed. Select the text and copy it by hand.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Show Passphrase      | Passphrase of {name} · Kept on this device. Whoever has it and access to the folder can read and change this place's stock.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Move                 | Move {name} · The stock goes to the storage and folder you choose, and the old file is marked as moved. Everyone else sees that the place moved and can join it again. · Move Place · Moving… · Toasts: Moved {name} · Moved {name}. The old file could not be marked as moved                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Move refusals        | Choose another storage or another folder. · This place is not synced. · {problem text}. Nothing was moved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Join a Place         | Join a Place / Join Again · Enter what the person who shares the place sees under Share. The first sync brings the name and the stock; until then the place is called Joined place. · The place moved. Ask for the new storage address, folder and passphrase, then enter them here. The place code is filled in. · Storage · Folder · Place code · Passphrase · Join Place · Joining… · Toast: Joined the place                                                                                                                                                                                                                                                                                                                                          |
| Join refusals        | The place code is not valid. Copy it again from the Share sheet of the place. · The folder cannot contain "." or ".." parts. · Choose a storage first. · Enter the passphrase. · There is no file for this place code in that folder. Check the folder and the place code. · Wrong passphrase, or the file was changed. Nothing was joined. · This place moved to other storage. Ask for the new values. · (the problem texts above)                                                                                                                                                                                                                                                                                                                      |
| Close                | Close                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

# Data

Screen `#/settings/data`: "Everything you entered goes into one file.
Built-in data is not part of it." · Last export: {date} · Not exported yet. ·
{n} changes since the last export. · The file has {counts}. · Merge: add
{a}, replace {r}, skip {s}. Your records stay unless the file has a newer
version of a drink. · Replace Everything: add, replace, remove, keep ·
The file was made by an older version (format {n}) and is converted. · The file is an older export and your data has no place to put its stock (The file cannot be read yet). · The
file was made with other built-in data ({found}; this app has {own}). Some
references may not be found. · A copy of your data from before the last
import, kept so it can be undone. · Buttons: Export Everything · Import
File · Merge · Replace Everything · Cancel · Undo · Dismiss · Delete
Import Backup. Counts read "2 ingredients, 1 template, 2 specs, 2 stock
entries, 1 pairing".

# Share a drink (#142)

Sheet on the spec screen: Share {name} · "Anyone you send this link to can
add a copy of the drink. The drink is inside the link; nothing is
uploaded." · Link · Copy Link · Link copied · The link could not be copied.
Select it above and copy it by hand. · Send... · Preparing the link · This
drink is too big for a link / Use Export on the Data screen to send it as a
file. · Open Data · The link could not be made. Nothing was changed. ·
Close. Button name: Share {name} by link; tooltip Share.

Opening a link, screen title Shared Drink: Opening the link · Somebody sent
you {name} (or "a drink") · Adds {n versions, n ingredients, n templates}. It
is added to your own drinks; nothing you have is replaced. · You already have
this drink. Nothing would change. · Add Drink · Not Now · Close. Errors (each
ends "Nothing was added."): The link is damaged / It may have been cut off when
it was sent. Ask for the link again. · The link is from a newer version /
Update the app and open the link again. · The link holds too much / It is
larger than a file this app reads. · The link is not a drink from Drink
Builder · This browser cannot keep drinks / Storage is not available, so the
drink cannot be added.

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

# Editor, as built (#25)

All in `packages/app/src/screens/editor/strings.ts`. Names, labels and
errors: Name, Template ("None (the app suggests one)"), Ingredients, Add
Ingredient, Method, Glass, Garnish, Notes, Status; line fields "Amount",
"Unit", "Volume in ml (optional)"; line menu Move Up, Move Down, Optional, Add
Note, Add Substitute, Role, Remove; substitute rows "or {name}" with an amount field "amount, optional" and Remove, toasts "{name} added as a substitute", "Removed substitute {name}", "{name} is already a substitute here", picker title "Substitute for {name}", the picker's "In stock"; prepared "How to keep it" ("e.g. in the fridge, closed"); "= 22.5 ml", "= about 0.9 ml", "= 1 whole (counted, no
volume of its own)"; "Not understood: {text}. {reason} Try 45 ml, 3/4 oz,
1½ oz, 2 dashes or 1 whole."; "Choose an ingredient for this line."; Save
reasons "Add a name", "Add one ingredient with an amount", "Fix the lines marked
above"; tag "Draft kept"; notice "Your unsaved changes were restored." with
Discard Draft; toasts "Removed {name}", "Draft discarded", "Saved {name}",
"Deleted {name}"; picker Choose ingredient, Search ingredients, Recently
used, Create “{text}”, tags Prepared and User; form New Ingredient, Edit
Ingredient, Belongs under, Role, "ABV in %", "Sugar in g per 100 ml", "Acid in
%", Save Ingredient, Delete Ingredient; prepared "Make this a prepared
ingredient", Yield, "Shelf life in days", "Computed from the lines", "Used in N
drinks"; refusals "{name} is still used by {names}. Remove it there first, then
delete it."

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

# Stock panel on the spec screen, as built (#82)

Fixed texts in `screens/spec/stock-strings.ts`: "What you have"; tags
"Makeable", "With substitute", "Missing {name}", "Missing {n} ingredients";
rows "Have: {name}", "Made from your stock: {name}", "Substitute: {a} for {b}",
"Missing: {name}", "Not in stock: {name} (optional)"; buttons "Mark in stock"
(accessible name "Mark {name} as in stock") and "Buy Next"; toast "{name}
marked as in stock" with Undo.

# Batch card and variants, as built (#37)

Fixed texts in `screens/spec/shelf-strings.ts` and `variant-strings.ts`. Batch
card: "Your batch", "Shelf life: {n} days" (", set by {name}"), "No shelf life
entered. You can add your own in Edit.", "Keep: {text}", "No batch recorded.
Mark when you made it to see how long it keeps.", "Made on {date} · use by
{date}", "Within its shelf life, {n} days left", "Use soon: {n} days left",
"Past the date you set by {n} days. Check it before you use it.", buttons "I
made this", "Used up", "Made on another day", "Set Date"; toasts "{name} marked
as made on {date}", "{name} marked as used up". Variants: "Variants", "Start a
Riff as {Variant Name}", "Replaces {names} with a base of your choice: {note}.",
"Carries over {names}.", "A different drink: the taste and the balance change.
The figures are worked out again once you have chosen.", in the editor "Started
as {name}: the base is open for you to choose. The balance shows once it is
filled."

# Batches on the Stock screen, as built (#101)

| Where | Text |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Card | Batches Near Their Date · Made by you, with the shelf life you entered. Check these before you use them. · and {n} more batch(es) at hand |
| Tree row | {n} batch(es) · Batches (button; accessible name "Batches of {name}") |
| Sheet | Batches of {name} · Close · Batches at hand · Add a batch · Made on · Add Batch · Made Today · Used up ("The batch made on {date} is used up") · No batch at hand. Add the day you made one to see how long it keeps. |
| Sheet, errors | Choose the day it was made. · A batch cannot be made in the future. · A batch made on {date} is already recorded. |
| Toasts | Added a batch of {name} made on {date} · {name}: the batch made on {date} is marked as used up |
| States | The words of the batch card ([shelf life](non-alcoholic.md#shelf-life-with-entered-dates)): Within its shelf life, {n} days left · Use soon: {n} days left · Past the date you set by {n} days. Check it before you use it. |
| Spec batch card | {n} more batch(es) at hand, see Stock. This card shows the newest. · A batch made on that day is already recorded. | |
