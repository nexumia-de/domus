// The checks of one run: one viewport, one language. Device A creates a space on GitHub, invites;
// device B (a second browser context: separate storage) joins with and without the access, renames;
// A syncs; the failures of the storage are made on purpose and read in words; WebDAV is the same
// again against a fake that the page reaches through the browser's own routing. `deviceOnly` is
// the space an app made before sync was set up, and its way to a storage.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  MAIN,
  MULTI,
  NOREPOS,
  PUBLIC,
  READONLY,
  TOKENS,
  WRONG,
} from '@nexumia-de/hospes/testing/fake-github';
import { audit, check, everything, newDevice } from '@nexumia-de/hospes/testing/browser';

const DAV = 'https://dav.example';

/** A WebDAV server in a route handler: Basic auth, GET, PUT with conditions, MKCOL, CORS. */
const fakeDav = () => {
  const files = new Map();
  let counter = 0;
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type, if-match, if-none-match',
    'access-control-allow-methods': 'GET, PUT, MKCOL, OPTIONS',
    'access-control-expose-headers': 'ETag',
  };
  const handler = async (route) => {
    const request = route.request();
    const answer = (status, body = '', headers = {}) =>
      route.fulfill({ status, body, headers: { ...cors, ...headers } });
    if (request.method() === 'OPTIONS') return answer(204);
    if (request.headers().authorization !== `Basic ${btoa('u:p')}`) return answer(401);
    const path = new URL(request.url()).pathname;
    const file = files.get(path);
    if (request.method() === 'MKCOL') return answer(path.endsWith('/') ? 405 : 201);
    if (request.method() === 'GET') {
      return file ? answer(200, file.body, { etag: file.etag }) : answer(404);
    }
    if (request.method() === 'PUT') {
      const { 'if-match': ifMatch, 'if-none-match': ifNoneMatch } = request.headers();
      if (ifMatch !== undefined && file?.etag !== ifMatch) return answer(412);
      if (ifNoneMatch === '*' && file) return answer(412);
      counter += 1;
      const etag = `"d${counter}"`;
      files.set(path, { body: request.postData() ?? '', etag });
      return answer(file ? 204 : 201, '', { etag });
    }
    return answer(405);
  };
  return { files, handler };
};

