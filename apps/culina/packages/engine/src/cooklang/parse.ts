// Reads a `.cook` file into metadata and blocks (steps, notes, sections). Pure, written from the
// specification: paragraphs are steps, `--` and `[- -]` are comments, a line starting with `>` is
// a note, a line starting with `=` is a section, front matter is YAML between `---` lines.
import { parseInline, plainText } from './inline';
import type { Block, CooklangDocument, IngredientUse, MetaValue } from './types';

const unquote = (value: string): string => {
  const v = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(v);
  return quoted ? (quoted[2] as string) : v;
};

/** The YAML subset conventions use: `key: value`, `key: [a, b]` and `- item` lists. Nested maps are ignored. */
function parseMetadata(lines: readonly string[]): Record<string, MetaValue> {
  const out: Record<string, MetaValue> = {};
  let list: string[] | undefined;
  for (const line of lines) {
    const item = /^\s+-\s+(.*)$|^-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(unquote((item[1] ?? item[2]) as string));
      continue;
    }
    const pair = /^([^\s#:][^:]*):\s*(.*)$/.exec(line);
    list = undefined;
    if (!pair) continue;
    const key = (pair[1] as string).trim();
    const value = (pair[2] as string).trim();
    if (value === '') {
      list = [];
      out[key] = list;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = value
        .slice(1, -1)
        .split(',')
        .map(unquote)
        .filter((v) => v !== '');
    } else out[key] = unquote(value);
  }
  return Object.fromEntries(
    Object.entries(out).filter(([, value]) => !Array.isArray(value) || value.length > 0),
  );
}

/** Splits off a leading `---` … `---` block; the file has none when the closing line is absent. */
function frontMatter(text: string): { meta: string[]; body: string } {
  const lines = text.replace(/^\uFEFF/, '').split('\n');
  if ((lines[0] ?? '').trimEnd() !== '---') return { meta: [], body: lines.join('\n') };
  const end = lines.findIndex((l, i) => i > 0 && l.trimEnd() === '---');
  if (end < 0) return { meta: [], body: lines.join('\n') };
  return { meta: lines.slice(1, end), body: lines.slice(end + 1).join('\n') };
}

/** Comments out of the body: `[- … -]` first (it may span lines), then `--` to the end of line. */
const withoutComments = (body: string): string =>
  body
    .replace(/\[-[\s\S]*?-\]/g, '')
    .split('\n')
    .map((line) => {
      const at = line.indexOf('--');
      return at < 0 ? line : line.slice(0, at);
    })
    .join('\n');

/** A step's lines as one text: a trailing backslash keeps the line break, else a space joins. */
const joinLines = (lines: readonly string[]): string =>
  lines
    .map((l) => l.trim())
    .reduce((acc, line, i) => {
      if (i === 0) return line;
      const before = lines[i - 1]?.trim() ?? '';
      return before.endsWith('\\') ? `${acc}\n${line}` : `${acc} ${line}`;
    }, '')
    .replace(/\\\n/g, '\n')
    .replace(/\\$/, '');

/**
 * Reads a Cooklang recipe. Never fails: text that is no markup stays text.
 *
 * @param text - The content of a `.cook` file.
 */
export function parseCooklang(text: string): CooklangDocument {
  const { meta, body } = frontMatter(text.replace(/\r\n?/g, '\n'));
  const blocks: Block[] = [];
  let step: string[] = [];
  const flush = (): void => {
    if (step.length === 0) return;
    const segments = parseInline(joinLines(step));
    blocks.push({ type: 'step', segments, text: plainText(segments) });
    step = [];
  };
  for (const line of withoutComments(body).split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') flush();
    else if (trimmed.startsWith('>')) {
      flush();
      blocks.push({ type: 'note', text: trimmed.replace(/^>+\s*/, '') });
    } else if (trimmed.startsWith('=')) {
      flush();
      blocks.push({ type: 'section', name: trimmed.replace(/^=+\s*/, '').replace(/\s*=+$/, '') });
    } else step.push(line);
  }
  flush();
  return { metadata: parseMetadata(meta), blocks };
}

/** Every ingredient occurrence of a document, in order, with its block and section. */
export function ingredientUses(doc: CooklangDocument): IngredientUse[] {
  const uses: IngredientUse[] = [];
  let section: string | undefined;
  for (const [block, b] of doc.blocks.entries()) {
    if (b.type === 'section') section = b.name === '' ? undefined : b.name;
    if (b.type !== 'step') continue;
    for (const seg of b.segments) {
      if (seg.type === 'ingredient') {
        uses.push({ ...seg, block, ...(section === undefined ? {} : { section }) });
      }
    }
  }
  return uses;
}
