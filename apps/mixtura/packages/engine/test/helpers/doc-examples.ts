// Runs the code blocks of docs/engine.md that start with ```ts example:
// each imports from '@mixtura/engine' (replaced by the public entry), builds a
// `result` and ends with a comment line `// result = <JSON>`.
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import * as api from '../../src/index';

export interface Example {
  title: string;
  code: string;
  expected: unknown;
}

export function examples(docPath: string): Example[] {
  const text = readFileSync(docPath, 'utf8');
  const out: Example[] = [];
  for (const m of text.matchAll(/```ts example ([^\n]+)\n([\s\S]*?)```/g)) {
    const code = m[2] as string;
    const tail = /\/\/ result = ([\s\S]*)$/.exec(code.trimEnd());
    if (!tail) throw new Error(`example "${m[1]}" has no "// result = " line`);
    const expected = JSON.parse((tail[1] as string).replace(/\n\/\/ ?/g, '\n')) as unknown;
    out.push({ title: (m[1] as string).trim(), code, expected });
  }
  return out;
}

export function run(code: string): unknown {
  const body = code.replace(
    /^import \{([^}]*)\} from '@mixtura\/engine';\n/m,
    (_all, names: string) => {
      const list = names
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      return `const { ${list.join(', ')} } = api;\n`;
    },
  );
  const js = transformSync(body, { loader: 'ts', target: 'es2022' }).code;
  return new Function('api', `${js}\nreturn result;`)(api);
}
