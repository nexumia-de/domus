// Export and import in a browser: fill data, export (the download is captured), clear the
// storage, import with "Merge now" (the tester's steps of 2026-11-21) and with "replace" and compare
// entity by entity, the skill state included; merge with a conflict, with a
// version record in conflict and with an ingredient that is here already; a corrupt file and a
// newer one change nothing; a file of format 2 still imports; the backup reminder with an injected
// clock; then Cooklang; and "Erase everything on this device" (e2e/erase-device.mjs).
import { check, watch } from './harness.mjs';
import { engine } from './notebook-fixture.mjs';
import { layout } from './editor-helpers.mjs';
import { cooklang } from './cooklang-flow.mjs';
import {
  FLOUR,
  NOTE1,
  OWN,
  V1,
  V2,
  VAR,
  file,
  listAll,
  putAll,
  readDownload,
  removeFromStore,
  same,
  uid,
} from './exchange-fixture.mjs';
import { seed } from './seed.mjs';
import { eraseDevice } from './erase-device.mjs';

const label = '360px export and import';
const DAY = 86_400_000;

const openAt = async (page, origin, hash, query = '') => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store${query}#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};

const clearStorage = async (context, page, origin) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Storage.clearDataForOrigin', { origin, storageTypes: 'indexeddb' });
};

const chooseFile = async (page, origin, upload) => {
  await openAt(page, origin, 'settings/import');
  await page.locator('input[type=file]').setInputFiles(upload);
};

const status = (page) => page.locator('.import [role=status]').first().innerText();

/** Imports a file that must be refused: a sentence, no step, and the data as it was. */
const refused = async (page, origin, name, upload, expectText, before) => {
  await chooseFile(page, origin, upload);
  await page.getByText(expectText).waitFor();
  const text = await status(page);
  check(
    text.endsWith('Nothing was changed.') && (await page.locator('.import-body').count()) === 0,
    `${label}: ${name} is refused with a quiet sentence (${text})`,
  );
  check(same(await listAll(page), before), `${label}: ${name} leaves the stored data untouched`);
};

const exported = async (page) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export everything' }).click(),
  ]);
  return { name: download.suggestedFilename(), text: await readDownload(download) };
};

