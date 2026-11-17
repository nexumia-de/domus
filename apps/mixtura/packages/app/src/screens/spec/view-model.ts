// The spec screen as data: lines, tags, fixed rows and the balance panel for
// one drink, worked out from the browse model and the engine. Pure: the same
// input gives the same texts, so tests read the screen without a browser
// (docs/screens-browse.md#spec).

import {
  computeBalance,
  type BalanceResult,
  getIngredient,
  lineRole,
  matchSpec,
  type DisplaySystem,
  type Excluded,
} from '@mixtura/engine';
import { strings } from '../../strings';
import type { BrowseModel } from '../browse/model';
import type { SpecData, SpecLine, Template } from '../browse/types';
import { balanceVM, type BalanceVM, type CompactItem } from './balance-vm';
import { amountText } from './format';
import { batchVM, type BatchVM } from './batch-vm';
import { scaledLine } from './servings';
import { initialSpecView, type SpecView } from './session';
import { swapDelta } from './swap-delta';
import { sheetVM, type SwapSheetVM } from './swap-sheet-vm';
import { applySwap, changedCount, type Swap } from './swap-state';
import { swapStrings } from './swap-strings';
import { swapTemplate } from './swap-template';

/** The volume of a `top` line and what the user can do with it. */
export interface TopVM {
  /** `stored`: part of the spec; `what-if`: entered on this screen only; `none`: no volume. */
  state: 'none' | 'stored' | 'what-if';
  /** The field is open. */
  editing: boolean;
  /** The what-if volume as text in the display unit, for the field. */
  fieldValue?: string;
}

export interface LineVM {
  /** Position of the line in the spec. */
  index: number;
  amount: string;
  top?: TopVM;
  name: string;
  /** False when the ingredient is not in the data: the line keeps its id. */
  known: boolean;
  /** The role tag, absent when the ingredient has none. */
  role?: { id: string; label: string };
  optional: boolean;
  note?: string;
  substitutes: string[];
  /** A prepared ingredient links to its own spec. */
  prepared?: { name: string; href: string };
  /** Try a Swap: the line as a tappable row; `was` names what the saved line had when it differs. */
  swap?: { changed: boolean; was?: string };
}

/** Try a Swap as the screen shows it (docs/screens-browse.md#swap-mode). */
export interface SwapVM {
  banner: string;
  /** Lines that differ from the saved spec. */
  count: number;
  /** One plain sentence when the swapped drink follows another template or none. */
  templateChange?: string;
  /** The three figures with their differences, for the compact bar. */
  compact: CompactItem[];
  /** The open line sheet. */
  sheet?: SwapSheetVM;
}

export interface TagVM {
  text: string;
  /** Tappable tags link somewhere. */
  href?: string;
  strong?: boolean;
}

export interface SpecVM {
  name: string;
  tags: TagVM[];
  lines: LineVM[];
  meta: { label: string; value: string }[];
  balance: BalanceVM;
  /** Drinks the amounts are for; the figures are always for one. */
  servings: number;
  /** The batch of `servings` drinks, present while the sheet is open. */
  batch?: BatchVM;
  /** Said under the balance panel when the drink has no template. */
  noTemplateNote?: string;
  /** Present in swap mode. */
  swap?: SwapVM;
  notes?: string;
  source?: string;
}

/** The three figures as the compact bar shows them. */
export function compactItems(balance: BalanceVM): CompactItem[] {
  return balance.figures.map((f) => ({
    name: f.name,
    value: f.valueText,
    ...(f.positionShort && { positionShort: f.positionShort }),
    ...(f.deltaShort && { deltaShort: f.deltaShort }),
  }));
}