const decodeInvite = (link) => {
  const data = link.slice(link.indexOf('#/join/') + '#/join/'.length);
  return JSON.parse(
    Buffer.from(data.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString(),
  );
};

export async function scenario(browser, run) {
  const { server, fake, t, texts, locale, width, height, label, shots, problems } = run;
  const origin = server.origin;
  const dav = fakeDav();
  const make = async (size = { width, height }) => {
    const device = await newDevice(browser, {
      origin,
      allowed: [origin, fake.origin, DAV],
      locale,
      problems,
      ...size,
    });
    await device.context.route(`${DAV}/**`, dav.handler);
    return device;
  };
  const ok = (value, what) => check(value, `${label}: ${what}`);
  const failure = (name, storage = 'github', detail) =>
    texts.failureText(t, { failure: name, ...(detail ? { detail } : {}) }, storage);

  let screen = 0;
  const looked = async (page, name) => {
    const found = await audit(page);
    ok(found.overflow <= 0, `${name}: no horizontal scroll (${found.overflow})`);
    ok(
      found.small.length === 0,
      `${name}: every tap target is at least 44 px (${found.small.join('; ')})`,
    );
    if (shots) {
      screen += 1;
      await page.screenshot({
        path: join(shots, `${String(screen).padStart(2, '0')}-${name}.png`),
        fullPage: true,
      });
    }
  };
  const mainText = (page) => page.locator('main').innerText();
  const noSecret = async (page, secret, where) => {
    const dump = await everything(page);
    ok(
      !dump.includes(secret),
      `${where}: the token is not in the address, storage, page text or fields`,
    );
  };
  const spaceId = (page) => /#\/spaces\/([0-9a-f]{32})/.exec(page.url())?.[1];
  const waitTitle = (page, text) =>
    page.waitForFunction((x) => document.querySelector('h1')?.textContent === x, text);
  const stateOf = async (page) =>
    page.locator('[data-testid=status]').first().getAttribute('data-state');
  fake.files.clear();
  fake.log.length = 0;
  fake.fail = fake.fail ?? {};

  // ---- Device A: home, then create a space with GitHub -------------------------------------
  const A = await make();
  const a = A.page;
  await a.goto(`${origin}/`);
  await a.waitForSelector('[data-testid=empty]');
  ok((await a.locator('h1').innerText()) === t.home.title, `home: the title is "${t.home.title}"`);
  ok(
    (await a.evaluate(() => document.documentElement.lang)) === (locale === 'de-DE' ? 'de' : 'en'),
    'the page language follows the browser',
  );
  const links = await a.$$eval('.apps a', (list) => list.map((x) => x.getAttribute('href')));
  ok(links.join() === 'mixtura/,culina/,emptio/', `home: lists the apps (${links.join()})`);
  ok((await mainText(a)).includes(t.home.empty), 'home: the empty state says what a space is');
  ok(
    (await a.locator('[data-testid=create-space]').count()) === 1,
    'home: offers "Create a space"',
  );
  ok(
    (await a.getByRole('button', { name: t.home.join }).count()) === 1,
    'home: offers "Join with a link"',
  );
  ok(
    (await a.evaluate(() => document.querySelector('link[rel=manifest]'))) === null,
    'home: no manifest',
  );
  ok(
    (await a.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0,
    'home: no service worker',
  );
  await looked(a, 'home-empty');

  // The paste field: a bad link is told in words, on the spot.
  await a.fill('[data-testid=join-input]', 'https://example.org/nothing');
  await a.click('[data-testid=join-form] button[type=submit]');
  ok(
    (await a.locator('[data-testid=join-problem]').innerText()) === t.join.errors['not-a-link'],
    'home: a pasted text that is no link is refused in words',
  );
  await a.fill('[data-testid=join-input]', '');
  await a.click('[data-testid=join-form] button[type=submit]');
  ok(
    (await a.locator('[data-testid=join-problem]').innerText()) === t.join.errors.empty,
    'home: an empty field is refused in words',
  );

  await a.click('[data-testid=create-space]');
  ok(
    (await a.locator('[data-testid=name-input]').inputValue()) === t.create.name.suggestion,
    `create: the name suggestion is "${t.create.name.suggestion}"`,
  );
  await a.fill('[data-testid=name-input]', '   ');
  await a.click('[data-testid=next]');
  ok(
    (await mainText(a)).includes(t.create.name.invalid),
    'create: an empty name is refused in words',
  );
  await looked(a, 'create-1-name');
  await a.fill('[data-testid=name-input]', 'Family');
  await a.click('[data-testid=next]');
  await looked(a, 'create-2-storage');
  ok(
    (await a.locator('[data-testid=type-webdav]').count()) === 1 &&
      (await a.locator('.choice').count()) === 2,
    'create: GitHub and WebDAV are on offer, nothing else',
  );
  // Back is always possible.
  await a.click('[data-testid=back]');
  ok(
    (await a.locator('[data-testid=name-input]').inputValue()) === 'Family',
    'create: back keeps what was typed',
  );
  await a.click('[data-testid=next]');
  await a.click('[data-testid=type-github]');

  // The three guided steps
  const hrefs = await a.$$eval('a[target=_blank]', (list) => list.map((x) => `${x.href} ${x.rel}`));
  ok(
    hrefs[0]?.startsWith('https://github.com/new?name=domus-sync&visibility=private') &&
      hrefs[0].includes('noopener'),
    'github: the first button opens the prefilled "new repository" page in a new tab',
  );
  ok(
    hrefs[1]?.startsWith('https://github.com/settings/personal-access-tokens/new') &&
      hrefs[1].includes('noopener'),
    'github: the second button opens the "new token" page in a new tab',
  );
  ok(
    (await a.locator('ol.steps li').count()) === 4,
    'github: the token page comes with a numbered list of what to click',
  );
  ok(
    (await a.locator('[data-testid=token-input]').getAttribute('type')) === 'password' &&
      (await a.locator('[data-testid=token-input]').getAttribute('autocomplete')) === 'off',
    'github: the token field is a password field with autocomplete off',
  );
  await looked(a, 'create-3-github');
  await a.locator('[data-testid=token-input]').fill('github_pat_typed_but_not_sent');
  await a.getByRole('button', { name: t.common.show }).click();
  ok(
    (await a.locator('[data-testid=token-input]').getAttribute('type')) === 'text',
    'github: Show reveals the token',
  );
  await a.getByRole('button', { name: t.common.hide }).click();
  ok(
    (await a.locator('[data-testid=token-input]').getAttribute('type')) === 'password',
    'github: Hide hides it again',
  );

  const tryToken = async (token) => {
    await a.fill('[data-testid=token-input]', token);
    await a.click('[data-testid=next]');
  };
  const message = () => a.locator('[data-testid=github-message]');
  await a.click('[data-testid=next]');
  await a.fill('[data-testid=token-input]', '');
  await a.click('[data-testid=next]');
  ok(
    (await message().innerText()) === t.fields.emptyToken,
    'github: no token is asked for in words',
  );
  await tryToken(WRONG);
  await message().getByText(failure('unauthorised'), { exact: true }).waitFor();
  ok(true, 'github: a wrong token gives the "unauthorised" sentence');
  await looked(a, 'create-3-github-wrong-token');
  await tryToken(NOREPOS);
  await message().getByText(t.create.github.none, { exact: true }).waitFor();
  ok(true, 'github: a token that reaches no repository is told what to do');
  await tryToken(READONLY);
  await message().getByText(t.create.github.noneWritable, { exact: true }).waitFor();
  ok(true, 'github: a token that may not write is told what to do');
  await tryToken(PUBLIC);
  await a.waitForSelector('[data-testid=public-use]');
  ok(
    (await mainText(a)).includes(t.create.github.publicText('me/open')),
    'github: a public repository is warned about, not blocked',
  );
  await looked(a, 'create-3-public-warning');
  await a.click('[data-testid=back]');
  await tryToken(MULTI);
  await a.waitForSelector('[data-testid=repository]');
  ok(
    (await a.locator('[data-testid=repository]').count()) === 2,
    'github: several repositories are offered to pick from',
  );
  await looked(a, 'create-3-pick');
  await a.click('[data-testid=back]');
  await tryToken(MAIN);
  await a.waitForSelector('[data-testid=create]');
  ok(
    (await a.locator('[data-testid=summary-storage]').innerText()) === 'GitHub: me/household',
    'github: exactly one writable repository is used without asking',
  );
  ok(
    (await a.locator('[data-testid=token-input]').count()) === 0,
    'github: the token field is gone after the step',
  );
  await noSecret(a, MAIN, 'after the token step');
  await looked(a, 'create-4-finish');

  await a.click('[data-testid=create]');
  await a.waitForFunction(() => /#\/spaces\/[0-9a-f]{32}$/.test(location.hash));
  const id = spaceId(a);
  await waitTitle(a, 'Family');
  ok(
    (await a.locator('[data-testid=space-messages]').innerText()) === t.space.created,
    'space: shows that the space was created',
  );
  ok(
    (await a.locator('[data-testid=storage-words]').innerText()) === 'GitHub: me/household',
    'space: names the storage in words',
  );
  ok((await stateOf(a)) === 'in-step', 'space: the first cycle ran, the state is "in step"');
  ok(fake.files.has(`me/household:${id}/space.json`), "the space's file is in the repository");
  ok(
    ![...fake.files.values()].some((f) =>
      Buffer.from(f.content, 'base64').toString().includes('Family'),
    ),
    'the file in the repository does not hold the name in clear',
  );
  await noSecret(a, MAIN, 'the space page');
  await looked(a, 'space');

  // ---- Invite ------------------------------------------------------------------------------
  await a.click('[data-testid=invite]');
  const link = a.locator('[data-testid=invite-link]');
  await link.waitFor();
  ok(
    (await a.locator('[data-testid=include-access]').isChecked()) === false,
    'invite: "Include the storage access" is off by default',
  );
  ok(
    (await a.locator('[data-testid=qr-box] svg.qr path').count()) === 1,
    'invite: the QR code is drawn on the page (inline svg)',
  );
  ok(
    (await a.locator('[data-testid=qr-box] img, [data-testid=qr-box] canvas').count()) === 0,
    'invite: no image or canvas from anywhere',
  );
  const withoutAccess = await link.inputValue();
  ok(
    withoutAccess.startsWith(`${origin}/#/join/`),
    'invite: the link is this page with #/join/<data>',
  );
  ok(
    decodeInvite(withoutAccess).access === undefined &&
      !withoutAccess.includes(MAIN) &&
      !JSON.stringify(decodeInvite(withoutAccess)).includes('github_pat'),
    'invite: without the box, the token is not in the link',
  );
  ok(
    decodeInvite(withoutAccess).secret.length === 43 &&
      decodeInvite(withoutAccess).name === 'Family',
    'invite: the secret and the name are always in it',
  );
  const explainOff = await a.locator('[data-testid=include-explain]').innerText();
  const qrOff = await a.locator('[data-testid=qr-box] path').getAttribute('d');
  await looked(a, 'invite');
  await a.check('[data-testid=include-access]');
  const withAccess = await link.inputValue();
  ok(
    withAccess !== withoutAccess && decodeInvite(withAccess).access?.token === MAIN,
    'invite: with the box ticked, the token is in the link',
  );
  ok(
    (await a.locator('[data-testid=include-explain]').innerText()) === t.invite.includeGithub &&
      explainOff === t.invite.without,
    'invite: the box says in words what it gives',
  );
  ok(
    (await a.locator('[data-testid=qr-box] path').getAttribute('d')) !== qrOff,
    'invite: the QR code follows the box',
  );
  ok(
    (await mainText(a)).includes(t.invite.always) &&
      (await mainText(a)).includes(t.invite.alwaysTitle),
    'invite: says what it always contains',
  );
  await noSecret(a, MAIN, 'the invite page with access (the link carries it encoded, by design)');
  await a.click('[data-testid=copy-link]');
  await a.getByText(t.invite.copied, { exact: true }).waitFor();
  ok(
    (await a.evaluate(() => navigator.clipboard.readText())) === withAccess,
    'invite: Copy puts the link on the clipboard',
  );
  await looked(a, 'invite-with-access');
  await a.uncheck('[data-testid=include-access]');
  ok((await link.inputValue()) === withoutAccess, 'invite: unticking takes the token out again');

  // ---- Device B joins with the access ------------------------------------------------------
  const B = await make();
  const b = B.page;
  await b.goto(withAccess);
  await b.waitForSelector('[data-testid=join]');
  ok(
    (await b.locator('[data-testid=join-name]').innerText()) === 'Family',
    "join: shows the space's name",
  );
  ok(
    (await b.locator('[data-testid=join-storage]').innerText()) === 'GitHub: me/household',
    'join: shows the storage',
  );
  ok(
    (await b.locator('[data-testid=access-token]').count()) === 0 &&
      (await mainText(b)).includes(t.join.accessIncluded),
    'join: an invite with access asks for nothing more',
  );
  await looked(b, 'join-with-access');
  await b.click('[data-testid=join]');
  await b.waitForFunction(() => /#\/spaces\/[0-9a-f]{32}$/.test(location.hash));
  await waitTitle(b, 'Family');
  ok(spaceId(b) === id, 'join: the second device has the same space');
  ok(
    (await b.locator('[data-testid=space-messages]').innerText()).includes(
      t.space.joined('Family'),
    ),
    'join: shows that it joined, with the name A gave',
  );
  ok(
    !b.url().includes('join') && !b.url().includes(decodeInvite(withAccess).secret),
    'join: the invite is gone from the address bar',
  );
  await b.goBack();
  ok(b.url() === 'about:blank', 'join: the history entry of the link was replaced, not kept');
  await b.goto(`${origin}/`);
  await b.waitForSelector('[data-testid=space-card]');
  ok(
    (await b.locator('[data-testid=space-card]').innerText()).includes('Family'),
    'home: lists the space with its name and storage',
  );
  await noSecret(b, MAIN, 'device B after joining');
  await looked(b, 'home-with-space');

  // Joining twice, and links that are bad
  await b.goto(withAccess);
  await b.waitForSelector('[data-testid=open-existing]');
  ok(
    (await mainText(b)).includes(t.join.alreadyHere('Family')),
    'join: a space that is already here says so and offers to open it',
  );
  await looked(b, 'join-already-here');
  await b.goto(`${origin}/#/join/AAAA`);
  await b.getByText(t.join.errors['not-json'], { exact: true }).waitFor();
  ok(true, 'join: a link that is cut off or damaged has its own message');
  await looked(b, 'join-bad-link');
  await b.goto(`${origin}/#/join`);
  await b.getByText(t.join.errors.empty, { exact: true }).waitFor();
  ok(true, 'join: no data at all has its own message');
  await b.goto(`${origin}/`);
  await b.fill('[data-testid=join-input]', withAccess);
  await b.click('[data-testid=join-form] button[type=submit]');
  await b.waitForSelector('[data-testid=open-existing]');
  ok(true, 'home: pasting a link into the field goes to the join screen');

  // Rename in B, Sync now in A
  await b.goto(`${origin}/#/spaces/${id}`);
  await waitTitle(b, 'Family');
  await b.fill('[data-testid=rename-input]', 'Family B');
  await b.click('[data-testid=rename]');
  await waitTitle(b, 'Family B');
  await b.waitForSelector('[data-testid=status][data-state=in-step]');
  ok(true, 'space: renaming saves and syncs');
  await a.goto(`${origin}/#/spaces/${id}`);
  await waitTitle(a, 'Family');
  await a.click('[data-testid=sync-now]');
  await waitTitle(a, 'Family B');
  ok(true, 'sync: "Sync now" in A shows the name B gave');

  // ---- Invite without the access: C has to bring its own ----------------------------------
  const C = await make();
  const c = C.page;
  await c.goto(withoutAccess);
  await c.waitForSelector('[data-testid=access-token]');
  ok(
    (await mainText(c)).includes(t.join.accessNeeded) &&
      (await c.locator('ol.steps li').count()) === 4,
    'join: an invite without access asks for it and says how to get a token',
  );
  await looked(c, 'join-without-access');
  await c.click('[data-testid=join]');
  ok((await mainText(c)).includes(t.fields.emptyToken), 'join: no token is asked for in words');
  await c.fill('[data-testid=access-token]', WRONG);
  await c.click('[data-testid=join]');
  await c.getByText(failure('unauthorised'), { exact: true }).waitFor();
  ok(true, 'join: a wrong token gives the "unauthorised" sentence');
  await looked(c, 'join-wrong-token');
  ok(
    (await c.evaluate(() => location.hash)).startsWith('#/join/'),
    'join: after a failure the link is still there to try again',
  );
  await c.fill('[data-testid=access-token]', READONLY);
  await c.click('[data-testid=join]');
  await c.getByText(t.join.readonly('me/household'), { exact: true }).waitFor();
  ok(true, 'join: a token that may not write is told so');
  await c.fill('[data-testid=access-token]', MAIN);
  await c.click('[data-testid=join]');
  await c.waitForFunction(() => /#\/spaces\/[0-9a-f]{32}$/.test(location.hash));
  await waitTitle(c, 'Family B');
  ok(true, "join: with a token of its own the third device joins and reads B's name");
  await noSecret(c, MAIN, 'device C after joining');

  // C: change access, then remove from this device
  await c.click('[data-testid=change-access]');
  await c.fill('[data-testid=access-token]', WRONG);
  await c.click('[data-testid=access-save]');
  await c.getByText(failure('unauthorised'), { exact: true }).waitFor();
  ok(true, 'access: a wrong token is refused and the old one stays');
  await looked(c, 'access');
  await c.fill('[data-testid=access-token]', MAIN);
  await c.click('[data-testid=access-save]');
  await waitTitle(c, 'Family B');
  ok(
    (await c.locator('[data-testid=space-messages]').innerText()) === t.space.accessSaved,
    'access: a working token is saved',
  );
  await c.click('[data-testid=remove]');
  ok(
    (await c.locator('[data-testid=confirm-remove]').innerText()).includes(t.space.removeText),
    'remove: says the files stay and other devices are not affected',
  );
  await looked(c, 'remove-confirm');
  await c.click('[data-testid=remove-cancel]');
  ok(await c.locator('[data-testid=confirm-remove]').isHidden(), 'remove: cancel changes nothing');
  await c.click('[data-testid=remove]');
  await c.click('[data-testid=remove-confirm]');
  await c.waitForSelector('[data-testid=empty]');
  ok(fake.files.has(`me/household:${id}/space.json`), 'remove: the file in the storage stays');
  await a.click('[data-testid=sync-now]');
  await a.waitForSelector('[data-testid=status][data-state=in-step]');
  ok(true, 'remove: the other devices are not affected');
  await C.context.close();

  // ---- The storage fails on purpose, and says so in words ----------------------------------
  await a.goto(`${origin}/#/spaces/${id}`);
  await waitTitle(a, 'Family B');
  const failed = async (what, sentence) => {
    await a.click('[data-testid=sync-now]');
    await a.waitForSelector('[data-testid=status][data-state=failed]');
    const text = await a.locator('[data-testid=status]').innerText();
    ok(
      sentence.every((part) => text.includes(part)),
      `failure: ${what} is told in words`,
    );
  };
  fake.fail.status = 500;
  await failed('a server error', [failure('server', 'github', 'HTTP 500')]);
  await looked(a, 'space-failed');
  fake.fail.status = 403;
  fake.fail.headers = {
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
  };
  await failed('a rate limit, with the time', t.failures.rateLimitedUntil('@@').split('@@'));
  fake.fail.status = 401;
  fake.fail.headers = {};
  await failed('a refused token', [failure('unauthorised')]);
  fake.fail.status = 404;
  await failed('a repository that is not found', [failure('not-found')]);
  delete fake.fail.status;
  await A.context.route(`${fake.origin}/**`, (route) => route.abort());
  await failed('a storage the page cannot reach', [failure('blocked')]);
  await A.context.unroute(`${fake.origin}/**`);
  await a.click('[data-testid=sync-now]');
  await a.waitForSelector('[data-testid=status][data-state=in-step]');
  ok(true, 'failure: after the storage is back, "Sync now" is in step again');
  await a.goto(`${origin}/`);
  await a.waitForSelector('[data-testid=space-card]');

  // ---- WebDAV ------------------------------------------------------------------------------
  await a.click('[data-testid=create-space]');
  await a.fill('[data-testid=name-input]', 'Garden');
  await a.click('[data-testid=next]');
  await a.click('[data-testid=type-webdav]');
  await a.fill('[data-testid=webdav-address]', 'http://dav.example/files/');
  await a.click('[data-testid=next]');
  ok(
    (await mainText(a)).includes(t.create.webdav.badAddress),
    'webdav: an address that is not https is refused in words',
  );
  await a.fill('[data-testid=webdav-address]', `${DAV}/files/`);
  await a.fill('[data-testid=webdav-user]', 'u');
  await a.fill('[data-testid=webdav-password]', 'wrong');
  await a.click('[data-testid=webdav-test]');
  await a.getByText(failure('unauthorised', 'webdav'), { exact: true }).waitFor();
  ok(true, 'webdav: a wrong password gives the "unauthorised" sentence of WebDAV');
  await looked(a, 'create-3-webdav-wrong');
  await a.fill('[data-testid=webdav-password]', 'p');
  await a.click('[data-testid=webdav-test]');
  await a.getByText(t.create.webdav.connected, { exact: true }).waitFor();
  ok(true, 'webdav: "Test connection" says it is connected');
  await a.click('[data-testid=next]');
  await a.waitForSelector('[data-testid=create]');
  ok(
    (await a.locator('[data-testid=summary-storage]').innerText()) === 'WebDAV: dav.example/files',
    'webdav: the storage in words, without the user name',
  );
  await a.click('[data-testid=create]');
  await waitTitle(a, 'Garden');
  const davId = spaceId(a);
  ok(
    [...dav.files.keys()].some((path) => path.includes(`${davId}/space.json`)),
    "webdav: the space's file is on the server",
  );
  await a.click('[data-testid=invite]');
  await a.check('[data-testid=include-access]');
  ok(
    (await a.locator('[data-testid=include-explain]').innerText()) === t.invite.includeWebdav,
    'invite: WebDAV says in words what the access gives',
  );
  const davLink = await a.locator('[data-testid=invite-link]').inputValue();
  ok(
    decodeInvite(davLink).access?.username === 'u',
    'invite: the WebDAV access is in the link when ticked',
  );
  await b.goto(davLink);
  await b.click('[data-testid=join]');
  await waitTitle(b, 'Garden');
  ok(spaceId(b) === davId, 'webdav: a second device joins with the access from the invite');

  // ---- Dark ---------------------------------------------------------------------------------
  if (shots) {
    await a.emulateMedia({ colorScheme: 'dark' });
    await a.goto(`${origin}/#/spaces/${id}/invite`);
    await a.waitForSelector('[data-testid=qr-box] svg');
    await looked(a, 'dark-invite');
    await a.goto(`${origin}/`);
    await a.waitForSelector('[data-testid=space-card]');
    await looked(a, 'dark-home');
  }

  // ---- The address of the API was never an input -----------------------------------------
  const apiLog = fake.log.filter((entry) => entry.token !== undefined);
  const tokens = [...Object.keys(TOKENS), WRONG];
  ok(
    fake.log.every(
      (entry) =>
        !tokens.some((token) => entry.path.includes(token) || entry.search.includes(token)),
    ),
    'no token was ever put into an address',
  );
  ok(
    apiLog.length > 10,
    `the tokens went to the fake API, in the Authorization header (${apiLog.length} requests)`,
  );
  await A.context.close();
  await B.context.close();
}

/**
 * A space on this device only (made the way an app makes it, see seed-entry.mjs): Home and its
 * page say so and send nothing, a storage is connected (a failing cycle first, which leaves the
 * space as it was), and a second device joins and reads the name.
 */
export async function deviceOnly(browser, run) {
  const { server, fake, t, texts, seed, locale, width, height, label, shots, problems } = run;
  const origin = server.origin;
  const ok = (value, what) => check(value, `${label}: device only: ${what}`);
  const make = () =>
    newDevice(browser, { origin, allowed: [origin, fake.origin], locale, problems, width, height });
  const looked = async (page, name) => {
    const found = await audit(page);
    ok(found.overflow <= 0, `${name}: no horizontal scroll (${found.overflow})`);
    ok(
      found.small.length === 0,
      `${name}: every tap target is at least 44 px (${found.small.join('; ')})`,
    );
    if (shots) await page.screenshot({ path: join(shots, `device-${name}.png`), fullPage: true });
  };
  const mainText = (page) => page.locator('main').innerText();
  const waitTitle = (page, text) =>
    page.waitForFunction((x) => document.querySelector('h1')?.textContent === x, text);
  const inPage = (page, call) => page.evaluate(`${seed}; ${call}`);
  const atSpace = (page, id) => page.waitForFunction((x) => location.hash === `#/spaces/${x}`, id);
  fake.files.clear();
  fake.log.length = 0;

  const D = await make();
  const d = D.page;
  await d.goto(`${origin}/`);
  await d.waitForSelector('[data-testid=empty]');
  const id = await inPage(d, '__seed.deviceOnlySpace("Pantry")');
  await d.reload();
  await d.waitForSelector('[data-testid=space-card]');
  const card = d.locator('[data-testid=space-card]');
  ok(
    (await card.locator('.name').innerText()) === 'Pantry' &&
      (await card.locator('[data-testid=card-storage]').innerText()) === t.storage.deviceOnly,
    `home: the card says "${t.storage.deviceOnly}" in place of a storage`,
  );
  ok(
    (await card.locator('[data-testid=status]').count()) === 0,
    'home: no sync state and no failure',
  );
  await looked(d, 'home');

  await card.click();
  await waitTitle(d, 'Pantry');
  ok(
    (await d.locator('[data-testid=storage-words]').innerText()) === t.storage.deviceOnly &&
      (await d.locator('[data-testid=device-only]').innerText()) === t.space.deviceOnlyText,
    'space: says the space and what the apps keep in it are on this device only',
  );
  ok(
    (await d.locator('[data-testid=sync-now]').count()) === 0 &&
      (await d.locator('[data-testid=invite]').count()) === 0 &&
      (await d.locator('[data-testid=change-access]').count()) === 0 &&
      (await d.locator('[data-testid=status]').count()) === 0,
    'space: no "Sync now", no invite, no storage access, no sync state',
  );
  ok(
    (await d.locator('[data-testid=connect-storage]').innerText()) === t.space.connect,
    `space: offers "${t.space.connect}"`,
  );
  await looked(d, 'space');

  await d.fill('[data-testid=rename-input]', 'Pantry 2');
  await d.click('[data-testid=rename]');
  await waitTitle(d, 'Pantry 2');
  await d.getByText(t.space.nameSaved, { exact: true }).waitFor();
  ok(
    (await d.locator('[data-testid=status]').count()) === 0 &&
      (await inPage(d, `__seed.look("${id}")`)).name === 'Pantry 2',
    'space: rename is saved on the device, without a cycle',
  );

  await d.click('[data-testid=remove]');
  ok(
    (await d.locator('[data-testid=confirm-remove]').innerText()).includes(
      t.space.removeDeviceOnlyText,
    ),
    'remove: says the data is deleted for good because no copy exists',
  );
  await looked(d, 'remove-confirm');
  await d.click('[data-testid=remove-cancel]');

  for (const route of ['invite', 'access']) {
    await d.goto(`${origin}/#/spaces/${id}/${route}`);
    await atSpace(d, id);
    await d.waitForSelector('[data-testid=connect-storage]');
    ok(true, `${route}: the route of a space without a storage leads to the space's page`);
  }
  ok(fake.log.length === 0, `nothing was sent anywhere so far (${fake.log.length} requests)`);

  // ---- Connect a storage --------------------------------------------------------------------
  await d.setViewportSize({ width: 320, height: 640 });
  await looked(d, 'space-at-320');
  await d.click('[data-testid=connect-storage]');
  await d.waitForSelector('[data-testid=type-github]');
  ok(
    (await d.locator('h1').innerText()) === t.connect.title &&
      (await d.locator('[data-testid=step-of]').innerText()) === t.create.stepOf(1, 3) &&
      (await d.locator('[data-testid=connect-intro]').innerText()) === t.connect.intro('Pantry 2'),
    'connect: three steps, starting with the storage; no name is asked for',
  );
  await looked(d, 'connect-1-storage-at-320');
  await d.setViewportSize({ width, height });
  await d.click('[data-testid=type-github]');
  ok(
    (await d.locator('ol.steps li').count()) === 4 &&
      (await d.locator('[data-testid=step-of]').innerText()) === t.create.stepOf(2, 3),
    "connect: GitHub's guided steps are those of Create a space",
  );
  await d.fill('[data-testid=token-input]', WRONG);
  await d.click('[data-testid=next]');
  await d
    .locator('[data-testid=github-message]')
    .getByText(texts.failureText(t, { failure: 'unauthorised' }, 'github'), { exact: true })
    .waitFor();
  ok(true, 'connect: a wrong token gives the "unauthorised" sentence');
  await d.fill('[data-testid=token-input]', MAIN);
  await d.click('[data-testid=next]');
  await d.waitForSelector('[data-testid=connect]');
  ok(
    (await d.locator('[data-testid=summary-name]').innerText()) === 'Pantry 2' &&
      (await d.locator('[data-testid=summary-storage]').innerText()) === 'GitHub: me/household',
    'connect: the summary names the space and the storage',
  );
  await looked(d, 'connect-3-finish');

  // The cycle fails: the space is as it was.
  await D.context.route(`${fake.origin}/repos/*/*/contents/**`, (route) => route.abort());
  await d.click('[data-testid=connect]');
  await d
    .locator('[data-testid=finish-message]')
    .getByText(t.connect.failedTitle, { exact: true })
    .waitFor();
  const failedText = await d.locator('[data-testid=finish-message]').innerText();
  ok(
    failedText.includes(texts.failureText(t, { failure: 'blocked' }, 'github')) &&
      failedText.includes(t.connect.failedHint),
    'connect: a failing cycle is told in words, with what happens to the space',
  );
  await looked(d, 'connect-3-failed');
  const after = await inPage(d, `__seed.look("${id}")`);
  ok(
    after.storage?.type === 'device' &&
      after.storage.access === undefined &&
      after.stock.join() === 'gin',
    'connect: after the failure the space is on this device only again, without the token, with its data',
  );
  await D.context.unroute(`${fake.origin}/repos/*/*/contents/**`);

  await d.click('[data-testid=connect]');
  await atSpace(d, id);
  await waitTitle(d, 'Pantry 2');
  ok(
    (await d.locator('[data-testid=space-messages]').innerText()) ===
      t.space.connected('GitHub: me/household'),
    'connect: the space page says it is kept in step now and to open the apps once',
  );
  ok(
    (await d.locator('[data-testid=storage-words]').innerText()) === 'GitHub: me/household' &&
      (await d.locator('[data-testid=status]').getAttribute('data-state')) === 'in-step' &&
      (await d.locator('[data-testid=sync-now]').count()) === 1 &&
      (await d.locator('[data-testid=connect-storage]').count()) === 0,
    'connect: the space is an ordinary one now: storage, state, "Sync now"',
  );
  ok(
    fake.files.has(`me/household:${id}/space.json`),
    'connect: the same id is used for the file in the repository',
  );
  ok(
    (await inPage(d, `__seed.look("${id}")`)).stock.join() === 'gin',
    'connect: what the app kept in the space is still there',
  );
  const dump = await everything(d);
  ok(
    !dump.includes(MAIN),
    'connect: the token is not in the address, storage, page text or fields',
  );
  await looked(d, 'space-connected');
  await d.goto(`${origin}/#/spaces/${id}/connect`);
  await atSpace(d, id);
  await d.waitForSelector('[data-testid=sync-now]');
  ok(true, "connect: the route of a space that has a storage leads to the space's page");

  // ---- A second device joins and reads the name ----------------------------------------------
  await d.click('[data-testid=invite]');
  await d.check('[data-testid=include-access]');
  const link = await d.locator('[data-testid=invite-link]').inputValue();
  const E = await make();
  const e = E.page;
  await e.goto(link);
  await e.click('[data-testid=join]');
  await atSpace(e, id);
  await waitTitle(e, 'Pantry 2');
  ok(
    (await mainText(e)).includes(t.space.joined('Pantry 2')),
    'a second device joins the connected space and reads the name given on this device only',
  );
  await e.fill('[data-testid=rename-input]', 'Larder');
  await e.click('[data-testid=rename]');
  await e.waitForSelector('[data-testid=status][data-state=in-step]');
  await d.goto(`${origin}/#/spaces/${id}`);
  await waitTitle(d, 'Pantry 2');
  await d.click('[data-testid=sync-now]');
  await waitTitle(d, 'Larder');
  ok(true, 'sync: the first device reads the name the second gave');
  await D.context.close();
  await E.context.close();
}

/** A 320 px walk over the screens that have a form, for overflow and tap targets. */
export async function narrow(browser, run) {
  const { server, fake, t, locale, problems, label } = run;
  const origin = server.origin;
  const { context, page } = await newDevice(browser, {
    origin,
    allowed: [origin, fake.origin],
    locale,
    problems,
    width: 320,
    height: 640,
  });
  const walk = async (hash, selector, name) => {
    await page.goto(`${origin}/${hash}`);
    await page.waitForSelector(selector);
    const found = await audit(page);
    check(
      found.overflow <= 0,
      `${label} at 320: ${name}: no horizontal scroll (${found.overflow})`,
    );
    check(
      found.small.length === 0,
      `${label} at 320: ${name}: every tap target is at least 44 px (${found.small.join('; ')})`,
    );
  };
  await walk('', '[data-testid=empty]', 'home');
  await walk('#/join/AAAA', 'h2', 'a bad invite');
  await page.goto(`${origin}/#/spaces/new`);
  await page.fill('[data-testid=name-input]', 'Narrow');
  const steps = async (name) => {
    const found = await audit(page);
    check(
      found.overflow <= 0,
      `${label} at 320: create ${name}: no horizontal scroll (${found.overflow})`,
    );
    check(
      found.small.length === 0,
      `${label} at 320: create ${name}: every tap target is at least 44 px (${found.small.join('; ')})`,
    );
  };
  await steps('name');
  await page.click('[data-testid=next]');
  await steps('storage');
  await page.click('[data-testid=type-github]');
  await steps('github');
  await page.fill('[data-testid=token-input]', READONLY);
  await page.click('[data-testid=next]');
  await page.getByText(t.create.github.noneWritable, { exact: true }).waitFor();
  await steps('github with a message');
  await page.click('[data-testid=back]');
  await page.click('[data-testid=type-webdav]');
  await steps('webdav');
  await context.close();
}

export const makeShots = (dir) => {
  mkdirSync(dir, { recursive: true });
  return dir;
};
