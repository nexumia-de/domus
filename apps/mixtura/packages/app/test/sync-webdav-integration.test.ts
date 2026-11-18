// The adapter against a real WebDAV server (tools/webdav-server, docs/sync-backends.md#test-server).
// Runs when MIXTURA_WEBDAV_URL is set (MIXTURA_WEBDAV_USER, default `mixtura`, and
// MIXTURA_WEBDAV_PASSWORD with it); otherwise it is skipped, and says why.
import { describe, expect, test } from 'vitest';
import { createWebdavAdapter } from '../src/sync/webdav';
import { testConnection } from '../src/sync/webdav-connection';

const url = process.env['MIXTURA_WEBDAV_URL'];
const username = process.env['MIXTURA_WEBDAV_USER'] ?? 'mixtura';
const password = process.env['MIXTURA_WEBDAV_PASSWORD'] ?? '';
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

if (url === undefined) {
  test.skip('WebDAV integration: skipped because MIXTURA_WEBDAV_URL is not set (start tools/webdav-server first)', () =>
    undefined);
} else {
  describe('WebDAV adapter against the real server', () => {
    const folder = `it-${Date.now()}`;
    const adapter = createWebdavAdapter({ baseUrl: url, username, password });
    const path = `${folder}/places/p1/stock.json`;

    test('a file that does not exist is missing, in a folder that does not exist either', async () => {
      expect(await adapter.read(path)).toEqual({ ok: true, missing: true });
    });

    test('create with null makes the folders, and gives or lacks an ETag', async () => {
      const created = await adapter.write(path, '{"n":1}', null);
      expect(created).toMatchObject({ ok: true });
      const read = await adapter.read(path);
      expect(read).toMatchObject({ ok: true, missing: false, body: '{"n":1}' });
    });

    test('create with null on an existing file is a conflict', async () => {
      expect(await adapter.write(path, '{"n":2}', null)).toEqual({
        ok: false,
        failure: 'conflict',
      });
    });

    test('a conditional write with the current etag succeeds; the old etag then conflicts', async () => {
      // Apache sends a weak ETag for a file written less than a second ago, and a weak ETag
      // never matches If-Match (docs/webdav-spike.md): wait before the conditional write.
      await pause(1200);
      const first = await adapter.read(path);
      if (!first.ok || first.missing) throw new Error('the file should be there');
      expect(first.etag).not.toMatch(/^W\//);
      expect(await adapter.write(path, '{"n":3}', first.etag)).toMatchObject({ ok: true });
      expect(await adapter.write(path, '{"n":4}', first.etag)).toEqual({
        ok: false,
        failure: 'conflict',
      });
      const now = await adapter.read(path);
      expect(now).toMatchObject({ ok: true, missing: false, body: '{"n":3}' });
    });

    test('an unconditional write replaces the file', async () => {
      expect(await adapter.write(path, '{"n":5}')).toMatchObject({ ok: true });
      expect(await adapter.read(path)).toMatchObject({ body: '{"n":5}' });
    });

    test('wrong credentials are unauthorised, for a read and for a write', async () => {
      const wrong = createWebdavAdapter({ baseUrl: url, username, password: `${password}-wrong` });
      expect(await wrong.read(path)).toEqual({ ok: false, failure: 'unauthorised' });
      expect(await wrong.write(path, '{}')).toEqual({ ok: false, failure: 'unauthorised' });
      expect(await testConnection(wrong)).toEqual({ state: 'unauthorised' });
    });

    test('a server that is not there is blocked while the browser says it is online', async () => {
      const dead = createWebdavAdapter({ baseUrl: 'http://127.0.0.1:9', online: () => true });
      expect(await dead.read(path)).toEqual({ ok: false, failure: 'blocked' });
      expect(await testConnection(dead)).toEqual({ state: 'blocked' });
    });

    test('Test Connection reaches the server', async () => {
      expect(await testConnection(adapter)).toEqual({ state: 'reachable' });
    });

    test('names with spaces and non-ASCII characters round-trip', async () => {
      const odd = `${folder}/ä ö/a b.json`;
      expect(await adapter.write(odd, '{"x":"ü"}', null)).toMatchObject({ ok: true });
      expect(await adapter.read(odd)).toMatchObject({ body: '{"x":"ü"}' });
    });
  });
}