function lineVM(
  model: BrowseModel,
  line: SpecLine,
  index: number,
  system: DisplaySystem,
  view: SpecView,
  servings: number,
  saved: SpecLine,
  swapped: boolean,
): LineVM {
  const ingredient = getIngredient(model.tree, line.ingredientId);
  const role = lineRole(model.tree, line);
  const whatIf = line.unit === 'top' ? view.topMl[index] : undefined;
  const shown = scaledLine(line, servings);
  const topMl = shown.topMl ?? (whatIf !== undefined ? whatIf * servings : undefined);
  const vm: LineVM = {
    index,
    amount:
      line.unit === 'top' && topMl !== undefined
        ? strings.spec.topWith(amountText({ amount: topMl, unit: 'ml' }, system))
        : amountText(shown, system),
    name: ingredient?.name ?? strings.spec.unknownIngredient,
    known: ingredient !== undefined,
    optional: line.optional === true,
    substitutes: (line.substitutes ?? []).map((sub) => {
      const name = model.ingredientName(sub.ingredientId) ?? sub.ingredientId;
      const amount =
        sub.amount !== undefined && sub.unit
          ? `${amountText(scaledLine({ ingredientId: sub.ingredientId, amount: sub.amount, unit: sub.unit }, servings), system)} `
          : '';
      return strings.spec.orLine(`${amount}${name}`);
    }),
  };
  if (swapped) {
    const same = line.ingredientId === saved.ingredientId;
    const sameAmount = line.amount === saved.amount && line.unit === saved.unit;
    const savedName = model.ingredientName(saved.ingredientId) ?? saved.ingredientId;
    const was = [
      !sameAmount || !same ? amountText(scaledLine(saved, servings), system) : '',
      same ? '' : savedName,
    ]
      .filter(Boolean)
      .join(' ');
    vm.swap = { changed: !same || !sameAmount, ...(was && { was }) };
  }
  if (line.unit === 'top') {
    vm.top = {
      state: line.topMl !== undefined ? 'stored' : whatIf !== undefined ? 'what-if' : 'none',
      editing: view.editingTop === index,
    };
    if (whatIf !== undefined && line.topMl === undefined) {
      vm.top.fieldValue = amountText({ amount: whatIf, unit: 'ml' }, 'metric');
    }
  }
  if ('role' in role) {
    vm.role = { id: role.role, label: strings.spec.roles[role.role] };
  }
  if (line.note) vm.note = line.note;
  if (!ingredient) vm.note = `${strings.spec.notInData}: ${line.ingredientId}`;
  const preparedSpec = ingredient?.prepared
    ? model.specById.get(ingredient.prepared.specId)
    : undefined;
  if (preparedSpec) {
    vm.prepared = {
      name: preparedSpec.name,
      href: `#/drinks/${encodeURIComponent(preparedSpec.lineageId)}`,
    };
  }
  return vm;
}

/** The template of a drink: explicit, or suggested by the engine, or none. */
export function templateOf(
  model: BrowseModel,
  spec: SpecData,
): { template?: Template; basis: 'explicit' | 'suggested' | 'none'; unknownId?: string } {
  const match = matchSpec(model.tree, model.templates as Template[], {
    templateId: spec.templateId,
    lines: spec.lines,
  });
  const chosen = match.chosen;
  if (!chosen) return { basis: 'none' };
  if (!chosen.known) return { basis: 'none', unknownId: chosen.templateId };
  return { template: model.templateById.get(chosen.templateId), basis: chosen.basis };
}

export interface SpecOptions {
  /** Drinks to show amounts for, 1 to 12 (default 1). */
  servings?: number;
  /** Build the batch for `servings` drinks (the sheet is open). */
  batch?: boolean;
  /** Temporary state of this screen (what-if volumes); defaults to none. */
  view?: SpecView;
  /** Try a Swap: the swap of the address, null outside swap mode. */
  swap?: Swap | null;
  /** Try a Swap: the line whose sheet is open. */
  sheetLine?: number | null;
  /** Where the spec lives: built-in drinks show their origin, not a version and a status. */
  origin?: 'seed' | 'user';
  /** Compute the figures now instead of from the model's cache: the spec is a draft that has no stable id. */
  fresh?: boolean;
}

