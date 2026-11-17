---
type: Decision Record
title: Where the shared model lives (proposal)
description: Proposal, needs decision by the owner. The general model moves into a new public repository with its own npm package, which Mixtura and Culina consume as a git dependency pinned to an exact tag and built by its prepare script; phosh-toolkit, a monorepo, GitHub Packages, npmjs and submodules were weighed and not proposed.
tags: [decision, architecture, culina, shared-code, dependencies, needs-decision]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: inventory
    title: 'Shared model inventory'
    url: ../shared-model.md
  - id: two-apps
    title: 'Decision: two apps, one engine'
    url: two-apps-one-engine.md
  - id: code-reuse
    title: 'phosh-toolkit: Code reuse between apps (decision, accepted 2026-10-25)'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/docs/decisions/code-reuse.md
  - id: dep-updates
    title: 'phosh-toolkit: Dependency updates'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/docs/dependency-updates.md
  - id: npm-git
    title: 'npm/cli, docs/lib/content/configuring-npm/package-json.md, section Git URLs as Dependencies (branch latest, read 2026-11-17)'
    url: https://docs.npmjs.com/cli/configuring-npm/package-json#git-urls-as-dependencies
  - id: npm-prepare
    title: 'npm/cli, docs/lib/content/using-npm/scripts.md, section prepare (branch latest, read 2026-11-17)'
    url: https://docs.npmjs.com/cli/using-npm/scripts
  - id: npm-workspaces
    title: 'npm/cli, docs/lib/content/using-npm/workspaces.md (branch latest, read 2026-11-17)'
    url: https://docs.npmjs.com/cli/using-npm/workspaces
  - id: dependabot-git
    title: 'dependabot/dependabot-core, npm_and_yarn/lib/dependabot/npm_and_yarn/update_checker.rb, latest_git_version_details and updated_source (branch main, read 2026-11-17)'
    url: https://github.com/dependabot/dependabot-core/blob/main/npm_and_yarn/lib/dependabot/npm_and_yarn/update_checker.rb
  - id: dependabot-ecosystems
    title: 'github/docs, data/reusables/dependabot/supported-package-managers.md (branch main, read 2026-11-17)'
    url: https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories
  - id: ghp-auth
    title: 'github/docs, data/reusables/package_registry/authenticate-packages.md and content/packages/working-with-a-github-packages-registry/working-with-the-npm-registry.md (branch main, read 2026-11-17)'
    url: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
  - id: npm-trusted
    title: 'npm/documentation, content/packages-and-modules/securing-your-code/trusted-publishers.mdx (branch main, read 2026-11-17)'
    url: https://docs.npmjs.com/trusted-publishers
  - id: pnpm-git
    title: 'pnpm/pnpm.io, docs/package-sources.md, Git repositories with path (branch main, read 2026-11-17)'
    url: https://pnpm.io/package-sources
  - id: node-ts
    title: 'nodejs/node, doc/api/typescript.md, type stripping in node_modules (branch main, read 2026-11-17)'
    url: https://nodejs.org/api/typescript.html
---

# Where the shared model lives (proposal)

**Status: proposal, `needs decision`.** Nothing below is decided until the
owner confirms or changes it. Second part of Mixtura issue #43 (Culina
issue #2).

## Context

Mixtura's engine keeps the general model (amounts, ingredient tree,
roles, templates and matching, specs and versions, stock, shelf life)
apart from drink rules; the [inventory](../shared-model.md)[^inventory]
lists the modules, the remaining coupling points and an extraction
order. Culina may copy no code from Mixtura and is due to start on that
general model[^two-apps]. The owner's rules for shared code: it moves
when a second app needs it, apps pin a tag and never `main`, and
duplicated code is a defect[^code-reuse]. Every dependency is pinned
exactly and updated by bot pull requests[^dep-updates]. Both apps are
AGPL-3.0-or-later TypeScript PWAs built with npm workspaces, esbuild and
Vitest on Node 22; no registry account exists.

How the web sources were read: `docs.npmjs.com`, `docs.github.com` and
`pnpm.io` were blocked in the session, so each page was read from its
source file on GitHub (the repository and file are named in the source
list).

