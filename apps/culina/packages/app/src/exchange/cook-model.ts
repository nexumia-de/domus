// The state of the Cooklang completion step, without any DOM: which names the file uses, what
// each is taken to mean, and what each line's amount and role are. A name is asked once; the
// choice holds for every line with that name (docs/behaviour.md, Import).
import {
  availableModes,
  ingredientUses,
  matchIngredients,
  normaliseName,
  parseCooklang,
} from '@culina/engine';
import type {
  AmountMode,
  Candidate,
  CooklangDocument,
  IngredientFacts,
  IngredientUse,
  LineDecision,
} from '@culina/engine';

export type Target = LineDecision['target'];

export type NameChoice =
  { type: 'unset' } | { type: 'existing'; target: Target } | { type: 'new'; parentId?: string };

export interface NameOption {
  target: Target;
  name: string;
  /** `same` for an exact match, `close`, or `component` for a recipe reference. */
  tag: 'same' | 'close' | 'component';
}

export interface NameRow {
  key: string;
  /** The name as first written in the file. */
  label: string;
  reference: boolean;
  options: NameOption[];
  /** Ancestors of the matches: a new ingredient may be filed under one of them. */
  classes: Candidate[];
  choice: NameChoice;
}

export interface LineRow {
  index: number;
  use: IngredientUse;
  key: string;
  mode: AmountMode['mode'];
  /** Text of the grams field (mode `grams`). */
  grams: string;
  role: string;
}

export interface CookModel {
  fileName: string;
  doc: CooklangDocument;
  rows: NameRow[];
  lines: LineRow[];
  title: string;
  yieldGrams: string;
}

export interface CookContext {
  ingredients: readonly Candidate[];
  components: readonly Candidate[];
}

const keyOf = (use: IngredientUse): string =>
  `${use.reference ? 'ref:' : ''}${normaliseName(use.name)}`;

/** `500%g` or `0.5%kg` is a mass; anything else leaves the field empty. */
const yieldText = (value: string | string[] | undefined): string => {
  const first = Array.isArray(value) ? value[0] : value;
  const m = /^(\d+(?:\.\d+)?)\s*%\s*(g|kg)$/i.exec(first?.trim() ?? '');
  if (!m) return '';
  const grams = Number(m[1]) * (m[2]?.toLowerCase() === 'kg' ? 1000 : 1);
  return String(Number(grams.toPrecision(10)));
};

const fileStem = (fileName: string): string =>
  fileName.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ');

/** The default amount mode: the amount as written when it can be read, else open. */
export const defaultMode = (modes: readonly AmountMode['mode'][]): AmountMode['mode'] =>
  modes.includes('given') ? 'given' : 'open';

export function buildCookModel(text: string, fileName: string, context: CookContext): CookModel {
  const doc = parseCooklang(text);
  const uses = ingredientUses(doc);
  const first = new Map<string, IngredientUse>();
  for (const use of uses) if (!first.has(keyOf(use))) first.set(keyOf(use), use);

  const entries = [...first.entries()];
  const names = entries.map(([, use]) => use.name);
  const byIngredient = matchIngredients(names, context.ingredients);
  const byComponent = matchIngredients(names, context.components);

  const rows = entries.map(([key, use], i): NameRow => {
    const ing = byIngredient[i];
    const comp = byComponent[i];
    const options: NameOption[] = [];
    const add = (c: Candidate, tag: NameOption['tag'], kind: Target['kind']): void => {
      options.push({ target: { kind, id: c.id }, name: c.name, tag });
    };
    if (use.reference) {
      if (comp?.exact) add(comp.exact, 'component', 'component');
      for (const c of comp?.close ?? []) add(c, 'component', 'component');
    }
    if (ing?.exact) add(ing.exact, 'same', 'ingredient');
    for (const c of ing?.close ?? []) add(c, 'close', 'ingredient');
    const exact = use.reference && comp?.exact ? options[0] : options.find((o) => o.tag === 'same');
    const choice: NameChoice = exact
      ? { type: 'existing', target: exact.target }
      : { type: 'unset' };
    return {
      key,
      label: use.name,
      reference: use.reference,
      options,
      classes: ing?.classes ?? [],
      choice,
    };
  });

  const lines = uses.map((use, index): LineRow => ({
    index,
    use,
    key: keyOf(use),
    mode: 'open',
    grams: '',
    role: '',
  }));
  const model: CookModel = {
    fileName,
    doc,
    rows,
    lines,
    title:
      typeof doc.metadata.title === 'string' && doc.metadata.title !== ''
        ? doc.metadata.title
        : fileStem(fileName),
    yieldGrams: yieldText(doc.metadata.yield),
  };
  for (const line of lines) line.mode = defaultMode(modesFor(model, line, () => ({})));
  return model;
}

export const rowOf = (model: CookModel, key: string): NameRow | undefined =>
  model.rows.find((r) => r.key === key);

/** The target a line's name currently means, if it was decided as an existing record. */
export const existingTarget = (model: CookModel, line: LineRow): Target | undefined => {
  const choice = rowOf(model, line.key)?.choice;
  return choice?.type === 'existing' ? choice.target : undefined;
};

/** The amount modes for a line, given what the chosen ingredient is known to weigh. */
export const modesFor = (
  model: CookModel,
  line: LineRow,
  factsOf: (target: Target) => IngredientFacts,
): AmountMode['mode'][] => {
  const target = existingTarget(model, line);
  return availableModes(line.use.quantity, target === undefined ? {} : factsOf(target));
};

/** Sets what a name means; every line with that name follows, and a mode that no longer fits resets. */
export function choose(
  model: CookModel,
  key: string,
  choice: NameChoice,
  factsOf: (target: Target) => IngredientFacts,
): void {
  const row = rowOf(model, key);
  if (row === undefined) return;
  row.choice = choice;
  for (const line of model.lines.filter((l) => l.key === key)) {
    const modes = modesFor(model, line, factsOf);
    if (!modes.includes(line.mode)) line.mode = defaultMode(modes);
  }
}

export const unresolvedNames = (model: CookModel): number =>
  model.rows.filter((r) => r.choice.type === 'unset').length;

/** Every name left open becomes "create a new ingredient". */
export const createForUnset = (model: CookModel): void => {
  for (const row of model.rows) if (row.choice.type === 'unset') row.choice = { type: 'new' };
};

/** The decisions for the engine, once every name has a target (`targetOf` gives new ids). */
export function decisionsOf(model: CookModel, targetOf: (key: string) => Target): LineDecision[] {
  return model.lines.map((line) => {
    const amount: AmountMode =
      line.mode === 'grams'
        ? { mode: 'grams', grams: Number(line.grams.replace(',', '.')) }
        : { mode: line.mode };
    return {
      target: targetOf(line.key),
      amount,
      ...(line.role.trim() === '' ? {} : { role: line.role.trim() }),
    };
  });
}

/** What a role may look like: the schema's role id. */
export const ROLE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const roleAllowed = (role: string): boolean =>
  role.trim() === '' || ROLE_PATTERN.test(role.trim());
export const gramsAllowed = (text: string): boolean => {
  const n = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n > 0;
};
