// The interaction steps every native app runs on its preferences' Spaces group
// (src/spaces.ts): create a space against a fake GitHub on localhost, then leave it. The
// coordinates are the app's (its preferences differ above the group); taps are touches, as on
// a phone (at 360x720 the preferences are a bottom sheet).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { MAIN, startFakeGithub } from '@nexumia-de/hospes/testing/fake-github';
import { sleep } from './interact-lib.mjs';

/**
 * @param {{
 *   dir: string,
 *   collection: string,
 *   bundleWith: (githubApi: string) => Promise<string>,
 *   session: (dir: string, gjsFile: string) => import('./interact-lib.mjs').Session,
 *   shot: (name: string) => string | undefined,
 *   check: (good: boolean, text: string, detail?: string) => boolean,
 *   at: { createRow: number[], repository: number[], token: number[], create: number[],
 *         leaveSecond: number[], cancel: number[], confirm: number[],
 *         leaveFirst: number[], confirmShort: number[] },
 * }} o `confirm` is Leave in the confirmation for a shared space, `confirmShort` in the shorter
 *   one for a space on this device only. `dir` is a seeded data folder with one space on this device whose `collection` holds records.
 */
export async function createAndLeave(o) {
  const { dir, at, check, shot } = o;
  const fake = await startFakeGithub();
  const spaces = () => JSON.parse(readFileSync(join(dir, 'spaces.json'), 'utf8'));
  const records = (id) => {
    try {
      return JSON.parse(readFileSync(join(dir, `${id}.${o.collection}.json`), 'utf8')).records;
    } catch {
      return [];
    }
  };
  const home = spaces()[0];
  const before = records(home?.id).length;
  const s = o.session(dir, await o.bundleWith(fake.origin));
  try {
    await s.start();
    s.activate('preferences');
    await sleep(1200);
    await s.shot(shot('spaces-1-preferences'));
    await s.touch(...at.createRow);
    await s.touch(...at.repository);
    await s.type('me/household');
    await s.touch(...at.token);
    await s.type(MAIN);
    await s.shot(shot('spaces-2-create-filled'));
    await s.touch(...at.create);
    await sleep(3000);
    await s.shot(shot('spaces-3-created'));
    const made = spaces().find((space) => space.name === 'Household');
    check(
      made?.storage?.type === 'github' && made.storage.address === 'me/household',
      'Create a Space stores a space "Household" with the GitHub repository and its token',
      JSON.stringify(spaces().map((space) => [space.name, space.storage?.type])),
    );
    const written = [...fake.files.keys()].filter((key) => key.includes(`${made?.id}/space.json`));
    check(
      made !== undefined && written.length === 1,
      'creating writes the space’s first file to the storage (one cycle ran)',
      JSON.stringify([...fake.files.keys()]),
    );
    check(
      spaces().length === 2 && before > 0 && records(home?.id).length === before,
      'the space on this device stays, with its records',
      `${spaces().length} spaces, ${records(home?.id).length} of ${before} records`,
    );

    // Leave the created space (the second row): the confirmation says what happens.
    s.activate('preferences');
    await sleep(1200);
    await s.shot(shot('spaces-4-two-spaces'));
    await s.touch(...at.leaveSecond);
    await sleep(600);
    await s.shot(shot('spaces-5-leave-confirm'));
    await s.touch(...at.cancel);
    await sleep(600);
    await s.shot(shot('spaces-6-leave-cancelled'));
    check(
      spaces().some((space) => space.id === made?.id),
      'Cancel in the confirmation keeps the space',
    );
    await s.touch(...at.leaveSecond);
    await sleep(600);
    await s.touch(...at.confirm);
    await sleep(1500);
    await s.shot(shot('spaces-7-left'));
    const left = made !== undefined && !spaces().some((space) => space.id === made.id);
    const leftovers = readdirSync(dir).filter((f) => made && f.startsWith(`${made.id}.`));
    check(
      left && leftovers.length === 0,
      'Leave takes the space and every file the app kept of it off this device',
      `${spaces().length} spaces, files left: ${leftovers.join(', ')}`,
    );
    check(
      written.length > 0 && written.every((key) => fake.files.has(key)),
      'the files in the storage stay after leaving',
    );
    check(records(home?.id).length === before, 'the other space keeps its records');

    // Leave the last space, the one on this device: the app makes a new, empty one there.
    s.activate('preferences');
    await sleep(1200);
    await s.touch(...at.leaveFirst);
    await sleep(600);
    await s.shot(shot('spaces-8-leave-last-confirm'));
    await s.touch(...at.confirmShort);
    await sleep(1500);
    await s.shot(shot('spaces-9-left-last'));
    const after = spaces();
    const homeFiles = readdirSync(dir).filter((f) => home && f.startsWith(`${home.id}.`));
    check(
      after.length === 1 &&
        after[0].id !== home?.id &&
        after[0].storage?.type === 'device' &&
        homeFiles.length === 0,
      'leaving the last space removes it with its files, and the app makes a new space on this device',
      `${JSON.stringify(after.map((space) => [space.name, space.storage?.type]))}, old files: ${homeFiles.join(', ')}`,
    );
    check(records(after[0]?.id).length === 0, 'the new space on this device is empty');
  } finally {
    await s.stop();
    await fake.close();
  }
}