## What the tools do

- **npm git dependencies.** A dependency may be a git URL with
  `#<commit-ish>` or `#semver:<range>`; with `#semver:` npm looks for
  matching tags in the remote repository[^npm-git]. The lockfile records
  the resolved commit.
- **`prepare` builds.** "If a package being installed through git
  contains a `prepare` script, its `dependencies` and `devDependencies`
  will be installed, and the prepare script will be run, before the
  package is packaged and installed."[^npm-prepare] So a shared package
  does not commit `dist/`; it builds on install.
- **Shipping TypeScript source instead** does not work for Vitest's
  default run: Node refuses to strip types of files under
  `node_modules`[^node-ts]. A built `dist/` with declarations is needed.
- **Subdirectories.** npm's git URL syntax has no path part[^npm-git];
  pnpm can install a subdirectory of a git repository with
  `#path:`[^pnpm-git]. With npm, a package in a subdirectory of another
  repository cannot be a git dependency.
- **Dependabot and git tags.** Dependabot's npm updater checks git
  dependencies: when the ref "looks like a version" (for example
  `v0.3.0`) or is a `semver:` requirement, it finds the latest version
  tag and rewrites the ref to that tag; a ref that is not version-like
  is left alone[^dependabot-git]. Read from the source, not yet tried
  in these repositories. Dependabot also supports `gitsubmodule` as an
  ecosystem[^dependabot-ecosystems].
- **GitHub Packages** needs a personal access token (classic) "to
  publish, install, and delete private, internal, and public packages";
  in Actions `GITHUB_TOKEN` publishes, and installing from another
  repository needs a token with `read:packages` or granted
  access[^ghp-auth]. Every machine and agent session that runs
  `npm ci` would need that token.
- **npmjs** needs an npm account and package ownership; publishing from
  Actions can use trusted publishing (OIDC) without a long-lived
  token[^npm-trusted]. The account is still needed.
- **npm workspaces** link packages of one repository by path during
  `npm install`[^npm-workspaces]; Mixtura uses them today.

## Options

|                                | (a) New repository, git tag                                                         | (b) Package in phosh-toolkit                                                                                     | (c) One monorepo                                                                                                                      | (d) Submodule or subtree                                    |
| ------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Exact pin                      | tag in `package.json`, commit in lockfile                                           | toolkit tag, but npm cannot install a subdirectory                                                               | not needed: one commit                                                                                                                | submodule commit; subtree is a copy                         |
| Bot updates                    | Dependabot npm (version-like tags)                                                  | none for a subdirectory                                                                                          | not needed                                                                                                                            | Dependabot `gitsubmodule`                                   |
| CI                             | `npm ci` clones a public repository, no token                                       | needs a release tarball or pnpm                                                                                  | one CI                                                                                                                                | checkout with submodules everywhere                         |
| Offline build                  | after one `npm ci`, like any dependency                                             | same                                                                                                             | yes                                                                                                                                   | yes after clone                                             |
| Vectors                        | general vectors with the shared code                                                | same, beside Python tests                                                                                        | one tree                                                                                                                              | in the submodule                                            |
| Licence                        | AGPL-3.0-or-later, as both apps                                                     | toolkit is GPL-3.0-or-later; combining with AGPL is allowed, but the toolkit gains a second licence and language | AGPL                                                                                                                                  | AGPL                                                        |
| Fits owner rules               | one repository per app, tags, no copy                                               | "shared code lives in the toolkit" (written for Python/GTK)                                                      | breaks one repository per app                                                                                                         | subtree copies code; submodules are easy for agents to miss |
| Cost for one owner with agents | a third repository; a general change is two pull requests (shared, then a tag bump) | toolkit tags shared with Python apps; JS tooling in a Python repository                                          | least: atomic changes, one checkout; but two apps' issues, milestones and one Pages site (one deploy for both apps) in one repository | every clone and CI step must handle the submodule           |

Rejected as distribution channels: **GitHub Packages** (a token on every
install, including agent sessions and Dependabot) and **npmjs** (needs
the account the owner does not want now; could be added later without
changing the package).

