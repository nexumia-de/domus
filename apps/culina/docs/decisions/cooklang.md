---
type: Decision Record
title: Whether Culina reads and writes Cooklang files
description: Current state of Cooklang (spec, licences, parsers, apps), what it can express of Culina's model, comparison with schema.org/Recipe and an own JSON export, and the recommendation: own JSON as the lossless format, Cooklang as a one-way export, no import in the first version.
tags: [decision, cooklang, export, import, formats, licences]
status: decided
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: spec
    title: 'Cooklang specification (cooklang/spec, README and conventions.md, last change 2026-09-30), MIT'
    url: https://github.com/cooklang/spec
  - id: site
    title: 'cooklang.org: Specification page'
    url: https://cooklang.org/docs/spec/
  - id: rs
    title: 'cooklang-rs: official Rust parser with WASM and TypeScript bindings, v0.19.0 (2026-09-30), MIT'
    url: https://github.com/cooklang/cooklang-rs
  - id: ext
    title: 'cooklang-rs: syntax extensions'
    url: https://github.com/cooklang/cooklang-rs/blob/main/extensions.md
  - id: npm
    title: 'npm registry: @cooklang/cooklang 0.19.1 (2026-10-15), @cooklang/cooklang-ts 1.2.8 deprecated'
    url: https://registry.npmjs.org/@cooklang%2Fcooklang
  - id: ts
    title: 'cooklang-ts: deprecation notice'
    url: https://github.com/cooklang/cooklang-ts/blob/main/DEPRECATION_NOTICE.md
  - id: cli
    title: 'CookCLI v0.41.1, MIT (last commit 2026-11-12)'
    url: https://github.com/cooklang/cookcli
  - id: app
    title: 'cooklang.org: Cook app'
    url: https://cooklang.org/app/
  - id: tandoor
    title: 'Tandoor: Import/Export'
    url: https://docs.tandoor.dev/features/import_export/
  - id: mealie
    title: 'Mealie: Features'
    url: https://mealie.io/documentation/getting-started/features/
  - id: google
    title: 'Google Search Central: Recipe structured data'
    url: https://developers.google.com/search/docs/appearance/structured-data/recipe
  - id: unhead
    title: 'unhead: schema.org Recipe'
    url: https://unhead.unjs.io/schema-org/schema/recipe
  - id: mixexport
    title: 'Mixtura: Export and import'
    url: ../../../mixtura/docs/export-format.md
---

# Whether Culina reads and writes Cooklang files

