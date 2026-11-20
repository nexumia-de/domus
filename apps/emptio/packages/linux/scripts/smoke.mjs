// `npm run smoke -w @emptio/linux`: bundles src/smoke.ts and runs it in GJS
// against a fake GitHub on localhost. Needs `gjs` and the libsoup typelib
// (docs/native-linux.md#running-it).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAIN, startFakeGithub } from '@nexumia-de/hospes/testing/fake-github';
import { bundle } from '../build.mjs';

const work = mkdtempSync(join(tmpdir(), 'emptio-smoke-'));
const fake = await startFakeGithub();
let status;
try {
  const script = await bundle('src/smoke.ts', join(work, 'smoke.js'));
  // Not spawnSync: the fake storage answers from this process while GJS runs.
  const gjs = spawn('gjs', ['-m', script], {
    stdio: 'inherit',
    env: { ...process.env, SMOKE_GITHUB_API: fake.origin, SMOKE_TOKEN: MAIN, SMOKE_DIR: work },
  });
  status = await new Promise((done) => {
    gjs.on('error', () => done(1));
    gjs.on('exit', (code) => done(code ?? 1));
  });
  const file = [...fake.files.values()][0];
  const sealed = file ? Buffer.from(file.content, 'base64').toString('utf8') : '';
  const clear = sealed.includes('Äpfel') || sealed === '';
  console.log(
    `${clear ? 'FAIL' : 'ok  '} the storage holds a sealed file without the entry's name`,
  );
  const others = fake.log.filter((r) => r.token !== undefined && r.token !== MAIN).length;
  console.log(`ok   ${fake.log.length} requests reached the fake, ${others} with another token`);
  if (clear) status = 1;
  // The files hold the secret: nobody but the user may read them.
  const mode = statSync(join(work, 'a', 'spaces.json')).mode & 0o777;
  console.log(
    `${mode === 0o600 ? 'ok  ' : 'FAIL'} the spaces file is private (${mode.toString(8)})`,
  );
  if (mode !== 0o600) status = 1;
} finally {
  await fake.close();
  rmSync(work, { recursive: true, force: true });
}
process.exit(status ?? 1);
