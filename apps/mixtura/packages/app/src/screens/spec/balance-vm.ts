// The balance panel as data: every text and number the panel shows, worked
// out from the engine's figures and range check, so a test can read the
// panel without a browser (docs/screens-browse.md#spec, docs/design.md#drawing-balance).
// Nothing here judges a drink: a figure is within, below or above a range,
// unknown with the ingredients that lack the value, or has no range.

import {
  checkRange,
  type BalanceFigures,
  type BalanceResult,
  type Figure,
  type RangeCheck,
  type RangeFigure,
} from '@mixtura/engine';
import { trackGeometry, type TrackGeometry } from '../../components/track';
import { strings } from '../../strings';
import type { Template } from '../browse/types';
import { fixed, listNames } from './format';

export type FigureStatus = 'within' | 'below' | 'above' | 'unknown';

export interface FigureVM {
  key: RangeFigure;
  name: string;
  unit: string;
  /** The value as shown, or "No figure". */
  valueText: string;
  known: boolean;
  /** Position against the usual range; `unknown` also covers "no range". */
  status: FigureStatus;
  positionShort?: string;
  /** Accessible name of the track. */
  label: string;
  track?: TrackGeometry;
  footer: string;
  /** Why there is no figure, naming the ingredients. */
  missing?: string;
}

export interface BalanceVM {
  title: string;
  figures: FigureVM[];
  volume?: string;
  more: { label: string; value: string; missing?: string }[];
  notes: string[];
  /** The line about unverified ranges, present while any shown range is. */
  unverified?: string;
  /** Texts of the Details disclosure. */
  details: string[];
  /** The balance could not be computed at all. */
  failure?: string;
}

const FIGURES: { key: RangeFigure; unit: string; decimals: number; property: string }[] = [
  { key: 'abv', unit: '%', decimals: 1, property: 'ABV' },
  { key: 'sugar', unit: 'g/100 ml', decimals: 1, property: 'sugar' },
  { key: 'acid', unit: '%', decimals: 2, property: 'acid' },
];

const lower = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

function names(ids: readonly string[], nameOf: (id: string) => string | undefined): string {
  return listNames(ids.map((id) => nameOf(id) ?? id));
}

function figureVM(
  spec: (typeof FIGURES)[number],
  check: RangeCheck | undefined,
  figure: Figure | undefined,
  hasTemplate: boolean,
  nameOf: (id: string) => string | undefined,
): FigureVM {
  const name = strings.balance.figures[spec.key];
  const known = figure?.known === true;
  const value = figure?.known ? figure.value : undefined;
  const range = check?.range;
  const footerNone = hasTemplate ? strings.balance.noRangeTemplate : strings.balance.noRangeDrink;
  const lo = range ? fixed(range.min, spec.decimals) : '';
  const hi = range ? fixed(range.max, spec.decimals) : '';
  const status: FigureStatus =
    known && check && check.status !== 'unknown' ? check.status : 'unknown';
  const valueText =
    value !== undefined ? `${fixed(value, spec.decimals)} ${spec.unit}` : strings.balance.noFigure;
  let label = `${name}: ${strings.balance.noFigure}`;
  if (value !== undefined && range && status !== 'unknown') {
    label = strings.balance.trackLabel(
      name,
      fixed(value, spec.decimals),
      spec.unit,
      lo,
      hi,
      lower(strings.balance.positionFull[status]),
    );
  } else if (value !== undefined) label = `${name} ${valueText}. ${footerNone}`;
  else if (range) label = strings.balance.trackNoValue(name, lo, hi, spec.unit);
  const vm: FigureVM = {
    key: spec.key,
    name,
    unit: spec.unit,
    valueText,
    known,
    status,
    label,
    footer: range ? strings.balance.footer(lo, hi, spec.unit) : footerNone,
  };
  if (status !== 'unknown') vm.positionShort = strings.balance.position[status];
  if (range) vm.track = trackGeometry(range, value);
  if (figure && !figure.known) {
    vm.missing = figure.missingIds.length
      ? strings.balance.noFigureNamed(names(figure.missingIds, nameOf), spec.property)
      : `${strings.balance.noFigure}: ${figure.reason}`;
  }
  return vm;
}

