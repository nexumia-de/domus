---
okf_version: '0.2'
---

# Domus knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle for what concerns the whole repository. Each part has
its own bundle. Change history is in [log.md](log.md).

# Plan

- [Roadmap](roadmap.md) - The goals for the whole repository in order: one address, host package, spaces, GitHub storage, Domus screens (first version built), the apps on spaces (Mixtura done), sync server, further storages; what each needs from the owner.

# Decisions

- [One repository](decisions/one-repository.md) - Why the apps and the shared model are in one repository, what replaces version tags, what keeps the parts apart, what was not decided.
- [Native Linux apps in GJS](decisions/native-linux-gjs.md) - Native apps for Phosh as libadwaita screens in GJS that reuse the engines and sync, Emptio and Mixtura built, Culina next, inside this repository, released into the shared Flatpak repository; the alternatives, the agent's choices, what is open.
- [One shared app shell](decisions/shared-shell.md) - Header, navigation, settings, sync display, toasts and banners live once in the host package (web) and in packages/gjs (native); why the apps had their own; the plan to move them over.
- [One address, spaces, storages](decisions/one-origin-spaces-storages.md) - All apps on domus.nexumia.de and separately installable; sync on spaces with one secret and one invite; GitHub first, then the household's sync server, WebDAV and S3; invites that may carry access; the agent's choices for each.

# Reference

- [Deployment](deployment.md) - The one address domus.nexumia.de: layout of the site, headers per folder, the browser check that the apps stay apart, the deploy job, the owner's steps.
- [Reviews](reviews.md) - The record of changes several agents made together: who did which part, who checked what, what the checks found, the counts, what nobody verified; first entry goal 6.
- [Development](development.md) - The layout, the one workspace, the checks from the root, how the histories were imported, what still points at the old repositories.

# Parts

- [materia](../packages/model/docs/index.md) - The general model.
- [hospes](../packages/host/docs/index.md) - The host code the apps share: sync cipher, WebDAV adapter.
- [gjs](../packages/gjs/docs/index.md) - What the native Linux apps share: the pieces GJS lacks, joining by link, the build and check tooling.
- [Mixtura](../apps/mixtura/docs/index.md) - Drinks.
- [Culina](../apps/culina/docs/index.md) - Cooking.
- [Emptio](../apps/emptio/docs/index.md) - Shopping list.
- [Household](../apps/domus/docs/index.md) - The app at the root of the address: spaces, storages, invites, join.
