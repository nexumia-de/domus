// Writes one component, or one dish with a section per slot, as a `.cook` file: core syntax of
// the specification only (no parser extensions). Percent lines become grams; what has no place
// in Cooklang is listed in `lost`.
import { componentLineGrams } from '../components/lines';
import type {
  Component,
  ComponentLine,
  ComponentRef,
  FactsByIngredient,
} from '../components/types';

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
  /** The component's structured steps, one line each as the app shows them; written after `method`. */
  steps?: readonly string[];
  /** The tasting note written as a `>` note (the latest on this version). */
  tasting?: string;
  /** How many other notes (older, or on other versions) are not written. */
  otherNotes?: number;
}

/** What the file cannot carry (docs/decisions/cooklang.md, What is lost; docs/exchange.md). */
export type Loss =
  | 'ratios'
  | 'roles'
  | 'states'
  | 'versions'
  | 'tastings'
  | 'characters'
  | 'slots'
  | 'yields'
  | 'details';

export interface SerializeResult {
  text: string;
  /** The file name: the component's or dish's name made safe, and `.cook`. */
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

/** A section line `= Name`: no comment marks, no `=` at either end, one line. */
const sectionLine = (name: string): { text: string; changed: boolean } => {
  const one = name.replace(/\s+/g, ' ').trim();
  const safe = one
    .replace(/--/g, '-')
    .replace(/\[-/g, '[')
    .replace(/^[=\s]+|[=\s]+$/g, '');
  return { text: `= ${safe || 'component'}`, changed: safe !== one };
};

const yamlValue = (value: string): string =>
  /^[\p{L}\p{N}][^:#]*$/u.test(value) && !/\s$/.test(value) ? value : JSON.stringify(value);

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** `@name{qty}(prep)` or `@./Name{qty}(prep)` for one line. */
function lineUse(
  ref: ComponentRef,
  q: string,
  note: string | undefined,
  context: Pick<SerializeContext, 'ingredientName' | 'componentName'>,
): string {
  const prep = note === undefined ? '' : `(${note.replace(/[()\n]/g, ' ').trim()})`;
  if (ref.kind === 'component') return `@./${fileStem(context.componentName(ref.id))}{${q}}${prep}`;
  return `@${cleanName(context.ingredientName(ref.id))}{${q}}${prep}`;
}

/** "A, B and C". */
const listed = (uses: readonly string[]): string =>
  uses.length === 1
    ? (uses[0] as string)
    : `${uses.slice(0, -1).join(', ')} and ${uses[uses.length - 1] as string}`;

/** Paragraphs of text that must not read as markup; a removed character is recorded. */
const safeParagraphs = (texts: readonly string[], lost: Set<Loss>): string[] =>
  texts.flatMap((step) => {
    const safe = safeStep(step);
    if (safe.changed) lost.add('characters');
    return safe.text === '' ? [] : [safe.text];
  });

/** The body of one component: one step that lists its lines, then its method and steps. */
function componentBody(
  component: CooklangComponent,
  context: SerializeContext,
  lost: Set<Loss>,
): string[] {
  const grams = componentLineGrams(component, context.facts);
  const gramsOf = new Map(grams.ok ? grams.lines.map((l) => [l.index, l.g]) : []);
  const uses = component.lines.map((line, index) => {
    if (line.amount?.unit === 'percent') lost.add('ratios');
    if (line.role !== undefined) lost.add('roles');
    if (line.state !== undefined) lost.add('states');
    return lineUse(line.ref, quantity(line, gramsOf.get(index)), line.note, context);
  });
  if (component.role !== undefined || component.templateId !== undefined) lost.add('ratios');
  if (component.role !== undefined) lost.add('roles');
  const v = component.version;
  if (v.parent !== undefined || v.change !== undefined || v.reason !== undefined)
    lost.add('versions');
  return [
    `Combine ${listed(uses)}.`,
    ...safeParagraphs([...(component.method ?? []), ...(context.steps ?? [])], lost),
  ];
}

/**
 * @param component - A stored component (one version).
 * @param context - Names, ingredient facts, its steps as text and the tasting note to write.
 * @returns The file text, its name and what was lost.
 */
export function componentToCooklang(
  component: CooklangComponent,
  context: SerializeContext,
): SerializeResult {
  const lost = new Set<Loss>();
  if ((context.otherNotes ?? 0) > 0) lost.add('tastings');
  const head = ['---', `title: ${yamlValue(oneLine(component.name))}`];
  if (component.yield !== undefined) {
    head.push(`yield: ${number(component.yield.amount.value)}%${component.yield.amount.unit}`);
  }
  head.push('---');
  const paragraphs: string[] = [head.join('\n')];
  const tasting = context.tasting === undefined ? '' : oneLine(context.tasting);
  if (tasting !== '') paragraphs.push(`> ${tasting}`);
  paragraphs.push(...componentBody(component, context, lost));
  return {
    text: `${paragraphs.join('\n\n')}\n`,
    fileName: `${fileStem(component.name)}.cook`,
    lost: [...lost],
  };
}

/** The fields of a stored dish the writer reads. */
export interface CooklangDish {
  name: string;
  portions?: number;
  course?: string;
  cuisine?: string;
  characters?: unknown;
  note?: string;
  slots: readonly {
    role: string;
    ref: ComponentRef;
    amount?: { value: number; unit: string };
    optional?: boolean;
  }[];
  steps?: readonly unknown[];
  version: { family: string; parent?: string; change?: string; reason?: string };
}

export interface DishSerializeContext {
  ingredientName(id: string): string;
  componentName(id: string): string;
  /** The stored component a slot means; undefined when the notebook does not have it. */
  component(id: string): CooklangComponent | undefined;
  /** A component's structured steps, one line each as the app shows them. */
  componentSteps?(id: string): readonly string[];
  /** Density and unit weight per ingredient id, to turn percent lines into grams. */
  facts: FactsByIngredient;
  /** The dish's assembly steps, one line each as the app shows them. */
  assembly?: readonly string[];
  /** The name of the section the assembly steps are written under, in the app's language. */
  assemblyName: string;
  /** The tasting note written as a `>` note (the latest on this version of the dish). */
  tasting?: string;
  /** How many other notes on the dish's family are not written. */
  otherNotes?: number;
}

/**
 * One file for a dish: the front matter (`title`, `servings` from the portions), the tasting note
 * and the dish's note before the first section, then one section per slot in slot order (a
 * component's lines and steps; an ingredient slot as one line), then the assembly steps under
 * a section of their own. Read back, the file gives the same parts (docs/exchange.md#cooklang).
 *
 * @param dish - A stored dish (one version).
 * @param context - Names, the components, facts, steps as text and the tasting note to write.
 */
export function dishToCooklang(dish: CooklangDish, context: DishSerializeContext): SerializeResult {
  const lost = new Set<Loss>();
  if ((context.otherNotes ?? 0) > 0) lost.add('tastings');
  const v = dish.version;
  if (v.parent !== undefined || v.change !== undefined || v.reason !== undefined)
    lost.add('versions');
  if (dish.course !== undefined || dish.cuisine !== undefined || dish.characters !== undefined)
    lost.add('details');
  const head = ['---', `title: ${yamlValue(oneLine(dish.name))}`];
  if (dish.portions !== undefined) head.push(`servings: ${number(dish.portions)}`);
  head.push('---');
  const paragraphs: string[] = [head.join('\n')];
  const tasting = context.tasting === undefined ? '' : oneLine(context.tasting);
  if (tasting !== '') paragraphs.push(`> ${tasting}`);
  if (dish.note !== undefined) paragraphs.push(...safeParagraphs(dish.note.split(/\n\s*\n/), lost));

  const section = (name: string): void => {
    const line = sectionLine(name);
    if (line.changed) lost.add('characters');
    paragraphs.push(line.text);
  };
  for (const slot of dish.slots) {
    lost.add('roles');
    if (slot.optional === true) lost.add('slots');
    if (slot.ref.kind === 'ingredient') {
      const q =
        slot.amount === undefined
          ? ''
          : slot.amount.unit === 'count'
            ? number(slot.amount.value)
            : `${number(slot.amount.value)}%${slot.amount.unit}`;
      section(context.ingredientName(slot.ref.id));
      paragraphs.push(`Add ${lineUse(slot.ref, q, undefined, context)}.`);
      continue;
    }
    if (slot.amount !== undefined) lost.add('slots');
    const component = context.component(slot.ref.id);
    section(component?.name ?? context.componentName(slot.ref.id));
    if (component === undefined) {
      // Not in the notebook: the slot stays a reference to a file of that name.
      paragraphs.push(`Add ${lineUse(slot.ref, '', undefined, context)}.`);
      continue;
    }
    if (component.yield !== undefined) lost.add('yields');
    const steps = context.componentSteps?.(component.id);
    paragraphs.push(
      ...componentBody(
        component,
        { ...context, ...(steps === undefined ? {} : { steps }) } as SerializeContext,
        lost,
      ),
    );
  }
  const assembly = safeParagraphs(context.assembly ?? [], lost);
  if (assembly.length > 0) {
    section(context.assemblyName);
    paragraphs.push(...assembly);
  }
  return {
    text: `${paragraphs.join('\n\n')}\n`,
    fileName: `${fileStem(dish.name)}.cook`,
    lost: [...lost],
  };
}
