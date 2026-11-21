// `npm run interact -w @emptio/linux`: drives the native app through GTK's
// Broadway backend with Playwright and checks the result in the data files.
// Broadway draws a canvas, so the widgets are clicked by coordinates in a
// 360x720 viewport (found in screenshots) and every step is verified in the
// JSON files of EMPTIO_DATA_DIR. SHOTS=<folder> keeps a screenshot per step.
// Run with PLAYWRIGHT_CHROMIUM_PATH set when Chromium is not Playwright's own.
// Needs gjs, gtk4-broadwayd, dbus-daemon and gdbus (docs/native-linux.md).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleApp } from './interact-build.mjs';
import { Session, sleep, stopAll } from '@nexumia-de/gjs/tooling/interact-lib';
import {
  heightOf,
  isBlue,
  difference,
  isRed,
  pixelAt,
} from '@nexumia-de/gjs/tooling/interact-pixels';

const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const root = mkdtempSync(join(tmpdir(), 'emptio-interact-data-'));
let failed = 0;
const say = (kind, text) => console.log(`${kind} ${text}`);
const check = (good, text, detail = '') => {
  if (!good) failed++;
  say(good ? 'ok  ' : 'FAIL', detail && !good ? `${text} (${detail})` : text);
  return good;
};

// Coordinates at 360x720, from the screenshots.
const FIELD = [100, 686];
const PRESSING = [240, 686];
const ADD = [322, 686];
const NOW_CHOICE = [246, 540];
const ROW = { bread: [180, 125], toilet: [180, 180] };
const TICK_BREAD = [43, 125];
const TICK_BREAD_BOUGHT = [43, 570];
const REMOVE = [180, 416];
const SAVE = [180, 686];
const UNDO = [268, 672];
const CLEAR_BOUGHT = [296, 575];
const FIRST_SWITCH = [311, 148];

