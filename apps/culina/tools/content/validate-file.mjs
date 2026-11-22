// Validates one technique file, handling rule file or dish file: the JSON Schema, then the engine's rules (cross
// references, units, settled values, texts in both languages), then a derive for 2 portions.
//   npm run validate:content -- packages/app/data/classics/de/<id>.json
//   npm run validate:content -- packages/engine/data/techniques/<id>.json
//   npm run validate:content -- packages/engine/data/handling/<id>.json
// The engine is TypeScript, so it is bundled with esbuild into a temporary folder first.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { build } from 'esbuild';
import { compileSchemas } from '../../packages/app/compile-schemas.mjs';
import { makeClassics } from '../../packages/app/make-classics.mjs';
import { makeSubstitutes } from '../../packages/engine/scripts/make-substitutes.mjs';
import { makeTechniques } from '../../packages/engine/scripts/make-techniques.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const schemaDir = join(root, 'packages/engine/schemas/');
const file = process.argv[2];
if (file === undefined) {
  console.error(
    'Usage: npm run validate:content -- <path to a technique, handling rule or dish .json file>',
  );
  process.exit(2);
}
const path = resolve(file);
const parts = path.split(sep);
const kind = parts.includes('techniques')
  ? 'technique'
  : parts.includes('handling')
    ? 'handling'
    : parts.includes('classics')
      ? 'classic'
      : '';
if (kind === '') {
  console.error(
    'The file must be in data/techniques/, data/handling/ or data/classics/<country>/.',
  );
  process.exit(2);
}

const problems = [];
const say = (text) => problems.push(text);
const doc = JSON.parse(readFileSync(path, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const f of readdirSync(schemaDir).filter((n) => n.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(schemaDir + f, 'utf8')));
}
const validate = ajv.getSchema(`https://nexumia-de.github.io/culina/schemas/${kind}.schema.json`);
if (!validate(doc)) {
  for (const e of validate.errors) say(`schema ${e.instancePath || '/'}: ${e.message}`);
}
if (basename(path) !== `${doc.id}.json`) say(`the file name must be ${doc.id}.json`);
if (kind === 'classic' && basename(dirname(path)) !== doc.country) {
  say(
    `the file must be in the folder of its country (${doc.country}), not ${basename(dirname(path))}`,
  );
}

// The generated, git-ignored files (compiled schemas, the technique and dish indexes) that the
// engine bundle needs: written first, so a fresh checkout works.
compileSchemas();
makeClassics();
makeTechniques();
makeSubstitutes();

const tmp = mkdtempSync(join(tmpdir(), 'culina-content-'));
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
  const engine = await import(pathToFileURL(outfile).href);
  const findings = (result) => (result.ok ? [] : result.error.findings);
  const show = (f) => `${f.code} at ${f.path}${f.value === undefined ? '' : ` (${f.value})`}`;
  if (kind === 'technique') {
    for (const f of findings(engine.validateTechnique(doc))) say(show(f));
  } else if (kind === 'handling') {
    const catalogue = JSON.parse(
      readFileSync(join(root, 'packages/app/data/ingredient-catalogue.json'), 'utf8'),
    );
    const context = {
      techniqueIds: new Set(engine.TECHNIQUES.map((t) => t.id)),
      ingredientIds: new Set(catalogue.ingredients.map((i) => i.id)),
    };
    for (const f of findings(engine.validateHandlingRule(doc, context))) say(show(f));
  } else {
    const catalogue = JSON.parse(
      readFileSync(join(root, 'packages/app/data/ingredient-catalogue.json'), 'utf8'),
    );
    const context = {
      techniques: engine.TECHNIQUES,
      ingredientIds: new Set(catalogue.ingredients.map((i) => i.id)),
    };
    for (const f of findings(engine.validateClassic(doc, context))) say(show(f));
    const derived = engine.deriveClassic(doc, { lang: 'en' });
    if (!derived.ok) say(`derive: ${derived.error.code} at ${derived.error.path ?? '-'}`);
    const wanted = engine.wantedLines(doc);
    if (wanted.length > 0) {
      console.log(
        `note: ${wanted.length} line(s) still name a wanted ingredient (the catalogue lacks it)`,
      );
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`${path}\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`ok: ${path}`);
