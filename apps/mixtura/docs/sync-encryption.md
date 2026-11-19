---
type: Specification
title: Sync file encryption
description: The passphrase per place of the sync file - what the storage can and cannot see, where the passphrase is kept, the generated passphrase format and its entropy, and what a lost passphrase means; the cipher itself (PBKDF2 into AES-256-GCM, the envelope) is documented in the host package.
tags: [sync, encryption, passphrase, web-crypto, envelope]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: decision
    title: 'Decision: stock sync, section Encryption'
    url: decisions/stock-sync.md#encryption
  - id: host
    title: 'Host package: the sync cipher'
    url: ../../../packages/host/docs/cipher.md
  - id: materia
    title: 'materia, sync: envelope and the Cipher port'
    url: ../../../packages/model/docs/sync.md
  - id: owasp
    title: 'OWASP Password Storage Cheat Sheet: PBKDF2-HMAC-SHA-256 with 600,000 iterations'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
---

# Sync file encryption

Code: `packages/app/src/sync/passphrase.ts` here; the cipher itself
(`cipher.ts`, `base64.ts`, `errors.ts`) is in the host package
`@nexumia-de/hospes` ([packages/host](../../../packages/host)). The cipher fills materia's
`Cipher` port ([decision](decisions/stock-sync.md#encryption)) on Web
Crypto only, with no dependency. Tests `packages/app/test/sync-passphrase.test.ts`.

## Scheme, envelope and limits of the cipher

The scheme (PBKDF2-HMAC-SHA-256 with 600,000 iterations into AES-256-GCM,
the key cache), the envelope fields, what `open` accepts, the fixed test
vector and the limits of the scheme are in the host package, not here:
[sync cipher](../../../packages/host/docs/cipher.md). `createCipher`,
`WrongPassphrase` and `UnsupportedEnvelope` come from `@nexumia-de/hospes`.
What stays here: the passphrase and what it means for a place.

## What the storage can and cannot see

It sees that a file exists, its size, when it changes, from which address,
and the envelope fields (scheme, iterations, salt, nonce). It cannot see
the place name, the stock or the "moved" marker; they are inside the
ciphertext.

## Where the passphrase is kept

With the binding of the place on each device, in the browser's storage,
readable there like the storage password. It is not in the export file.
The binding store is `bindings` ([sync backends](sync-backends.md#the-stores)). The local stock is not encrypted
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

The limits of the cipher itself (a wrong passphrase and a changed file look
the same, PBKDF2 instead of Argon2, no forward secrecy, what the storage
sees of size and time, salt reuse) are in
[the cipher's document](../../../packages/host/docs/cipher.md#limits). The
generated passphrase of 100 bits is what makes PBKDF2 acceptable here.
