// Checks a draft the way the store will: every line read, every blocker
// named in words next to what is wrong. `spec` is the draft as a spec of its
// valid lines, so the balance panel can be drawn from it while typing.
// Invalid amounts never reach the store: `ok` is false while any line is
// marked (docs/screens-specs.md#spec-editor).

import { buildTree, computePrepared, getIngredient, type IngredientTree } from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';
import { preparedLine, yieldMl } from '../browse/prepared';
import type { Ingredient, SpecData, SpecLine } from '../browse/types';
import { readAmount } from './amount-entry';
import { parseTopVolume } from '../spec/session';
import { editorStrings as t } from './strings';
import type { Draft, DraftLine } from './types';

export interface LineCheck {
  key: string;
  /** `empty`: nothing typed, left out on save; `ok`: a valid line; `error`: marked. */
  status: 'empty' | 'ok' | 'error';
  /** Which field the error belongs to. */
  field?: 'ingredient' | 'amount' | 'volume';
  error?: string;
  /** What was understood, "= 22.5 ml". */
  hint?: string;
  /** The unit the text carries, for the selector. */
  unit?: string;
  line?: SpecLine;
}

export interface PreparedCheck {
  yield?: { amount: number; unit: string };
  yieldError?: string;
  shelfDays?: number;
  shelfError?: string;
  /** Why the prepared ingredient cannot be saved, beside the field errors. */
  blocker?: string;
  /** ABV, sugar and acid per 100 ml, or why there is no figure. */
  figures?: { abv?: number; sugar?: number; acid?: number; reason?: string };
}

export interface DraftCheck {
  lines: LineCheck[];
  nameError?: string;
  prepared?: PreparedCheck;
  /** Why saving is not possible yet, in the order the user would fix them. */
  blockers: string[];
  ok: boolean;
  /** The valid lines as a spec, for the live balance. */
  spec: SpecData;
}

const PREVIEW = 'draft-preview';

/** The ounce a plain `oz` means for this line: the one it was stored with, else the display setting. */
function ounceOf(line: DraftLine, imperial: boolean): 'us' | 'imperial' {
  if (line.original?.unit === 'oz_imp') return 'imperial';
  if (line.original?.unit === 'oz_us') return 'us';
  return imperial ? 'imperial' : 'us';
}

export function checkLine(model: BrowseModel, line: DraftLine, imperial: boolean): LineCheck {
  const key = line.key;
  const typed = line.amountText.trim() !== '' || line.topText.trim() !== '';
  if (line.ingredientId === '' && !typed && line.unit !== 'top') return { key, status: 'empty' };
  if (line.ingredientId === '') {
    return { key, status: 'error', field: 'ingredient', error: t.needIngredient };
  }
  if (!getIngredient(model.tree, line.ingredientId)) {
    return { key, status: 'error', field: 'ingredient', error: t.unknownIngredient };
  }
  const extras = {
    ...(line.role && { role: line.role }),
    ...(line.optional && { optional: true as const }),
    ...(line.note.trim() !== '' && { note: line.note.trim() }),
    ...(line.original?.substitutes && { substitutes: line.original.substitutes }),
  };
  if (line.unit === 'top') {
    let topMl: number | undefined;
    if (line.topText.trim() !== '') {
      const volume = parseTopVolume(line.topText);
      if (!volume.ok) return { key, status: 'error', field: 'volume', error: t.volumeInvalid };
      topMl = volume.ml;
    }
    return {
      key,
      status: 'ok',
      unit: 'top',
      line: {
        ingredientId: line.ingredientId,
        amount: 1,
        unit: 'top',
        ...(topMl !== undefined && { topMl }),
        ...extras,
      },
    };
  }
  // A line that has not been touched keeps the stored numbers exactly.
  if (line.original && line.originalText === line.amountText && line.original.unit !== 'top') {
    const o = line.original;
    return {
      key,
      status: 'ok',
      unit: o.unit,
      line: {
        ingredientId: line.ingredientId,
        amount: o.amount,
        ...(o.amountMax !== undefined && { amountMax: o.amountMax }),
        unit: o.unit,
        ...extras,
      },
    };
  }
  const read = readAmount(line.amountText, line.unit, ounceOf(line, imperial));
  if (!read.ok) {
    if (line.amountText.trim() === '') {
      return { key, status: 'error', field: 'amount', error: t.needAmount };
    }
    return {
      key,
      status: 'error',
      field: 'amount',
      error: t.notUnderstood(line.amountText.trim(), read.message),
    };
  }
  return {
    key,
    status: 'ok',
    hint: read.hint,
    unit: read.unit,
    line: {
      ingredientId: line.ingredientId,
      amount: read.amount,
      ...(read.amountMax !== undefined && { amountMax: read.amountMax }),
      unit: read.unit,
      ...extras,
    },
  };
}

const TEMP_SPEC = 'draft-spec';

