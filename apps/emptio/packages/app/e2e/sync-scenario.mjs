// Stage 4 of a run: two devices of one household against the fake GitHub. A adds an entry and
// the fake receives a sealed file; B (opened afterwards) shows the entry; B ticks it and A shows
// the tick without a reload, within the polling time. What this does not prove: the real GitHub
// (its rate limits, its latency), two real devices, or a clock that differs between them.
import { MAIN } from '@nexumia-de/hospes/testing/fake-github';
import { everything, newDevice } from '@nexumia-de/hospes/testing/browser';
import { add, ok, openApp, rowOf, rows } from './driver.mjs';

const ADDRESS = 'me/household';
const POLL_WAIT_MS = 25_000;

async function device(run, secret) {
  const { browser, server, fake, width, height, locale, problems } = run;
  const made = await newDevice(browser, {
    origin: server.origin,
    allowed: [server.origin, fake.origin],
    locale,
    width,
    height,
    problems,
  });
  made.page.setDefaultTimeout(8_000);
  const leaks = [];
  made.context.on('request', (r) => {
    if (new URL(r.url()).origin === server.origin && r.headers().authorization) leaks.push(r.url());
  });
  // The shared space is put into the database before the app starts, as the Household app would.
  await made.page.goto(`${server.origin}/manifest.webmanifest`);
  await made.page.addScriptTag({ content: run.seed });
  const id = await made.page.evaluate((args) => globalThis.__seed.putShared(args), {
    secret,
    name: 'Family',
    address: ADDRESS,
    token: MAIN,
  });
  await openApp(made.page, server.origin);
  return { ...made, id, leaks };
}

const inStep = (run, text) => text.startsWith(run.t.status.inStep('').split('·')[0].trim());
const statusOf = (page) => page.locator('.space-status').first().innerText();
const waitInStep = (run, page) =>
  page.waitForFunction(
    (prefix) => document.querySelector('.space-status')?.textContent.startsWith(prefix),
    run.t.status.inStep('').split('·')[0].trim(),
    { timeout: 15_000 },
  );

export async function syncStage(run) {
  const { t, fake } = run;
  const logFrom = fake.log.length;
  const probe = await run.browser.newContext();
  const page0 = await probe.newPage();
  await page0.goto(`${run.server.origin}/manifest.webmanifest`);
  await page0.addScriptTag({ content: run.seed });
  const secret = await page0.evaluate(() => globalThis.__seed.makeSecret());
  await probe.close();

  const a = await device(run, secret);
  await ok(
    run,
    'sync: device A shows the shared space by its name',
    async () => (await a.page.locator('.space-name').innerText()) === 'Family',
  );
  await add(a.page, t, 'Oat milk', { amount: '1 l' });
  const key = `${ADDRESS}:${a.id}/list.json`;
  // The first cycle of A already writes an empty file; the one that carries the entry follows
  // about 2 s after the add, so the file is opened (with the secret) until the entry is in it.
  const reader = await run.browser.newContext();
  const readerPage = await reader.newPage();
  await readerPage.goto(`${run.server.origin}/manifest.webmanifest`);
  await readerPage.addScriptTag({ content: run.seed });
  const names = async () =>
    fake.files.has(key)
      ? readerPage.evaluate((args) => globalThis.__seed.openFile(args), {
          secret,
          collection: 'list',
          content: fake.files.get(key).content,
        })
      : { names: [] };
  await ok(
    run,
    'sync: the fake receives the sealed file <space id>/list.json with the entry in it',
    async () => {
      for (let i = 0; i < 60 && !(await names()).names?.includes('Oat milk'); i += 1) {
        await a.page.waitForTimeout(250);
      }
      return (await names()).names?.includes('Oat milk');
    },
  );
  await ok(
    run,
    'sync: the stored text does not contain the entry name (plain or as base64)',
    async () => {
      const stored = fake.files.get(key)?.content ?? '';
      const plain = Buffer.from(stored, 'base64').toString('latin1');
      return (
        stored.length > 0 &&
        !plain.includes('Oat') &&
        !plain.includes('milk') &&
        !stored.includes('Oat')
      );
    },
  );
  await ok(run, 'sync: A reaches "In step"', async () => {
    await waitInStep(run, a.page);
    return inStep(run, await statusOf(a.page));
  });

  const b = await device(run, secret);
  await ok(run, 'sync: device B, opened afterwards, shows the entry', async () => {
    await rowOf(b.page, 'Oat milk').waitFor({ timeout: 15_000 });
    return (await rows(b.page)).find((r) => r.name === 'Oat milk')?.amount === '1 l';
  });
  await ok(run, 'sync: B reaches "In step"', async () => {
    await waitInStep(run, b.page);
    return inStep(run, await statusOf(b.page));
  });

  await rowOf(b.page, 'Oat milk').locator('.tick').check();
  await ok(
    run,
    `sync: A shows B's tick without a reload (within ${POLL_WAIT_MS / 1000} s)`,
    async () => {
      await a.page.waitForSelector('.entry-bought', { timeout: POLL_WAIT_MS });
      return (await rows(a.page)).find((r) => r.name === 'Oat milk')?.bought === true;
    },
  );
  await ok(run, 'sync: after that, A is in step again', async () => {
    await waitInStep(run, a.page);
    return true;
  });

  await ok(run, 'sync: the token went to the fake only, with every request to it', () => {
    const mine = fake.log.slice(logFrom).filter((r) => r.method !== 'OPTIONS');
    return (
      mine.length > 0 &&
      mine.every((r) => r.token === MAIN) &&
      a.leaks.length + b.leaks.length === 0
    );
  });
  await ok(run, 'sync: no screen of either device shows the token', async () => {
    const text = (await everything(a.page)) + (await everything(b.page));
    return !text.includes(MAIN) && !text.includes(secret);
  });
  await reader.close();
  await a.context.close();
  await b.context.close();
}
