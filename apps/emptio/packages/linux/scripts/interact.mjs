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
import { bundleApp, bundleAppWith } from './interact-build.mjs';
import { Session, sleep, stopAll } from '@nexumia-de/gjs/tooling/interact-lib';
import { createAndLeave } from '@nexumia-de/gjs/tooling/interact-spaces';
import {
  heightOf,
  isBlue,
  difference,
  isRed,
  pixelAt,
  scrolledBy,
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
// The first category name at 1000x700, two letters into "Fruit & vegetables".
const WIDE_FIRST_NAME = [243, 139];
// The preferences (a bottom sheet at 360x720), the page Create a Space and the confirmation.
const SPACES_AT = {
  createRow: [180, 410],
  repository: [150, 398],
  token: [150, 453],
  create: [180, 681],
  leaveSecond: [301, 407],
  cancel: [104, 477],
  confirm: [254, 477],
  leaveFirst: [301, 352],
  confirmShort: [254, 443],
};

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
      // Said apart, so a failure of the next check tells a lost tap on the row from a wrong
      // Remove: in 8 runs on 2026-11-22 the record was deleted at the first read, 400 ms
      // after the click on Remove, every time.
      check(!(await isListPage(s)), 'tapping Bread pushes its entry page');
      await s.click(...REMOVE);
      await sleep(400);
      const removed = named(dir, 'Bread')?.deleted === true;
      check(
        removed,
        'Remove marks the record deleted',
        `${JSON.stringify(named(dir, 'Bread'))}, ${removed || (await isListPage(s)) ? 'list page' : 'still the entry page'}`,
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
      await s.page.keyboard.press('Escape');
      await sleep(500);
      // The shared Report a Problem dialog (docs/feedback.md), in memory for the token.
      const beforeReport = join(root, 'before-report.png');
      await s.shot(beforeReport);
      s.activate('report-problem');
      await s.page.waitForTimeout(1000);
      const report = shotName('13-report-problem') ?? join(root, 'report.png');
      await s.shot(report);
      const reportDiff = await difference(s, beforeReport, report);
      check(reportDiff > 0.05, 'Report a Problem opens a dialog over the window', reportDiff);
      await s.page.keyboard.press('Escape');
      await sleep(500);
      // The preferences with the KitchenOwl group at the bottom (look; not judged by the script).
      s.activate('preferences');
      await s.page.waitForTimeout(1000);
      await s.page.mouse.move(180, 400);
      for (let i = 0; i < 10; i++) await s.page.mouse.wheel(0, 400);
      await s.page.waitForTimeout(800);
      await s.shot(shotName('12-preferences-kitchenowl'));
    } finally {
      await s.stop();
    }
  }

  // 13: a list of fields at 360x720, by touch. Every row of the categories is a text field; the
  // finger starts on a category name, below the fold are more categories. The proof of the fix
  // is the second check, "the drag focused no field": on the code before it, the touch focused
  // the field under the finger (on Phosh that brings up the on-screen keyboard, which Broadway
  // has not; the owner could not scroll there). The scroll distance is a control: in Broadway
  // the list moved before the fix too.
  {
    const sdir = seed('scroll');
    const s = forAScreen(360, 720, sdir, gjsFile);
    try {
      await s.start();
      s.activate('categories');
      await s.page.waitForTimeout(1000);
      const before = shotName('13-categories-top') ?? join(root, 'scroll-before.png');
      await s.shot(before);
      const categories = () => JSON.stringify(read(sdir, '.list-categories.json'));
      const kept = categories();
      await s.touch(120, 560, 120, 210);
      await sleep(1500); // the kinetic scrolling comes to rest
      const after = shotName('13-categories-scrolled') ?? join(root, 'scroll-after.png');
      await s.shot(after);
      const moved = await scrolledBy(s, before, after);
      say('info', `step 13: the list moved ${moved.dy} px for a drag of 350 px`);
      // The finger moves 350 px; the list moved 216 to 486 px in the runs of 2026-11-22 (on the
      // code before and after the fix), less when GTK starts the drag late. 100 px is the lower
      // bound: more than a row (55 px), so a row below the fold came into view.
      check(
        moved.dy >= 100 && moved.rest < 0.05,
        'control: a touch drag that starts on a category name scrolls the list up by more than a row',
        `moved ${moved.dy} px, ${(moved.rest * 100).toFixed(1)} % of the band differ`,
      );
      // The proof: a drag is no tap, so no field took the focus and what is typed now goes nowhere.
      await s.type('x');
      await s.press('Enter');
      await sleep(500);
      check(
        categories() === kept,
        'the drag focused no field: typing and Enter afterwards rename no category',
      );
      await s.shot(shotName('13-categories-after-typing'));
      // A tap on a name still edits it (a control: it held before the fix too).
      await s.touch(120, 400);
      await s.type('Z');
      await s.press('Enter');
      await sleep(500);
      const renamed = read(sdir, '.list-categories.json').filter((r) =>
        String(r.value?.name ?? '').includes('Z'),
      );
      check(
        renamed.length === 1,
        'a tap on a category name focuses it: typing and Enter rename that category',
        categories(),
      );
    } finally {
      await s.stop();
    }
  }

  // 13b: with a mouse at 1000x700 a field works as GTK's own: a click on an unfocused name
  // focuses it and puts the cursor where it was clicked (editOnTap defers the focus for touch
  // only).
  {
    const mdir = seed('mouse');
    const s = forAScreen(1000, 700, mdir, gjsFile);
    try {
      await s.start();
      s.activate('categories');
      await s.page.waitForTimeout(1000);
      await s.shot(shotName('13b-categories-wide'));
      await s.click(...WIDE_FIRST_NAME);
      await s.type('Q');
      await s.press('Enter');
      await sleep(500);
      await s.shot(shotName('13b-clicked-and-typed'));
      const names = read(mdir, '.list-categories.json').map((r) => String(r.value?.name ?? ''));
      const typed = names.find((name) => name.includes('Q'));
      check(
        typed !== undefined && !typed.endsWith('Q'),
        'a mouse click on an unfocused category name focuses it with the cursor where it was clicked',
        JSON.stringify(names),
      );
    } finally {
      await s.stop();
    }
  }

  // Spaces: create a space in the preferences (a fake GitHub on localhost, compiled in as the
  // address), then leave it; the steps are the shared ones of the native apps.
  await createAndLeave({
    dir: seed('create'),
    collection: 'list',
    bundleWith: (api) => bundleAppWith(api, join(root, 'with-fake-github.js')),
    session: (dir, file) => forAScreen(360, 720, dir, file),
    shot: shotName,
    check,
    at: SPACES_AT,
  });

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
