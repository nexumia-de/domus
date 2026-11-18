// Writes one component as a `.cook` file: core syntax of the specification only (no parser
// extensions). Percent lines become grams; what has no place in Cooklang is listed in `lost`.
import { componentLineGrams } from '../components/lines';
import type { Component, ComponentLine, FactsByIngredient } from '../components/types';

/** The fields of a stored component the writer reads. */
export interface CooklangComponent extends Component {
  name: string;
  role?: string;
  templateId?: string;
  method?: readonly string[];
  version: { family: string; parent?: string; change?: string; reason?: string };
}

export interface SerializeContext {
  ingredientName(id: string): string;
  componentName(id: string): string;
  /** Density and unit weight per ingredient id, to turn percent lines into grams. */
  facts: FactsByIngredient;
  /** The tasting note written as a `>` note (the latest on this version). */
  tasting?: string;
  /** How many other notes (older, or on other versions) are not written. */
  otherNotes?: number;
}

/** What the file cannot carry of this component (docs/decisions/cooklang.md, What is lost). */
export type Loss = 'ratios' | 'roles' | 'states' | 'versions' | 'tastings' | 'characters';

export interface SerializeResult {
  text: string;
  /** The file name: the component's name made safe, and `.cook`. */
  fileName: string;
  lost: Loss[];
}

const number = (n: number): string => String(Number(n.toPrecision(10)));

/** A name safe inside `@…{…}`: no markup characters, no line breaks. */
const cleanName = (name: string): string =>
  name
    .replace(/[@#~{}%()\\\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'ingredient';

/** The file stem of a component name: no path or reserved characters, spaces as hyphens. */
export const fileStem = (name: string): string =>
  name
    .replace(/[/\\:*?"<>|.]/g, ' ')
    .replace(/\p{Cc}/gu, ' ')
    .trim()
    .replace(/\s+/g, '-') || 'component';

const quantity = (line: ComponentLine, grams: number | undefined): string => {
  const amount = line.amount;
  if (amount === undefined) return '';
  if (amount.unit === 'percent') return grams === undefined ? '' : `${number(grams)}%g`;
  return amount.unit === 'count' ? number(amount.value) : `${number(amount.value)}%${amount.unit}`;
};

/** Step text without what Cooklang would read as markup; true when something was removed. */
const safeStep = (text: string): { text: string; changed: boolean } => {
  const safe = text
    .replace(/[@#~]/g, '')
    .replace(/--/g, '-')
    .replace(/\[-/g, '[')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[>=\s]+/, '')
    .trim();
  return { text: safe, changed: safe !== text.trim() };
};

const yamlValue = (value: string): string =>
  /^[\p{L}\p{N}][^:#]*$/u.test(value) && !/\s$/.test(value) ? value : JSON.stringify(value);

/**
 * @param component - A stored component (one version).
 * @param context - Names, ingredient facts and the tasting note to write.
 * @returns The file text, its name and what was lost.
 */
export function componentToCooklang(
  component: CooklangComponent,
  context: SerializeContext,
): SerializeResult {
  const lost = new Set<Loss>();
  const grams = componentLineGrams(component, context.facts);
  const gramsOf = new Map(grams.ok ? grams.lines.map((l) => [l.index, l.g]) : []);

  const uses = component.lines.map((line, index) => {
    if (line.amount?.unit === 'percent') lost.add('ratios');
    if (line.role !== undefined) lost.add('roles');
    if (line.state !== undefined) lost.add('states');
    const q = quantity(line, gramsOf.get(index));
    const prep = line.note === undefined ? '' : `(${line.note.replace(/[()\n]/g, ' ').trim()})`;
    if (line.ref.kind === 'component') {
      const path = fileStem(context.componentName(line.ref.id));
      return `@./${path}{${q}}${prep}`;
    }
    return `@${cleanName(context.ingredientName(line.ref.id))}{${q}}${prep}`;
  });
  if (component.role !== undefined || component.templateId !== undefined) lost.add('ratios');
  if (component.role !== undefined) lost.add('roles');
  const v = component.version;
  if (v.parent !== undefined || v.change !== undefined || v.reason !== undefined)
    lost.add('versions');
  if ((context.otherNotes ?? 0) > 0) lost.add('tastings');

  const head = ['---', `title: ${yamlValue(component.name.replace(/\s+/g, ' ').trim())}`];
  if (component.yield !== undefined) {
    head.push(`yield: ${number(component.yield.amount.value)}%${component.yield.amount.unit}`);
  }
  head.push('---');

  const paragraphs: string[] = [head.join('\n')];
  const tasting = context.tasting?.replace(/\s+/g, ' ').trim();
  if (tasting) paragraphs.push(`> ${tasting}`);
  const joined =
    uses.length === 1
      ? (uses[0] as string)
      : `${uses.slice(0, -1).join(', ')} and ${uses[uses.length - 1] as string}`;
  paragraphs.push(`Combine ${joined}.`);
  for (const step of component.method ?? []) {
    const safe = safeStep(step);
    if (safe.changed) lost.add('characters');
    if (safe.text !== '') paragraphs.push(safe.text);
  }
  return {
    text: `${paragraphs.join('\n\n')}\n`,
    fileName: `${fileStem(component.name)}.cook`,
    lost: [...lost],
  };
}
