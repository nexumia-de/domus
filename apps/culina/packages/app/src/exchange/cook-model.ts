// The state of the Cooklang completion step, without any DOM: which names the file uses, what
// each is taken to mean, and what each line's amount and role are. A name is asked once; the
// choice holds for every line with that name (docs/behaviour.md, Import).
import {
  availableModes,
  cooklangParts,
  hasSections,
  ingredientUses,
  matchIngredients,
  normaliseName,
  parseCooklang,
} from '@culina/engine';
import type {
  AmountMode,
  Candidate,
  CooklangDocument,
  CookPart,
  FactsByIngredient,
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
  /** Where the candidate comes from: `notebook` or `catalogue`. */
  origin: string;
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
  /** True when the AI's answer marked the amount as guessed (never for a Cooklang file). */
  guessed?: boolean;
}

/** What the name and line steps read and change: shared by the Cooklang and AI imports. */
export interface NamesModel {
  rows: NameRow[];
  lines: LineRow[];
  /** What the ingredients that may be chosen are known to weigh, by id. */
  facts: FactsByIngredient;
}

/** One part of a file with sections, as the step shows it (docs/behaviour.md, Cooklang files). */
export interface PartRow {
  part: CookPart;
  /** The name of the component it becomes (text of the field). */
  name: string;
  /** The role of its slot in the dish. */
  role: string;
  /** The component's percent base, among the roles of its lines; empty for none. */
  percentBase: string;
}

export interface CookModel {
  fileName: string;
  doc: CooklangDocument;
  rows: NameRow[];
  lines: LineRow[];
  title: string;
  yieldGrams: string;
  /** What the ingredients that may be chosen are known to weigh, by id. */
  facts: FactsByIngredient;
  /** True when the file has sections: it becomes a dish of one component per part with lines. */
  dish: boolean;
  /** The parts of the file in order (one leading part when it has no sections). */
  parts: PartRow[];
  /** Text of the portions field, prefilled from a whole `servings` number. */
  portions: string;
}

/** The slot role a part's component is prefilled with: visible and changed in the step. */
export const DEFAULT_SLOT_ROLE = 'main';

export interface CookContext {
  ingredients: readonly Candidate[];
  components: readonly Candidate[];
  facts?: FactsByIngredient;
}

export const keyOf = (use: { name: string; reference: boolean }): string =>
  `${use.reference ? 'ref:' : ''}${normaliseName(use.name)}`;

/** `500%g` or `0.5%kg` is a mass; anything else leaves the field empty. */
const yieldText = (value: string | string[] | undefined): string => {
  const first = Array.isArray(value) ? value[0] : value;
  const m = /^(\d+(?:\.\d+)?)\s*%\s*(g|kg)$/i.exec(first?.trim() ?? '');
  if (!m) return '';
  const grams = Number(m[1]) * (m[2]?.toLowerCase() === 'kg' ? 1000 : 1);
  return String(Number(grams.toPrecision(10)));
};

/**
 * Two parts with lines that would get the same name ("= Teig" twice, or a section named like the
 * file) are named apart: the second is "Teig (2)", the third "Teig (3)". Two components of one
 * dish with one name could not be told apart in the dish, and a Cooklang export would write the
 * same file stem for both. The fields stay editable.
 */
const apart = (rows: PartRow[]): PartRow[] => {
  const used = new Set<string>();
  for (const row of rows) {
    if (row.part.uses.length === 0) continue;
    let name = row.name;
    for (let n = 2; used.has(normaliseName(name)); n++) name = `${row.name} (${n})`;
    used.add(normaliseName(name));
    row.name = name;
  }
  return rows;
};

/** The leading whole number of `servings` (conventions: "leading number is used for scaling"). */
const portionsText = (value: string | string[] | undefined): string => {
  const first = Array.isArray(value) ? value[0] : value;
  const m = /^(\d+)(?!\s*[.,/]\d)/.exec(first?.trim() ?? '');
  return m && Number(m[1]) > 0 ? String(Number(m[1])) : '';
};

const fileStem = (fileName: string): string =>
  fileName.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ');

/** The default amount mode: the amount as written when it can be read, else open. */
export const defaultMode = (modes: readonly AmountMode['mode'][]): AmountMode['mode'] =>
  modes.includes('given') ? 'given' : 'open';

/**
 * The name rows of some ingredient occurrences: one per name, with the proposals of the notebook
 * and the catalogue. Only an exact match is preselected. Shared by the Cooklang and AI imports.
 */
