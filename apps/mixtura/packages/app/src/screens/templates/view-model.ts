// The templates overview and detail as data (docs/screens-browse.md#templates-overview):
// order with variants under their parent, the role line, slots with their
// ranges in parts, and the usual ranges with the numbers a band is drawn from.
// Pure, so a test reads them without a browser.

import { strings } from '../../strings';
import { fixed } from '../spec/format';
import { trackGeometry, type TrackGeometry } from '../../components/track';
import { normalise } from '../browse/normalise';
import type { BrowseModel } from '../browse/model';
import type { Template } from '../browse/types';

export interface TemplateRow {
  id: string;
  name: string;
  /** Variants are drawn indented. */
  variant: boolean;
  /** The roles of the required slots: "Base, Sour, Sweet". */
  roles: string;
  /** Roles that optional slots add beyond those; empty when none. */
  optionalRoles: string;
  method: string;
  drinks: number;
  user: boolean;
}

const methodName = (model: BrowseModel, id: string): string =>
  model.vocabulary.methods.find((m) => m.id === id)?.name ?? id;

const roleLine = (template: Template): string =>
  template.slots
    .filter((slot) => slot.optional !== true)
    .map((slot) => strings.spec.roles[slot.role])
    .join(', ');

/** Roles that only optional slots add, once each; empty when there are none. */
const optionalRoleLine = (template: Template): string => {
  const required = new Set(template.slots.filter((s) => s.optional !== true).map((s) => s.role));
  const extra = new Set(
    template.slots.filter((s) => s.optional === true && !required.has(s.role)).map((s) => s.role),
  );
  return [...extra].map((role) => strings.spec.roles[role]).join(', ');
};

/** Root templates by name, each followed by its variants; `q` filters by name. */
export function templateRows(model: BrowseModel, q: string): TemplateRow[] {
  const byName = (a: Template, b: Template): number => a.name.localeCompare(b.name, 'en');
  const known = new Set(model.templates.map((t) => t.id));
  const roots = model.templates.filter((t) => !t.parentId || !known.has(t.parentId)).sort(byName);
  const counts = model.templateCounts();
  const needle = normalise(q);
  const row = (t: Template, variant: boolean): TemplateRow => ({
    id: t.id,
    name: t.name,
    variant,
    roles: roleLine(t),
    optionalRoles: optionalRoleLine(t),
    method: methodName(model, t.method),
    drinks: counts.get(t.id) ?? 0,
    user: model.userTemplateIds.has(t.id),
  });
  const rows = roots.flatMap((root) => [
    row(root, false),
    ...model.templates
      .filter((t) => t.parentId === root.id)
      .sort(byName)
      .map((t) => row(t, true)),
  ]);
  return rows.filter((r) => normalise(r.name).includes(needle));
}

export interface SlotVM {
  role: string;
  parts: string;
  optional: boolean;
  note?: string;
}

export interface RangeVM {
  name: string;
  unit: string;
  text: string;
  label: string;
  track: TrackGeometry;
}

export interface TemplateVM {
  name: string;
  parent?: { id: string; name: string };
  slots: SlotVM[];
  meta: { label: string; value: string }[];
  /** Empty when the template has no usual range. */
  ranges: RangeVM[];
  /** The basis of the ranges, with the unverified line while it is true. */
  basis: string[];
  notes?: string;
}

const RANGES = [
  { key: 'abv', unit: '%', decimals: 1 },
  { key: 'sugar', unit: 'g/100 ml', decimals: 1 },
  { key: 'acid', unit: '%', decimals: 2 },
] as const;

export function templateVM(model: BrowseModel, template: Template): TemplateVM {
  const parent = template.parentId ? model.templateById.get(template.parentId) : undefined;
  const meta: TemplateVM['meta'] = [
    { label: strings.templates.method, value: methodName(model, template.method) },
  ];
  if (template.glass) {
    const glass = model.vocabulary.glasses.find((g) => g.id === template.glass)?.name;
    meta.push({ label: strings.templates.glass, value: glass ?? template.glass });
  }
  const ranges: RangeVM[] = [];
  for (const spec of RANGES) {
    const range = template.usual?.[spec.key];
    if (!range) continue;
    const name = strings.balance.figures[spec.key];
    const lo = fixed(range.min, spec.decimals);
    const hi = fixed(range.max, spec.decimals);
    ranges.push({
      name,
      unit: spec.unit,
      text: strings.balance.footer(lo, hi, spec.unit),
      label: `${name}: ${strings.balance.footerFull(lo, hi, spec.unit)}`,
      track: trackGeometry(range),
    });
  }
  const basis: string[] = [];
  if (ranges.length) {
    const evidence = template.usual?.evidence ?? 'unstated';
    basis.push(strings.templates.basis(strings.balance.evidence[evidence]));
    if (template.source?.note) basis.push(template.source.note);
    if (evidence !== 'verified') basis.push(strings.balance.unverified);
  }
  return {
    name: template.name,
    parent: parent ? { id: parent.id, name: parent.name } : undefined,
    slots: template.slots.map((slot) => ({
      role: strings.spec.roles[slot.role],
      parts: strings.templates.partsRange(slot.minParts, slot.maxParts),
      optional: slot.optional === true,
      note: slot.note,
    })),
    meta,
    ranges,
    basis,
    notes: template.notes,
  };
}
