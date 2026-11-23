// Turns a read Cooklang document and the user's decisions into records: one component (version 1
// of a new family), or, for a file with sections, a dish of one component per section. Pure: ids
// and the date come in as input.
import type { IngredientFacts } from '../amounts/types';
import type { ComponentLine } from '../components/types';
import { resolveAmount, type AmountErrorCode, type AmountMode } from './amount';
import { ingredientUses } from './parse';
import { cooklangParts, type CookPart } from './sections';
import type { Block, CooklangDocument, IngredientUse } from './types';

/** What the user decided for one ingredient occurrence of the file. */
export interface LineDecision {
  /** The notebook ingredient or component the name means. */
  target: { kind: 'ingredient' | 'component'; id: string };
  amount: AmountMode;
  /** A role id, or none. */
  role?: string;
}

export interface ImportOptions {
  /** The new record's id; it is also the family. */
  id: string;
  name: string;
  /** Calendar day from the host's clock. */
  date: string;
  /** The text of the version's `change`, naming the file. */
  change: string;
  /** Set to make the record a variation of that version record. */
  parent?: string;
  /** Output weight in grams the user entered; none when left out. */
  yieldGrams?: number;
  /** Role whose mass is 100 percent, chosen among the line roles. */
  percentBase?: string;
  /** Density and unit weight per ingredient id. */
  facts(target: LineDecision['target']): IngredientFacts;
}

export type ImportErrorCode = AmountErrorCode | 'no-lines' | 'decision-count';

export type ImportResult =
  | {
      ok: true;
      /** A stored component record. */
      component: Record<string, unknown>;
      /** Indexes (in `ingredientUses` order) of the lines kept without an amount. */
      unmeasured: number[];
    }
  | { ok: false; error: { code: ImportErrorCode; index?: number } };

/** The note of a line: the short preparation and the quantity as written when it is not the amount. */
const noteOf = (prep: string | undefined, original: string | undefined): string | undefined => {
  const parts = [prep, original].filter((p): p is string => p !== undefined && p !== '');
  return parts.length === 0 ? undefined : parts.join(', ');
};

/** The lines of the given occurrences, with the indexes of those kept without an amount. */
function resolveLines(
  uses: readonly IngredientUse[],
  indexes: readonly number[],
  decisions: readonly LineDecision[],
  facts: ImportOptions['facts'],
):
  | { ok: true; lines: ComponentLine[]; unmeasured: number[] }
  | { ok: false; error: { code: ImportErrorCode; index: number } } {
  const lines: ComponentLine[] = [];
  const unmeasured: number[] = [];
  for (const index of indexes) {
    const use = uses[index] as IngredientUse;
    const decision = decisions[index] as LineDecision;
    const done = resolveAmount(use.quantity, decision.amount, facts(decision.target));
    if (!done.ok) return { ok: false, error: { code: done.error.code, index } };
    if (done.unmeasured) unmeasured.push(index);
    const note = noteOf(use.note, done.original);
    lines.push({
      ref: decision.target,
      ...(done.amount === undefined ? {} : { amount: done.amount }),
      ...(decision.role === undefined || decision.role === '' ? {} : { role: decision.role }),
      ...(note === undefined ? {} : { note }),
    });
  }
  return { ok: true, lines, unmeasured };
}

/** What one stored component of an import holds besides its lines and method. */
interface RecordOptions {
  id: string;
  name: string;
  date: string;
  change: string;
  parent?: string;
  yieldGrams?: number;
  percentBase?: string;
}

/** A stored component record, version 1 of its own family (or of a variation). */
function componentRecord(
  options: RecordOptions,
  lines: readonly ComponentLine[],
  method: readonly string[],
): Record<string, unknown> {
  const kept = method.filter((m) => m !== '');
  return {
    id: options.id,
    name: options.name,
    ...(options.percentBase === undefined ? {} : { percentBase: options.percentBase }),
    lines,
    ...(options.yieldGrams === undefined
      ? {}
      : { yield: { amount: { value: options.yieldGrams, unit: 'g' }, source: 'user' } }),
    ...(kept.length === 0 ? {} : { method: kept }),
    version: {
      family: options.id,
      date: options.date,
      change: options.change,
      ...(options.parent === undefined ? {} : { parent: options.parent }),
    },
  };
}

/** The text of a block: a step's or note's text, a section's name. */
const blockText = (b: Block): string => (b.type === 'section' ? b.name : b.text);

/**
 * @param doc - The parsed file.
 * @param decisions - One per ingredient occurrence, in `ingredientUses(doc)` order.
 * @param options - Ids, date, change text and what the user entered for the whole component.
 */
