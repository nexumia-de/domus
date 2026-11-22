import { isDeviceOnly } from '@nexumia-de/hospes';
import { h } from '../dom';
import { problemOf } from '../logic/failures';
import { fragmentOf, parseInviteText } from '../logic/invite';
import { storageWords } from '../logic/storage';
import { COLLECTION } from '../logic/actions';
import { hashFor } from '../router';
import { failureText } from '../logic/words';
import type { Ctx } from './context';
import { button, linkButton, notice, buttonRow, textField } from './parts';
import { statusView } from './status-view';

export function homeScreen(ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const page = h('div', { class: 'screen' });
  page.append(h('h1', {}, t.home.title), h('p', { class: 'lead' }, t.home.intro));
  if (ctx.flash.text !== undefined) {
    page.append(notice('ok', ctx.flash.text));
    ctx.flash.text = undefined;
  }

  const apps = h('ul', { class: 'apps', 'aria-label': t.home.appsLabel });
  for (const app of t.home.apps) {
    apps.append(
      h(
        'li',
        {},
        h(
          'a',
          { href: app.href },
          h('span', { class: 'name' }, app.name),
          h('span', { class: 'what' }, app.what),
        ),
      ),
    );
  }
  page.append(apps);

  // Sync
  const sync = h('section', { class: 'sync', 'aria-labelledby': 'sync-title' });
  sync.append(h('h2', { id: 'sync-title' }, t.home.syncTitle), h('p', {}, t.home.syncIntro));
  const spaces = h('div', { class: 'spaces' }, h('p', { class: 'muted' }, t.common.loading));
  sync.append(spaces);

  const join = h('form', { class: 'join-form', novalidate: true, 'data-testid': 'join-form' });
  const field = textField(t.home.joinLabel, {
    hint: t.home.joinHint,
    inputmode: 'url',
    testid: 'join-input',
  });
  const problem = h('p', { class: 'field-error', role: 'alert', 'data-testid': 'join-problem' });
  const submit = h('button', { type: 'submit', class: 'button' }, t.home.joinButton);
  join.append(h('h3', {}, t.home.joinTitle), field.element, problem, buttonRow(submit));
  join.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsed = parseInviteText(field.input.value);
    if (!parsed.ok) {
      problem.textContent = t.join.errors[parsed.error];
      field.input.focus();
      return;
    }
    const fragment = fragmentOf(field.input.value);
    field.input.value = '';
    ctx.go(fragment);
  });
  sync.append(join);
  page.append(sync);

  void (async () => {
    try {
      const list = await ctx.deps.store.listSpaces();
      const now = ctx.deps.now();
      const states = await Promise.all(
        list.map((space) => ctx.deps.store.readCollection(space.id, COLLECTION)),
      );
      if (list.length === 0) {
        spaces.replaceChildren(
          h('p', { class: 'empty', 'data-testid': 'empty' }, t.home.empty),
          buttonRow(
            linkButton(t.home.create, hashFor.new, { primary: true, testid: 'create-space' }),
            button(t.home.join, () => {
              field.input.focus();
              field.input.scrollIntoView({ block: 'center' });
            }),
          ),
        );
        return;
      }
      const items = h('ul', { class: 'space-list', 'aria-label': t.home.spacesLabel });
      list.forEach((space, index) => {
        items.append(
          h(
            'li',
            {},
            h(
              'a',
              { href: hashFor.space(space.id), class: 'space-card', 'data-testid': 'space-card' },
              h('span', { class: 'name' }, space.name ?? t.join.unnamed),
              h(
                'span',
                { class: 'what', 'data-testid': 'card-storage' },
                storageWords(t, space.storage),
              ),
              // A space on this device only has no cycle, so no state and no failure.
              isDeviceOnly(space)
                ? null
                : statusView(t, space.storage.type, states[index]?.syncedAt, space.id, now),
            ),
          ),
        );
      });
      spaces.replaceChildren(
        items,
        buttonRow(
          linkButton(t.home.create, hashFor.new, { primary: true, testid: 'create-space' }),
        ),
      );
    } catch (error) {
      spaces.replaceChildren(notice('error', failureText(t, problemOf(error))));
    }
  })();
  return page;
}
