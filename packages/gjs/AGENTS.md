# gjs

What the native Linux apps (`apps/<app>/packages/linux`, GTK 4 and
libadwaita on GJS) share: the pieces GJS lacks, joining a space by
link, the build and the check tooling. One npm package,
`@nexumia-de/gjs`, used from this repository
([decision](../../docs/decisions/native-linux-gjs.md)); the rules of the
[root](../../AGENTS.md) apply too. Knowledge of this part:
[docs/index.md](docs/index.md).

gjs is a library and tooling, not an app: the toolkit's GTK rules do not
apply to it, but every native app that uses it follows them.

## Rules

- **Only what two native apps need.** A piece moves here when a second
  native app needs it, never in advance. Nothing of one app's domain,
  texts, store or screens; the package imports no app, and
  `npm run boundaries` checks it.
- **Behind the interface the shared code already takes.** The host
  package asks for `crypto`, `fetch` and `Files`; each piece here fills
  one of them and nothing more. No Web Crypto beyond the subset the host
  package calls: `subtle.ts` throws for anything else, and a new call
  there gets a test against Node's Web Crypto.
- **The `gi://` files run in GJS only.** The tests import the pure files
  by their path (`src/subtle.ts`, `src/join.ts`); what needs GJS is
  proved by `src/smoke.ts` through `tooling/smoke.mjs`, which both apps
  run (`npm run smoke -w @<app>/linux`).
- **Everything an app needs to differ is a parameter**: the app id, the
  data folder variable, the collection the smoke check uses. No app name
  is written here.
- **Dependencies pinned exactly**, licence read from the files, listed in
  [docs/dependencies.md](docs/dependencies.md); the two crypto libraries'
  licence texts are kept in `licenses/` once, and each app's Flatpak
  manifest installs them from there.

## Before committing

`npm run check:gjs` from the root, then `npm run smoke -w @emptio/linux`
and `npm run smoke -w @mixtura/linux` (GJS needed), and
`npm run check:emptio` and `npm run check:mixtura` for the apps that use
it.