const roundTrip = async (context, page, origin) => {
  await openAt(page, origin, 'settings');
  await seed(page, origin);
  await openAt(page, origin, 'settings');
  check((await putAll(page, OWN)) === 'ok', `${label}: own records are put through the store`);
  // An unsaved form is a draft, not a record: it must not be in the export.
  await page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    await opened.store.drafts.put('component:new', { name: 'Draft only sentinel' });
  });
  const before = await listAll(page);
  await openAt(page, origin, 'settings');
  check(
    (await page.getByText('No export yet.').count()) === 1,
    `${label}: Settings says there is no export yet`,
  );
  await layout(page, `${label} (settings, Your data)`);
  const file1 = await exported(page);
  check(
    /^cooks-notebook-\d{4}-\d{2}-\d{2}\.json$/.test(file1.name),
    `${label}: the file name is the app and a date (${file1.name})`,
  );
  const parsed = JSON.parse(file1.text);
  const records = Object.fromEntries(Object.entries(before).filter(([, list]) => list.length));
  check(
    file1.text === engine.serializeExport(engine.buildExport(records, parsed.exportedAt)),
    `${label}: the file is exactly what the engine builds from the stored records`,
  );
  check(
    !file1.text.includes('Draft only sentinel') && !file1.text.includes('component:new'),
    `${label}: drafts are not in the export`,
  );
  check(
    (await page.getByText(/^Last export: \d{4}-\d{2}-\d{2}$/).count()) === 1,
    `${label}: Settings shows the date of the last export`,
  );

  check(
    (await page.locator('.not-in-file').allTextContents()).some((t) =>
      t.startsWith('Not in the file: the stock of “Home”'),
    ),
    `${label}: Settings says the stock is not in the file and where it lives`,
  );
  check(
    JSON.parse(file1.text).formatVersion === 3 && JSON.parse(file1.text).skills.length === 2,
    `${label}: the file is format 3 and holds the skill state`,
  );

  // The tester's steps: delete the browser's data, then import with "Merge now".
  await clearStorage(context, page, origin);
  await openAt(page, origin, 'settings');
  check(
    Object.values(await listAll(page)).every((list) => list.length === 0),
    `${label}: storage cleared, the notebook and the skill state are empty`,
  );
  await chooseFile(page, origin, file(file1.name, file1.text));
  await page.locator('.plan').waitFor();
  await page.getByRole('button', { name: 'Merge now' }).click();
  await page.locator('.toast-text', { hasText: 'Imported:' }).waitFor();
  const merged = await listAll(page);
  for (const kind of Object.keys(before)) {
    check(
      same(merged[kind], before[kind]),
      `${label}: ${kind} are identical after export, wipe and "Merge now" (${merged[kind].length})`,
    );
  }
  await openAt(page, origin, 'settings');
  check(
    (await page.locator('.skill-list li').allTextContents()).some((t) => t.includes('Pan-frying')),
    `${label}: the technique marked as learned is listed as learned again after the import`,
  );

  await clearStorage(context, page, origin);
  await openAt(page, origin, 'settings');
  const empty = await listAll(page);
  check(
    Object.values(empty).every((list) => list.length === 0),
    `${label}: storage cleared, the notebook is empty`,
  );

  // Replace everything, with the inline confirmation, then compare entity by entity.
  await chooseFile(page, origin, file(file1.name, file1.text));
  await page.locator('.summary-list').waitFor();
  const counts = await page.locator('.summary-list li').allTextContents();
  const want = Object.entries(records).map(
    ([kind, list]) =>
      `${list.length} ${
        {
          ingredients: 'ingredients',
          components: 'component versions',
          dishes: 'dish versions',
          tastings: 'tasting notes',
          skills: 'skill marks',
        }[kind]
      }`,
  );
  check(same(counts, want), `${label}: the summary counts per entity (${counts.join(', ')})`);
  await layout(page, `${label} (import summary)`);
  await page.getByLabel('Replace everything here').check();
  await page.getByRole('button', { name: 'Replace everything now' }).click();
  await page.getByText(/^Replace the 0 records here with the \d+ records of the file\?$/).waitFor();
  check(
    (await page.getByRole('dialog').count()) === 0,
    `${label}: the confirmation is an inline row, not a dialog`,
  );
  await page.getByRole('button', { name: 'Yes, replace' }).click();
  await page.locator('.toast-text', { hasText: 'Imported: everything here is now' }).waitFor();
  const after = await listAll(page);
  for (const kind of Object.keys(before)) {
    check(
      same(after[kind], before[kind]),
      `${label}: ${kind} are identical after the round trip (${after[kind].length})`,
    );
  }
  const heads = (r) => engine.familyHeads(r.components).map((h) => h.id);
  const chainIds = (r) => engine.versionFamily(r.components, V1).versions.map((v) => v.id);
  check(
    same(chainIds(after), chainIds(before)) &&
      same(chainIds(after), [V1, V2, uid(12)]) &&
      engine.variationParent(after.components, VAR).kind ===
        engine.variationParent(before.components, VAR).kind &&
      same(heads(after), heads(before)),
    `${label}: versions, their order and the variation link survive`,
  );

  // Undo puts the old state back (here: an empty notebook), then the data is imported again.
  await page.locator('.toast-action').click();
  await page.locator('.toast-text', { hasText: 'The import was undone.' }).waitFor();
  const undone = await listAll(page);
  check(
    Object.values(undone).every((list) => list.length === 0),
    `${label}: Undo after "replace" brings back the notebook as it was`,
  );
  await chooseFile(page, origin, file(file1.name, file1.text));
  await page.getByLabel('Replace everything here').check();
  await page.getByRole('button', { name: 'Replace everything now' }).click();
  await page.getByRole('button', { name: 'Yes, replace' }).click();
  await page.locator('.toast-text', { hasText: 'Imported: everything here' }).waitFor();
  check(same(await listAll(page), before), `${label}: imported again, identical again`);
  return { before, file1 };
};

