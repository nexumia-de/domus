// Usage: node scripts/seed/run.mjs <checkout> [--out <dir>] [--report <file>] [--pin <file>]
// Reads a local checkout of the Bar Assistant data and writes the seed JSON
// (docs/seed-data.md, Regenerating). The checkout is only read.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readPin } from './attribution';
import { buildSeed, type Curated } from './build';
import { readSource } from './source';

export interface Options {
  checkout: string;
  out: string;
  report: string;
  pin: string;
  curated: string;
  schemas: string;
}

export function convert(o: Options) {
  const pin = readPin(o.pin);
  const head = join(o.checkout, '.git', 'HEAD');
  if (existsSync(head)) {
    const sha = readFileSync(head, 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(sha) && sha !== pin.commit) {
      throw new Error(`checkout is at ${sha}, the pinned commit is ${pin.commit}`);
    }
  }
  const curated = JSON.parse(readFileSync(o.curated, 'utf8')) as Curated;
  const licencePath = join(o.checkout, 'LICENSE');
  const licence = existsSync(licencePath) ? readFileSync(licencePath, 'utf8') : undefined;
  const result = buildSeed(readSource(o.checkout), pin, curated, o.schemas, licence);
  mkdirSync(o.out, { recursive: true });
  for (const [name, text] of Object.entries(result.files)) writeFileSync(join(o.out, name), text);
  writeFileSync(o.report, JSON.stringify(result.report, null, 2) + '\n');
  return result;
}

/** `repo` is the root of this repository. */
export function main(argv: string[], repo: string): void {
  const args = [...argv];
  const take = (flag: string, fallback: string) => {
    const i = args.indexOf(flag);
    if (i < 0) return fallback;
    const [, value] = args.splice(i, 2);
    if (!value) throw new Error(`${flag} needs a value`);
    return value;
  };
  const out = take('--out', join(repo, 'packages/engine/data/seed'));
  const report = take('--report', join(tmpdir(), 'mixtura-seed-report.json'));
  const pin = resolve(take('--pin', join(repo, 'scripts/seed/pinned.json')));
  const checkout = args[0];
  if (!checkout)
    throw new Error('usage: convert <checkout> [--out <dir>] [--report <file>] [--pin <file>]');
  const { report: r } = convert({
    checkout: resolve(checkout),
    out,
    report,
    pin,
    schemas: join(repo, 'packages/engine/schemas'),
    curated: join(repo, 'packages/engine/data/ingredient-properties.json'),
  });
  console.log(`converted ingredients: ${r.counts.ingredients}`);
  console.log(`converted specs: ${r.counts.specs} of ${r.counts.cocktailsRead}`);
  console.log(`skipped specs: ${r.counts.specsSkipped}`);
  console.log(`ingredients without a resolved role: ${r.counts.ingredientsUnclassified}`);
  console.log(`lines missing a property (%): ${JSON.stringify(r.missingLineShare)}`);
  console.log(`report: ${report}`);
}
