// Collects the bilingual texts of shipped content (techniques, substitutes, classics) from their JSON files,
// for tests that scan every text. A text is any object with a string `en` and a string `de`.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface ContentText {
  /** The file and the path inside it. */
  where: string;
  en: string;
  de: string;
}

const engine = (path: string): string =>
  fileURLToPath(new URL(`../../engine/${path}`, import.meta.url));
const app = (path: string): string => fileURLToPath(new URL(`../${path}`, import.meta.url));

/** Every `.json` file under a folder (recursive), as absolute paths in name order. */
export function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? jsonFiles(`${dir}/${entry.name}`)
        : entry.name.endsWith('.json')
          ? [`${dir}/${entry.name}`]
          : [],
    )
    .sort();
}

/** The folders of shipped content. */
export const TECHNIQUE_DIR = engine('data/techniques');
export const HANDLING_DIR = engine('data/handling');
export const SUBSTITUTE_DIR = engine('data/substitutes');
export const CLASSIC_DIR = app('data/classics');
/** The fictional examples: always present, so the scan is never empty. */
export const EXAMPLE_FILES = [
  engine('schemas/examples/technique.valid.json'),
  engine('schemas/examples/substitute.valid.json'),
  engine('schemas/examples/classic.valid.json'),
  engine('schemas/examples/handling.valid.json'),
];

function walk(value: unknown, where: string, out: ContentText[]): void {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${where}[${i}]`, out));
  else if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.en === 'string' && typeof o.de === 'string')
      out.push({ where, en: o.en, de: o.de });
    else for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`, out);
  }
}

/** The texts of the given JSON files. */
export function textsOf(files: readonly string[]): ContentText[] {
  const out: ContentText[] = [];
  for (const file of files) {
    walk(JSON.parse(readFileSync(file, 'utf8')), file.split('/').slice(-2).join('/'), out);
  }
  return out;
}

/** The texts of every shipped technique, handling rule, substitute and classic. */
export const shippedTexts = (): ContentText[] =>
  textsOf([
    ...jsonFiles(TECHNIQUE_DIR),
    ...jsonFiles(HANDLING_DIR),
    ...jsonFiles(SUBSTITUTE_DIR),
    ...jsonFiles(CLASSIC_DIR),
  ]);
