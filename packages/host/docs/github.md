---
type: Specification
title: GitHub adapter
description: The storage adapter on the Contents API of one private GitHub repository from a browser page, with a fine-grained token; the table of answers and failures, the connection test, the repository list, the setup links and the limits. Nothing here was verified against the live API.
tags: [github, adapter, storage, fetch, token]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Domus decision: one origin, spaces, storages (section Storages)'
    url: ../../../docs/decisions/one-origin-spaces-storages.md#storages
  - id: webdav
    title: 'WebDAV adapter (the style this follows)'
    url: webdav.md
  - id: materia
    title: 'materia, sync: the StorageAdapter interface'
    url: ../../model/docs/sync.md
---

# GitHub adapter

Code: `src/github.ts`, `src/github-http.ts` (options, request, answers),
`src/github-connection.ts` (`testGithub`, `findRepositories`, `setupLinks`),
`src/storage.ts` (the registry); tests `test/github.test.ts`,
`test/github-connection.test.ts`, `test/storage.test.ts`. GitHub is the owner's
storage ([decision](../../../docs/decisions/one-origin-spaces-storages.md#storages)).
It is the [WebDAV adapter](webdav.md) in style: a factory function, only `fetch`,
`fetch` and `online` injectable, the failures of materia's `StorageAdapter`.

## What was verified

**Nothing was verified against the live API.** GitHub's documentation
(docs.github.com) could not be reached from the session that wrote this, and no
request went to `api.github.com`. Everything below about GitHub is written from
the documented behaviour as far as it is known, and the tests run against a
fake `fetch` and a small in-memory fake of the Contents API. Each point to
check with a real repository is marked **unverified**. The adapter's own
rules (the mapping of answers, the requests it sends) are tested.

## What the storage needs

1. One private repository for the household's sealed files.
2. A fine-grained personal access token limited to that repository, permission
   **Contents: read and write**. No OAuth, no GitHub App, no other permission.
3. A browser that may call `https://api.github.com` from the app's origin
   (GitHub's API is documented to answer CORS; **unverified**, including that
   `If-None-Match` is an allowed request header and `ETag` a readable one).

The files are ciphertext, so a public repository leaks nothing readable, but the
setup screen warns about one (`private: false` of `testGithub`).

## The adapter

`createGithubAdapter({ repository, token, folder?, branch?, message?, apiBase?, fetch?, online? })`.

- `repository` is `owner/name`; anything else throws a `RangeError` (which does
  not repeat the text) before any request. `folder` is a path prefix inside the
  repository. `branch` defaults to the repository's default branch (the `ref`
  and `branch` parameters are left out). Paths are joined and encoded per
  segment as in `webdav-url.ts`; an empty path or a `.`/`..` segment throws a
  `RangeError`.
- Requests go to `apiBase` (default `https://api.github.com`, injectable for
  tests) with `Accept: application/vnd.github+json`,
  `Authorization: Bearer <token>`, `X-GitHub-Api-Version: 2022-11-28`,
  `cache: 'no-store'` and `credentials: 'omit'`. The token is in that header and
  nowhere else: no detail, thrown message or log holds it (details are fixed
  words, status codes and a reset time; the package logs nothing).
- `read(path)`: `GET /repos/{owner}/{repo}/contents/{path}` (`?ref=` with a
  branch). The body is the base64 `content` (GitHub wraps it in newlines, which are
  stripped) decoded as strict UTF-8; the etag is the blob `sha`.
- `write(path, body, ifMatch)`: `PUT` of `{ message, content, sha?, branch? }`.
  A string `ifMatch` is the `sha`; `null` sends none (the file must not exist);
  omitted reads the file once (without `If-None-Match`) and uses its sha if there
  is one. The answer's `content.sha` is the new etag.
- There is no `watch`: GitHub has no push to a page, the sync loop polls.

| Request                    | Answer                                                                        | Result                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET`                      | 200, object, `type: "file"`, `encoding: "base64"`                             | `{ ok, missing: false, body, etag: sha }`                                                     |
| `GET`                      | 200, an array (a folder) or another type                                      | `server`, detail `not-a-file`                                                                 |
| `GET`                      | 200, empty `content` although `size` > 0 (over 1 MB)                          | `server`, detail `too-large`                                                                  |
| `GET`                      | 200, bytes that are not UTF-8 / not base64 / no JSON                          | `server`, detail `not-utf8` / `bad-base64` / `bad-answer`                                     |
| `GET` with `If-None-Match` | 304                                                                           | the remembered result of the last read of that path                                           |
| `GET`                      | 404                                                                           | `{ ok, missing: true }`                                                                       |
| `PUT`                      | 200 or 201                                                                    | `{ ok, etag: content.sha }`                                                                   |
| `PUT`                      | 409                                                                           | `conflict`                                                                                    |
| `PUT` with a sha or `null` | 422 (sha missing for an existing file, or not the current one)                | `conflict`                                                                                    |
| `PUT` unconditional        | 422                                                                           | `server`, detail `HTTP 422`                                                                   |
| `PUT`                      | 404 (repository or branch not reachable with this token)                      | `not-found`                                                                                   |
| any                        | 401                                                                           | `unauthorised`                                                                                |
| any                        | 403 or 429 with `x-ratelimit-remaining: 0` or a `retry-after` header; any 429 | `server`, detail `rate-limited until <ISO time>` (from `x-ratelimit-reset`) or `rate-limited` |
| any                        | other 403                                                                     | `unauthorised`                                                                                |
| any                        | other 4xx and 5xx                                                             | `server`, detail `HTTP <status>`                                                              |
| any                        | `fetch` throws a `TypeError`                                                  | `blocked` while `navigator.onLine` is true, `unreachable` while it is false                   |

A 429 is always taken as a rate limit (the brief asked for the headers; a 429 is
by definition that). Any other exception from `fetch` is not caught.

### Cheap polling

The adapter remembers, per path, the HTTP `ETag` header and the result of the
last successful read, sends `If-None-Match` on the next read and, on `304`,
returns the remembered result. GitHub documents that a request answered with
`304` does not count against the rate limit; that is GitHub's documented
behaviour and **was not measured here**. The memory is per adapter instance (it
is gone with the page) and is dropped for a path at every write to it. A
response without an `ETag` header is not remembered.

### Commits

Every write is a commit on the branch. `message` is the commit message, default
`sync <last path segment>` (for example `sync list.json`). It must hold nothing
personal: no names, no device ids, no content. The path itself is visible in the
repository (a space id and a collection name, which the secret derives; the
content is sealed).

## Connection test and setup help (`github-connection.ts`)

- `testGithub(options)`: `GET /repos/{owner}/{repo}`. `reachable` carries
  `private`, `canWrite` (`permissions.push`) and `empty` (`size === 0`; GitHub's
  size is in KB and may lag a first push); the other states are `unauthorised`,
  `not-found`, `blocked`, `unreachable` and `server` with a detail as above.
  The screen warns when the repository is public or not writable.
- `findRepositories(token, { fetch?, apiBase?, online? })`:
  `GET /user/repos?per_page=100&affiliation=owner,collaborator&sort=pushed` gives
  `{ ok: true, repositories: { fullName, private, canWrite }[], more }`; one
  `Link: rel="next"` page at most (200 entries), then `more: true`. A next link
  to another host is not followed, so the token is never sent elsewhere. That
  this endpoint lists exactly the selected repositories for a fine-grained token
  limited to selected repositories is the behaviour as far as known;
  **unverified**.
- `setupLinks({ name?, tokenName? })` gives `repositoryUrl`
  (`https://github.com/new?name=<name>&visibility=private`, default name
  `domus-sync`) and `tokenUrl`
  (`https://github.com/settings/personal-access-tokens/new`). **Unverified:**
  that the "new repository" form accepts `name` and `visibility` by link, and
  whether the token form accepts a name, description or permissions by link; no
  parameter for it is guessed, so `tokenName` is accepted and unused and the
  screen tells the person which values to enter.

