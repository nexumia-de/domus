// A host that redirects `index.html` to its folder (Cloudflare's static assets do): with the
// service worker in control, the start page, `index.html` itself and an unknown path still open.
import { check, watch } from './harness.mjs';
import { controlled } from './smoke.mjs';

export const hostRedirect = async (browser, server) => {
  const label = 'index.html redirect';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const ratios = () =>
    page.getByRole('heading', { level: 1, name: 'What do you want to cook?' }).waitFor();
  const plain = await context.request.get(`${server.url}index.html`, { maxRedirects: 0 });
  check(plain.status() === 307, `${label}: the test host answers index.html with 307`);
  await page.goto(server.url);
  await ratios();
  await controlled(page);
  for (const path of ['', 'index.html', 'no-such-page']) {
    let opened = true;
    try {
      await page.goto(server.url + path);
      await ratios();
    } catch (error) {
      opened = String(error.message).split('\n')[0];
    }
    check(opened === true, `${label}: "/${path}" opens under the service worker (${opened})`);
  }
  await context.setOffline(true);
  await page.goto(`${server.url}index.html#/settings`);
  await page.getByRole('heading', { level: 1, name: 'Settings' }).waitFor();
  check(true, `${label}: offline, index.html opens from the cache`);
  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};