/** ABV, sugar and acid of the draft as a prepared ingredient, from the engine, with the yield. */
function figuresOf(
  model: BrowseModel,
  lines: readonly SpecLine[],
  yieldValue: { amount: number; unit: string },
  ingredient: Ingredient,
): NonNullable<PreparedCheck['figures']> & { cycle?: boolean } {
  const parts = lines.map((line) => ({ line, part: preparedLine(model.tree, line) }));
  const bad = parts.find((p) => p.part === undefined);
  if (bad) {
    const name = model.ingredientName(bad.line.ingredientId) ?? bad.line.ingredientId;
    return { reason: t.prepared.unmeasured(name) };
  }
  const tempIngredient: Ingredient = {
    ...ingredient,
    id: 'draft-prepared',
    prepared: { specId: TEMP_SPEC, yield: yieldValue },
  };
  const others = model.tree.ids
    .map((id) => model.tree.byId.get(id) as Ingredient)
    .filter((i) => i.id !== ingredient.id);
  const tree: IngredientTree | undefined = (() => {
    const built = buildTree([...others, tempIngredient]);
    return built.ok ? built.tree : undefined;
  })();
  if (!tree) return { reason: t.prepared.noFigure };
  const ml = yieldMl({ specId: TEMP_SPEC, yield: yieldValue });
  const lookup = new Map(model.preparedSpecs);
  lookup.set(TEMP_SPEC, {
    lines: parts.map((p) => p.part as NonNullable<typeof p.part>),
    ...(ml !== undefined && { yieldMl: ml }),
  });
  const result = computePrepared(tree, lookup, 'draft-prepared');
  if (!result.ok) {
    return {
      reason: result.errors[0]?.message ?? t.prepared.noFigure,
      cycle: result.errors.some((e) => e.code === 'prepared-cycle'),
    };
  }
  const { abv, sugar, acid } = result.value;
  const reasons = [abv, sugar, acid].flatMap((c) => (c.value === undefined ? [c.reason] : []));
  return {
    ...(abv.value !== undefined && { abv: abv.value }),
    ...(sugar.value !== undefined && { sugar: sugar.value }),
    ...(acid.value !== undefined && { acid: acid.value }),
    ...(reasons.length > 0 && { reason: reasons.join('. ') }),
  };
}

function checkPrepared(
  model: BrowseModel,
  draft: Draft,
  lines: readonly SpecLine[],
): PreparedCheck {
  const p = draft.prepared;
  const out: PreparedCheck = {};
  if (p.yieldText.trim() === '') out.yieldError = t.prepared.yieldNeeded;
  else {
    const read = readAmount(p.yieldText, 'ml');
    const volume = read.ok && read.amountMax === undefined ? read : undefined;
    const isVolume =
      volume &&
      yieldMl({ specId: '', yield: { amount: volume.amount, unit: volume.unit } }) !== undefined;
    if (volume && isVolume) out.yield = { amount: volume.amount, unit: volume.unit };
    else
      out.yieldError = read.ok
        ? t.prepared.yieldVolume
        : `${read.message} ${t.prepared.yieldVolume}`;
  }
  if (p.shelfText.trim() !== '') {
    const days = Number(p.shelfText.trim());
    if (Number.isInteger(days) && days >= 0) out.shelfDays = days;
    else out.shelfError = t.prepared.shelfInvalid;
  }
  if (p.ingredientId !== '' && lines.some((l) => l.ingredientId === p.ingredientId)) {
    out.blocker = t.prepared.self;
  }
  if (out.yield) {
    const base: Ingredient = {
      id: p.ingredientId || 'draft-prepared',
      name: draft.name || 'Prepared',
      level: 'product',
    };
    const figures = figuresOf(model, lines, out.yield, base);
    out.figures = figures;
    if (figures.cycle) out.blocker = t.prepared.cycle;
  }
  return out;
}

export function checkDraft(model: BrowseModel, draft: Draft, imperial: boolean): DraftCheck {
  const lines = draft.lines.map((line) => checkLine(model, line, imperial));
  const valid = lines.flatMap((l) => (l.status === 'ok' && l.line ? [l.line] : []));
  const spec: SpecData = {
    id: PREVIEW,
    lineageId: PREVIEW,
    version: 1,
    name: draft.name.trim() || t.titleNew,
    ...(draft.templateId !== '' && { templateId: draft.templateId }),
    lines: valid,
    ...(draft.method !== '' && { method: draft.method }),
    ...(draft.glass !== '' && { glass: draft.glass }),
    status: draft.status,
  };
  const out: DraftCheck = { lines, blockers: [], ok: false, spec };
  const nameMissing = draft.name.trim() === '';
  const anyError = lines.some((l) => l.status === 'error');
  if (nameMissing) out.nameError = t.nameRequired;
  if (draft.prepared.on) out.prepared = checkPrepared(model, draft, valid);
  if (nameMissing && valid.length === 0) out.blockers.push(t.needsName, t.needsLine);
  else if (nameMissing) out.blockers.push(t.needsName);
  else if (valid.length === 0 && !anyError) out.blockers.push(t.needsLine);
  if (anyError) out.blockers.push(t.fixLines);
  const prep = out.prepared;
  if (prep) {
    if (prep.yieldError) out.blockers.push(prep.yieldError);
    if (prep.shelfError) out.blockers.push(prep.shelfError);
    if (prep.blocker) out.blockers.push(prep.blocker);
  }
  out.ok = out.blockers.length === 0;
  return out;
}
