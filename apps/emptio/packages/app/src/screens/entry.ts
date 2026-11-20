// One entry: name, amount, note, priority and category, and why it is on the list.
import { PRIORITIES, type Entry, type Origin, type Priority } from '@emptio/engine';
import { button, h } from '../dom';
import { editEntry, removeEntries, restoreEntries } from '../list/actions';
import { categoriesOf } from '../list/categories';
import { hashFor } from '../router';
import type { Ctx, Screen } from './context';

const APPS: Record<string, string> = { culina: "Cook's Notebook", mixtura: 'Drink Builder' };

export function entryScreen(ctx: Ctx, id: string): Screen {
  const { app, t } = ctx;
  const node = h('div', { class: 'screen screen-entry' });
  const back = h('a', { class: 'back', href: hashFor.list }, `‹ ${t.nav.back}`);
  /** The form is built once, when the entry is first there: a sync must not wipe what is typed. */
  let built = false;

  const day = (time: string): string => time.slice(0, 10);
  const originText = (origin: Origin, entry: Entry): string =>
    origin.kind === 'typed'
      ? t.entry.typed(day(entry.addedAt))
      : origin.kind === 'recipe'
        ? t.entry.recipe(APPS[origin.app] ?? origin.app, origin.title)
        : t.entry.staple;

  function build(entry: Entry): void {
    built = true;
    const field = (label: string, input: HTMLElement): HTMLElement =>
      h('label', { class: 'form-field' }, h('span', { class: 'form-label' }, label), input);
    const name = h('input', { class: 'field', type: 'text', maxlength: 200, value: entry.name });
    const amount = h('input', {
      class: 'field',
      type: 'text',
      maxlength: 100,
      value: entry.amount ?? '',
      placeholder: t.list.amountPlaceholder,
    });
    const note = h('textarea', { class: 'field', rows: 2, maxlength: 500 }, entry.note ?? '');
    let priority: Priority = entry.priority;
    const chips = h(
      'fieldset',
      { class: 'chips' },
      h('legend', { class: 'form-label' }, t.priorityLabel),
      ...PRIORITIES.map((step) => {
        const input = h('input', {
          type: 'radio',
          name: 'entry-priority',
          value: step,
          checked: step === priority,
        });
        input.addEventListener('change', () => {
          if (input.checked) priority = step;
        });
        return h('label', { class: `chip chip-${step}` }, input, t.priority[step]);
      }),
    );
    const all = categoriesOf(app.state().changes, ctx.lang, t.categories.unnamed);
    const known = all.some((c) => c.id === entry.categoryId);
    const category = h(
      'select',
      { class: 'field' },
      ...all
        .filter((c) => !c.hidden || c.id === entry.categoryId)
        .map((c) => h('option', { value: c.id, selected: c.id === entry.categoryId }, c.name)),
    );
    // An entry whose category was removed keeps it until the person chooses another.
    if (!known) category.value = 'other';
    const problem = h('p', { class: 'notice notice-error', role: 'alert', hidden: true });
    const form = h(
      'form',
      { class: 'entry-form', novalidate: true },
      field(t.entry.name, name),
      field(t.entry.amount, amount),
      field(t.entry.note, note),
      chips,
      field(t.entry.category, category),
      problem,
      h(
        'div',
        { class: 'actions' },
        h('button', { type: 'submit', class: 'primary' }, t.entry.save),
        button(
          t.entry.remove,
          () =>
            void app
              .act((deps, spaceId) => removeEntries(deps, spaceId, [id]))
              .then(() => {
                ctx.say(t.list.removed(entry.name), {
                  label: t.list.undo,
                  run: () =>
                    void app.act((deps, spaceId) => restoreEntries(deps, spaceId, [entry])),
                });
                ctx.go(hashFor.list);
              }),
          { class: 'danger' },
        ),
      ),
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (name.value.trim() === '') {
        problem.textContent = t.entry.nameNeeded;
        problem.hidden = false;
        name.focus();
        return;
      }
      void app
        .act((deps, spaceId) =>
          editEntry(deps, spaceId, id, {
            name: name.value,
            amount: amount.value,
            note: note.value,
            priority,
            categoryId: known || category.value !== 'other' ? category.value : entry.categoryId,
          }),
        )
        .then((done) => {
          if (done === undefined) {
            problem.textContent = t.failure.write;
            problem.hidden = false;
          } else ctx.go(hashFor.list);
        });
    });
    node.replaceChildren(
      back,
      h('h1', {}, entry.name),
      form,
      h(
        'p',
        { class: 'muted origins' },
        entry.origins.map((origin) => originText(origin, entry)).join(' '),
        entry.bought === undefined ? null : ` ${t.entry.boughtOn(day(entry.bought.at))}`,
      ),
    );
  }

  function update(): void {
    const state = app.state();
    if (state.phase === 'loading') return;
    const entry = state.entries.find((e) => e.id === id);
    if (entry !== undefined) {
      if (!built) build(entry);
      return;
    }
    built = false;
    node.replaceChildren(back, h('h1', {}, t.entry.title), h('p', {}, t.entry.gone));
  }

  node.append(back, h('h1', {}, t.entry.title));
  update();
  return { node, update };
}
