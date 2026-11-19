# Log

## 2026-11-19

- **Update**: materia moved with its history into the repository domus as `packages/model`; the apps use it from there instead of a git tag ([decision](../../../docs/decisions/one-repository.md), [development](../../../docs/development.md)): one workspace and lockfile at the root, checks run from the root, links to the other parts are relative, CI is the root workflow.

## 2026-11-18

- **Unit documents, unit plan and renumbering, version 0.3.0**: `materia-unit` documents of kind `place`, `library` or `profile` with named collections (`parseUnit`, `buildUnit`, `UNIT_FORMAT`, `UNIT_VERSION`), `planUnitSync` over them (unknown collections are carried through), and `renumberClashes` for version numbers that two devices created at once. Every exported function and constant of `src/sync/` now has a TSDoc comment with `@param` and `@returns`. `materia-place`, `parseDocument`, `buildDocument` and `planSync` are unchanged. Vectors `unit-parse`, `unit-build`, `unit-plan` in `vectors/sync/` and `renumber-*` in `vectors/specs/` (with `specs-vector.schema.json`). See [sync](sync.md) and [modules](modules.md).
- **Sync module added, version 0.2.0**: `src/sync/` with the record merge (newest wins, tombstones, symmetric and idempotent), places and the combined view, the plain place document, the encrypted envelope, the storage adapter types and `planSync`; new public exports `mergeRecords`, `mergePlace`, `combinePlaces`, `parseDocument`, `buildDocument`, `parseEnvelope`, `buildEnvelope`, `envelopeAad`, `planSync`, `instantMs`, `DOCUMENT_FORMAT`, `DOCUMENT_VERSION`, `ENVELOPE_FORMAT`, `ENVELOPE_VERSION` and their types. Vectors in `vectors/sync/`. See [sync](sync.md).
- **Repository set up and the general model moved in** (#1): `ingredients/`, `templates/`, `specs/`, `stock/` and `shelf/` copied unchanged from Mixtura's engine (after its extraction steps 1 to 7), with an explicit public entry, the purity rule and its test, vectors, CI with a check that installs the package the way the apps do, and Dependabot. No unit system: amounts stay in Mixtura. See [modules](modules.md) and [development](development.md).
