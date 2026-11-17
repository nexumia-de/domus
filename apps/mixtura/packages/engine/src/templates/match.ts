// Scores a spec against templates by role coverage and ratio fit and returns
// every candidate with its numbers, best first. Deterministic: the order is
// distance, then offset, then template id.
import type { IngredientTree } from '../ingredients/tree';
import { assignSlots } from './slots';
import type {
  Candidate,
  MatchOptions,
  MatchResult,
  MatchSpec,
  RatioStatus,
  SlotRatio,
  Template,
} from './types';

/** Floating point noise must not decide a tie. */
const round = (n: number) => Math.round(n * 1e9) / 1e9;

function evaluate(
  tree: IngredientTree,
  template: Template,
  spec: MatchSpec,
  options: MatchOptions,
): Omit<Candidate, 'rank'> {
  const assignment = assignSlots(tree, template, spec.lines, options);
  const refIndex = template.slots.findIndex((s) => s.role === 'base');
  const ref = template.slots[refIndex];
  const refMl = assignment.fills[refIndex]?.ml;
  const refParts = ref ? (ref.minParts + ref.maxParts) / 2 : 0;
  let miss = 0;
  let offset = 0;
  const ratios: SlotRatio[] = template.slots.map((slot, i) => {
    const fill = assignment.fills[i];
    const bounds = { slotId: slot.id, minParts: slot.minParts, maxParts: slot.maxParts };
    if (!fill) return { ...bounds, status: 'empty' };
    if (fill.lineIndexes.length === 0) return { ...bounds, status: 'empty' };
    if (i === refIndex) return { ...bounds, status: 'reference', parts: refParts };
    if (fill.ml === undefined || refMl === undefined || refMl <= 0) {
      return { ...bounds, status: 'unmeasured' };
    }
    const parts = (refParts * fill.ml) / refMl;
    let status: RatioStatus = 'within';
    if (parts < slot.minParts) {
      status = 'below';
      miss += (slot.minParts - parts) / slot.minParts;
    } else if (parts > slot.maxParts) {
      status = 'above';
      miss += (parts - slot.maxParts) / slot.maxParts;
    }
    const mid = (slot.minParts + slot.maxParts) / 2;
    offset += Math.abs(parts - mid) / mid;
    return { ...bounds, status, parts };
  });
  const distance = round(assignment.emptyRequired.length + assignment.unassigned.length + miss);
  return {
    templateId: template.id,
    fits: distance === 0,
    distance,
    offset: round(offset),
    assignment,
    ratios,
  };
}

function rank(list: Omit<Candidate, 'rank'>[]): Candidate[] {
  return [...list]
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.offset - b.offset ||
        (a.templateId < b.templateId ? -1 : a.templateId > b.templateId ? 1 : 0),
    )
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

/**
 * Without `spec.templateId`: all templates ranked, `chosen` is the best one
 * that fits (absent if none fits). With it: only that template is analysed
 * and it is `chosen`; an explicit id is never replaced by a suggestion.
 */
export function matchSpec(
  tree: IngredientTree,
  templates: readonly Template[],
  spec: MatchSpec,
  options: MatchOptions = {},
): MatchResult {
  if (spec.templateId !== undefined) {
    const own = templates.find((t) => t.id === spec.templateId);
    if (!own) {
      return {
        chosen: { templateId: spec.templateId, basis: 'explicit', known: false },
        candidates: [],
      };
    }
    return {
      chosen: { templateId: own.id, basis: 'explicit', known: true },
      candidates: rank([evaluate(tree, own, spec, options)]),
    };
  }
  const candidates = rank(templates.map((t) => evaluate(tree, t, spec, options)));
  const best = candidates[0];
  if (!best || !best.fits) return { candidates };
  const next = candidates[1];
  const tie = next !== undefined && next.distance === best.distance && next.offset === best.offset;
  return {
    chosen: {
      templateId: best.templateId,
      basis: 'suggested',
      known: true,
      ...(tie ? { tieBrokenById: true } : {}),
    },
    candidates,
  };
}
