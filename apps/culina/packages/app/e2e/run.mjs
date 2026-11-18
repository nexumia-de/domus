// `npm run e2e`: build, serve dist/, run the browser checks. Exit code 1 on any failure.
// Chromium: PLAYWRIGHT_CHROMIUM_PATH when set, otherwise Playwright's own.
import { buildApp, check, distDir, failureCount, launch } from './harness.mjs';
import { install } from './install.mjs';
import { serve } from './serve.mjs';
import { smoke } from './smoke.mjs';

buildApp();
const server = await serve(distDir);
const subServer = await serve(distDir, '/apps/cook/');
const browser = await launch();
try {
  await smoke(browser, server, subServer);
  await install(browser, server);
} catch (error) {
  check(false, `e2e aborted: ${error.message}`);
} finally {
  await browser.close();
  await server.close();
  await subServer.close();
}
console.log(failureCount() === 0 ? 'e2e passed' : `e2e failed: ${failureCount()} check(s)`);
process.exit(failureCount() === 0 ? 0 : 1);
