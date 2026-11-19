# Log

## 2026-11-19

- **Package created** (roadmap goal 2, [roadmap](../../../docs/roadmap.md)): `@nexumia-de/hospes` 0.1.0 with the sync cipher (`cipher.ts`, `errors.ts`, `base64.ts`) and the WebDAV adapter (`webdav.ts`, `webdav-url.ts`, `webdav-connection.ts`), moved with their history and tests from Mixtura's `packages/app/src/sync/`; the types come from materia directly. The code is unchanged; the one fixed envelope vector moved to `test/fixtures/envelope.json`. The probe file is still named `.mixtura-probe`. See [WebDAV adapter](webdav.md) and [sync cipher](cipher.md).