export function importComponent(
  doc: CooklangDocument,
  decisions: readonly LineDecision[],
  options: ImportOptions,
): ImportResult {
  const uses = ingredientUses(doc);
  if (uses.length === 0) return { ok: false, error: { code: 'no-lines' } };
  if (decisions.length !== uses.length) return { ok: false, error: { code: 'decision-count' } };
  const done = resolveLines(
    uses,
    uses.map((_, i) => i),
    decisions,
    options.facts,
  );
  if (!done.ok) return done;
  // Read as one component, a section name stays an entry of the method of its own.
  return {
    ok: true,
    component: componentRecord(options, done.lines, doc.blocks.map(blockText)),
    unmeasured: done.unmeasured,
  };
}

/** What the user entered for one component of a dish, in the order of `cooklangParts`. */
export interface DishComponentOptions {
  /** The new component's id; it is also its family. */
  id: string;
  name: string;
  /** The role of its slot in the dish. */
  role: string;
  yieldGrams?: number;
  percentBase?: string;
}

export interface DishImportOptions {
  /** The new dish's id; it is also the family. */
  id: string;
  name: string;
  /** Calendar day from the host's clock. */
  date: string;
  /** The text of every new version's `change`, naming the file. */
  change: string;
  /** Set to make the dish a variation of that version record. */
  parent?: string;
  /** Portions the user confirmed (prefilled from `servings`); none when left out. */
  portions?: number;
  /** One per part with ingredient lines (`cooklangParts(doc)` with `uses`), in file order. */
  components: readonly DishComponentOptions[];
  /** Density and unit weight per ingredient id. */
  facts(target: LineDecision['target']): IngredientFacts;
}

export type DishImportErrorCode = ImportErrorCode | 'component-count';

export type DishImportResult =
  | {
      ok: true;
      /** A stored dish record. */
      dish: Record<string, unknown>;
      /** Stored component records, one per part with lines, in file order. */
      components: Record<string, unknown>[];
      /** Indexes (in `ingredientUses` order) of the lines kept without an amount. */
      unmeasured: number[];
    }
  | { ok: false; error: { code: DishImportErrorCode; index?: number } };

const textsOf = (part: CookPart): string[] =>
  part.blocks.map((b) => b.text).filter((t) => t !== '');

/**
 * A file with sections as a dish (docs/decisions/ai-prompt-import.md, point 6): each part with
 * ingredient lines becomes a component, version 1 of its own family, filling one slot of the
 * dish in file order; the text before the first section, when it has no ingredient lines, becomes
 * the dish's note, and a later part without lines becomes assembly steps of the dish.
 *
 * @param doc - The parsed file.
 * @param decisions - One per ingredient occurrence, in `ingredientUses(doc)` order.
 * @param options - Ids, date, change text, the dish's fields and one entry per component.
 */
export function importDish(
  doc: CooklangDocument,
  decisions: readonly LineDecision[],
  options: DishImportOptions,
): DishImportResult {
  const uses = ingredientUses(doc);
  if (uses.length === 0) return { ok: false, error: { code: 'no-lines' } };
  if (decisions.length !== uses.length) return { ok: false, error: { code: 'decision-count' } };
  const parts = cooklangParts(doc);
  const withLines = parts.filter((p) => p.uses.length > 0);
  if (withLines.length !== options.components.length) {
    return { ok: false, error: { code: 'component-count' } };
  }
  const components: Record<string, unknown>[] = [];
  const unmeasured: number[] = [];
  for (const [i, part] of withLines.entries()) {
    const own = options.components[i] as DishComponentOptions;
    const done = resolveLines(uses, part.uses, decisions, options.facts);
    if (!done.ok) return done;
    unmeasured.push(...done.unmeasured);
    const record: RecordOptions = {
      id: own.id,
      name: own.name,
      date: options.date,
      change: options.change,
      ...(own.yieldGrams === undefined ? {} : { yieldGrams: own.yieldGrams }),
      ...(own.percentBase === undefined ? {} : { percentBase: own.percentBase }),
    };
    components.push(componentRecord(record, done.lines, textsOf(part)));
  }
  const note = parts
    .filter((p) => p.leading && p.uses.length === 0)
    .flatMap(textsOf)
    .join('\n\n');
  const steps = parts
    .filter((p) => !p.leading && p.uses.length === 0)
    .flatMap(textsOf)
    .map((text) => ({ note: text }));
  const dish = {
    id: options.id,
    name: options.name,
    ...(options.portions === undefined ? {} : { portions: options.portions }),
    slots: options.components.map((c) => ({
      role: c.role,
      ref: { kind: 'component', id: c.id },
    })),
    ...(steps.length === 0 ? {} : { steps }),
    version: {
      family: options.id,
      date: options.date,
      change: options.change,
      ...(options.parent === undefined ? {} : { parent: options.parent }),
    },
    ...(note === '' ? {} : { note }),
  };
  return { ok: true, dish, components, unmeasured };
}
