// Fetches FlavorDB's entities (one JSON document per ingredient) into a folder of raw files.
//
//   node tools/flavordb/fetch.mjs [--out <folder>] [--from <id>] [--to <id>] [--pause <ms>]
//
// FlavorDB offers its data per entity, as JSON from the entity page (its FAQ, question 19), and
// has no download of the whole. This asks for one entity at a time, one after the other, with a
// pause between requests, and keeps what it got: a second run fetches only what is missing. The
// raw files are not committed (tools/flavordb/raw/ is ignored); build.mjs turns them into the one
// file the app reads. Data: CC BY-NC-SA 3.0, see docs/decisions/flavordb.md. Needs only Node.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE = 'https://cosylab.iiitd.edu.in/flavordb2/entities_json';
/** The ids are dense from 0; the site names 936 and 951 ingredients, so 1100 leaves room. */
export const LAST_ID = 1100;
/** This many missing ids in a row past the first hundred end the run. */
const GIVE_UP_AFTER = 40;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

async function main() {
  const out = arg('out', fileURLToPath(new URL('./raw/', import.meta.url)));
  const from = Number(arg('from', 0));
  const to = Number(arg('to', LAST_ID));
  const pause = Number(arg('pause', 1000));
  mkdirSync(out, { recursive: true });
  let got = 0;
  let had = 0;
  let missingInARow = 0;
  const failed = [];
  for (let id = from; id <= to; id += 1) {
    const file = join(out, `${id}.json`);
    if (existsSync(file)) {
      had += 1;
      missingInARow = 0;
      continue;
    }
    let response;
    try {
      response = await fetch(`${SOURCE}?id=${id}`, {
        headers: { 'User-Agent': 'recipe-app-data-build/1 (one request per second)' },
      });
    } catch (error) {
      failed.push(`${id}: ${error.message}`);
      continue;
    }
    if (response.status === 404) {
      missingInARow += 1;
      if (id > 100 && missingInARow >= GIVE_UP_AFTER) break;
    } else if (!response.ok) {
      failed.push(`${id}: HTTP ${response.status}`);
    } else {
      const text = await response.text();
      try {
        const doc = JSON.parse(text);
        if (doc.entity_id !== id) throw new Error(`entity_id ${doc.entity_id}`);
        writeFileSync(file, text);
        got += 1;
        missingInARow = 0;
      } catch (error) {
        failed.push(`${id}: not an entity (${error.message})`);
      }
    }
    await new Promise((r) => setTimeout(r, pause));
  }
  console.log(`fetched ${got}, already there ${had}, failed ${failed.length}; folder ${out}`);
  for (const line of failed) console.log(`  failed ${line}`);
  if (failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
