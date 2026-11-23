// #/components/<classic id>.<component id>: one component of a shipped dish or base, read-only.
// Top to bottom: the name, the quiet line (role, "Shipped with the app"), the dish it is part of,
// Keep in my notebook (or why it cannot be kept yet), the portions of the dish, its lines with
// their amounts, its steps, and its source closed behind a tap. No edit, no history, no versions:
// those belong to the own component that Keep makes.
import type { Classic } from '@culina/engine';
import { classicOf, techniques } from '../classics/content';
import { keepShippedComponent } from '../classics/keep';
import { currentLang } from '../classics/lang';
import { ingredientLabel, loadNames } from '../classics/names';
import { portionsOf, setPortions } from '../classics/session';
import { roleLabel } from '../components/names';
import { parseShippedKey, shippedView, type ShippedView } from '../components/shipped';
import { learnedSkills } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { showToast } from '../shell/toast';
import { strings } from '../strings';
import { lineItem, methodBlock } from './classics/recipe';
import { sourceDetails } from './classics/source-block';
import { storeText } from './editor/store-text';
import { stepper } from './stepper';

const t = strings.components;
const tc = strings.classics;

let keeping = false;

/** The lines, a line that names another shipped component linked to it. */
const linesBlock = (view: ShippedView): HTMLElement => {
  const block = el('section', 'recipe-block');
  block.append(el('h2', undefined, tc.ingredientsHeading));
  const list = el('ul', 'recipe-lines');
  list.setAttribute('aria-label', view.name);
  view.lines.forEach((line, i) => {
    const item = lineItem(line);
    const link = view.links[i];
    const name = item.querySelector('.recipe-name');
    if (link !== undefined && name !== null) {
      // As on an own component: the name is the link, with the small "component" tag in it.
      const a = el('a', 'line-link', line.name);
      a.href = hashFor('components', link);
      a.append(' ', el('span', 'tag', t.subTag));
      name.replaceChildren(a);
    }
    list.append(item);
  });
  block.append(list);
  return block;
};

const keepBox = (
  classic: Classic,
  componentId: string,
  view: ShippedView,
  portions: () => number,
): HTMLElement => {
  const box = el('div', 'actions shipped-keep');
  if (view.wanted.length > 0) {
    box.append(el('p', 'note-quiet keep-cannot', t.keepCannot(view.wanted.join(', '))));
    return box;
  }
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  const keep = el('button', 'btn quiet keep-button', tc.keepButton);
  keep.type = 'button';
  keep.addEventListener('click', () => {
    if (keeping) return;
    keeping = true;
    keep.disabled = true;
    status.textContent = t.keepWorking;
    void keepShippedComponent(classic, componentId, portions(), currentLang())
      .then((done) => {
        if (done.ok) {
          showToast(t.kept(view.name));
          window.location.hash = hashFor('components', done.componentId);
          return;
        }
        if (done.reason === 'wanted') status.textContent = t.keepCannot(done.names.join(', '));
        else if (done.reason === 'store' && !done.result.ok)
          status.textContent = storeText(done.result.error.code);
        else status.textContent = t.keepProblem;
      })
      .finally(() => {
        keeping = false;
        keep.disabled = false;
      });
  });
  box.append(keep, el('p', 'muted', t.keepNote), status);
  return box;
};

/** The screen of a shipped component, or undefined when the key names none. */
export const shippedComponentDetail = (key: string): HTMLElement | undefined => {
  const parsed = parseShippedKey(key);
  const classic = parsed === undefined ? undefined : classicOf(parsed.classicId);
  if (parsed === undefined || classic === undefined) return undefined;
  const { componentId } = parsed;
  const lang = currentLang();
  const viewFor = (portions: number) =>
    shippedView(
      classic,
      componentId,
      portions,
      lang,
      (id) => ingredientLabel(id, lang),
      techniques(),
      learnedSkills(),
    );
  let portions = portionsOf(classic.id);
  const first = viewFor(portions);
  if (!first.ok) return undefined;

  const card = el('article', 'card component-card shipped-component-card');
  const back = el('a', 'back-link', t.back);
  back.href = hashFor('components');
  const title = el('h1', undefined, first.view.name);
  const quiet = [
    first.view.role === undefined ? undefined : roleLabel(first.view.role),
    strings.dishes.originShipped,
  ].filter((part): part is string => part !== undefined);
  const dish = el('a', 'family-link shipped-dish-link', t.partOf(first.view.dishName));
  dish.href = hashFor('classic', classic.id);
  const dishLine = el('p');
  dishLine.append(dish);
  card.append(back, title, el('p', 'muted', quiet.join(' · ')), dishLine);
  card.append(keepBox(classic, componentId, first.view, () => portions));

  const results = el('div', 'classic-results');
  const sourceHost = el('div', 'source-host');
  const draw = (): void => {
    const shown = viewFor(portions);
    if (!shown.ok) {
      results.replaceChildren(el('p', 'note-quiet', tc.portionsUnknown));
      return;
    }
    const method = methodBlock(shown.view.steps);
    results.replaceChildren(linesBlock(shown.view), ...(method === undefined ? [] : [method]));
    const wasOpen = sourceHost.querySelector('details')?.open === true;
    const source = sourceDetails(shown.view.source);
    source.open = wasOpen;
    sourceHost.replaceChildren(source);
  };
  const control = stepper(
    strings.dishes.portionsLabel,
    strings.dishes.portionsFewer,
    strings.dishes.portionsMore,
    portions,
    (n) => {
      if (!(n > 0)) return;
      portions = n;
      setPortions(classic.id, n);
      draw();
    },
  );
  card.append(control.wrap, el('p', 'muted', t.shippedPortions), results, sourceHost);
  draw();
  // The catalogue gives the ingredient names: drawn again once it is there.
  void loadNames().then(draw);
  return card;
};
