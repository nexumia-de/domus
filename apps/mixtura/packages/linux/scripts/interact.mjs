// `npm run interact -w @mixtura/linux`: drives the native app through GTK's Broadway
// backend with Playwright and checks the result in the data files. Broadway draws a
// canvas, so the widgets are clicked by coordinates in a 360x720 viewport (found in
// screenshots) and every step is verified in the JSON files of MIXTURA_DATA_DIR.
// SHOTS=<folder> keeps a screenshot per step. Run with PLAYWRIGHT_CHROMIUM_PATH set
// when Chromium is not Playwright's own. Needs gjs, gtk4-broadwayd, dbus-daemon and gdbus
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
const root = mkdtempSync(join(tmpdir(), 'mixtura-interact-data-'));
let failed = 0;
const say = (kind, text) => console.log(`${kind} ${text}`);
const check = (good, text, detail = '') => {
  if (!good) failed++;
  say(good ? 'ok  ' : 'FAIL', detail && !good ? `${text} (${detail})` : text);
  return good;
};

// Coordinates at 360x720, from the screenshots.
const SEARCH = [100, 686];
const ONLY = [246, 686];
const BOTTLES = [322, 686];
const FIRST_ROW = [180, 125];
const BACK = [23, 28];
const CLEAR_ALL = [208, 32];
const FIRST_GROUP = [180, 105];
const FIRST_SWITCH = [311, 160];
const UNDO = [268, 672];

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
const record = (dir, key) => records(dir).find((r) => r.key === key);
const shotName = (name) => join(shots ?? root, `${name}.png`);
const forAScreen = (width, height, dir, file, lang = 'en') =>
  new Session({
    appId: 'de.nexumia.Mixtura',
    dataEnv: 'MIXTURA_DATA_DIR',
    gjsFile: file,
    dataDir: dir,
    width,
    height,
    lang,
  });
/** Takes a screenshot and says how much of the list area differs from an earlier one. */
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

  // The drinks, the filter, a drink and the way back.
  const flow = seed('flow');
  const bar = present(flow).length;
  check(bar === 14, 'the recorded bar has 14 bottles at hand', `${bar}`);
  check(record(flow, 'campari')?.value?.present === true, 'Campari is a stock value of the bar');
  {
    const s = forAScreen(360, 720, flow, gjsFile);
    try {
      await s.start();
      const start = shotName('01-drinks');
      await s.shot(start);

      await s.click(...ONLY);
      check(
        (await changedSince(s, start, '02-can-make')) > 0.1,
        'the filter button shows only what the bottles allow (the list changes)',
      );
      await s.click(...ONLY);
      check(
        (await changedSince(s, start, '02-all-again')) < 0.002,
        'pressing it again shows every drink again',
      );

      await s.click(...FIRST_ROW);
      check((await changedSince(s, start, '03-drink')) > 0.05, 'tapping a drink pushes its page');
      await s.click(...BACK);
      check(
        (await changedSince(s, start, '04-back')) < 0.002,
        'the back button returns to the list as it was',
      );

      await s.click(...SEARCH);
      await s.type('negroni');
      await sleep(800);
      check(
        (await changedSince(s, start, '05-search')) > 0.05,
        'typing in the search narrows the list',
      );
      await s.click(...FIRST_ROW);
      await s.shot(shotName('06-negroni'));
      check(defects(s).length === 0, 'no error in the app log', defects(s).join(' | '));
    } finally {
      await s.stop();
    }
  }

  // Marking bottles writes the collection `stock`, clearing and Undo, searching.
  const dir = seed('bottles');
  let before;
  {
    const s = forAScreen(360, 720, dir, gjsFile);
    try {
      await s.start();
      await s.click(...BOTTLES);
      before = shotName('10-bottles');
      await s.shot(before);
      await s.click(...FIRST_GROUP);
      await s.shot(shotName('11-group'));
      await s.click(...FIRST_SWITCH);
      await sleep(500);
      const first = present(dir).length;
      check(first === bar + 1, 'a switch marks a bottle: one more record at hand', `${first}`);
      await s.shot(shotName('12-marked'));
      await s.click(...FIRST_SWITCH);
      await sleep(500);
      check(
        present(dir).length === bar,
        'the switch again marks it out (the record stays, absent)',
      );
      check(
        records(dir).some((r) => r.value?.present === false),
        'a bottle marked out keeps its record with present false',
      );

      await s.click(...CLEAR_ALL);
      await sleep(500);
      check(present(dir).length === 0, 'Clear all marks every bottle out at once');
      await s.shot(shotName('13-cleared'));
      await s.click(...UNDO);
      await sleep(600);
      check(present(dir).length === bar, 'Undo marks them in again', `${present(dir).length}`);

      await s.click(...SEARCH);
      await s.type('gin');
      await sleep(800);
      await s.shot(shotName('14-search'));
      await s.click(180, 125);
      await sleep(500);
      check(
        present(dir).length !== bar,
        'a switch in the search results marks a bottle too',
        `${present(dir).length}`,
      );
      check(defects(s).length === 0, 'no error in the app log', defects(s).join(' | '));
    } finally {
      await s.stop();
    }
  }
  {
    // After a restart the bottles are as they were left.
    const s = forAScreen(360, 720, dir, gjsFile);
    const was = present(dir).length;
    try {
      await s.start();
      await s.click(...BOTTLES);
      await s.shot(shotName('15-after-restart'));
      check(present(dir).length === was, 'a restart changes nothing in the data');
    } finally {
      await s.stop();
    }
  }

  // No stock at all: the filter explains itself and leads to the bottles.
  {
    const empty = join(root, 'empty');
    const s = forAScreen(360, 720, empty, gjsFile);
    try {
      await s.start();
      const start = shotName('20-empty');
      await s.shot(start);
      await s.click(...ONLY);
      check(
        (await changedSince(s, start, '21-empty-only')) > 0.1,
        'without bottles the filter shows an explanation, not an empty list',
      );
      await s.click(180, 400);
      check(
        (await changedSince(s, start, '22-empty-bottles')) > 0.1,
        'its button opens the bottles',
      );
      check(records(empty).length === 0, 'looking writes no record');
    } finally {
      await s.stop();
    }
  }

  // German, preferences and About through the app actions.
  {
    const s = forAScreen(360, 720, seed('de', 'de'), gjsFile, 'de');
    try {
      await s.start();
      await s.shot(shotName('30-german'));
      s.activate('preferences');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('31-preferences'));
      await s.page.keyboard.press('Escape');
      await sleep(600);
      s.activate('about');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('32-about'));
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
      repository: [150, 433],
      token: [150, 488],
      create: [180, 681],
      leaveSecond: [301, 466],
      cancel: [104, 477],
      confirm: [254, 477],
      leaveFirst: [301, 442],
      confirmShort: [254, 443],
    },
  });

  // Desktop size, one screenshot.
  {
    const s = forAScreen(1000, 700, seed('wide'), gjsFile);
    try {
      await s.start();
      await s.shot(shotName('40-wide-drinks'));
      say(
        'ok  ',
        '1000x700: the drinks were drawn (look at 40-wide-drinks.png; not judged by the script)',
      );
    } finally {
      await s.stop();
    }
  }

  say(
    'skip ',
    'swipe back, on-screen keyboard and a real compositor cannot be driven through Broadway',
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
