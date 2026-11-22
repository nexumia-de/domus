// Run inside GJS by tooling/smoke.mjs (one run for every native app): the parts that only a real GJS can
// prove. Derives the fixed vector, keeps a list in files, and takes two
// "devices" (two folders) through sync cycles against the fake GitHub that the
// Node script started. Prints one line per check and exits 1 on a failure.
import GLib from 'gi://GLib';
import { exit } from 'system';
import {
  adapterFor,
  createFileStore,
  deriveSpace,
  localChange,
  syncCollection,
  type Store,
} from '@nexumia-de/hospes';
import { createIssue, type Report } from '@nexumia-de/hospes';
import { gioFiles } from './gio-files';
import { createKeyring } from './keyring';
import { randomBytes } from './random';
import { soupFetch } from './soup-fetch';
import { installWebPlatform } from './subtle';

installWebPlatform(randomBytes);

// GJS's own `print` and `printerr`; the DOM types know another `print`.
const { print, printerr } = globalThis as unknown as Record<string, (text: string) => void>;

let failed = 0;
const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  print?.(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
};

const api = GLib.getenv('SMOKE_GITHUB_API') as string;
const token = GLib.getenv('SMOKE_TOKEN') as string;
const work = GLib.getenv('SMOKE_DIR') as string;
const collection = GLib.getenv('SMOKE_COLLECTION') as string;
const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const now = (): string => new Date().toISOString();

async function main(): Promise<void> {
  const space = await deriveSpace(SECRET);
  check(
    space.id === 'cfa6a5e7daf2bdd14b468c61b095f608',
    `the fixed vector's space id (${space.id})`,
  );
  check(
    crypto.getRandomValues(new Uint8Array(32)).some((b) => b !== 0),
    'random bytes from the system',
  );
  check(/^[0-9a-f-]{36}$/.test(crypto.randomUUID()), 'a random id');

  const storage = { type: 'github', address: 'me/household', access: { token } };
  const device = (name: string): Store => createFileStore(gioFiles(`${work}/${name}`));
  const a = device('a');
  const b = device('b');
  for (const store of [a, b]) await store.putSpace({ id: space.id, secret: SECRET, storage });
  const plain = soupFetch('gjs-smoke');
  // A request that got no answer is said, so a failing run names its cause.
  const fetch = ((...args: Parameters<typeof plain>) =>
    plain(...args).catch((error: unknown) => {
      printerr?.(`fetch: ${String(error)}`);
      throw error;
    })) as typeof plain;
  const cycle = (store: Store) =>
    syncCollection({
      space,
      collection,
      adapter: adapterFor(storage, { apiBase: api, fetch, online: () => true }),
      store,
      now,
    });

  await localChange(a, space.id, collection, now, () => ({
    put: [{ key: 'e1', value: { name: 'Äpfel' } }],
  }));
  // A second store on the same folder is the app after a restart.
  const again = await device('a').readCollection(space.id, collection);
  check(again.records.length === 1, 'the collection survives in files');
  const mode = GLib.file_test(`${work}/a/spaces.json`, GLib.FileTest.EXISTS);
  check(mode, 'the spaces file exists');

  const first = await cycle(a);
  check(first.ok && first.wrote, `device A writes the sealed file (${JSON.stringify(first)})`);
  const second = await cycle(b);
  const got = (await b.readCollection(space.id, collection)).records;
  check(
    second.ok && got.length === 1 && (got[0]?.value as { name?: string })?.name === 'Äpfel',
    `device B reads it (${JSON.stringify(second)})`,
  );
  const quiet = await cycle(b);
  check(quiet.ok && !quiet.wrote && !quiet.changed, 'a cycle with nothing new writes nothing');

  const wrong = await syncCollection({
    space,
    collection,
    adapter: adapterFor(
      { ...storage, access: { token: 'github_pat_wrong' } },
      { apiBase: api, fetch, online: () => true },
    ),
    store: a,
    now,
  });
  check(
    !wrong.ok && wrong.failure === 'unauthorised',
    `a wrong token is unauthorised (${JSON.stringify(wrong)})`,
  );
  const nowhere = await syncCollection({
    space,
    collection,
    adapter: adapterFor(storage, { apiBase: 'http://127.0.0.1:9', fetch, online: () => false }),
    store: a,
    now,
  });
  check(
    !nowhere.ok && nowhere.failure === 'unreachable',
    `no answer is unreachable (${JSON.stringify(nowhere)})`,
  );
}

// Issue reports (docs/feedback.md): the keyring in memory and without a keyring daemon, and
// the request on libsoup. Not proven: a real keyring, the Secret portal, the live GitHub API.
async function reports(): Promise<void> {
  const fetch = soupFetch('gjs-smoke');
  GLib.setenv('SMOKE_KEYRING', 'memory', true);
  const memory = createKeyring({
    appId: 'de.nexumia.Smoke',
    labels: {},
    memoryEnv: 'SMOKE_KEYRING',
  });
  memory.store('github-token', 'github_pat_x');
  const kept = memory.lookup('github-token');
  memory.clear('github-token');
  check(
    kept === 'github_pat_x' && memory.lookup('github-token') === undefined,
    'the keyring in memory keeps and forgets',
  );
  const real = createKeyring({ appId: 'de.nexumia.Smoke', labels: {} });
  real.store('github-token', 'github_pat_y');
  check(
    real.lookup('github-token') === 'github_pat_y',
    'a keyring that cannot store keeps the token for the session',
  );
  real.clear('github-token');

  const report: Report = {
    kind: 'problem',
    title: 'T',
    text: 'B',
    app: 'Smoke',
    version: '0',
    device: 'Desktop',
  };
  const refused = await createIssue({
    repo: 'x/y',
    token: 'github_pat_wrong',
    report,
    fetch,
    apiBase: api,
  });
  check(
    !refused.ok && refused.failure === 'no-access',
    `an issue the fake refuses is no access (${JSON.stringify(refused)})`,
  );
  const offline = await createIssue({
    repo: 'x/y',
    token: 't',
    report,
    fetch,
    apiBase: 'http://127.0.0.1:9',
  });
  check(
    !offline.ok && offline.failure === 'offline',
    `an issue without an answer is offline (${JSON.stringify(offline)})`,
  );
}

const loop = new GLib.MainLoop(null, false);
main()
  .then(reports)
  .catch((error: unknown) => check(false, `aborted: ${String(error)}`))
  .finally(() => loop.quit());
loop.run();
exit(failed === 0 ? 0 : 1);
