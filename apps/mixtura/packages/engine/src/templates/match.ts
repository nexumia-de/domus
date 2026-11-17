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
 * The templates a spec is tried against. Variants (`alcohol` set) are offered only for their class, and
 * then they replace their parent: same slots, so both would tie on every spec and the id would decide.
 */
function offered(templates: readonly Template[], alcohol: MatchOptions['alcohol']): Template[] {
  return templates.filter((t) =>
    t.alcohol !== undefined
      ? t.alcohol === alcohol
      : !templates.some(
          (v) => v.parentId === t.id && v.alcohol !== undefined && v.alcohol === alcohol,
        ),
  );
}

/**
 * Matches a spec to templates by roles and ratios and ranks every candidate.
 *
 * @param tree - A validated tree that gives each ingredient its role.
 * @param templates - Templates to try; slot ratios are in parts against the base slot.
 * @param spec - Lines (amounts in units of the unit table) and an optional explicit template id.
 * @param options - Unit overrides; `alcohol` (class of the drink) offers the variants of that class in place of their parents.
 * @returns Candidates best first with distance and ratios; `chosen` is the best that fits (absent if none), or the explicit id, which is never replaced.
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
  const candidates = rank(
    offered(templates, options.alcohol).map((t) => evaluate(tree, t, spec, options)),
  );
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
