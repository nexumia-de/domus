# Log

## 2026-11-19

- **Creation**: goal 3, spaces, in the model (rules and formats with vectors) and in the host package (key derivation, sealing, invite link, the shared database `domus`, the sync cycle, the loop). No app uses them yet. [Roadmap](roadmap.md).
- **Update**: goal 2 of the [roadmap](roadmap.md) is done in part: `packages/host` (`@nexumia-de/hospes`) holds the sync cipher and the WebDAV adapter taken out of Mixtura, which uses them from there. Mixtura's store, cycle, scheduler, bindings and invites were not moved; they are rebuilt for spaces in goal 3.
- **Update**: [decision](decisions/one-origin-spaces-storages.md#storages): setting up GitHub from the app is three guided steps with filled-in links, not one click, and why. The owner created the private repository for their data.
- **Update**: the owner installed the apps from `domus.nexumia.de` and they are separate apps; goal 1 of the [roadmap](roadmap.md) is done.
- **Update**: `domus.nexumia.de` is live (first `site-deploy`). The apps' own deploys are replaced by `forward-old-addresses`: `mixtura.nexumia.de` and `culina.nexumia.de` redirect to the app's folder. [Deployment](deployment.md).
- **Creation**: goal 1, one address. `npm run build:site` puts the root page (`apps/domus`), Mixtura and Culina under one address with one `_headers` file; `npm run e2e:site` checks that the apps stay apart; CI jobs `site-check` and `site-deploy` to `domus.nexumia.de`. Mixtura's service worker no longer deletes the caches of other apps. [Deployment](deployment.md).
- **Decision**: by the owner: GitHub (a private repository with a token) is the owner's storage and comes first; an invite may carry the storage access; removal markers go after 90 days; Dropbox, Google Drive and OneDrive are left to others. In [the decision](decisions/one-origin-spaces-storages.md) and the [roadmap](roadmap.md).
- **Decision**: by the owner: one address `domus.nexumia.de`, sync on spaces, the storages on offer, nothing to carry over. [Decision](decisions/one-origin-spaces-storages.md) with the agent's choices; the order of work in the [roadmap](roadmap.md).
- **Creation**: the repository. materia, Mixtura, Culina and Emptio imported with their histories (323 commits) into `packages/model` and `apps/`; one npm workspace and lockfile; `npm run check` from the root; the boundaries check; one CI workflow. [Decision](decisions/one-repository.md), [development](development.md).