const merging = async (page, origin, { before, file1 }) => {
  // The notebook differs: an ingredient renamed, a note removed, one record only here.
  const renamed = { ...OWN.ingredients[0], name: 'Wheat flour' };
  await putAll(page, { ingredients: [renamed, { id: uid(99), name: 'Local only' }] });
  await removeFromStore(page, 'tastings', NOTE1);
  const total = Object.values(before).reduce((n, l) => n + l.length, 0);

  await chooseFile(page, origin, file('export.json', file1.text));
  await page.locator('.plan').waitFor();
  const summary = await page.locator('.plan .note').first().innerText();
  check(
    summary === `1 to add, ${total - 2} already here, 1 that differ.`,
    `${label}: merge summary counts added, same and differing (${summary})`,
  );
  check(
    (await page.locator('.conflict').count()) === 1 &&
      (await page.locator('.conflict legend').innerText()).includes('Wheat flour'),
    `${label}: the differing record is listed`,
  );
  await layout(page, `${label} (merge with a conflict)`);
  await page.getByRole('button', { name: 'Merge now' }).click();
  await page.locator('.toast-text', { hasText: 'Imported: 1 added, 0 replaced' }).waitFor();
  let now = await listAll(page);
  check(
    same(
      now.ingredients.find((r) => r.id === FLOUR),
      renamed,
    ) &&
      now.tastings.length === 2 &&
      now.ingredients.some((r) => r.id === uid(99)),
    `${label}: by default the notebook's own record stays, the missing note is added, nothing is lost`,
  );
  // Undo of a merge removes what it added only.
  await page.locator('.toast-action').click();
  await page.locator('.toast-text', { hasText: 'The import was undone.' }).waitFor();
  now = await listAll(page);
  check(
    now.tastings.length === 1 && now.ingredients.some((r) => r.id === uid(99)),
    `${label}: Undo of a merge takes back only what the merge added`,
  );

  // Choosing the file's side for the conflict.
  await chooseFile(page, origin, file('export.json', file1.text));
  await page.locator('.conflict').waitFor();
  await page.getByLabel("Take the file's").check();
  await page.getByRole('button', { name: 'Merge now' }).click();
  await page.locator('.toast-text', { hasText: 'Imported: 1 added, 1 replaced' }).waitFor();
  now = await listAll(page);
  check(
    same(
      now.ingredients.find((r) => r.id === FLOUR),
      before.ingredients.find((r) => r.id === FLOUR),
    ),
    `${label}: "Take the file's" replaces the record with the file's`,
  );
  await page.locator('.toast-action').click();
  await page.locator('.toast-text', { hasText: 'The import was undone.' }).waitFor();
  check(
    same(
      (await listAll(page)).ingredients.find((r) => r.id === FLOUR),
      renamed,
    ),
    `${label}: Undo puts the notebook's own record back`,
  );

  // A version record that differs can only stay as it is.
  const changed = JSON.parse(file1.text);
  changed.components.find((c) => c.id === V1).lines[0].amount.value = 99;
  await chooseFile(page, origin, file('changed.json', JSON.stringify(changed)));
  await page.locator('.conflict').first().waitFor();
  const versionText = await page
    .locator('.conflict')
    .filter({ hasText: 'component versions' })
    .innerText();
  check(
    versionText.includes('This version cannot be changed. Yours stays.') &&
      (await page
        .locator('.conflict', { hasText: 'component versions' })
        .locator('input')
        .count()) === 0,
    `${label}: a differing version record offers no choice and says it stays`,
  );
  await page.getByRole('button', { name: 'Merge now' }).click();
  await page.locator('.toast-text', { hasText: 'Imported:' }).waitFor();
  now = await listAll(page);
  check(
    now.components.find((r) => r.id === V1).lines[0].amount.value === 30,
    `${label}: the stored version record is never overwritten`,
  );
  await page.locator('.toast-action').click();
  await page.locator('.toast-text', { hasText: 'The import was undone.' }).waitFor();

  // An ingredient with a new id but a name that is here already (the example data has a Flour).
  const dup = {
    format: 'culina-export',
    formatVersion: 1,
    ingredients: [{ id: uid(77), name: 'flour' }],
    components: [
      {
        id: uid(78),
        name: 'From another device',
        lines: [{ ref: { kind: 'ingredient', id: uid(77) }, amount: { value: 10, unit: 'g' } }],
        version: { family: uid(78), date: '2026-11-15' },
      },
    ],
  };
  await chooseFile(page, origin, file('other.json', JSON.stringify(dup)));
  await page.locator('.matches').waitFor();
  const picked = await page.getByLabel('Ingredient flour').inputValue();
  check(
    picked === 'flour',
    `${label}: an ingredient whose id is new and whose name is known is matched, preselected only for the exact match`,
  );
  await page.getByRole('button', { name: 'Merge now' }).click();
  await page.locator('.toast-text', { hasText: 'Imported: 1 added' }).waitFor();
  now = await listAll(page);
  const adopted = now.components.find((r) => r.id === uid(78));
  check(
    adopted?.lines[0].ref.id === 'flour' && !now.ingredients.some((r) => r.id === uid(77)),
    `${label}: the imported line points at the notebook's ingredient and no duplicate is created`,
  );
  await putAll(page, { ingredients: [OWN.ingredients[0]] });
};

