// The folders that move to materia (docs/shared-model.md, step 8) import
// nothing from the rest of the engine: no unit table, no drink rules.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const general = ['ingredients', 'templates', 'specs', 'stock', 'shelf'];

test.each(general)('%s imports only from the general folders', (folder) => {
  const files = readdirSync(`${src}${folder}`).filter((f) => f.endsWith('.ts'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(`${src}${folder}/${file}`, 'utf8');
    const outside = [...text.matchAll(/from '\.\.\/([^/']+)/g)]
      .map((m) => m[1] as string)
      .filter((target) => !general.includes(target));
    expect(outside, `${folder}/${file}`).toEqual([]);
  }
});
