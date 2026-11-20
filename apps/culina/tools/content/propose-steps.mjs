// Prints, for every step of the shipped dishes, what `proposeStep` suggests beside what the file
// says: the word (technique or plain action) and the lines used, from the English and from the
// German text. An aid for the person who decides each step by reading it; it changes no file.
//   npm run propose:steps                      every dish
//   npm run propose:steps -- de/sauerbraten    one dish (a part of the path)
//   npm run propose:steps -- --count           only the counts
// The engine is TypeScript, so it is bundled with esbuild into a temporary folder first.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { compileSchemas } from '../../packages/app/compile-schemas.mjs';
import { makeClassics } from '../../packages/app/make-classics.mjs';
import { makeSubstitutes } from '../../packages/engine/scripts/make-substitutes.mjs';
import { makeTechniques } from '../../packages/engine/scripts/make-techniques.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dataDir = join(root, 'packages/app/data/classics/');
const args = process.argv.slice(2);
const countOnly = args.includes('--count');
const filter = args.find((a) => !a.startsWith('--'));

const files = readdirSync(dataDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((dir) =>
    readdirSync(join(dataDir, dir.name))
      .filter((f) => f.endsWith('.json'))
      .map((f) => `${dir.name}/${f}`),
  )
  .sort()
  .filter((f) => filter === undefined || f.includes(filter));

const catalogue = JSON.parse(
  readFileSync(join(root, 'packages/app/data/ingredient-catalogue.json'), 'utf8'),
);
const byId = new Map(catalogue.ingredients.map((i) => [i.id, i]));

/** The names a line goes by: its wanted text, or the catalogue's names, or its component's name. */
const namesOf = (line, classic) => {
  if (line.wanted !== undefined) return [line.wanted.en, line.wanted.de];
  if (line.ref?.kind === 'component') {
    const c = (classic.components ?? []).find((x) => x.id === line.ref.id);
    return c === undefined ? [] : [c.name.en, c.name.de];
  }
  const entry = byId.get(line.ref?.id);
  if (entry === undefined) return [];
  const de = entry.names?.de;
  return [entry.name, ...(de === undefined ? [] : [de.name, ...(de.aliases ?? [])])];
};

compileSchemas();
makeClassics();
makeTechniques();
makeSubstitutes();

const tmp = mkdtempSync(join(tmpdir(), 'culina-propose-'));
try {
  const outfile = join(tmp, 'engine.mjs');
  await build({
    entryPoints: [join(root, 'packages/engine/src/index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'error',
  });
  const { proposeStep } = await import(pathToFileURL(outfile).href);
  const show = (p) =>
    `${p.word === undefined ? '-' : `${p.word.kind}:${p.word.id} ("${p.matched}")`} uses [${p.uses.join(', ')}]`;
  const count = { steps: 0, technique: 0, action: 0, none: 0, uses: 0 };
  // How the proposal from the English text compares with the word the file has.
  const agree = { same: 0, other: 0, silent: 0, noWord: 0 };
  for (const f of files) {
    const classic = JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
    if (!countOnly) console.log(`\n# ${f}`);
    for (const component of classic.components ?? []) {
      const lines = component.lines
        .filter((l) => l.key !== undefined)
        .map((l) => ({ key: l.key, names: namesOf(l, classic) }));
      if (!countOnly) {
        console.log(`\n## ${component.id}`);
        for (const l of component.lines) {
          console.log(`   line ${l.key ?? '(no key)'}: ${namesOf(l, classic).join(' | ')}`);
        }
      }
      (component.steps ?? []).forEach((step, i) => {
        const en = proposeStep(step.text.en, lines);
        const de = proposeStep(step.text.de, lines);
        const has =
          step.technique !== undefined
            ? `technique:${step.technique}`
            : step.action !== undefined
              ? `action:${step.action}`
              : undefined;
        count.steps += 1;
        if (step.technique !== undefined) count.technique += 1;
        else if (step.action !== undefined) count.action += 1;
        else count.none += 1;
        if (step.uses !== undefined) count.uses += 1;
        if (has === undefined) agree.noWord += 1;
        else if (en.word === undefined) agree.silent += 1;
        else if (`${en.word.kind}:${en.word.id}` === has) agree.same += 1;
        else agree.other += 1;
        if (countOnly) return;
        console.log(`\n[${i}] has: ${has ?? '-'} uses [${(step.uses ?? []).join(', ')}]`);
        console.log(`    en: ${step.text.en}`);
        console.log(`        -> ${show(en)}`);
        console.log(`    de: ${step.text.de}`);
        console.log(`        -> ${show(de)}`);
      });
    }
  }
  console.log(
    `\n${count.steps} steps: ${count.technique} with a technique, ${count.action} with a plain action, ${count.none} with neither; ${count.uses} with uses.`,
  );
  console.log(
    `The proposal from the English text against the file's word: ${agree.same} the same, ${agree.other} another word, ${agree.silent} none proposed; ${agree.noWord} steps have no word to compare.`,
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