const refusals = async (page, origin) => {
  const before = await listAll(page);
  await refused(
    page,
    origin,
    'a file that is not JSON',
    file('x.json', 'this is { not json'),
    /cannot be read as an export/,
    before,
  );
  await refused(
    page,
    origin,
    'a file that is JSON but not an export',
    file('x.json', '{"hello":1}'),
    /not a Cook's Notebook export/,
    before,
  );
  await refused(
    page,
    origin,
    'a record that breaks its schema',
    file(
      'x.json',
      JSON.stringify({ format: 'culina-export', formatVersion: 1, ingredients: [{ id: uid(5) }] }),
    ),
    /Entry 1 of ingredients does not fit/,
    before,
  );
  await refused(
    page,
    origin,
    'a file from a newer version',
    file(
      'x.json',
      JSON.stringify({ format: 'culina-export', formatVersion: 4, components: [{ any: 'shape' }] }),
    ),
    /newer version of the app \(format 4; this app reads up to 3\)/,
    before,
  );
  await layout(page, `${label} (refused file)`);

  // A file of version 1 with stock is read; its stock is left out, and the preview says so.
  const old = {
    format: 'culina-export',
    formatVersion: 1,
    ingredients: [{ id: uid(81), name: 'Old flour' }],
    stock: [{ id: uid(82), ref: { kind: 'ingredient', id: uid(81) } }],
  };
  await chooseFile(page, origin, file('old.json', JSON.stringify(old)));
  await page.locator('.stock-left-out').waitFor();
  const note = await page.locator('.stock-left-out').innerText();
  const summary = await page.locator('.summary-list li').allTextContents();
  check(
    note.includes('holds 1 stock item. They are left out') && same(summary, ['1 ingredients']),
    `${label}: an older file's stock is left out and the preview says so (${note} | ${summary})`,
  );
  check(same(await listAll(page), before), `${label}: reading the older file changed nothing`);

  // A file of format 2 (before the skill state was in the file) still imports, and says that the
  // skill marks here stay; "replace everything" with it leaves them.
  const two = {
    format: 'culina-export',
    formatVersion: 2,
    ingredients: [{ id: uid(83), name: 'Format two flour' }],
  };
  await chooseFile(page, origin, file('two.json', JSON.stringify(two)));
  await page.locator('.skills-not-in-file').waitFor();
  await page.getByRole('button', { name: 'Merge now' }).click();
  await page.locator('.toast-text', { hasText: 'Imported: 1 added' }).waitFor();
  const afterTwo = await listAll(page);
  check(
    afterTwo.ingredients.some((r) => r.id === uid(83)) && same(afterTwo.skills, before.skills),
    `${label}: a format 2 file is merged and the skill state stays (${afterTwo.skills.length})`,
  );
  await page.locator('.toast-action').click();
  await page.locator('.toast-text', { hasText: 'The import was undone.' }).waitFor();
  check(same(await listAll(page), before), `${label}: Undo of the format 2 merge`);
};

