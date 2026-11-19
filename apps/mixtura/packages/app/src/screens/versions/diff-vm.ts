// Two versions of a drink as data: the lines added, removed and changed, the
// other fields, and the balance figures before and after as numbers. The
// engine finds the differences (`diffSpecs`); this file words them. The
// figures reuse Try a Swap's comparison (`swapDelta`, `balanceVM`), so the
// same "was -> now (+1.4 points)" reads the same everywhere. Nothing here
// judges: a figure moved by so much, and that is all it says.

import {
  diffSpecs,
  lineRole,
  summariseRiff,
  type DiffLine,
  type DisplaySystem,
  type LineDiff,
  type RiffChange,
  type SpecDiff,
} from '@mixtura/engine';
import { strings } from '../../strings';
import type { BrowseModel } from '../browse/model';
import type { SpecData } from '../browse/types';
import { balanceVM, type BalanceVM } from '../spec/balance-vm';
import { amountText } from '../spec/format';
import { signed, swapDelta } from '../spec/swap-delta';
import { swapStrings } from '../spec/swap-strings';
import { templateOf } from '../spec/view-model';
import { versionStrings as vs } from './strings';

/** The role of a line for matching: the explicit one or the ingredient's own. */
export const roleOfLine =
  (model: BrowseModel) =>
  (line: DiffLine): string | undefined => {
    const role = lineRole(model.tree, line as never);
    return 'role' in role ? role.role : undefined;
  };

export const diffOf = (model: BrowseModel, before: SpecData, after: SpecData): SpecDiff =>
  diffSpecs(before, after, { roleOf: roleOfLine(model) });

export interface DiffLineVM {
  kind: 'added' | 'removed' | 'changed';
  /** A shape next to the word, so the kind never rests on colour. */
  marker: '+' | '−' | '~';
  label: string;
  text: string;
}

export interface DiffVM {
  empty: boolean;
  lines: DiffLineVM[];
  /** Name, template, method, glass, garnish and notes, one sentence each. */
  fields: string[];
  balance: BalanceVM;
}

const MARKER = { added: '+', removed: '−', changed: '~' } as const;

const nameOf = (model: BrowseModel, id: string): string => model.ingredientName(id) ?? id;

/** One line change in words: "Lime juice to Lemon juice, 22.5 ml to 30 ml". */
export function lineText(model: BrowseModel, line: LineDiff, system: DisplaySystem): string {
  const before = line.before;
  const after = line.after;
  if (line.kind === 'added' && after) {
    return `${amountText(after, system)} ${nameOf(model, after.ingredientId)}`;
  }
  if (line.kind === 'removed' && before) {
    return `${amountText(before, system)} ${nameOf(model, before.ingredientId)}`;
  }
  if (!before || !after) return '';
  const parts: string[] = [];
  const ingredient = line.fields.includes('ingredient');
  const name = nameOf(model, after.ingredientId);
  parts.push(ingredient ? vs.changedIngredient(nameOf(model, before.ingredientId), name) : name);
  parts.push(
    line.fields.includes('amount')
      ? vs.changedAmount(amountText(before, system), amountText(after, system))
      : amountText(after, system),
  );
  const flags: string[] = [];
  if (line.fields.includes('optional')) flags.push(vs.lineChange.optional(after.optional === true));
  if (line.fields.includes('role')) flags.push(vs.lineChange.role);
  if (line.fields.includes('note')) flags.push(vs.lineChange.note);
  if (line.fields.includes('substitutes')) flags.push(vs.lineChange.substitutes);
  return [parts.join(', '), ...flags].join('; ');
}

function fieldText(model: BrowseModel, field: SpecDiff['fields'][number]): string {
  const word = (value: string | undefined): string => {
    if (value === undefined) return vs.fieldNone;
    if (field.field === 'method') {
      return model.vocabulary.methods.find((m) => m.id === value)?.name ?? value;
    }
    if (field.field === 'glass') {
      return model.vocabulary.glasses.find((g) => g.id === value)?.name ?? value;
    }
    if (field.field === 'template') return model.templateById.get(value)?.name ?? value;
    return value;
  };
  return vs.fieldChange(vs.field[field.field], word(field.before), word(field.after));
}

/** The balance after, with the change from `before` on every figure (the swap's rendering). */
export function figuresChange(model: BrowseModel, before: SpecData, after: SpecData): BalanceVM {
  const { template } = templateOf(model, after);
  return balanceVM(
    model.balanceOf(after),
    after.method,
    template,
    model.ingredientName,
    undefined,
    swapDelta(model.balanceOf(before), model.balanceOf(after)),
  );
}

export function diffVM(
  model: BrowseModel,
  before: SpecData,
  after: SpecData,
  system: DisplaySystem,
): DiffVM {
  const diff = diffOf(model, before, after);
  return {
    empty: diff.empty,
    lines: diff.lines.map((line) => ({
      kind: line.kind,
      marker: MARKER[line.kind],
      label: vs[line.kind],
      text: lineText(model, line, system),
    })),
    fields: diff.fields.map((field) => fieldText(model, field)),
    balance: figuresChange(model, before, after),
  };
}

/** A riff against its parent: "one change" or "3 changes", the list in one line, the figures moved. */
export interface RiffSummary {
  count: number;
  /** "one change" / "n changes" / "no changes". */
  label: string;
  /** "Lime juice to Lemon juice; Syrup 22.5 ml to 15 ml", empty for none. */
  text: string;
  /** "ABV +1.4 points, Sugar −0.5 g/100 ml", empty when nothing moved or is known. */
  figures: string;
}

function shortChange(
  model: BrowseModel,
  change: RiffChange['items'][number],
  system: DisplaySystem,
): string {
  if (change.type === 'field') return fieldText(model, change.change);
  const line = change.line;
  const text = lineText(model, line, system);
  return line.kind === 'added' ? vs.adds(text) : line.kind === 'removed' ? vs.removes(text) : text;
}

export function riffSummary(
  model: BrowseModel,
  parent: SpecData,
  riff: SpecData,
  system: DisplaySystem,
): RiffSummary {
  const change = summariseRiff(diffOf(model, parent, riff));
  const delta = swapDelta(model.balanceOf(parent), model.balanceOf(riff));
  const moved: string[] = [];
  for (const [key, decimals, unit] of [
    ['abv', 1, swapStrings.points],
    ['sugar', 1, 'g/100 ml'],
    ['acid', 2, swapStrings.points],
  ] as const) {
    const d = delta.figures[key].delta;
    if (d !== undefined && d !== 0) {
      moved.push(`${strings.balance.figures[key]} ${signed(d, decimals)} ${unit}`);
    }
  }
  return {
    count: change.count,
    label:
      change.count === 0
        ? vs.noChanges
        : change.count === 1
          ? vs.oneChange
          : vs.nChanges(change.count),
    text: change.items.map((item) => shortChange(model, item, system)).join('; '),
    figures: moved.join(', '),
  };
}
