// `npm run e2e`: build, serve dist/, run the browser checks. Exit code 1 on any failure.
// Chromium: PLAYWRIGHT_CHROMIUM_PATH when set, otherwise Playwright's own.
import { components } from './components.mjs';
import { buildApp, check, distDir, failureCount, launch } from './harness.mjs';
import { install } from './install.mjs';
import { ratios } from './ratios.mjs';
import { serve } from './serve.mjs';
import { smoke } from './smoke.mjs';
import { store } from './store.mjs';

buildApp();
const server = await serve(distDir);
const subServer = await serve(distDir, '/apps/cook/');
const browser = await launch();
try {
  await smoke(browser, server, subServer);
  await ratios(browser, server);
  await components(browser, server);
  await install(browser, server);
  await store(browser, server);
} catch (error) {
  check(false, `e2e aborted: ${error.message}`);
} finally {
  await browser.close();
  await server.close();
  await subServer.close();
}
console.log(failureCount() === 0 ? 'e2e passed' : `e2e failed: ${failureCount()} check(s)`);
process.exit(failureCount() === 0 ? 0 : 1);
