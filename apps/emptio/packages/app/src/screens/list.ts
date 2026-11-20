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
import { addToList, clearBought, restoreEntries, setBought } from '../list/actions';
import { categoriesOf, orderOf } from '../list/categories';
import { statusText } from '../list/status';
import { hashFor } from '../router';
import type { Ctx, Screen } from './context';

let fieldIds = 0;

export function listScreen(ctx: Ctx): Screen {
  const { app, t } = ctx;
  const n = ++fieldIds;
  let priority: Priority = DEFAULT_PRIORITY;

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
    ctx.say(done.joined ? t.list.raised(what.name.trim()) : t.list.added(what.name.trim()));
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

  const spaceLine = h('div', { class: 'space-line' });
  const body = h('div', { class: 'list-body' });

  function row(entry: Entry): HTMLElement {
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
        entry.note === undefined ? null : h('span', { class: 'entry-note' }, entry.note),
      ),
    );
  }

  function drawSpaceLine(): void {
    const { space, spaces } = app.state();
    if (space === undefined) return spaceLine.replaceChildren();
    const status = statusText(t.status, app.status(space.id), ctx.now(), ctx.isOnline());
    let who: HTMLElement;
    if (spaces.length > 1) {
      const select = h(
        'select',
        { class: 'field space-select', 'aria-label': t.list.listOf },
        ...spaces.map((s) => h('option', { value: s.id, selected: s.id === space.id }, s.name)),
      );
      select.addEventListener('change', () => void app.choose(select.value));
      who = select;
    } else who = h('span', { class: 'space-name' }, space.name);
    // The select keeps its focus while only the status changes.
    const old = spaceLine.querySelector('select');
    if (old && document.activeElement === old && spaces.length > 1) {
      spaceLine.querySelector('.space-status')?.replaceChildren(status);
      return;
    }
    spaceLine.replaceChildren(who, h('span', { class: 'space-status' }, status));
  }

  function draw(): void {
    const state = app.state();
    drawSpaceLine();
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
    const open = sorted.filter((entry) => entry.bought === undefined);
    const bought = sorted.filter((entry) => entry.bought !== undefined);
    const parts: HTMLElement[] = [];
    if (open.length === 0 && bought.length === 0) {
      parts.push(
        h(
          'div',
          { class: 'empty' },
          h('p', {}, t.list.empty),
          h('p', { class: 'muted' }, t.list.emptyHint),
        ),
      );
    }
    for (const step of PRIORITIES) {
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
        if (position !== at || list === undefined) {
          at = position;
          list = h('ul', { class: 'entries' });
          section.append(
            h('h3', { class: 'category-title' }, names.get(order[position] ?? '') ?? ''),
            list,
          );
        }
        list.append(row(entry));
      }
      parts.push(section);
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
          h('ul', { class: 'entries' }, ...bought.map(row)),
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

  const node = h(
    'div',
    { class: 'screen screen-list' },
    h('h1', { class: 'visually-hidden' }, t.appName),
    spaceLine,
    body,
  );
  draw();
  return { node, dock: form, update: draw };
}
