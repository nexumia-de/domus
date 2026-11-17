// The spec screen as data: lines, tags, fixed rows and the balance panel for
// one drink, worked out from the browse model and the engine. Pure: the same
// input gives the same texts, so tests read the screen without a browser
// (docs/screens-browse.md#spec).

import { getIngredient, lineRole, matchSpec, type DisplaySystem } from '@mixtura/engine';
import { strings } from '../../strings';
import type { BrowseModel } from '../browse/model';
import type { SpecData, SpecLine, Template } from '../browse/types';
import { balanceVM, type BalanceVM } from './balance-vm';
import { amountText } from './format';

export interface LineVM {
  amount: string;
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
  /** Said under the balance panel when the drink has no template. */
  noTemplateNote?: string;
  notes?: string;
  source?: string;
}

function lineVM(model: BrowseModel, line: SpecLine, system: DisplaySystem): LineVM {
  const ingredient = getIngredient(model.tree, line.ingredientId);
  const role = lineRole(model.tree, line);
  const vm: LineVM = {
    amount: amountText(line, system),
    name: ingredient?.name ?? strings.spec.unknownIngredient,
    known: ingredient !== undefined,
    optional: line.optional === true,
    substitutes: (line.substitutes ?? []).map((sub) => {
      const name = model.ingredientName(sub.ingredientId) ?? sub.ingredientId;
      const amount =
        sub.amount !== undefined && sub.unit
          ? `${amountText({ amount: sub.amount, unit: sub.unit }, system)} `
          : '';
      return strings.spec.orLine(`${amount}${name}`);
    }),
  };
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

export function specVM(model: BrowseModel, spec: SpecData, system: DisplaySystem): SpecVM {
  const { template, basis, unknownId } = templateOf(model, spec);
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
  tags.push(
    { text: strings.spec.version(spec.version) },
    { text: strings.spec.status[spec.status] },
  );

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

  const balance = balanceVM(model.balanceOf(spec), spec.method, template, model.ingredientName);
  const vm: SpecVM = {
    name: spec.name,
    tags,
    lines: spec.lines.map((line) => lineVM(model, line, system)),
    meta,
    balance,
  };
  if (!template) {
    vm.noTemplateNote = unknownId ? strings.spec.unknownTemplate : strings.spec.noTemplateNote;
  }
  if (spec.notes) vm.notes = spec.notes;
  if (spec.source) vm.source = strings.spec.source(spec.source.name, spec.source.licence);
  return vm;
}
