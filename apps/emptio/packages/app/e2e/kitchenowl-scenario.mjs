// Stage 5 of a run: the shown space connected to a KitchenOwl server. The server is a fake in
// the test (Playwright answers the requests to https://ko.example, with the CORS headers a
// household's reverse proxy would add). The settings check the address and token, offer the
// list, connect; what is on either list appears on the other; disconnecting offers Undo. What
// this does not prove: a real KitchenOwl server, a real reverse proxy and its CORS headers.
import { newDevice } from '@nexumia-de/hospes/testing/browser';
import { add, ok, openApp, rows, said, tapAudit } from './driver.mjs';

const KO = 'https://ko.example';
const TOKEN = 'llt-test';

/** A KitchenOwl list in memory behind the routes the app calls. */
async function fakeKitchenowl(context, origin) {
  const items = new Map([[100, { name: 'Bread', description: 'whole grain', created_at: 't1' }]]);
  let next = 101;
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };
  await context.route(`${KO}/**`, async (route) => {
    const request = route.request();
    const json = (status, body) =>
      route.fulfill({
        status,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (request.headers().authorization !== `Bearer ${TOKEN}`) return json(401, { msg: 'no' });
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? JSON.parse(request.postData()) : {};
    if (path === '/api/household') return json(200, [{ id: 1, name: 'Home' }]);
    if (path === '/api/household/1/shoppinglist') return json(200, [{ id: 7, name: 'Groceries' }]);
    if (path === '/api/shoppinglist/7/items') {
      return json(
        200,
        [...items].map(([id, item]) => ({ id, ...item })),
      );
    }
    if (path === '/api/shoppinglist/7/add-item-by-name') {
      const id = next++;
      items.set(id, { name: body.name, description: body.description ?? '', created_at: `t${id}` });
      return json(200, { id, name: body.name });
    }
    if (path === '/api/shoppinglist/7/item' && request.method() === 'DELETE') {
      items.delete(body.item_id);
      return json(200, { msg: 'DONE' });
    }
    return json(404, {});
  });
  return items;
}

export async function kitchenowlStage(run) {
  const { browser, server, width, height, locale, problems, t } = run;
  const k = t.kitchenowl;
  const { context, page } = await newDevice(browser, {
    origin: server.origin,
    allowed: [server.origin, KO],
    locale,
    width,
    height,
    problems,
  });
  page.setDefaultTimeout(8_000);
  const items = await fakeKitchenowl(context, server.origin);
  try {
    await openApp(page, server.origin);
    await add(page, t, 'Milk', { amount: '2 l' });
    await page.goto(`${server.origin}/#/settings`);
    await page.waitForSelector('#kitchenowl-address');

    await page.locator('#kitchenowl-address').fill('ko.example');
    await page.getByRole('button', { name: k.check, exact: true }).click();
    await ok(run, 'kitchenowl: an address without https:// is refused', async () =>
      (await page.getByRole('alert').allInnerTexts()).includes(k.badAddress),
    );
    await page.locator('#kitchenowl-address').fill(KO);
    await page.locator('#kitchenowl-token').fill('wrong');
    await page.getByRole('button', { name: k.check, exact: true }).click();
    await ok(run, 'kitchenowl: a wrong token is named', async () => {
      await page.getByText(k.failures.unauthorized, { exact: false }).waitFor();
      return true;
    });

    await page.locator('#kitchenowl-token').fill(TOKEN);
    await page.getByRole('button', { name: k.check, exact: true }).click();
    await page.locator('#kitchenowl-list option').first().waitFor({ state: 'attached' });
    await ok(run, 'kitchenowl: the list of the household is offered', async () =>
      (await page.locator('#kitchenowl-list').innerText()).includes('Groceries'),
    );
    await ok(run, 'kitchenowl: the form has no tap target under 44 px, no overflow', async () => {
      const a = await tapAudit(page);
      if (a.small.length || a.overflow > 0) console.log('     ', JSON.stringify(a));
      return a.small.length === 0 && a.overflow <= 0;
    });
    await page.getByRole('button', { name: k.connect, exact: true }).click();
    await page.getByText(k.connected('Groceries', KO)).waitFor();
    await ok(run, 'kitchenowl: connected, and the first cycle went through', async () => {
      await page.waitForFunction(
        (wanted) =>
          [...document.querySelectorAll('p')].some((p) => p.textContent.startsWith(wanted)),
        k.status.inStep('').trim(),
      );
      return true;
    });
    await ok(run, 'kitchenowl: Milk went to KitchenOwl with its amount', async () =>
      [...items.values()].some((i) => i.name === 'Milk' && i.description === '2 l'),
    );
    await openApp(page, server.origin);
    await ok(run, 'kitchenowl: Bread came from KitchenOwl with its amount', async () => {
      await page.waitForSelector('.entry-name:has-text("Bread")');
      return (await rows(page)).some((r) => r.name === 'Bread' && r.amount.includes('whole grain'));
    });

    await page.goto(`${server.origin}/#/settings`);
    await page.getByRole('button', { name: k.disconnect, exact: true }).click();
    await said(page, k.disconnected);
    await ok(run, 'kitchenowl: disconnected, the form is back and the list stays', async () =>
      page.locator('#kitchenowl-address').isVisible(),
    );
  } finally {
    await context.close();
  }
}
