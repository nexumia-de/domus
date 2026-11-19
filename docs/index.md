---
okf_version: '0.2'
---

# Domus knowledge bundle

[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2) bundle for what concerns the whole repository. Each part has
its own bundle. Change history is in [log.md](log.md).

# Plan

- [Roadmap](roadmap.md) - The goals for the whole repository in order: one address, host package, spaces, GitHub storage, Domus screens (first version built), the apps on spaces, sync server, further storages; what each needs from the owner.

# Decisions

- [One repository](decisions/one-repository.md) - Why the apps and the shared model are in one repository, what replaces version tags, what keeps the parts apart, what was not decided.
- [One address, spaces, storages](decisions/one-origin-spaces-storages.md) - All apps on domus.nexumia.de and separately installable; sync on spaces with one secret and one invite; GitHub first, then the household's sync server, WebDAV and S3; invites that may carry access; the agent's choices for each.

# Reference

- [Deployment](deployment.md) - The one address domus.nexumia.de: layout of the site, headers per folder, the browser check that the apps stay apart, the deploy job, the owner's steps.
- [Development](development.md) - The layout, the one workspace, the checks from the root, how the histories were imported, what still points at the old repositories.

# Parts

- [materia](../packages/model/docs/index.md) - The general model.
- [hospes](../packages/host/docs/index.md) - The host code the apps share: sync cipher, WebDAV adapter.
- [Mixtura](../apps/mixtura/docs/index.md) - Drinks.
- [Culina](../apps/culina/docs/index.md) - Cooking.
- [Emptio](../apps/emptio/docs/index.md) - Shopping list.
- [Household](../apps/domus/docs/index.md) - The app at the root of the address: spaces, storages, invites, join.