export function nameRowsFor(
  uses: readonly { name: string; reference: boolean }[],
  context: CookContext,
): NameRow[] {
  const first = new Map<string, { name: string; reference: boolean }>();
  for (const use of uses) if (!first.has(keyOf(use))) first.set(keyOf(use), use);

  const entries = [...first.entries()];
  const names = entries.map(([, use]) => use.name);
  const byIngredient = matchIngredients(names, context.ingredients);
  const byComponent = matchIngredients(names, context.components);

  return entries.map(([key, use], i): NameRow => {
    const ing = byIngredient[i];
    const comp = byComponent[i];
    const options: NameOption[] = [];
    const add = (c: Candidate, tag: NameOption['tag'], kind: Target['kind']): void => {
      options.push({ target: { kind, id: c.id }, name: c.name, tag, origin: c.origin });
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
}

export function buildCookModel(text: string, fileName: string, context: CookContext): CookModel {
  const doc = parseCooklang(text);
  const uses = ingredientUses(doc);
  const rows = nameRowsFor(uses, context);

  const lines = uses.map((use, index): LineRow => ({
    index,
    use,
    key: keyOf(use),
    mode: 'open',
    grams: '',
    role: '',
  }));
  const title =
    typeof doc.metadata.title === 'string' && doc.metadata.title !== ''
      ? doc.metadata.title
      : fileStem(fileName);
  const model: CookModel = {
    fileName,
    doc,
    rows,
    lines,
    title,
    yieldGrams: yieldText(doc.metadata.yield),
    facts: context.facts ?? {},
    dish: hasSections(doc),
    // A part without a section name (the text before the first section) is named after the file.
    parts: apart(
      cooklangParts(doc).map((part) => ({
        part,
        name: part.name ?? title,
        role: DEFAULT_SLOT_ROLE,
        percentBase: '',
      })),
    ),
    portions: portionsText(doc.metadata.servings ?? doc.metadata.serves),
  };
  for (const line of lines) line.mode = defaultMode(modesFor(model, line, () => ({})));
  return model;
}

export const rowOf = (model: NamesModel, key: string): NameRow | undefined =>
  model.rows.find((r) => r.key === key);

/** The target a line's name currently means, if it was decided as an existing record. */
export const existingTarget = (model: NamesModel, line: LineRow): Target | undefined => {
  const choice = rowOf(model, line.key)?.choice;
  return choice?.type === 'existing' ? choice.target : undefined;
};

/** The amount modes for a line, given what the chosen ingredient is known to weigh. */
export const modesFor = (
  model: NamesModel,
  line: LineRow,
  factsOf: (target: Target) => IngredientFacts,
): AmountMode['mode'][] => {
  const target = existingTarget(model, line);
  return availableModes(line.use.quantity, target === undefined ? {} : factsOf(target));
};

/** Sets what a name means; every line with that name follows, and a mode that no longer fits resets. */
export function choose(
  model: NamesModel,
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

export const unresolvedNames = (model: NamesModel): number =>
  model.rows.filter((r) => r.choice.type === 'unset').length;

/** Every name left open becomes "create a new ingredient". */
export const createForUnset = (model: NamesModel): void => {
  for (const row of model.rows) if (row.choice.type === 'unset') row.choice = { type: 'new' };
};

/** The decisions for the engine, once every name has a target (`targetOf` gives new ids). */
export function decisionsOf(model: NamesModel, targetOf: (key: string) => Target): LineDecision[] {
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
/** The parts that become components: those with ingredient lines, in file order. */
export const componentParts = (model: CookModel): PartRow[] =>
  model.parts.filter((p) => p.part.uses.length > 0);

/** The lines of one part, in file order. */
export const partLines = (model: CookModel, row: PartRow): LineRow[] =>
  row.part.uses.flatMap((i) => model.lines[i] ?? []);

/** The roles given to some lines (all lines, or one part's), usable as a percent base. */
export const lineRoles = (lines: readonly LineRow[]): string[] => [
  ...new Set(lines.map((l) => l.role.trim()).filter((r) => r !== '' && roleAllowed(r))),
];

/** How many characters of a part's text the step shows before it shortens it. */
export const PREVIEW_LENGTH = 160;

/** The text of a part on one line, cut at a word with "…" when longer than `max`. */
export const partPreview = (row: PartRow, max = PREVIEW_LENGTH): string => {
  const all = row.part.blocks
    .map((b) => b.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (all.length <= max) return all;
  const cut = all.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

/** Portions: empty, or a whole number above 0. */
export const portionsAllowed = (text: string): boolean =>
  text.trim() === '' || (/^\d+$/.test(text.trim()) && Number(text.trim()) > 0);

export const gramsAllowed = (text: string): boolean => {
  const n = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n > 0;
};
