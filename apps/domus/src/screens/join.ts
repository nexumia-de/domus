import { setupLinks } from '@nexumia-de/hospes';
import { deriveSpace } from '@nexumia-de/hospes';
import { h } from '../dom';
import { joinSpace } from '../logic/actions';
import { needsAccess, parseInviteText } from '../logic/invite';
import { problemOf } from '../logic/failures';
import { storageWords } from '../logic/storage';
import { failureText } from '../logic/words';
import { hashFor } from '../router';
import { accessForm } from './access-form';
import type { Ctx } from './context';
import { busy, buttonRow, linkButton, notice } from './parts';

/** Join by the fragment an invite link carries (`#/join/<data>`); empty fragment: nothing to join. */
export function joinScreen(ctx: Ctx, fragment: string): HTMLElement {
  const { t } = ctx;
  const page = h('div', { class: 'screen' });
  page.append(h('h1', {}, t.join.title));
  const body = h('div');
  page.append(body);
  const parsed = parseInviteText(fragment);
  if (!parsed.ok) {
    body.append(
      h('h2', {}, t.join.problemTitle),
      notice('error', t.join.errors[parsed.error]),
      buttonRow(linkButton(t.common.back, hashFor.home, { primary: true })),
    );
    return page;
  }
  const { invite } = parsed;
  const type = invite.storage.type;

  void (async () => {
    // A space that is already here is not joined a second time.
    try {
      const id = (await deriveSpace(invite.secret)).id;
      const here = await ctx.deps.store.getSpace(id);
      if (here) {
        body.append(
          notice('info', t.join.alreadyHere(here.name ?? invite.name)),
          buttonRow(
            linkButton(t.join.open, hashFor.space(id), { primary: true, testid: 'open-existing' }),
          ),
        );
        return;
      }
    } catch (error) {
      body.append(notice('error', failureText(t, problemOf(error))));
      return;
    }

    const asks = needsAccess(invite);
    const form = asks ? accessForm(t, type) : undefined;
    const message = h('div', { 'data-testid': 'join-message' });
    const join = h(
      'button',
      { type: 'submit', class: 'button primary', 'data-testid': 'join' },
      t.join.button,
    );
    const element = h('form', { novalidate: true });
    const summary = h(
      'dl',
      { class: 'summary' },
      h('dt', {}, t.join.spaceLine),
      h('dd', { 'data-testid': 'join-name' }, invite.name ?? t.join.unnamed),
      h('dt', {}, t.join.storageLine),
      h('dd', { 'data-testid': 'join-storage' }, storageWords(t, invite.storage)),
    );
    element.append(summary);
    if (form) {
      element.append(h('p', {}, t.join.accessNeeded));
      if (type === 'github') {
        const list = h('ol', { class: 'steps' });
        for (const item of t.join.githubStepsList) list.append(h('li', {}, item));
        element.append(
          h('p', {}, t.join.githubSteps),
          list,
          linkButton(
            t.join.openTokenPage,
            setupLinks({ tokenName: t.create.github.tokenName }).tokenUrl,
            { external: true },
          ),
        );
      }
      element.append(form.element);
    } else {
      element.append(h('p', {}, t.join.accessIncluded));
    }
    element.append(
      message,
      buttonRow(linkButton(t.common.back, hashFor.home, { quiet: true }), join),
    );

    element.addEventListener('submit', (event) => {
      event.preventDefault();
      const entered = form ? form.read() : invite.access;
      if (form && entered === undefined) return;
      void busy([join], async () => {
        message.replaceChildren(notice('info', t.join.joining));
        const result = await joinSpace(invite, entered, ctx.deps);
        if (result.ok) {
          form?.clear();
          const name = result.name ?? t.join.unnamed;
          ctx.flash.text = result.found
            ? t.space.joined(name)
            : `${t.space.joined(name)} ${t.space.joinedEmpty}`;
          // The secret leaves the address bar: this entry of the history becomes the space's page.
          ctx.go(hashFor.space(result.id), true);
          return;
        }
        if (result.alreadyHere) {
          message.replaceChildren(
            notice('info', t.join.alreadyHere(invite.name)),
            buttonRow(linkButton(t.join.open, hashFor.space(result.id), { primary: true })),
          );
          return;
        }
        message.replaceChildren(
          notice(
            'error',
            result.readonly
              ? t.join.readonly(invite.storage.address)
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
      });
    });
    body.append(element);
  })();
  return page;
}