const reminder = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const origin = server.origin;
  await openAt(page, origin, 'settings');
  await putAll(page, { ingredients: [OWN.ingredients[0]] });
  const t0 = await page.evaluate(() => new Date().toISOString());
  const at = (days) => new Date(Date.parse(t0) + days * DAY).toISOString();
  const banner = (p) => p.locator('.backup-banner');
  const visible = async (p) => (await banner(p).count()) === 1 && (await banner(p).isVisible());
  const settle = (p) => p.waitForTimeout(150);

  await openAt(page, origin, 'settings', `&e2e-now=${at(10)}`);
  await settle(page);
  check(!(await visible(page)), `${label}: no banner before the period has passed (10 of 30 days)`);

  await openAt(page, origin, 'settings', `&e2e-now=${at(40)}`);
  await banner(page).waitFor({ state: 'visible' });
  const text = await banner(page).innerText();
  check(
    text.includes('in no export yet') && (await page.getByRole('dialog').count()) === 0,
    `${label}: the banner appears with unexported changes after the period, and is no dialog (${text.split('\n')[0]})`,
  );
  await layout(page, `${label} (backup banner)`);
  await page.getByRole('button', { name: 'Export everything' }).click();
  await banner(page).waitFor({ state: 'hidden' });
  check(true, `${label}: exporting hides the banner`);
  await openAt(page, origin, 'settings', `&e2e-now=${at(41)}`);
  await settle(page);
  check(!(await visible(page)), `${label}: no banner when nothing changed since the export`);
  await page.getByText('Last export: ').waitFor();

  // A change after the export, seen once the period has passed again.
  await openAt(page, origin, 'settings', `&e2e-now=${at(41)}`);
  await putAll(page, { ingredients: [{ id: uid(60), name: 'Salt' }] });
  await openAt(page, origin, 'settings', `&e2e-now=${at(60)}`);
  await settle(page);
  check(!(await visible(page)), `${label}: 20 days after the export is not yet due`);
  await openAt(page, origin, 'settings', `&e2e-now=${at(75)}`);
  await banner(page).waitFor({ state: 'visible' });
  check(
    (await banner(page).innerText()).includes('The last export was 35 days ago.'),
    `${label}: the banner says how long ago the export was`,
  );
  // "Not now" hides it for this session without a dialog.
  await page.getByRole('button', { name: 'Not now' }).click();
  check(!(await visible(page)), `${label}: "Not now" hides the banner`);

  // The period is the user's: 90 days and Never.
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await page.getByLabel('After 90 days with changes').check();
  await openAt(page, origin, 'settings', `&e2e-now=${at(75)}`);
  await settle(page);
  check(!(await visible(page)), `${label}: a period of 90 days is respected`);
  await page.getByLabel('Never').check();
  await openAt(page, origin, 'settings', `&e2e-now=${at(900)}`);
  await settle(page);
  check(!(await visible(page)), `${label}: Never turns the reminder off`);
  check(
    problems.length === 0,
    `${label}: reminder pages have no console error, CSP violation or foreign request`,
  );
  if (problems.length) console.log(problems.join('\n'));
  await context.close();
};

export const exportImport = async (browser, server) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    acceptDownloads: true,
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const state = await roundTrip(context, page, server.origin);
  await merging(page, server.origin, state);
  await refusals(page, server.origin);
  await cooklang(page, server.origin, { openAt, file, listAll });
  check(
    problems.length === 0,
    `${label}: no console error, CSP violation or foreign request over the whole run`,
  );
  if (problems.length) console.log(problems.join('\n'));
  await context.close();
  await reminder(browser, server);
  await eraseDevice(browser, server);
};