export function balanceVM(
  result: BalanceResult,
  method: string | undefined,
  template: Template | undefined,
  nameOf: (id: string) => string | undefined,
): BalanceVM {
  const gerund = method
    ? (strings.balance.gerunds as Record<string, string | undefined>)[method]
    : undefined;
  const title = strings.balance.title(gerund);
  if (!result.ok) {
    return {
      title,
      figures: [],
      more: [],
      notes: [],
      details: [],
      failure: `${strings.balance.noFigure}: ${result.errors[0]?.message ?? ''}`.trim(),
    };
  }
  const value: BalanceFigures = result.value;
  const after = value.after;
  const checks = template ? checkRange(template, after) : [];
  const figures = FIGURES.map((spec) => {
    const figure =
      after?.[{ abv: 'abvPct', sugar: 'sugarPer100Ml', acid: 'acidPct' }[spec.key] as 'abvPct'];
    const vm = figureVM(
      spec,
      checks.find((c) => c.figure === spec.key),
      figure,
      template !== undefined,
      nameOf,
    );
    if (!after) vm.missing = strings.balance.noFigureDilution;
    return vm;
  });

  const notes: string[] = [];
  if (value.estimatedIds.length)
    notes.push(strings.balance.estimatedNote(names(value.estimatedIds, nameOf)));
  if (value.excluded.length) {
    notes.push(
      strings.balance.excludedNote(
        names(
          value.excluded.map((e) => e.ingredientId),
          nameOf,
        ),
      ),
    );
  }

  const more: BalanceVM['more'] = [];
  const before = value.before.abvPct;
  more.push({
    label: strings.balance.abvBefore,
    value: before.known ? `${fixed(before.value, 1)} %` : strings.balance.noFigure,
    missing: before.known
      ? undefined
      : strings.balance.noFigureNamed(names(before.missingIds, nameOf), 'ABV'),
  });
  const ratio = value.sugarAcidRatio;
  if (ratio.known) {
    more.push({
      label: strings.balance.sugarAcidRatio,
      value:
        ratio.value === null
          ? strings.balance.ratioUndefined
          : `${fixed(ratio.value, 1)} ${strings.balance.ratioUnit}`,
    });
  } else {
    more.push({
      label: strings.balance.sugarAcidRatio,
      value: strings.balance.noFigure,
      missing: strings.balance.noFigureNamed(names(ratio.missingIds, nameOf), 'acid or sugar'),
    });
  }
  const uk = value.ukUnits;
  more.push({
    label: strings.balance.ukUnits,
    value: uk.known
      ? `${fixed(uk.value, 1)} ${strings.balance.ukUnitsUnit}`
      : strings.balance.noFigure,
    missing: uk.known
      ? undefined
      : strings.balance.noFigureNamed(names(uk.missingIds, nameOf), 'ABV'),
  });

  const details: string[] = [...strings.balance.how];
  if (value.dilution?.method) {
    const basis =
      value.dilution.evidence === 'override'
        ? strings.balance.dilutionBasis.override
        : strings.balance.evidence[value.dilution.evidence];
    details.push(
      strings.balance.dilution(
        value.dilution.method,
        Math.round(value.dilution.fraction * 100),
        basis,
      ),
    );
  }
  const shownRange = checks.find((c) => c.range);
  let unverified: string | undefined;
  if (shownRange) {
    const evidence = shownRange.evidence ?? 'unstated';
    details.push(
      strings.balance.basisLine(strings.balance.evidence[evidence], shownRange.sourceName),
    );
    if (evidence !== 'verified') unverified = strings.balance.unverified;
  }
  return {
    title,
    figures,
    volume: after ? strings.balance.volume(after.volumeMl) : undefined,
    more,
    notes,
    unverified,
    details,
  };
}
