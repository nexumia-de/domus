// The variant suggestions of the spec screen as data (#37): for a drink that
// follows a template, the engine's variants with what they replace and keep,
// worded plainly. A variant of the class the drink already has is not offered.

import { variantSuggestions, type AlcoholClass, type VariantSuggestion } from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';
import type { SpecData, SpecLine, Template } from '../browse/types';
import { variantStrings as t } from './variant-strings';

export interface VariantVM {
  templateId: string;
  name: string;
  alcohol: 'none' | 'low';
  /** The editor address that starts the riff. */
  href: string;
  /** "Start a Riff as Non-Alcoholic Sour". */
  button: string;
  buttonAria: string;
  /** What changes, one sentence each. */
  changes: string[];
  /** The slots' evidence, as the data states it. */
  evidence?: string;
}

const titleCase = (text: string): string =>
  text.replace(/(^|[\s-])([a-z])/g, (_m, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);

const list = (names: readonly string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** The address of the riff editor that starts from a variant. */
export const variantAddress = (lineageId: string, variantId: string): string =>
  `#/drinks/${encodeURIComponent(lineageId)}/riff?variant=${encodeURIComponent(variantId)}`;

/** The suggestion for one variant id of a spec, as the editor needs it; undefined when it is not offered. */
export function suggestionFor(
  model: BrowseModel,
  spec: SpecData,
  variantId: string,
): { suggestion: VariantSuggestion; template: Template } | undefined {
  const result = variantSuggestions(model.tree, model.templates as Template[], {
    templateId: spec.templateId,
    lines: spec.lines,
  });
  const suggestion = result.suggestions.find((s) => s.templateId === variantId);
  const template = model.templateById.get(variantId);
  return suggestion && template ? { suggestion, template } : undefined;
}

export function variantVMs(
  model: BrowseModel,
  spec: SpecData,
  drinkClass: AlcoholClass,
): { template?: string; items: VariantVM[] } {
  const result = variantSuggestions(model.tree, model.templates as Template[], {
    templateId: spec.templateId,
    lines: spec.lines,
  });
  const template = result.templateId ? model.templateById.get(result.templateId)?.name : undefined;
  const nameOf = (line: SpecLine): string =>
    model.ingredientName(line.ingredientId) ?? line.ingredientId;
  const items = result.suggestions
    .filter((s) => s.alcohol !== drinkClass)
    .map((s) => {
      const replaced = s.replacedLines.map((i) => spec.lines[i] as SpecLine).map(nameOf);
      const kept = s.keptLines.map((i) => spec.lines[i] as SpecLine).map(nameOf);
      const baseSlot = s.openSlots.find((slot) => slot.role === 'base');
      const changes = [
        replaced.length > 0 ? t.replaces(list(replaced), baseSlot?.note) : t.replacesNothing,
        ...(kept.length > 0 ? [t.keeps(list(kept))] : []),
        t.caveat,
      ];
      const name = titleCase(s.name);
      return {
        templateId: s.templateId,
        name,
        alcohol: s.alcohol,
        href: variantAddress(spec.lineageId, s.templateId),
        button: t.start(name),
        buttonAria: t.startAria(name, spec.name),
        changes,
        ...(s.evidence && { evidence: t.evidence(s.evidence) }),
      };
    });
  return { ...(template && { template }), items };
}
