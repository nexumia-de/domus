// The categories of the shown space: hide, rename, add and remove.
import { OTHER_CATEGORY } from '@nexumia-de/list';
import { button, h } from '../dom';
import { addCategory, removeCategory, renameCategory, setCategoryHidden } from '../list/actions';
import { categoriesOf, type Category } from '../list/categories';
import type { Ctx, Screen } from './context';

export function categoriesScreen(ctx: Ctx): Screen {
  const { app, t } = ctx;
  const list = h('ul', { class: 'categories' });
  /** The category whose name is being typed; the list is not redrawn under it. */
  let renaming: string | undefined;

  const failed = (done: unknown): void => {
    if (done === undefined) ctx.say(t.failure.write);
  };

  function row(category: Category): HTMLElement {
    if (renaming === category.id) {
      const input = h('input', {
        class: 'field',
        type: 'text',
        maxlength: 80,
        value: category.name,
        'aria-label': t.categories.nameOf(category.name),
      });
      const form = h(
        'form',
        { class: 'category-rename', novalidate: true },
        input,
        h('button', { type: 'submit', class: 'primary' }, t.categories.save),
        button(t.categories.cancel, () => {
          renaming = undefined;
          draw();
        }),
      );
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        renaming = undefined;
        void app
          .act((deps, spaceId) =>
            renameCategory(deps, spaceId, category.id, input.value, category.starting).then(
              () => true,
            ),
          )
          .then(failed);
      });
      queueMicrotask(() => input.focus());
      return h('li', { class: 'category' }, form);
    }
    return h(
      'li',
      { class: category.hidden ? 'category category-hidden' : 'category' },
      h(
        'span',
        { class: 'category-name' },
        category.name,
        category.hidden ? h('span', { class: 'tag' }, t.categories.hidden) : null,
      ),
      h(
        'span',
        { class: 'category-actions' },
        button(t.categories.rename, () => {
          renaming = category.id;
          draw();
        }),
        category.id === OTHER_CATEGORY
          ? null
          : category.starting
            ? button(
                category.hidden ? t.categories.show : t.categories.hide,
                () =>
                  void app
                    .act((deps, spaceId) =>
                      setCategoryHidden(deps, spaceId, category.id, !category.hidden).then(
                        () => true,
                      ),
                    )
                    .then(failed),
              )
            : button(
                t.categories.remove,
                () =>
                  void app
                    .act((deps, spaceId) =>
                      removeCategory(deps, spaceId, category.id).then(() => true),
                    )
                    .then((done) => {
                      if (done === undefined) return ctx.say(t.failure.write);
                      ctx.say(t.categories.removed(category.name));
                    }),
                { class: 'danger' },
              ),
      ),
    );
  }

  function draw(): void {
    const categories = categoriesOf(app.state().changes, ctx.lang, t.categories.unnamed);
    list.replaceChildren(...categories.map(row));
  }

  const name = h('input', {
    id: 'new-category',
    class: 'field',
    type: 'text',
    maxlength: 80,
    autocomplete: 'off',
  });
  const form = h(
    'form',
    { class: 'add-row', novalidate: true },
    name,
    h('button', { type: 'submit', class: 'primary' }, t.categories.add),
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void app
      .act((deps, spaceId) => addCategory(deps, spaceId, name.value))
      .then((done) => {
        if (done === undefined) return ctx.say(t.failure.write);
        if (done !== null) name.value = '';
      });
  });

  const node = h(
    'div',
    { class: 'screen screen-categories' },
    h('p', { class: 'muted' }, t.categories.intro),
    list,
    h('label', { class: 'form-label', for: 'new-category' }, t.categories.addLabel),
    form,
  );
  draw();
  return {
    node,
    title: () => t.categories.title,
    update() {
      if (renaming === undefined) draw();
    },
  };
}