export function specVM(
  model: BrowseModel,
  spec: SpecData,
  system: DisplaySystem,
  options: SpecOptions = {},
): SpecVM {
  const view = options.view ?? initialSpecView;
  const servings = options.servings ?? 1;
  const swap = options.swap ?? null;
  const swappedLines = swap ? applySwap(spec.lines, swap) : spec.lines;
  const withWhatIfVolumes = (lines: readonly SpecLine[]): SpecLine[] =>
    lines.map((line, index) => {
      const ml = view.topMl[index];
      return line.unit === 'top' && line.topMl === undefined && ml !== undefined
        ? { ...line, topMl: ml }
        : line;
    });
  // What-if volumes and a swap make an effective spec for the figures only; the spec itself is never changed.
  const effective: SpecData = { ...spec, lines: withWhatIfVolumes(swappedLines) };
  const withWhatIf = effective.lines.some((line, i) => line !== spec.lines[i]);
  const savedLines = withWhatIfVolumes(spec.lines);
  const original = templateOf(model, { ...spec, lines: savedLines });
  const swapChanged = swap !== null && changedCount(swap, spec.lines) > 0;
  const swappedTemplate = swapChanged
    ? swapTemplate(model, original, savedLines, effective.lines)
    : undefined;
  const { template, basis } = swappedTemplate ?? original;
  const unknownId = swappedTemplate ? undefined : original.unknownId;
  const tags: TagVM[] = [];
  if (template) {
    tags.push({
      text:
        basis === 'suggested'
          ? strings.spec.suggestedTag(template.name)
          : strings.spec.templateTag(template.name),
      href: `#/templates/${encodeURIComponent(template.id)}`,
      strong: true,
    });
  } else tags.push({ text: strings.spec.noTemplate });
  if (options.origin === 'seed') tags.push({ text: strings.spec.builtIn });
  else {
    tags.push(
      { text: strings.spec.version(spec.version) },
      { text: strings.spec.status[spec.status] },
    );
  }

  const meta: SpecVM['meta'] = [];
  if (spec.method) {
    const name = model.vocabulary.methods.find((m) => m.id === spec.method)?.name ?? spec.method;
    meta.push({ label: strings.spec.method, value: name });
  }
  if (spec.glass) {
    const name = model.vocabulary.glasses.find((g) => g.id === spec.glass)?.name ?? spec.glass;
    meta.push({ label: strings.spec.glass, value: name });
  }
  if (spec.garnish) meta.push({ label: strings.spec.garnish, value: spec.garnish });

  const used = new Set<number>();
  const describeExcluded = (entry: Excluded): string => {
    const at = effective.lines.findIndex(
      (l, i) => !used.has(i) && l.ingredientId === entry.ingredientId && l.unit === entry.unit,
    );
    used.add(at);
    const line = effective.lines[at];
    const name = model.ingredientName(entry.ingredientId) ?? entry.ingredientId;
    const amount = line ? `${amountText(line, system)} ` : '';
    return `${amount}${name}: ${strings.balance.notCountedReason[entry.reason]}`;
  };
  const figuresOf = (lines: readonly SpecLine[]): BalanceResult =>
    computeBalance(
      model.tree,
      { method: spec.method, lines: [...lines] },
      { specs: model.preparedSpecs },
    );
  const result = withWhatIf || options.fresh ? figuresOf(effective.lines) : model.balanceOf(spec);
  const savedResult = swap
    ? savedLines.some((line, i) => line !== spec.lines[i])
      ? figuresOf(savedLines)
      : model.balanceOf(spec)
    : undefined;
  const delta = savedResult ? swapDelta(savedResult, result) : undefined;
  const balance = balanceVM(
    result,
    spec.method,
    template,
    model.ingredientName,
    describeExcluded,
    delta,
  );
  const vm: SpecVM = {
    name: spec.name,
    tags,
    lines: swappedLines.map((line, i) =>
      lineVM(model, line, i, system, view, servings, spec.lines[i] as SpecLine, swap !== null),
    ),
    meta,
    balance,
    servings,
  };
  if (options.batch) {
    vm.batch = batchVM(
      model.tree,
      spec.method,
      effective.lines,
      servings,
      system,
      model.ingredientName,
    );
  }
  if (swap) {
    const count = changedCount(swap, spec.lines);
    const sheet =
      options.sheetLine === null || options.sheetLine === undefined
        ? undefined
        : sheetVM(model, spec.lines, swappedLines, swap, options.sheetLine, view, system);
    vm.swap = {
      banner:
        count === 0
          ? swapStrings.bannerEmpty
          : count === 1
            ? swapStrings.banner
            : swapStrings.bannerCount(count),
      count,
      compact: compactItems(balance),
      ...(swappedTemplate?.change && { templateChange: swappedTemplate.change }),
      ...(sheet && { sheet }),
    };
  }
  if (!template) {
    vm.noTemplateNote = unknownId ? strings.spec.unknownTemplate : strings.spec.noTemplateNote;
  }
  if (spec.notes) vm.notes = spec.notes;
  if (spec.source) vm.source = strings.spec.source(spec.source.name, spec.source.licence);
  return vm;
}
