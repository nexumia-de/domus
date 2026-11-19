---
type: Specification
title: Sync cipher
description: The cipher that fills materia's Cipher port on Web Crypto only - PBKDF2-HMAC-SHA-256 with 600,000 iterations into AES-256-GCM, the envelope fields and the limits it accepts on opening, the typed errors, the key cache, and the limits of the scheme.
tags: [cipher, encryption, web-crypto, envelope, pbkdf2, aes-gcm]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Mixtura decision: stock sync, section Encryption'
    url: ../../../apps/mixtura/docs/decisions/stock-sync.md#encryption
  - id: materia
    title: 'materia, sync: envelope and the Cipher port'
    url: ../../model/docs/sync.md
  - id: mixtura
    title: 'Mixtura: sync file encryption (passphrase, where it is kept, what a loss means)'
    url: ../../../apps/mixtura/docs/sync-encryption.md
  - id: owasp
    title: 'OWASP Password Storage Cheat Sheet: PBKDF2-HMAC-SHA-256 with 600,000 iterations'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
---

# Sync cipher

Code: `src/cipher.ts` (`createCipher`), `src/errors.ts` (`WrongPassphrase`,
`UnsupportedEnvelope`) and `src/base64.ts`; tests `test/cipher.test.ts` and
`test/base64.test.ts`. It fills materia's `Cipher` port on Web Crypto only,
with no dependency; it makes no network request and writes nothing to
storage. Which passphrase a caller gives it, where that is kept and what a
lost one means is the caller's: for Mixtura see
[sync encryption](../../../apps/mixtura/docs/sync-encryption.md).

## Scheme

| Part            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| Key derivation  | PBKDF2, HMAC-SHA-256, 600,000 iterations, random 16-byte salt                       |
| Key             | 256-bit AES-GCM key, non-extractable (`crypto.subtle.deriveKey`)                    |
| Cipher          | AES-256-GCM, random 12-byte nonce on every `seal`, 128-bit tag (Web Crypto default) |
| Additional data | UTF-8 of `envelopeAad`, `materia-sync/1` (format name and version)                  |
| Plaintext       | UTF-8 of the text the caller seals                                                  |
| Passphrase      | UTF-8 of the text, as the caller passes it                                          |

`seal` with a `previous` envelope of this scheme (PBKDF2, SHA-256,
AES-GCM, acceptable parameters) reuses its salt and iterations, so the
derived key is reused and a sync cycle derives once; the nonce is always
new. Without a usable `previous` a new salt is drawn. Derived keys are
kept in a small in-memory cache (eight entries) keyed by passphrase, salt
and iterations; it dies with the page and is never stored.
`options.iterations` and `options.minIterations` exist for tests only;
production code never passes them.

One key derivation at 600,000 iterations took about 125 to 150 ms in
Node 22 on the machine of 2026-11-18; a phone is several times slower, so
expect around a second there. The cache keeps it to one per sync cycle.

## Envelope

JSON, built and read by [materia](../../model/docs/sync.md) (`buildEnvelope`, `parseEnvelope`):

| Field                  | Content                                       |
| ---------------------- | --------------------------------------------- |
| `format`, `version`    | `materia-sync`, `1`; bound as additional data |
| `kdf.name`, `kdf.hash` | `PBKDF2`, `SHA-256`                           |
| `kdf.iterations`       | 600,000 for files this build writes           |
| `kdf.salt`             | base64, 16 bytes                              |
| `cipher.name`          | `AES-GCM`                                     |
| `cipher.nonce`         | base64, 12 bytes                              |
| `data`                 | base64 ciphertext with the tag                |

`open` accepts only the names above, iterations from 100,000 to
10,000,000 (a hostile file cannot ask for hours of work), and salt and
nonce of the exact lengths; anything else throws `UnsupportedEnvelope`
before any key is derived. A failed authentication throws
`WrongPassphrase`. The fixed vector `test/fixtures/envelope.json`
(600,000 iterations, known passphrase) pins the format: it must keep
opening.

## Limits

- A wrong passphrase and a changed file look the same: the authentication
  tag fails either way, so `open` throws the same `WrongPassphrase`.
- PBKDF2 instead of Argon2: Argon2 resists guessing better but is not in
  Web Crypto and would be a dependency shipped in the app. Mixtura's generated
  passphrase has 100 bits and makes the weaker function acceptable
  ([Mixtura](../../../apps/mixtura/docs/sync-encryption.md#generated-passphrase)); a caller that
  lets people choose passphrases does not get that.
- No forward secrecy: whoever gets the passphrase can read every copy of
  the file they have, old ones included.
- File size and change times are visible to the storage and its admin.
- The salt is reused across writes of one place (to reuse the key); with
  a fresh random nonce per write this is safe for AES-GCM at the volume of
  a sync file, but a nonce collision would need about 2^32 writes under one
  key.
