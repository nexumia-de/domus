// The editor as data: every text and choice the screen shows, worked out
// from the draft, its check and the browse model, so a test can read the
// editor without a browser. The balance panel is the spec screen's own
// view model, fed with the draft's valid lines.

import { getIngredient, lineRole, type Role } from '@mixtura/engine';
import { strings } from '../../strings';
import type { BrowseModel } from '../browse/model';
import type { BalanceVM, CompactItem } from '../spec/balance-vm';
import { compactItems, specVM, templateOf } from '../spec/view-model';
import type { DraftCheck, LineCheck } from './check';
import { editorStrings as t } from './strings';
import type { Draft, DraftLine } from './types';

export interface LineRowVM {
  key: string;
  index: number;
  count: number;
  /** The chosen ingredient's name; null while none is chosen. */
  ingredient: string | null;
  /** The role the ingredient has by itself, in words. */
  ownRole: string | null;
  /** The role shown on the line: the user's or the ingredient's. */
  role: { id: Role; label: string } | null;
  check: LineCheck;
  isTop: boolean;
  /** An empty line that came from a template slot. */
  slot: boolean;
  noteOpen: boolean;
  menuOpen: boolean;
}

export interface PreparedVM {
  on: boolean;
  figures: { label: string; value: string }[];
  /** Why there is no figure. */
  reason?: string;
  usedIn: number;
  yieldError?: string;
  shelfError?: string;
}

export interface EditorVM {
  title: string;
  copyNote?: string;
  templates: { id: string; name: string }[];
  suggestion?: { id: string; name: string };
  lines: LineRowVM[];
  balance: BalanceVM;
  compact: CompactItem[];
  templateNote?: string;
  methods: { id: string; name: string }[];
  glasses: { id: string; name: string }[];
  garnishes: string[];
  prepared: PreparedVM;
  /** What the bottom bar says under Save while it is not possible. */
  saveReason?: string;
}

const roleLabel = (role: Role): string => strings.spec.roles[role];

export function lineRow(
  model: BrowseModel,
  line: DraftLine,
  index: number,
  count: number,
  check: LineCheck,
  noteOpen: boolean,
  menuOpen: boolean,
): LineRowVM {
  const known =
    line.ingredientId !== '' && getIngredient(model.tree, line.ingredientId) !== undefined;
  const own = known
    ? lineRole(model.tree, { ingredientId: line.ingredientId, amount: 1, unit: 'ml' })
    : undefined;
  const ownRole = own && 'role' in own ? roleLabel(own.role) : null;
  const shown: Role | undefined = line.role ?? (own && 'role' in own ? own.role : undefined);
  return {
    key: line.key,
    index,
    count,
    ingredient: line.ingredientId === '' ? null : (model.ingredientName(line.ingredientId) ?? null),
    ownRole,
    role: shown ? { id: shown, label: roleLabel(shown) } : null,
    check,
    isTop: line.unit === 'top',
    slot: line.ingredientId === '' && line.role !== undefined,
    noteOpen: noteOpen || line.note !== '',
    menuOpen,
  };
}

const figure = (value: number | undefined, unit: string, decimals: number): string =>
  value === undefined ? t.prepared.noFigure : `${value.toFixed(decimals)} ${unit}`;

/** How many drinks use a prepared ingredient (any version of any drink). */
export function usedInCount(model: BrowseModel, ingredientId: string): number {
  if (ingredientId === '') return 0;
  const lineages = new Set<string>();
  for (const spec of model.specById.values()) {
    if (spec.lines.some((l) => l.ingredientId === ingredientId)) lineages.add(spec.lineageId);
  }
  return lineages.size;
}

export function editorVM(
  model: BrowseModel,
  draft: Draft,
  check: DraftCheck,
  units: 'metric' | 'us' | 'imperial',
  noteOpen: ReadonlySet<string>,
  menu: string | null,
): EditorVM {
  const base = specVM(model, check.spec, units, { origin: 'user', fresh: true });
  const { template, basis } = templateOf(model, check.spec);
  const count = draft.lines.length;
  const target = draft.target;
  const prepared = check.prepared;
  const figures = prepared?.figures;
  const vm: EditorVM = {
    title:
      target.kind === 'new'
        ? t.titleNew
        : target.kind === 'copy' && target.riff
          ? t.titleRiff(target.fromName)
          : t.titleEdit(target.kind === 'copy' ? target.fromName : draft.name || t.titleNew),
    templates: model.templates.map((tpl) => ({ id: tpl.id, name: tpl.name })),
    lines: draft.lines.map((line, i) =>
      lineRow(
        model,
        line,
        i,
        count,
        check.lines[i] as LineCheck,
        noteOpen.has(line.key),
        menu === line.key,
      ),
    ),
    balance: base.balance,
    compact: compactItems(base.balance),
    methods: model.vocabulary.methods,
    glasses: model.vocabulary.glasses,
    garnishes: [
      ...new Set(model.drinks.flatMap((d) => (d.spec.garnish ? [d.spec.garnish] : []))),
    ].sort(),
    prepared: {
      on: draft.prepared.on,
      usedIn: usedInCount(model, draft.prepared.ingredientId),
      figures: figures
        ? [
            { label: strings.balance.figures.abv, value: figure(figures.abv, '%', 1) },
            { label: strings.balance.figures.sugar, value: figure(figures.sugar, 'g/100 ml', 1) },
            { label: strings.balance.figures.acid, value: figure(figures.acid, '%', 2) },
          ]
        : [],
      ...(figures?.reason && { reason: figures.reason }),
      ...(prepared?.yieldError &&
        draft.prepared.yieldText.trim() !== '' && { yieldError: prepared.yieldError }),
      ...(prepared?.shelfError && { shelfError: prepared.shelfError }),
    },
  };
  if (target.kind === 'copy') {
    vm.copyNote = target.riff ? t.riffOf(target.fromName) : t.copyOf(target.fromName);
  }
  if (draft.templateId === '' && basis === 'suggested' && template) {
    vm.suggestion = { id: template.id, name: template.name };
  }
  if (base.noTemplateNote && draft.templateId === '') vm.templateNote = base.noTemplateNote;
  if (!check.ok) vm.saveReason = check.blockers[0];
  return vm;
}
