import { h } from '../dom';
import { changeAccess } from '../logic/actions';
import { storageWords } from '../logic/storage';
import { failureText } from '../logic/words';
import { hashFor } from '../router';
import { accessForm } from './access-form';
import type { Ctx } from './context';
import { busy, buttonRow, linkButton, notice } from './parts';

/** New access for the storage of a space: a new token or new credentials. */
export function accessScreen(ctx: Ctx, id: string): HTMLElement {
  const { t } = ctx;
  const page = h('div', { class: 'screen' });
  page.append(h('h1', {}, t.access.title));
  const body = h('div');
  page.append(body);

  void (async () => {
    const space = await ctx.deps.store.getSpace(id).catch(() => undefined);
    if (!space) {
      body.append(
        h('p', {}, t.space.notFound),
        buttonRow(linkButton(t.space.home, hashFor.home, { primary: true })),
      );
      return;
    }
    const type = space.storage.type;
    const form = accessForm(t, type);
    const message = h('div', { 'data-testid': 'access-message' });
    const save = h(
      'button',
      { type: 'submit', class: 'button primary', 'data-testid': 'access-save' },
      t.access.save,
    );
    const element = h('form', { novalidate: true });
    element.append(
      form.element,
      message,
      buttonRow(linkButton(t.common.back, hashFor.space(id), { quiet: true }), save),
    );
    element.addEventListener('submit', (event) => {
      event.preventDefault();
      const access = form.read();
      if (access === undefined) return;
      void busy([save], async () => {
        message.replaceChildren(notice('info', t.access.saving));
        const result = await changeAccess(id, access, ctx.deps);
        if (!result.ok) {
          message.replaceChildren(
            notice(
              'error',
              result.readonly
                ? t.join.readonly(space.storage.address)
                : failureText(
                    t,
                    {
                      failure: result.failure ?? 'unexpected',
                      ...(result.detail === undefined ? {} : { detail: result.detail }),
                    },
                    type,
                  ),
            ),
          );
          return;
        }
        form.clear();
        ctx.flash.text = t.space.accessSaved;
        ctx.go(hashFor.space(id));
      });
    });
    body.append(
      h('p', { class: 'lead' }, type === 'github' ? t.access.githubIntro : t.access.webdavIntro),
      h('p', { 'data-testid': 'storage-words' }, storageWords(space.storage)),
      element,
    );
  })();
  return page;
}
