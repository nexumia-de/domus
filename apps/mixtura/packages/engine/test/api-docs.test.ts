// Every exported value has a TSDoc comment with @param for each parameter and
// @returns, and every exported value is a row of the API tables in
// docs/engine.md.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, test } from 'vitest';
import * as api from '../src/index';

const root = fileURLToPath(new URL('../', import.meta.url));
const program = ts.createProgram([`${root}src/index.ts`], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  strict: true,
  noEmit: true,
});
const checker = program.getTypeChecker();
const entry = program.getSourceFile(`${root}src/index.ts`) as ts.SourceFile;
const exported = checker.getExportsOfModule(checker.getSymbolAtLocation(entry) as ts.Symbol);
const values = exported
  .filter((s) => Object.keys(api).includes(s.name))
  .map((s) => ({
    name: s.name,
    sym: s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s,
  }));

test('the runtime exports are all found in the program', () => {
  expect(values.map((v) => v.name).sort()).toEqual(Object.keys(api).sort());
});

// materia 0.2.0 documents its sync functions without @param/@returns and its
// format constants not at all; their rows in docs/engine.md still are
// required below. To be fixed in materia, then remove this list.
const UPSTREAM_UNDOCUMENTED = new Set([
  'buildDocument',
  'buildEnvelope',
  'combinePlaces',
  'DOCUMENT_FORMAT',
  'DOCUMENT_VERSION',
  'ENVELOPE_FORMAT',
  'ENVELOPE_VERSION',
  'envelopeAad',
  'mergePlace',
  'mergeRecords',
  'parseDocument',
  'parseEnvelope',
  'planSync',
]);

test.each(
  values.filter((v) => !UPSTREAM_UNDOCUMENTED.has(v.name)).map((v) => [v.name, v.sym] as const),
)('%s has a TSDoc comment', (name, sym) => {
  const doc = ts.displayPartsToString(sym.getDocumentationComment(checker));
  expect(doc.trim().length, `${name} has no comment`).toBeGreaterThan(10);
  const decl = sym.declarations?.[0];
  if (!decl || !ts.isFunctionDeclaration(decl)) return;
  const tags = ts.getJSDocTags(decl);
  const params = tags
    .filter((t) => t.tagName.text === 'param')
    .map((t) => (t as ts.JSDocParameterTag).name.getText());
  const wanted = decl.parameters.map((p) => p.name.getText());
  expect(params, `${name} @param`).toEqual(wanted);
  expect(
    tags.some((t) => t.tagName.text === 'returns'),
    `${name} @returns`,
  ).toBe(true);
});

test('every exported value is a row of the API tables in docs/engine.md', () => {
  const doc = readFileSync(`${root}../../docs/engine.md`, 'utf8');
  for (const name of Object.keys(api))
    expect(doc, name).toMatch(new RegExp(`^\\| \`${name}\` +\\| \``, 'm'));
  const rows = [...doc.matchAll(/^\| `([A-Za-z]+)` +\| `/gm)].map((m) => m[1]);
  for (const row of rows)
    expect(Object.keys(api), `${row} is documented but not exported`).toContain(row);
});
