// `npm run interact -w @culina/linux`: drives the native app through GTK's Broadway backend with
// Playwright and checks the result in the data files. Broadway draws a canvas, so the widgets
// are clicked by coordinates in a 360x720 viewport (found in screenshots) and every step is
// verified in the JSON files of CULINA_DATA_DIR or by how much of the screen changed.
// SHOTS=<folder> keeps a screenshot per step. Run with PLAYWRIGHT_CHROMIUM_PATH set when
// Chromium is not Playwright's own. Needs gjs, gtk4-broadwayd, dbus-daemon and gdbus
// (docs/native-linux.md).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Session, sleep, stopAll } from '@nexumia-de/gjs/tooling/interact-lib';
import { createAndLeave } from '@nexumia-de/gjs/tooling/interact-spaces';
import { difference } from '@nexumia-de/gjs/tooling/interact-pixels';
import { bundleApp, bundleAppWith } from './interact-build.mjs';

const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const root = mkdtempSync(join(tmpdir(), 'culina-interact-data-'));
let failed = 0;
const say = (kind, text) => console.log(`${kind} ${text}`);
const check = (good, text, detail = '') => {
  if (!good) failed++;
  say(good ? 'ok  ' : 'FAIL', detail && !good ? `${text} (${detail})` : text);
  return good;
};

// Coordinates at 360x720, from the screenshots (Cook as of 2026-11-23: 01-start, 11-cook-have,
// 12-order-open, 21-empty-have).
const BAR_BUTTON = [180, 681];
const BACK_ARROW = [23, 22];
// Cook: the filter row, the switch "Only with what I have", the order row and its popover's
// "Use up first", the first dish below the count, and "Tick what is there" with nothing ticked.
const FILTER_ROW = [180, 85];
const HAVE_SWITCH = [311, 140];
const ORDER_ROW = [180, 194];
const USE_UP = [259, 295];
const FIRST_DISH = [180, 325];
const TICK_WHAT = [180, 529];
const PLUS = [312, 150];
const COOK_BACK = [57, 675];
const COOK_NEXT = [240, 675];
const FIRST_SWITCH = [311, 176];
const SEARCH = [180, 690];
const UNDO = [268, 672];
const FIRST_RESULT_SWITCH = [311, 126];

