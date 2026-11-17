// The spec editor (#25): `#/drinks/new` for a new drink (`?template=<id>`
// starts from a template) and `#/drinks/<id>/edit` for an existing one. A
// built-in drink opens as the user's own copy that names it as its parent.
// Docs: docs/screens-specs.md#spec-editor.

import { type Route } from '../../router';
import { replace } from '../../navigation';
import { type Screen, type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { browseState } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import type { Ingredient, SpecData } from '../browse/types';
import { drinksPane, failedStatus, loadingStatus } from '../drinks/pane';
import { storedText } from './amount-entry';
import { blankDraft, draftFromSpec, riffDraft, variantDraft, withTemplate } from './draft';
import { suggestionFor } from '../spec/variant-vm';
import { newestOfLineage } from './newest';
import { editorPage } from './page';
import { bump, flushDraft, markKept, sessionFor, type Ctx } from './session';
import { sheetAddress } from './sheet-actions';
import { presentIds, stockState } from '../../stock/state';
import { applySwap, swapOf } from '../spec/swap-state';
import { editorStrings as t } from './strings';
import type { Draft } from './types';

const isNew = (route: Route): boolean =>
  route.path.length === 2 && route.path[0] === 'drinks' && route.path[1] === 'new';
const isEdit = (route: Route): boolean =>
  route.path.length === 3 && route.path[0] === 'drinks' && route.path[2] === 'edit';
const isRiff = (route: Route): boolean =>
  route.path.length === 3 && route.path[0] === 'drinks' && route.path[2] === 'riff';
const isEditor = (route: Route): boolean => isNew(route) || isEdit(route) || isRiff(route);

function preparedOf(model: BrowseModel, spec: SpecData): Parameters<typeof draftFromSpec>[2] {
  for (const id of model.tree.ids) {
    const item = model.tree.byId.get(id) as Ingredient;
    if (item.prepared?.specId !== spec.id) continue;
    return {
      ingredientId: item.id,
      yieldText: storedText({ amount: item.prepared.yield.amount, unit: item.prepared.yield.unit }),
      shelfText: item.shelfLifeDays === undefined ? '' : String(item.shelfLifeDays),
      storageText: item.storage ?? '',
      parentId: item.parentId ?? '',
      role: item.role ?? '',
    };
  }
  return undefined;
}

function newDraft(model: BrowseModel, route: Route): Draft {
  const blank = blankDraft();
  const template = model.templateById.get(route.query.get('template') ?? '');
  if (!template) return blank;
  const withSlots = withTemplate(blank, template, () => undefined);
  return { ...withSlots, method: template.method, glass: template.glass ?? '' };
}

function notFound(context: ScreenContext): ScreenView {
  return {
    title: strings.titles.notFound,
    body: notFoundBody(),
    list: drinksPane(context, 'detail'),
  };
}

function notFoundBody(): HTMLElement {
  const div = document.createElement('div');
  div.className = 'status';
  const title = document.createElement('h2');
  title.textContent = t.notFoundTitle;
  const text = document.createElement('p');
  text.textContent = t.notFoundText;
  const link = document.createElement('a');
  link.className = 'btn btn--primary';
  link.href = '#/drinks';
  link.textContent = strings.buttons.openDrinks;
  div.append(title, text, link);
  return div;
}

let listening = false;

function view(context: ScreenContext): ScreenView {
  const state = browseState(context);
  if (state.kind !== 'ready') {
    return {
      title: strings.titles.newDrink,
      body: state.kind === 'loading' ? loadingStatus() : failedStatus(state.reason),
      list: drinksPane(context, 'detail'),
    };
  }
  const { model } = state;
  const { route, store, data } = context;
  const riff = isRiff(route);
  const id = isNew(route) ? 'new' : (route.path[1] ?? '');
  const found = id === 'new' ? undefined : newestOfLineage(model, id);
  if (id !== 'new' && !found) return notFound(context);
  // A riff from a swap is its own session: the swap is part of its address.
  const swap = riff ? swapOf(route.query) : null;
  const variantId = riff && !swap ? route.query.get('variant') : null;
  const variant = found && variantId ? suggestionFor(model, found.spec, variantId) : undefined;
  const key = riff
    ? `riff/${id}${swap ? `?${route.query.get('swap')}` : ''}${variant ? `?variant=${variantId}` : ''}`
    : id;
  const base = (): Draft =>
    found && riff && variant
      ? variantDraft(found.spec, variant.suggestion, variant.template)
      : found && riff
        ? riffDraft(found.spec, swap ? applySwap(found.spec.lines, swap) : found.spec.lines)
        : found
          ? draftFromSpec(found.spec, found.origin, preparedOf(model, found.spec))
          : newDraft(model, route);
  const local = data.local();
  const session = sessionFor(key, base, local, () => bump(store));
  const title =
    id === 'new'
      ? t.titleNew
      : riff
        ? t.titleRiff(found?.spec.name ?? '')
        : t.titleEdit(session.base.name);
  if (session.status === 'loading') {
    return { title, body: loadingStatus(), list: drinksPane(context, 'detail') };
  }
  const stockNow = stockState(context);
  const stockIds = new Set(stockNow.kind === 'ready' ? presentIds(stockNow.records) : []);
  const ctx: Ctx = {
    store,
    data,
    route,
    session,
    model,
    units: context.state.units,
    imperial: context.state.units === 'imperial',
    writable: local !== null,
    stock: stockIds,
  };
  const page = editorPage(ctx);
  // A sheet address with nothing open (a reload, a shared link) opens nothing: clear it once.
  if (session.fresh) {
    session.fresh = false;
    if (route.query.has('sheet') && !session.picker && !session.form) {
      queueMicrotask(() => replace(store, sheetAddress(route, null)));
    }
  }
  if (session.focus) {
    const target = session.focus;
    session.focus = null;
    queueMicrotask(() => {
      document
        .querySelector<HTMLElement>(`[data-focus="${target}"]`)
        ?.focus({ preventScroll: false });
    });
  }
  if (!listening) {
    listening = true;
    // Leaving with changes: the next visit says they were kept.
    store.subscribe((now, before) => {
      if (isEditor(before.route) && !isEditor(now.route)) markKept();
    });
    // What was typed a moment ago is written when the page is hidden or closed.
    const flush = (): void => flushDraft(data);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  return {
    title,
    body: page.body,
    actions: page.actions,
    headerAction: page.tag,
    list: drinksPane(context, 'detail', found?.spec.lineageId),
  };
}

export const screens: Screen[] = [
  { id: 'editor-new', destination: 'drinks', pushed: true, match: isNew, view },
  { id: 'editor-edit', destination: 'drinks', pushed: true, match: isEdit, view },
  { id: 'editor-riff', destination: 'drinks', pushed: true, match: isRiff, view },
];
