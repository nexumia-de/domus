// The spec editor (#25): `#/drinks/new` for a new drink (`?template=<id>`
// starts from a template) and `#/drinks/<id>/edit` for an existing one. A
// built-in drink opens as the user's own copy that names it as its parent.
// Docs: docs/screens-specs.md#spec-editor.

import { type Route } from '../../router';
import { replace } from '../../navigation';
import { type Screen, type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { isUserId } from '../../store';
import { browseState } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import type { Ingredient, SpecData } from '../browse/types';
import { drinksPane, failedStatus, loadingStatus } from '../drinks/pane';
import { storedText } from './amount-entry';
import { blankDraft, draftFromSpec, withTemplate } from './draft';
import { editorPage } from './page';
import { bump, flushDraft, markKept, sessionFor, type Ctx } from './session';
import { sheetAddress } from './sheet-actions';
import { editorStrings as t } from './strings';
import type { Draft } from './types';

const isNew = (route: Route): boolean =>
  route.path.length === 2 && route.path[0] === 'drinks' && route.path[1] === 'new';
const isEdit = (route: Route): boolean =>
  route.path.length === 3 && route.path[0] === 'drinks' && route.path[2] === 'edit';
const isEditor = (route: Route): boolean => isNew(route) || isEdit(route);

/** The newest version of a drink, retired ones included, and where it comes from. */
export function newestOfLineage(
  model: BrowseModel,
  lineageId: string,
): { spec: SpecData; origin: 'seed' | 'user' } | undefined {
  let best: SpecData | undefined;
  for (const spec of model.specById.values()) {
    if (spec.lineageId === lineageId && (!best || spec.version > best.version)) best = spec;
  }
  return best && { spec: best, origin: isUserId(best.id) ? 'user' : 'seed' };
}

function preparedOf(model: BrowseModel, spec: SpecData): Parameters<typeof draftFromSpec>[2] {
  for (const id of model.tree.ids) {
    const item = model.tree.byId.get(id) as Ingredient;
    if (item.prepared?.specId !== spec.id) continue;
    return {
      ingredientId: item.id,
      yieldText: storedText({ amount: item.prepared.yield.amount, unit: item.prepared.yield.unit }),
      shelfText: item.shelfLifeDays === undefined ? '' : String(item.shelfLifeDays),
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
  const id = isNew(route) ? 'new' : (route.path[1] ?? '');
  const found = id === 'new' ? undefined : newestOfLineage(model, id);
  if (id !== 'new' && !found) return notFound(context);
  const base = (): Draft =>
    found
      ? draftFromSpec(found.spec, found.origin, preparedOf(model, found.spec))
      : newDraft(model, route);
  const local = data.local();
  const session = sessionFor(id, base, local, () => bump(store));
  const title = id === 'new' ? t.titleNew : t.titleEdit(session.base.name);
  if (session.status === 'loading') {
    return { title, body: loadingStatus(), list: drinksPane(context, 'detail') };
  }
  const ctx: Ctx = {
    store,
    data,
    route,
    session,
    model,
    units: context.state.units,
    imperial: context.state.units === 'imperial',
    writable: local !== null,
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
];
