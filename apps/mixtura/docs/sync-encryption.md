---
type: Specification
title: Sync file encryption
description: How a sync file is encrypted in the browser with a passphrase per place - PBKDF2-HMAC-SHA-256 with 600,000 iterations into AES-256-GCM, the envelope fields, what the storage can and cannot see, where the passphrase is kept, the generated passphrase format and its entropy, what a lost passphrase means, and the limits.
tags: [sync, encryption, passphrase, web-crypto, envelope]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: decision
    title: 'Decision: stock sync, section Encryption'
    url: decisions/stock-sync.md#encryption
  - id: materia
    title: 'materia, sync: envelope and the Cipher port'
    url: https://github.com/nexumia-de/materia/blob/main/docs/sync.md
  - id: owasp
    title: 'OWASP Password Storage Cheat Sheet: PBKDF2-HMAC-SHA-256 with 600,000 iterations'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
---

# Sync file encryption

Code: `packages/app/src/sync/` (`cipher.ts`, `passphrase.ts`, `base64.ts`,
`errors.ts`); tests `packages/app/test/sync-*.test.ts`. It fills materia's
`Cipher` port ([decision](decisions/stock-sync.md#encryption)) on Web
Crypto only, with no dependency. Nothing is wired into a screen or store
yet, and the module makes no network request and writes nothing to storage.

## Scheme

| Part            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| Key derivation  | PBKDF2, HMAC-SHA-256, 600,000 iterations, random 16-byte salt                       |
| Key             | 256-bit AES-GCM key, non-extractable (`crypto.subtle.deriveKey`)                    |
| Cipher          | AES-256-GCM, random 12-byte nonce on every `seal`, 128-bit tag (Web Crypto default) |
| Additional data | UTF-8 of `envelopeAad`, `materia-sync/1` (format name and version)                  |
| Plaintext       | UTF-8 of the place document text                                                    |
| Passphrase      | UTF-8 of the text, after `normalisePassphrase` where the caller applies it          |

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

JSON, built and read by materia (`buildEnvelope`, `parseEnvelope`):

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
`WrongPassphrase`. The fixed vector `test/fixtures/sync-envelope.json`
(600,000 iterations, known passphrase) pins the format: it must keep
opening.

## What the storage can and cannot see

It sees that a file exists, its size, when it changes, from which address,
and the envelope fields (scheme, iterations, salt, nonce). It cannot see
the place name, the stock or the "moved" marker; they are inside the
ciphertext.

## Where the passphrase is kept

With the binding of the place on each device, in the browser's storage,
readable there like the storage password. It is not in the export file.
The binding store itself comes with #133. The local stock is not encrypted
on the device.

## A lost passphrase

A device that is still bound has the passphrase and can show it again as an
invite. Losing it means no bound device is left, or the browser storage of
all of them was cleared. The file then cannot be read by anyone: no
recovery, no reset, no copy with us. Nothing local is lost; every device
still has the stock of that place in clear. The way back is to bind the
place again from one device, which writes a new file with a new passphrase,
and to invite the others again. A wrong passphrase is reported as such and
never overwrites the file ([decision](decisions/stock-sync.md#when-the-passphrase-is-lost)).

## Generated passphrase

`generatePassphrase()`: five groups of four characters from Crockford's
base32 (`0-9`, `A-Z` without `I`, `L`, `O`, `U`), joined by `-`, for example
`7K3M-9QXA-B2CD-EF4G-H5JK`. That is 20 characters of 5 bits each, 100 bits
of entropy. Each character takes the low 5 bits of one random byte from
`crypto.getRandomValues`; 256 is a multiple of 32, so all 32 characters are
exactly equally likely and there is no bias (a test checks that each
character has exactly 8 of the 256 byte values). 100 bits is far beyond
what PBKDF2 at 600,000 iterations lets anyone guess.

`normalisePassphrase(text)` trims, upper-cases and maps `O` to `0` and `I`,
`L` to `1`, but only when the result has the generated form; any other
text is used exactly as typed, since the user may choose their own (which
often has far less entropy, as the decision notes).

## Limits

- A wrong passphrase and a changed file look the same: the authentication
  tag fails either way, so `open` throws the same `WrongPassphrase`.
- PBKDF2 instead of Argon2: Argon2 resists guessing better but is not in
  Web Crypto and would be a dependency shipped in the app. The generated
  passphrase makes the weaker function acceptable.
- No forward secrecy: whoever gets the passphrase can read every copy of
  the file they have, old ones included.
- File size and change times are visible to the storage and its admin.
- The salt is reused across writes of one place (to reuse the key); with
  a fresh random nonce per write this is safe for AES-GCM at the volume of
  a sync file, but a nonce collision would need about 2^32 writes under one
  key.