Status: **decided by the owner on 2026-11-18** (issue #6): Culina
**imports and exports** Cooklang. Own JSON stays the lossless format.
On import the user supplies what a Cooklang file cannot carry (see
[Decision](#decision)). The text from Context on is the proposal as it
was written on 2026-11-17, which recommended export only.

## Decision

1. **Own JSON is the lossless format** for export, import and backup.
2. **Export to Cooklang**: one component per file, with the losses
   listed under [What is lost](#what-is-lost). Since issue 41 (2026-11-23) a dish is
   one file with one `= section` per component, and a file with sections is imported
   as a dish ([AI prompt import](ai-prompt-import.md), point 6;
   [exchange](../exchange.md#cooklang) has what a dish still loses).
3. **Import from Cooklang**, with a step in which the user completes
   what the file does not say before anything is saved: the role of
   each line, the mass of amounts given by volume or count (or the
   ingredient's density or unit weight), the yield, the percent base,
   and which ingredient of the notebook a name means. A line the user
   leaves open is kept as text and reported as unmeasured, never
   guessed.
4. Nothing is imported silently: the import shows what was read, what
   is open, and saves only on confirmation.

Built with export and import in issue 18: see [exchange](../exchange.md#cooklang) for what the reader and writer support and [behaviour](../behaviour.md#export-and-import). Spec read on 2026-11-18 at `raw.githubusercontent.com/cooklang/spec/main/` (`README.md`, `conventions.md`); no parser or library was used.

Before the decision: (issue #6). It refines point 4 of
[After Mixtura](after-mixtura.md), which said recipes are read from
Cooklang files "where possible", to be confirmed.

## Context

### Cooklang today (read 2026-11-17)

- **Specification**: a markup in plain text: each paragraph is a step;
  `@name{qty%unit}` ingredients, `#name{}` cookware, `~name{qty%unit}`
  timers, YAML front matter for metadata, `--` and `[- -]` comments,
  `=` sections, `>` notes, `(…)` short preparations, `@./path{qty}`
  references to other recipes, and optional items `@?`/`#?`
  (proposal 0018, merged 2026-09-30)[^spec][^site]. The spec carries **no
  version number**; it changes through numbered proposals (0002–0018)
  and says that the apps do not support every latest feature[^spec].
- **Conventions**[^spec]: canonical metadata keys (`source`, `author`,
  `servings`, `yield`, `tags`, `time`, …); scaling: linear by `servings`,
  `=` locks a quantity, timers and cookware do not scale; references
  scale by a factor, by servings, or (experimental) by `yield` in a
  matching unit (`yield: 500%ml`); shopping list, pantry and menu files.
- **Extensions** of the Rust parser, not of the spec[^ext]: references to
  other ingredients (`@&`), hidden items, intermediate preparations
  (`@&(~1)dough{}`), aliases, units written with a space, range values,
  temperatures.
- **Parsers**: the official parser is `cooklang-rs` (Rust), v0.19.0 of
  2026-09-30, active (latest commit 2026-11-10)[^rs]. Its WASM build
  is the official JavaScript package `@cooklang/cooklang`, 0.19.1 of
  2026-10-15[^npm]. The former pure TypeScript parser
  `@cooklang/cooklang-ts` is deprecated since 2025-11-23 and receives
  critical security fixes only[^ts].
- **Ecosystem**: CookCLI v0.41.1 (web server, shopping lists, pantry),
  last commit 2026-11-12[^cli]; the official Cook app for iOS and
  Android is free, syncs through a folder the user manages or through
  Cook Cloud at €4.99 per month; the page does not state the apps'
  licence[^app]. Editor modes for Emacs, Vim, VS Code, Sublime and
  Obsidian are listed in the spec[^spec]. Tandoor imports `.cook` files
  and does not export them; Mealie's feature page lists no Cooklang
  migration[^tandoor][^mealie].

### Licences

| Item                                     | Licence                                                              | Read                                  |
| ---------------------------------------- | -------------------------------------------------------------------- | ------------------------------------- |
| Specification repository `cooklang/spec` | MIT (Copyright 2021 Cooklang contributors)                           | LICENSE file[^spec]                   |
| Specification page on cooklang.org       | "Copyright © 2021-2026 Cooklang. All rights reserved." in the footer | page[^site]                           |
| `cooklang-rs`, `@cooklang/cooklang`      | MIT                                                                  | LICENSE file, npm metadata[^rs][^npm] |
| `cooklang-ts`                            | MIT, deprecated                                                      | LICENSE file[^ts]                     |
| CookCLI                                  | MIT                                                                  | LICENSE file[^cli]                    |
| Cook apps (iOS, Android)                 | not stated                                                           | page[^app]                            |
| schema.org vocabulary                    | CC BY-SA 3.0 (copyright in the schema), read 2026-11-18              | schema.org/docs/terms.html            |

Writing the format needs no licence: Culina would produce text in a
documented syntax. The MIT repository text is the one to cite. Reading
would need the MIT parser as a dependency (WASM).

### What Cooklang can express of Culina's model

| Culina                                           | In Cooklang                                                                         | Kept?                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Ingredient with amount and unit                  | `@flour{500%g}`                                                                     | yes                                                       |
| Amounts by weight                                | units are free text; `g` works                                                      | yes                                                       |
| Ratio or template (3 flour : 2 fat : 1 water)    | no ratio or percentage type; only absolute quantities at one scale                  | **no**: written as amounts at one size, the ratio is lost |
| Baker's percentages                              | no; `%` is the unit separator, not a percentage                                     | **no** (could sit in a custom metadata key no tool reads) |
| Components nested in a dish                      | `@./component{150%g}` references to other files; scaling by `yield` is experimental | partly: one file per component, nesting by path           |
| Role slots of a dish (sauce, crunch, acid)       | no                                                                                  | **no** (section titles or comments only)                  |
| Versions with date, change, reason, tasting note | no; one file is one version, history only through git                               | **no** (current version only; notes as `>` notes)         |
| Sources and licences                             | canonical `source`, `author` metadata                                               | partly: no licence key                                    |
| Yield and servings                               | `servings`, `yield` metadata                                                        | yes                                                       |
| Fixed amounts that do not scale (salt to taste)  | `=` lock                                                                            | yes                                                       |
| Timers, cookware, step text                      | yes                                                                                 | Culina has no model for timers and cookware; kept as text |

### Alternatives for exchange

- **schema.org/Recipe as JSON-LD**: what recipe sites publish and what
  Mealie's URL import reads. `recipeIngredient` takes text, an
  `ItemList` or a `PropertyValue` ("free text or more structured
  values", read at schema.org on 2026-11-18); sites mostly publish
  strings such as "3 apples". `recipeYield` is a quantity or text;
  `recipeInstructions` text or `HowToStep`/`HowToSection`; Google advises
  separate `Recipe` objects for variants[^google][^unhead] (these two
  still search excerpts only). Ingredients as published lose their
  structure (amount, unit, name in one string) unless written as
  `PropertyValue`; components flatten into sections; no ratios, roles or
  versions.
- **Mealie, Tandoor, Nextcloud Cookbook**: Mealie imports from Tandoor,
  Nextcloud Cookbook, Paprika and others and exports its own JSON;
  Tandoor imports Nextcloud, Mealie and Cooklang and exports only its
  own ZIP, Saffron and RecipeSage[^mealie][^tandoor]. No common
  lossless format exists among them.
- **Own JSON** like Mixtura's export: one file, `app`, `formatVersion`,
  `exportedAt`, the lists of user data, sorted by id[^mixexport]. It
  keeps everything Culina stores and is read back by Culina only.

## Recommendation

1. **Own JSON is the lossless format** for backup and moving between
   devices, built on the same export and import rules as Mixtura's (in
   shared code once the engine moves there).
2. **Cooklang as a one-way export**, per component or dish, at a size
   the user picks: amounts in grams, one `.cook` file per component, a
   dish referencing its components by path, `source` and `author`
   metadata, the current version's tasting note as a `>` note. Writing
   needs no dependency. It gives people a plain-text copy for git,
   CookCLI, the Cook app and Tandoor's importer, without Culina becoming
   a recipe manager.
3. **No Cooklang import in the first version.** An imported recipe
   arrives as absolute amounts, often by volume, with cookware and
   timers Culina has no place for; turning it into a template needs
   decisions only the cook can make. It would also add the WASM parser
   as a dependency. If users ask for it, an import that creates a draft
   component (amounts kept, no template) is the smallest version; open
   an issue then.
4. **No schema.org export in the first version.** It loses more than
   Cooklang (ingredients become strings in what recipe sites read; the
   vocabulary's `PropertyValue` could carry an amount and a unit, but
   not percentages or nesting). Its schema is CC BY-SA 3.0 (read
   2026-11-18). Reconsider together with handing recipes to a tracker.

Point 4 of [After Mixtura](after-mixtura.md) ("recipes are read from
Cooklang files") is replaced by this record once the owner decides.

## What is lost

| Direction                           | Lost                                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Culina → Cooklang                   | ratios and baker's percentages (only amounts at one size remain), role slots, template families, version history and older tasting notes, licence of a source, the stock and expiry data                                                                |
| Cooklang → Culina (if import comes) | step text with inline positions, cookware and timers (kept only as text), `=` locked amounts unless Culina models them, optional markers, sections, text quantities ("a pinch") that cannot scale, volumes that cannot become weights without a density |
| Culina → schema.org                 | everything lost to Cooklang, plus the split of amount, unit and name (as usually published)                                                                                                                                                             |
| Culina → own JSON                   | nothing                                                                                                                                                                                                                                                 |

## Consequences

- The data model stays free of Cooklang's limits; the exporter is a
  pure function from a component to text and gets test vectors like
  the engine ([vectors](../vectors.md)).
- Tandoor users get a way in through its Cooklang importer.
- The spec has no version; the exporter writes only the core syntax of
  the README (no parser extensions, no experimental `yield` scaling
  unless it is in the conventions by then) and records the spec commit
  it targets.
