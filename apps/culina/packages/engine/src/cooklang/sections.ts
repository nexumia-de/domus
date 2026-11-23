// The parts of a `.cook` file: the text before the first section line, then one part per section.
// The specification calls sections "components that need to be prepared separately" (README,
// Sections); like cooklang-rs, the text before the first section is a part without a name.
import type { CooklangDocument } from './types';

export interface CookPart {
  /** The section name; absent before the first section and for a `=` line without a name. */
  name?: string;
  /** True for the text before the first section line (the whole file when it has none). */
  leading: boolean;
  /** The steps and notes of the part, in file order. */
  blocks: { type: 'step' | 'note'; text: string }[];
  /** The part's ingredient occurrences, as indexes in `ingredientUses(doc)` order. */
  uses: number[];
}

/** True when the file has at least one section line. */
export const hasSections = (doc: CooklangDocument): boolean =>
  doc.blocks.some((b) => b.type === 'section');

/** The parts of a document in file order; a part without steps or notes is left out. */
export function cooklangParts(doc: CooklangDocument): CookPart[] {
  const parts: CookPart[] = [];
  let current: CookPart = { leading: true, blocks: [], uses: [] };
  let use = 0;
  for (const b of doc.blocks) {
    if (b.type === 'section') {
      parts.push(current);
      current = {
        ...(b.name === '' ? {} : { name: b.name }),
        leading: false,
        blocks: [],
        uses: [],
      };
      continue;
    }
    current.blocks.push({ type: b.type, text: b.text });
    if (b.type !== 'step') continue;
    for (const seg of b.segments) if (seg.type === 'ingredient') current.uses.push(use++);
  }
  parts.push(current);
  return parts.filter((p) => p.blocks.length > 0);
}
