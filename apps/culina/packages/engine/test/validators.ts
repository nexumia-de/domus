// Compiled schema validators for the tests that read export files: the same schemas the app
// compiles at build time, here with Ajv at run time.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { RecordValidators } from '../src/index';

const schemaDir = fileURLToPath(new URL('../schemas/', import.meta.url));
const read = (name: string): { $id: string } =>
  JSON.parse(readFileSync(schemaDir + name, 'utf8')) as { $id: string };

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
  ajv.addSchema(read(file));
}

const compile = (name: string) => {
  const fn = ajv.getSchema(read(`${name}.schema.json`).$id);
  if (!fn) throw new Error(`schema ${name} not loaded`);
  return fn;
};

export const validators: RecordValidators = {
  ingredients: compile('ingredient'),
  templates: compile('template'),
  components: compile('component'),
  dishes: compile('dish'),
  stock: compile('stock'),
  affinities: compile('affinity'),
  tastings: compile('tasting'),
};

/** The export envelope schema, to check that the hand-written header rules agree with it. */
export const envelopeValidator = compile('export');

/** Shipped content and its example: the schemas of techniques, classics and skill state. */
export const contentValidators = {
  technique: compile('technique'),
  handling: compile('handling'),
  classic: compile('classic'),
  skill: compile('skill'),
  component: compile('component'),
};
