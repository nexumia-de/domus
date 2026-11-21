// `npm run e2e`: build, serve dist/, run the browser checks. Exit code 1 on any failure.
// Chromium: PLAYWRIGHT_CHROMIUM_PATH when set, otherwise Playwright's own. E2E_WIDE_FONT=1: DejaVu Sans
// as the system font (see harness.mjs).
import { catalogue } from './catalogue.mjs';
import { classics } from './classics.mjs';
import { classicsFinder } from './classics-finder.mjs';
import { components } from './components.mjs';
import { cook } from './cook.mjs';
import { dishCook } from './dish-cook.mjs';
import { dishCharacters } from './dish-characters.mjs';
import { dishSwap } from './dish-swap.mjs';
import { editor } from './editor.mjs';
import { editorMore } from './editor-more.mjs';
import { exportImport } from './export-import.mjs';
import { german } from './german.mjs';
import { buildApp, check, distDir, failureCount, launch } from './harness.mjs';
import { hostRedirect } from './host-redirect.mjs';
import { importCatalogue } from './import-catalogue.mjs';
import { install } from './install.mjs';
import { mealPrep } from './meal-prep.mjs';
import { navigation } from './navigation.mjs';
import { ratios } from './ratios.mjs';
import { serve } from './serve.mjs';
import { smoke } from './smoke.mjs';
import { stepsKit } from './steps-kit.mjs';
import { stock } from './stock.mjs';
import { store } from './store.mjs';
import { versions } from './versions.mjs';

buildApp();
const server = await serve(distDir);
const subServer = await serve(distDir, '/apps/cook/');
const redirectServer = await serve(distDir, '/', { redirectIndex: true });
const browser = await launch();
try {
  await smoke(browser, server, subServer);
  await ratios(browser, server);
  await components(browser, server);
  await hostRedirect(browser, redirectServer);
  await editor(browser, server);
  await editorMore(browser, server);
  await stepsKit(browser, server);
  await mealPrep(browser, server);
  await dishCook(browser, server);
  await dishSwap(browser, server);
  await dishCharacters(browser, server);
  await catalogue(browser, server);
  await install(browser, server);
  await store(browser, server);
  await versions(browser, server);
  await exportImport(browser, server);
  await stock(browser, server);
  await cook(browser, server);
  await classics(browser, server);
  await classicsFinder(browser, server);
  await importCatalogue(browser, server);
  await german(browser, server);
  await navigation(browser, server);
} catch (error) {
  check(false, `e2e aborted: ${error.message}`);
} finally {
  await browser.close();
  await server.close();
  await subServer.close();
  await redirectServer.close();
}
console.log(failureCount() === 0 ? 'e2e passed' : `e2e failed: ${failureCount()} check(s)`);
process.exit(failureCount() === 0 ? 0 : 1);