## Proposal

**(a) A new public repository with one npm package of the general model,
consumed by both apps as a git dependency pinned to an exact version tag
(`github:nexumia-de/<name>#v0.1.0`) and built by its `prepare`
script.**

Reasons:

1. It is the owner's existing rule carried over to TypeScript: shared
   code in one place, apps pin a tag, never `main`, bumping is a normal
   app change[^code-reuse].
2. Exact pinning and bot updates work with tools already in use: the tag
   in `package.json`, the commit in `package-lock.json`, Dependabot's
   `npm` ecosystem for the tag[^dependabot-git].
3. No token, account or registry: the repository is public, `npm ci`
   clones it.
4. phosh-toolkit does not fit with npm: a subdirectory cannot be a git
   dependency, toolkit tags are shared with the Python apps, and the
   licence and language differ.
5. A monorepo would be the cheapest to work in but undoes "one
   repository per app" and mixes both apps' issues, milestones and
   Pages deploy; it is the fallback if the two-pull-request cost proves
   too high.

## Consequences if accepted

**Shared repository**: name chosen by the owner; AGPL-3.0-or-later; the
general modules, their vectors and schema parts (step 8 of the
[extraction order](../shared-model.md#extraction-order)); `prepare` runs
an esbuild bundle and `tsc` declarations; a purity check like the
engine's; CI and Dependabot as in the apps; tags `v<semver>`; docs as
an OKF bundle; zero runtime dependencies so `prepare` installs only
build tools.

**Mixtura**: steps 1 to 7 of the extraction order happen here first,
with the public engine API unchanged; then `@mixtura/engine` depends on
the shared package at an exact tag and re-exports it from `model.ts`;
general vectors leave `packages/engine/vectors/`; a general change is a
pull request in the shared repository, a tag, then a bump here.

**Culina**: the app starts from the shared package at a tag, with its
own kitchen rules (weights, baker's percentages, yields, perishable
stock, urgency ranking) in its own engine package beside it; what turns
out general moves to the shared package by the same rule.

**phosh-toolkit**: its code-reuse decision covers Python/GTK apps; it
would need one line saying web apps share code through their own
repository.

[^inventory]: [Shared model inventory](../shared-model.md)

[^two-apps]: [Two apps, one engine](two-apps-one-engine.md)

[^code-reuse]: [phosh-toolkit: Code reuse between apps](https://github.com/nexumia-de/phosh-toolkit/blob/main/docs/decisions/code-reuse.md)

[^dep-updates]: [phosh-toolkit: Dependency updates](https://github.com/nexumia-de/phosh-toolkit/blob/main/docs/dependency-updates.md)

[^npm-git]: [npm, package.json: Git URLs as Dependencies](https://docs.npmjs.com/cli/configuring-npm/package-json#git-urls-as-dependencies), read 2026-11-17 from `npm/cli`.

[^npm-prepare]: [npm, Scripts: prepare](https://docs.npmjs.com/cli/using-npm/scripts), read 2026-11-17 from `npm/cli`.

[^npm-workspaces]: [npm, Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces), read 2026-11-17 from `npm/cli`.

[^node-ts]: [Node.js, Modules: TypeScript](https://nodejs.org/api/typescript.html), read 2026-11-17 from `nodejs/node`.

[^pnpm-git]: [pnpm, Supported package sources](https://pnpm.io/package-sources), read 2026-11-17 from `pnpm/pnpm.io`.

[^dependabot-git]: [dependabot-core, npm update checker](https://github.com/dependabot/dependabot-core/blob/main/npm_and_yarn/lib/dependabot/npm_and_yarn/update_checker.rb), read 2026-11-17.

[^dependabot-ecosystems]: [GitHub Docs, Dependabot supported ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories), read 2026-11-17 from `github/docs`.

[^ghp-auth]: [GitHub Docs, Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), read 2026-11-17 from `github/docs`.

[^npm-trusted]: [npm Docs, Trusted publishing](https://docs.npmjs.com/trusted-publishers), read 2026-11-17 from `npm/documentation`.
