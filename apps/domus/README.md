# Household

The app at the root of `domus.nexumia.de`. It lists the apps and is where
sync is set up once for all of them: create a **space**, connect a
**storage** (a private GitHub repository, or a WebDAV folder), **invite**
someone by link or QR code, **join** with a link.

Status: first usable version of roadmap goal 5, not installable and not yet
used by the apps. What is done and what is not:
[docs/screens.md](docs/screens.md) and the
[roadmap](../../docs/roadmap.md#goals).

No server of ours and no account; the files in the storage are encrypted
on the device. It is built only on the shared packages
[hospes](../../packages/host) and [materia](../../packages/model).

## Development

From the root of the repository:

```sh
npm run check:domus          # format, lint, typecheck, tests
npm run build -w @domus/app  # apps/domus/dist
PLAYWRIGHT_CHROMIUM_PATH=... npm run e2e -w @domus/app
```

More in [docs/development.md](docs/development.md).

## Licence

AGPL-3.0-or-later, see [LICENSE](../../LICENSE).