const keys = new Map();
const seed = (name) => {
  const dir = join(root, name);
  const run = spawnSync(process.execPath, [join(import.meta.dirname, 'seed.mjs'), dir, 'en'], {
    encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(`seed failed: ${run.stderr}`);
  // A removed record keeps only its key, so the seeded names are remembered.
  keys.set(dir, new Map(list(dir).map((r) => [r.value.name, r.key])));
  return dir;
};
const read = (dir, suffix) => {
  const file = readdirSync(dir).find((f) => f.endsWith(suffix));
  return JSON.parse(readFileSync(join(dir, file), 'utf8')).records;
};
const list = (dir) => read(dir, '.list.json');
const live = (dir) => list(dir).filter((r) => !r.deleted);
const named = (dir, name) => {
  const key = keys.get(dir)?.get(name);
  return list(dir).find((r) => (key ? r.key === key : r.value?.name === name));
};
const shotName = (name) => (shots ? join(shots, `${name}.png`) : undefined);
const forAScreen = (width, height, dir, file) =>
  new Session({
    appId: 'de.nexumia.Emptio',
    dataEnv: 'EMPTIO_DATA_DIR',
    gjsFile: file,
    dataDir: dir,
    width,
    height,
  });

async function onList(s, name) {
  const file = shotName(name);
  await s.shot(file);
  return file;
}
/** The list page shows the add bar; the entry page a blue Save button at that place. */
const isListPage = async (s) => !isBlue(await pixelAt(s, ...FIELD));

async function addTyped(s, text) {
  await s.click(...FIELD);
  await s.type(text);
  await s.press('Enter');
  await sleep(500);
}

const heights = [];
const measure = async (s, label, x, y, want) => {
  const h = await heightOf(s, x, y, want);
  heights.push([label, h]);
};

async function main() {
  const gjsFile = await bundleApp();

  // 1-3: start, add, spelling.
  {
    const dir = seed('add');
    const s = forAScreen(360, 720, dir, gjsFile);
    try {
      await s.start();
      await onList(s, '01-start');
      await measure(s, 'add button', 322, 696, isBlue);
      await s.press('x');
      await s.click(...ADD);
      await sleep(500);
      check(
        live(dir).length === 8,
        'no text field has the focus at the start: a key and the add button add nothing',
        `${live(dir).length} live entries`,
      );
      await s.shot(shotName('01-key-then-add'));

      await addTyped(s, 'Eggs');
      const eggs = named(dir, 'Eggs');
      check(
        eggs?.value.priority === 'soon',
        'typing a name and pressing Enter adds it as "soon"',
        JSON.stringify(eggs?.value),
      );
      await s.shot(shotName('02-added-enter'));

      await s.click(...PRESSING);
      await s.shot(shotName('02-dropdown'));
      await s.click(...NOW_CHOICE);
      await s.click(...FIELD);
      await s.type('Flour');
      await s.click(...ADD);
      await sleep(500);
      const flour = named(dir, 'Flour');
      check(
        flour?.value.priority === 'now',
        'the add button with "Now" chosen adds it as "now"',
        JSON.stringify(flour?.value),
      );
      await s.shot(shotName('02-added-button'));

      const before = live(dir).length;
      await addTyped(s, 'milk');
      const milks = live(dir).filter((r) => r.value.name.toLowerCase() === 'milk');
      check(
        milks.length === 1 && live(dir).length === before,
        'adding "milk" creates no second record for Milk',
        `${milks.length} milk records, ${live(dir).length - before} new`,
      );
      await s.shot(shotName('03-milk'));
    } finally {
      await s.stop();
    }
  }

  // 4-7, then 9 on the same folder.
  const dir = seed('flow');
  let beforeStop;
  {
    const s = forAScreen(360, 720, dir, gjsFile);
    try {
      await s.start();
      await s.click(...TICK_BREAD);
      await sleep(500);
      check(
        named(dir, 'Bread')?.value.bought?.at !== undefined,
        'ticking an open entry gives its record bought.at',
        JSON.stringify(named(dir, 'Bread')?.value.bought),
      );
      await s.shot(shotName('04-ticked'));
      await s.click(...TICK_BREAD_BOUGHT);
      await sleep(500);
      check(
        named(dir, 'Bread')?.value.bought === undefined,
        'unticking removes bought',
        JSON.stringify(named(dir, 'Bread')?.value.bought),
      );
      await s.shot(shotName('04-unticked'));

      await s.click(...ROW.toilet);
      const pushed = !(await isListPage(s));
      await s.shot(shotName('05-entry-page'));
      check(pushed, 'tapping a row pushes the entry page');
      await measure(s, 'Save button', 40, 696, isBlue);
      await measure(s, 'Remove button', 100, 416, isRed);
      await s.page.keyboard.press('Control+a');
      await s.type('Loo roll');
      await s.click(...SAVE);
      await sleep(500);
      check(
        named(dir, 'Toilet paper')?.value?.name === 'Loo roll',
        'Save stores the changed name',
        JSON.stringify(live(dir).map((r) => r.value.name)),
      );
      check(await isListPage(s), 'Save returns to the list page');
      await s.shot(shotName('05-saved'));

      await s.click(...ROW.bread);
      await s.click(...REMOVE);
      await sleep(400);
      check(
        named(dir, 'Bread')?.deleted === true,
        'Remove marks the record deleted',
        JSON.stringify(named(dir, 'Bread')),
      );
      await s.shot(shotName('06-removed-toast'));
      await s.click(...UNDO);
      await sleep(500);
      check(
        named(dir, 'Bread')?.deleted !== true,
        'Undo makes the record live again',
        JSON.stringify(named(dir, 'Bread')),
      );
      await s.shot(shotName('06-undone'));

      const bought = ['Rice', 'Butter'];
      await s.click(...CLEAR_BOUGHT);
      await sleep(500);
      check(
        bought.every((n) => named(dir, n)?.deleted === true),
        'Clear bought deletes the bought records',
        bought.map((n) => named(dir, n)?.deleted).join(),
      );
      await s.shot(shotName('07-cleared-toast'));
      await s.click(...UNDO);
      await sleep(500);
      check(
        bought.every(
          (n) => named(dir, n) && named(dir, n).deleted !== true && named(dir, n).value.bought,
        ),
        'Undo restores the bought records',
        bought.map((n) => named(dir, n)?.deleted).join(),
      );
      await sleep(11000); // the toast goes
      beforeStop = shotName('09-before-restart');
      await s.shot(beforeStop ?? join(root, 'before.png'));
      beforeStop ??= join(root, 'before.png');
    } finally {
      await s.stop();
    }
  }
  {
    const s = forAScreen(360, 720, dir, gjsFile);
    try {
      await s.start();
      const after = shotName('09-after-restart') ?? join(root, 'after.png');
      await s.shot(after);
      const diff = await difference(s, beforeStop, after);
      check(
        diff < 0.002,
        'after a restart the list looks as it was left (screenshots, list area)',
        `${(diff * 100).toFixed(2)} % of the pixels differ`,
      );
      check(
        live(dir).length === 8,
        'after a restart the data holds the same 8 live entries',
        `${live(dir).length}`,
      );
    } finally {
      await s.stop();
    }
  }

  // 8: categories page through the app action.
  {
    const cdir = seed('categories');
    const s = forAScreen(360, 720, cdir, gjsFile);
    try {
      await s.start();
      s.activate('categories');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('08-categories'));
      await s.click(...FIRST_SWITCH);
      await sleep(500);
      const record = read(cdir, '.list-categories.json').find((r) => r.key === 'produce');
      check(
        record?.value?.hidden === true,
        'the first category switch hides "produce" in the categories file',
        JSON.stringify(record),
      );
      await s.shot(shotName('08-hidden'));
      s.activate('about');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('10-about'));
    } finally {
      await s.stop();
    }
  }

  // Desktop size, one screenshot.
  {
    const s = forAScreen(1000, 700, seed('wide'), gjsFile);
    try {
      await s.start();
      await s.shot(shotName('11-wide-list'));
      say(
        'ok  ',
        '1000x700: the list was drawn (look at 11-wide-list.png; not judged by the script)',
      );
    } finally {
      await s.stop();
    }
  }

  say(
    'info',
    `control heights (px, measured from pixels): ${heights.map(([l, h]) => `${l} ${h}`).join('; ')}`,
  );
  say(
    'skip ',
    'swipe back, on-screen keyboard and a real compositor cannot be driven through Broadway',
  );
}

try {
  await main();
} catch (error) {
  failed++;
  say('FAIL', `the check stopped: ${error.message}`);
} finally {
  await stopAll();
  rmSync(root, { recursive: true, force: true });
}
process.exit(failed === 0 ? 0 : 1);
