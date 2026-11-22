// The list at home: the add field (docked at the bottom), open entries by priority and category,
// bought ones below (docs/behaviour.md#the-list).
import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  categoryPosition,
  homeOrder,
  suggest,
  type Entry,
  type Priority,
} from '@emptio/engine';
import { button, h } from '../dom';
import { addToList, clearBought, removeEntries, restoreEntries, setBought } from '../list/actions';
import { categoriesOf, orderOf } from '../list/categories';
import {
  SORTS,
  arrange,
  countsOf,
  grouped,
  shownOf,
  shownText,
  sortOf,
  type View,
} from '../list/view';
import { drawIcon } from '@nexumia-de/hospes/frame';
import { SORT_ICON } from '../icons';
import { KEYS } from '../prefs';
import { hashFor } from '../router';
import type { Ctx, Screen } from './context';

let fieldIds = 0;

export function listScreen(ctx: Ctx): Screen {
  const { app, t } = ctx;
  const n = ++fieldIds;
  let priority: Priority = DEFAULT_PRIORITY;
  /** How the open entries are shown on this device (docs/behaviour.md#filter-and-sort). */
  const view: View = {
    shown: shownOf(ctx.prefs.get(KEYS.shown)),
    sort: sortOf(ctx.prefs.get(KEYS.sort)),
  };

  const name = h('input', {
    id: `add-name-${n}`,
    class: 'field',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'sentences',
    enterkeyhint: 'done',
    maxlength: 200,
    placeholder: t.list.addPlaceholder,
  });
  const amount = h('input', {
    id: `add-amount-${n}`,
    class: 'field',
    type: 'text',
    autocomplete: 'off',
    maxlength: 100,
    placeholder: t.list.amountPlaceholder,
  });
  const suggestions = h('div', { class: 'suggestions' });
  const radios = PRIORITIES.map((step) => {
    const input = h('input', {
      type: 'radio',
      name: `add-priority-${n}`,
      value: step,
      checked: step === priority,
    });
    input.addEventListener('change', () => {
      if (input.checked) priority = step;
    });
    return {
      step,
      input,
      label: h('label', { class: `chip chip-${step}` }, input, t.priority[step]),
    };
  });
  // Priority and amount belong to what is being typed; they show once there is a name.
  const more = h(
    'div',
    { class: 'add-more', hidden: true },
    h(
      'fieldset',
      { class: 'chips' },
      h('legend', { class: 'visually-hidden' }, t.priorityLabel),
      ...radios.map((radio) => radio.label),
    ),
    h('label', { class: 'visually-hidden', for: amount.id }, t.list.amountLabel),
    amount,
  );
  // The form is docked at the bottom, so what it offers opens upwards, above the field.
  const form = h(
    'form',
    { class: 'add-form', novalidate: true },
    suggestions,
    more,
    h('label', { class: 'visually-hidden', for: name.id }, t.list.addLabel),
    h(
      'div',
      { class: 'add-row' },
      name,
      h('button', { type: 'submit', class: 'primary' }, t.list.add),
    ),
  );

  async function add(what: { name: string; ingredientId?: string }): Promise<void> {
    const done = await app.act((deps, spaceId) =>
      addToList(deps, spaceId, { ...what, priority, amount: amount.value }),
    );
    if (done === undefined) return ctx.say(t.failure.write);
    if (done === null) return;
    const id = done.id;
    if (done.joined) ctx.say(t.list.raised(what.name.trim()));
    else {
      ctx.say(t.list.added(what.name.trim()), {
        label: t.list.undo,
        run: () => void app.act((deps, spaceId) => removeEntries(deps, spaceId, [id])),
      });
    }
    name.value = '';
    amount.value = '';
    priority = DEFAULT_PRIORITY;
    for (const radio of radios) radio.input.checked = radio.step === priority;
    drawSuggestions();
    name.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void add({ name: name.value });
  });

  function drawSuggestions(): void {
    more.hidden = name.value.trim() === '';
    const hits = suggest(name.value, app.state().entries, 6);
    suggestions.replaceChildren(
      ...(hits.length === 0
        ? []
        : [
            h('span', { class: 'visually-hidden' }, t.list.suggestions),
            ...hits.map((hit) =>
              button(
                hit.open ? `${hit.name} (${t.list.onList})` : hit.name,
                () =>
                  void add({
                    name: hit.name,
                    ...(hit.ingredientId === undefined ? {} : { ingredientId: hit.ingredientId }),
                  }),
                { class: 'suggestion' },
              ),
            ),
          ]),
    );
  }
  name.addEventListener('input', drawSuggestions);

  // The urgencies shown and the order: one slim row above the list.
  const filterChips = PRIORITIES.map((step) => {
    const count = h('span', { class: 'filter-count' });
    const chip = h(
      'button',
      { type: 'button', class: `filter-chip chip-${step}`, 'aria-pressed': false },
      t.priority[step],
      count,
    );
    chip.addEventListener('click', () => {
      view.shown = view.shown.includes(step)
        ? view.shown.filter((s) => s !== step)
        : PRIORITIES.filter((s) => s === step || view.shown.includes(s));
      ctx.prefs.set(KEYS.shown, shownText(view.shown));
      draw();
    });
    return { step, chip, count };
  });
  const sortSelect = h(
    'select',
    { class: 'sort-select', 'aria-label': t.list.sortLabel },
    ...SORTS.map((s) => h('option', { value: s }, t.list.sorts[s])),
  );
  sortSelect.value = view.sort;
  sortSelect.addEventListener('change', () => {
    view.sort = sortOf(sortSelect.value);
    ctx.prefs.set(KEYS.sort, view.sort);
    draw();
  });
  const sortPick = h('label', { class: 'sort-pick' }, drawIcon(SORT_ICON), sortSelect);
  const tools = h(
    'div',
    { class: 'list-tools', role: 'group', 'aria-label': t.list.filterLabel },
    ...filterChips.map((c) => c.chip),
    sortPick,
  );
  const body = h('div', { class: 'list-body' });

  function row(entry: Entry, withPriority = false): HTMLElement {
    const box = h('input', {
      type: 'checkbox',
      class: 'tick',
      checked: entry.bought !== undefined,
      'aria-label': t.list.tick(entry.name),
    });
    box.addEventListener('change', () => {
      const bought = box.checked;
      void app
        .act((deps, spaceId) => setBought(deps, spaceId, entry.id, bought))
        .then((done) => {
          if (done === undefined) ctx.say(t.failure.write);
        });
    });
    return h(
      'li',
      {
        class: entry.bought === undefined ? 'entry' : 'entry entry-bought',
        'data-entry': entry.id,
      },
      box,
      h(
        'a',
        {
          class: 'entry-text',
          href: hashFor.entry(entry.id),
          'aria-label': t.list.edit(entry.name),
        },
        h(
          'span',
          { class: 'entry-name' },
          entry.name,
          entry.amount === undefined ? null : h('span', { class: 'entry-amount' }, entry.amount),
        ),
        withPriority
          ? h('span', { class: `entry-prio prio-${entry.priority}` }, t.priority[entry.priority])
          : null,
        entry.note === undefined ? null : h('span', { class: 'entry-note' }, entry.note),
      ),
    );
  }

  function draw(): void {
    const state = app.state();
    tools.hidden = state.phase !== 'ready';
    if (state.phase === 'loading') {
      form.hidden = true;
      return body.replaceChildren(h('p', { class: 'muted' }, t.list.loading));
    }
    if (state.phase === 'failed') {
      form.hidden = true;
      return body.replaceChildren(
        h('p', { class: 'notice notice-error', role: 'alert' }, t.failure.store),
        button(t.failure.retry, () => void app.load()),
      );
    }
    form.hidden = false;
    const order = orderOf(state.changes);
    const names = new Map(
      categoriesOf(state.changes, ctx.lang, t.categories.unnamed).map((c) => [c.id, c.name]),
    );
    const sorted = homeOrder(state.entries, order);
    const everyOpen = sorted.filter((entry) => entry.bought === undefined);
    const bought = sorted.filter((entry) => entry.bought !== undefined);
    const open = arrange(state.entries, view, order);
    const counts = countsOf(everyOpen);
    for (const { step, chip, count } of filterChips) {
      const on = view.shown.includes(step);
      chip.setAttribute('aria-pressed', String(on));
      count.textContent = String(counts[step]);
    }
    const parts: HTMLElement[] = [];
    if (everyOpen.length === 0 && bought.length === 0) {
      parts.push(
        h(
          'div',
          { class: 'empty' },
          h('p', {}, t.list.empty),
          h('p', { class: 'muted' }, t.list.emptyHint),
        ),
      );
    } else if (open.length === 0 && everyOpen.length > 0) {
      parts.push(
        h(
          'div',
          { class: 'empty' },
          h('p', {}, t.list.nothingShown),
          h('p', { class: 'muted' }, t.list.nothingShownHint),
        ),
      );
    }
    if (!grouped(view.sort) && open.length > 0) {
      parts.push(
        h('ul', { class: 'entries entries-flat' }, ...open.map((entry) => row(entry, true))),
      );
    }
    for (const step of grouped(view.sort) ? PRIORITIES : []) {
      const ofStep = open.filter((entry) => entry.priority === step);
      if (ofStep.length === 0) continue;
      const section = h(
        'section',
        { class: `step step-${step}` },
        h('h2', { class: 'step-title' }, t.priority[step]),
      );
      // An entry whose category is gone or hidden is listed where rule 1 puts it: with the last.
      let at = -1;
      let list: HTMLElement | undefined;
      for (const entry of ofStep) {
        const position = categoryPosition(order, entry.categoryId);
        if (view.sort === 'store' && (position !== at || list === undefined)) {
          at = position;
          list = h('ul', { class: 'entries' });
          section.append(
            h('h3', { class: 'category-title' }, names.get(order[position] ?? '') ?? ''),
            list,
          );
        } else if (list === undefined) {
          list = h('ul', { class: 'entries' });
          section.append(list);
        }
        list.append(row(entry));
      }
      parts.push(section);
    }
    // What the choice hides is counted, one tap shows it.
    if (!view.shown.includes('sometime') && counts.sometime > 0) {
      parts.push(
        h(
          'div',
          { class: 'more-line' },
          button(t.list.moreSometime(counts.sometime), () => {
            view.shown = PRIORITIES.filter((s) => s === 'sometime' || view.shown.includes(s));
            ctx.prefs.set(KEYS.shown, shownText(view.shown));
            draw();
          }),
        ),
      );
    }
    if (bought.length > 0) {
      parts.push(
        h(
          'section',
          { class: 'step step-bought' },
          h(
            'div',
            { class: 'bought-head' },
            h('h2', { class: 'step-title' }, t.list.bought(bought.length)),
            button(
              t.list.clearBought,
              () =>
                void app
                  .act((deps, spaceId) => clearBought(deps, spaceId))
                  .then((removed) => {
                    if (removed === undefined) return ctx.say(t.failure.write);
                    if (removed.length === 0) return;
                    ctx.say(t.list.cleared(removed.length), {
                      label: t.list.undo,
                      run: () =>
                        void app.act((deps, spaceId) => restoreEntries(deps, spaceId, removed)),
                    });
                  }),
            ),
          ),
          h('ul', { class: 'entries' }, ...bought.map((entry) => row(entry))),
        ),
      );
    }
    // A redraw (a sync brought something) must not take the focus from a tick box.
    const focused = document.activeElement?.closest?.('[data-entry]')?.getAttribute('data-entry');
    body.replaceChildren(...parts);
    if (focused) {
      body
        .querySelector<HTMLElement>(`[data-entry="${CSS.escape(focused)}"] .tick`)
        ?.focus({ preventScroll: true });
    }
  }

  const node = h('div', { class: 'screen screen-list' }, tools, body);
  draw();
  return { node, title: () => t.list.title, dock: form, update: draw };
}