## The registry (`storage.ts`)

`adapterFor(storage, { fetch?, online?, delay? })` takes the
`{ type, address, access? }` that a space stores and is the one place that knows
the types: `github` (address `owner/name`, `access.token`; a missing token or a
bad address throws a `RangeError`) and `webdav` (address the base URL,
`access.username` and `access.password` optional). Another type throws
`UnknownStorage`.

## The three setup steps of the screen

1. A link opens GitHub's "new repository" form (name, private).
2. A link opens the "new fine-grained token" form; the person limits it to that
   repository and gives it Contents: read and write, and chooses an expiry.
3. The person pastes the token; `findRepositories` lists what it reaches, the
   person picks one (no typing of the name) and `testGithub` checks it.

## Limits

- **Every write is a commit** and the history grows without end; the app
  collects changes for a few seconds before it writes
  ([decision](../../../docs/decisions/one-origin-spaces-storages.md#storages)).
- **No push.** Other devices see a change at their next poll.
- **1 MB per file** through this API: a larger file reads as `too-large`
  (documented limit of the Contents API for content in the answer; the sealed
  collections are far below it).
- **Rate limits.** 5,000 requests per hour per token as GitHub documents,
  shared by everyone who holds the token (so a household shares one budget).
  `304` answers are documented not to count; not measured. The adapter does not
  wait or retry; the sync loop's back-off applies to the `server` failure.
- **The token acts as its creator.** Whoever holds it can overwrite or delete
  the repository's content; taking access away means a new token for everyone.
- **Tokens expire.** An expired or revoked token is `unauthorised`; the screen
  says so.
- **An empty repository** (no commit yet): a first write creates the first commit
  by the Contents API. Believed to work; **not verified**.
- **The sha condition** of a write is GitHub's: a wrong or missing sha is `409`
  or `422`; both are `conflict` when the caller gave a condition.
- **`blocked` and `unreachable` are a guess**, as for WebDAV: a page learns
  nothing from a failed `fetch` but a `TypeError`.
- Not tested: any real GitHub repository, any browser.
