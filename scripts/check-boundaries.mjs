// Keeps the parts of this repository apart (docs/decisions/one-repository.md):
// an app imports nothing of another app, and a shared package imports nothing
// of an app; a pure shared package (materia, the list package) imports no host
// package either. Reads every import and export specifier of the source files.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const skip = new Set(['node_modules', 'dist', 'coverage', '.git']);
const sourceFile = /\.(ts|mts|js|mjs)$/;
const specifier = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g;

/** The part a path belongs to: `apps/<name>` or `packages/<name>`, else null. */
export function partOf(path) {
  const [kind, name] = relative(root, path).split(sep);
  return (kind === 'apps' || kind === 'packages') && name ? `${kind}/${name}` : null;
}

/** Package scopes that belong to one app, taken from the folder names. */
function appScopes() {
  return readdirSync(join(root, 'apps')).map((name) => ({ part: `apps/${name}`, scope: name }));
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (sourceFile.test(name)) yield path;
  }
}

/** The shared packages that are pure: their `src/` uses no host API, so no host package either. */
const PURE = new Set(['packages/model', 'packages/list']);
const HOST_PACKAGES = ['@nexumia-de/hospes', '@nexumia-de/gjs'];

/** Why `spec`, imported by a file of `part` in `dir`, crosses a boundary; null if it does not. */
export function problem(part, dir, spec, scopes, source = true) {
  if (spec.startsWith('.')) {
    const target = partOf(resolve(dir, spec));
    return target === part ? null : `leaves ${part} by a relative path`;
  }
  if (
    source &&
    PURE.has(part) &&
    HOST_PACKAGES.some((h) => spec === h || spec.startsWith(`${h}/`))
  ) {
    return `is pure and imports the host package ${spec}`;
  }
  for (const { part: app, scope } of scopes) {
    const named = spec === scope || spec.startsWith(`@${scope}/`) || spec.startsWith(`${scope}/`);
    if (named && app !== part) return `imports ${app}`;
  }
  return null;
}

const scopes = appScopes();
const found = [];
for (const top of ['apps', 'packages']) {
  for (const file of files(join(root, top))) {
    const part = partOf(file);
    if (!part) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(specifier)) {
      const source = relative(join(root, part), file).startsWith(`src${sep}`);
      const why = problem(part, dirname(file), match[2], scopes, source);
      if (why) found.push(`${relative(root, file)}: '${match[2]}' ${why}`);
    }
  }
}

if (found.length > 0) {
  console.error(found.join('\n'));
  console.error(`\n${found.length} import(s) cross a boundary.`);
  process.exit(1);
}
console.log(
  'boundaries: no app imports another app, no shared package imports an app, no pure package imports a host package',
);