const seed = (name, lang = 'en') => {
  const dir = join(root, name);
  const run = spawnSync(process.execPath, [join(import.meta.dirname, 'seed.mjs'), dir, lang], {
    encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(`seed failed: ${run.stderr}`);
  return dir;
};
const records = (dir) => {
  const file = readdirSync(dir).find((f) => f.endsWith('.stock.json'));
  return file ? JSON.parse(readFileSync(join(dir, file), 'utf8')).records : [];
};
const present = (dir) => records(dir).filter((r) => !r.deleted && r.value?.present === true);
/** Cook's kept choices in the preferences file (the web app's key), or undefined. */
const cookList = (dir) => {
  try {
    const kept = JSON.parse(readFileSync(join(dir, 'prefs.json'), 'utf8'))['culina.cookList'];
    return kept === undefined ? undefined : JSON.parse(kept);
  } catch {
    return undefined;
  }
};
const shotName = (name) => join(shots ?? root, `${name}.png`);
const forAScreen = (width, height, dir, file, lang = 'en') =>
  new Session({
    appId: 'de.nexumia.Culina',
    dataEnv: 'CULINA_DATA_DIR',
    gjsFile: file,
    dataDir: dir,
    width,
    height,
    lang,
  });
/** Takes a screenshot and says how much of the screen differs from an earlier one. */
const changedSince = async (s, earlier, name) => {
  const now = shotName(name);
  await s.shot(now);
  return difference(s, earlier, now);
};
/** A line of the app's own log that names a defect (JS errors, GTK criticals). */
const defects = (s) =>
  s.log
    .split('\n')
    .filter((line) => /CRITICAL|JS ERROR|Unhandled|TypeError|ReferenceError/.test(line));

async function main() {
  const gjsFile = await bundleApp();

  // Cook: the list of every dish, the filter row, a dish, its portions, cooking step by step and the way back.
  const flow = seed('flow');
  check(present(flow).length === 9, 'the recorded kitchen has 9 things at hand');
  check(
    records(flow).some((r) => typeof r.value?.bestBefore === 'string'),
    'one of them has a use-by date, as the web app writes it',
  );
  {
    const s = forAScreen(360, 720, flow, gjsFile);
    try {
      await s.start();
      const start = shotName('01-start');
      await s.shot(start);

      await s.click(...FILTER_ROW);
      check(
        (await changedSince(s, start, '02-filter-open')) > 0.05,
        'the filter row opens its choices',
      );
      await s.click(...FILTER_ROW);
      check(
        (await changedSince(s, start, '02-filter-closed')) < 0.002,
        'and closes again to the list as it was',
      );
      await s.click(...FIRST_DISH);
      const dish = shotName('03-dish');
      check((await changedSince(s, start, '03-dish')) > 0.1, 'a dish opens its page');
      await s.click(...PLUS);
      check(
        (await changedSince(s, dish, '04-more-portions')) > 0.0005,
        'one more portion changes the amounts',
      );
      await s.click(...BAR_BUTTON);
      const step1 = shotName('05-step-1');
      check(
        (await changedSince(s, dish, '05-step-1')) > 0.1,
        'Cook step by step opens the first step',
      );
      await s.click(...COOK_NEXT);
      check((await changedSince(s, step1, '06-step-2')) > 0.01, 'Next shows the next step');
      await s.click(...COOK_BACK);
      check(
        (await changedSince(s, step1, '07-step-1-again')) < 0.02,
        'Back shows the first step again (the buttons may differ in hover)',
      );
      await s.click(...BACK_ARROW);
      await s.click(...BACK_ARROW);
      check(
        (await changedSince(s, start, '08-back-to-list')) < 0.002,
        'the back button returns to the list as it was',
      );
      check(defects(s).length === 0, 'no error in the app log', defects(s).join(' | '));
    } finally {
      await s.stop();
    }
  }

  // Cook's switch and order, the stock from Cook and back, and the stock itself: a switch writes
  // the collection, Undo takes it back, a search finds more.
  const dir = seed('stock');
  {
    const s = forAScreen(360, 720, dir, gjsFile);
    try {
      await s.start();
      const start = shotName('10-start');
      await s.shot(start);
      check(cookList(dir) === undefined, 'opening Cook keeps no choice');
      await s.click(...HAVE_SWITCH);
      await sleep(600);
      const have = shotName('11-cook-have');
      check(
        (await changedSince(s, start, '11-cook-have')) > 0.05,
        'Only with what I have narrows the list',
      );
      check(cookList(dir)?.have === true, 'and is kept under culina.cookList');
      await s.click(...ORDER_ROW);
      await sleep(600);
      await s.shot(shotName('12-order-open'));
      await s.click(...USE_UP);
      await sleep(600);
      check(
        (await changedSince(s, have, '13-cook-have-use-up')) > 0.02,
        'Use up first names the dated item under each dish that uses it',
      );
      check(
        cookList(dir)?.order === 'use-up' && cookList(dir)?.have === true,
        'the order is kept, and the switch with it',
      );
      await s.click(...HAVE_SWITCH);
      await sleep(600);
      const all = shotName('14-cook-use-up-all');
      check(
        (await changedSince(s, have, '14-cook-use-up-all')) > 0.05,
        'the switch off shows every dish again, the dated ones first',
      );
      check(cookList(dir)?.have === false, 'the switch off is kept');
      await s.click(...BAR_BUTTON);
      check(
        (await changedSince(s, all, '15-stock')) > 0.1,
        'What is there in the bottom bar opens the stock',
      );
      await s.click(...BACK_ARROW);
      check(
        (await changedSince(s, all, '16-back-to-cook')) < 0.002,
        'the back button returns to Cook as it was',
      );
      check(present(dir).length === 9, 'looking at Cook and the stock writes no stock record');
      await s.click(...BAR_BUTTON);
      await sleep(600);
      await s.click(...FIRST_SWITCH);
      await sleep(600);
      check(present(dir).length === 8, 'a switch marks a thing out: one record fewer at hand');
      check(
        records(dir).some((r) => r.value?.present === false),
        'the record stays, with present false',
      );
      await s.shot(shotName('17-unticked'));
      await s.click(...UNDO);
      await sleep(600);
      check(present(dir).length === 9, 'Undo marks it in again');
      await s.click(...SEARCH);
      await s.type('cheese');
      await sleep(1200);
      await s.shot(shotName('18-search'));
      await s.click(...FIRST_RESULT_SWITCH);
      await sleep(600);
      check(present(dir).length === 10, 'a switch in the search results marks a thing in');
      check(defects(s).length === 0, 'no error in the app log', defects(s).join(' | '));
    } finally {
      await s.stop();
    }
  }
  {
    // After a restart the stock is as it was left.
    const s = forAScreen(360, 720, dir, gjsFile);
    const was = present(dir).length;
    try {
      await s.start();
      await s.shot(shotName('19-after-restart'));
      check(
        cookList(dir)?.order === 'use-up' && cookList(dir)?.have === false,
        'Cook opens with the kept choices',
      );
      await s.click(...BAR_BUTTON);
      await s.shot(shotName('19-after-restart-stock'));
      check(present(dir).length === was, 'a restart changes nothing in the data');
    } finally {
      await s.stop();
    }
  }

  // No stock at all: Only with what I have explains itself and leads to the stock, and looking
  // writes nothing.
  {
    const empty = join(root, 'empty');
    const s = forAScreen(360, 720, empty, gjsFile);
    try {
      await s.start();
      const start = shotName('20-empty');
      await s.shot(start);
      await s.click(...HAVE_SWITCH);
      await sleep(600);
      const explained = shotName('21-empty-have');
      check(
        (await changedSince(s, start, '21-empty-have')) > 0.1,
        'without stock the switch shows an explanation, not an empty list',
      );
      await s.click(...TICK_WHAT);
      check(
        (await changedSince(s, explained, '22-empty-tick-what')) > 0.1,
        'Tick what is there opens the stock',
      );
      check(records(empty).length === 0, 'looking writes no record');
    } finally {
      await s.stop();
    }
  }

  // German, a dish, preferences and About through the app actions.
  {
    const s = forAScreen(360, 720, seed('de', 'de'), gjsFile, 'de');
    try {
      await s.start();
      await s.shot(shotName('30-german'));
      await s.click(...FIRST_DISH);
      await s.shot(shotName('31-german-dish'));
      s.activate('preferences');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('32-preferences'));
      await s.page.keyboard.press('Escape');
      await sleep(600);
      s.activate('about');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('33-about'));
      check(defects(s).length === 0, 'no error in the app log', defects(s).join(' | '));
    } finally {
      await s.stop();
    }
  }

  // Spaces: create a space in the preferences (a fake GitHub on localhost, compiled in as the
  // address), then leave it; the steps are the shared ones of the native apps. Coordinates at
  // 360x720: the preferences are a bottom sheet whose top follows its content.
  await createAndLeave({
    dir: seed('spaces'),
    collection: 'stock',
    bundleWith: (api) => bundleAppWith(api, join(root, 'with-fake-github.js')),
    session: (dir, file) => forAScreen(360, 720, dir, file),
    shot: (name) => (shots ? shotName(name) : undefined),
    check,
    at: {
      createRow: [180, 500],
      repository: [150, 488],
      token: [150, 543],
      create: [180, 681],
      leaveSecond: [301, 441],
      cancel: [104, 477],
      confirm: [254, 477],
      leaveFirst: [301, 442],
      confirmShort: [254, 443],
    },
  });

  // Desktop size: Cook with the switch off and on, and a dish. The switch and the first dish are
  // at the same height as on a phone; the column is centred (at most 600 px wide).
  {
    const s = forAScreen(1000, 700, seed('wide'), gjsFile);
    try {
      await s.start();
      const wide = shotName('40-wide-start');
      await s.shot(wide);
      await s.click(751, HAVE_SWITCH[1]);
      await sleep(600);
      check(
        (await changedSince(s, wide, '41-wide-have')) > 0.02,
        '1000x700: the switch narrows the list',
      );
      await s.click(500, FIRST_DISH[1]);
      await s.shot(shotName('42-wide-dish'));
      say(
        'ok  ',
        '1000x700: Cook and a dish were drawn (look at 40 to 42; not judged by the script)',
      );
    } finally {
      await s.stop();
    }
  }

  say(
    'skip ',
    'swipe back, on-screen keyboard, screen kept on and a real compositor cannot be driven through Broadway',
  );
}

try {
  await main();
} catch (error) {
  failed++;
  console.error(error);
} finally {
  await stopAll();
  rmSync(root, { recursive: true, force: true });
}
process.exit(failed === 0 ? 0 : 1);
