import { isDeviceOnly } from '@nexumia-de/hospes';
import { h } from '../dom';
import { inviteLink } from '../logic/invite';
import { hashFor } from '../router';
import { qrImage } from '../qr';
import type { Ctx } from './context';
import { button, buttonRow, linkButton, notice, uid } from './parts';

export function inviteScreen(ctx: Ctx, id: string): HTMLElement {
  const { t } = ctx;
  const page = h('div', { class: 'screen' });
  page.append(h('h1', {}, t.invite.title));
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
    if (isDeviceOnly(space)) {
      // Nothing to invite to without a storage: the space's page offers to connect one.
      ctx.go(hashFor.space(id), true);
      return;
    }
    const type = space.storage.type;
    const hasAccess = Object.keys(space.storage.access ?? {}).length > 0;

    const box = h('input', {
      type: 'checkbox',
      id: uid('include'),
      'data-testid': 'include-access',
    });
    box.checked = false;
    const includeText = type === 'github' ? t.invite.includeGithub : t.invite.includeWebdav;
    const explain = h('p', { class: 'hint', 'data-testid': 'include-explain' }, t.invite.without);
    const checkbox = h(
      'label',
      { class: 'check', for: box.id },
      box,
      h('span', {}, t.invite.include),
    );

    const linkField = h('textarea', {
      id: uid('link'),
      class: 'link',
      readonly: true,
      rows: 5,
      spellcheck: 'false',
      autocomplete: 'off',
      'data-testid': 'invite-link',
      'aria-label': t.invite.linkLabel,
    });
    const qrBox = h('div', { class: 'qr-box', 'data-testid': 'qr-box' });
    const feedback = h('p', { class: 'feedback', role: 'status', 'data-testid': 'copy-feedback' });

    let link = '';
    const draw = (): void => {
      link = inviteLink(ctx.base(), space, box.checked && hasAccess);
      linkField.value = link;
      explain.textContent = box.checked ? includeText : t.invite.without;
      const image = qrImage(link, t.invite.qrLabel);
      qrBox.replaceChildren(...(image ? [image] : [notice('warn', t.invite.qrTooLong)]));
      feedback.textContent = '';
    };
    box.disabled = !hasAccess;
    box.addEventListener('change', draw);
    linkField.addEventListener('focus', () => linkField.select());

    const copy = button(
      t.invite.copy,
      () => {
        void (async () => {
          try {
            await navigator.clipboard.writeText(link);
            feedback.textContent = t.invite.copied;
          } catch {
            feedback.textContent = t.invite.copyFailed;
            linkField.focus();
            linkField.select();
          }
        })();
      },
      { primary: true, testid: 'copy-link' },
    );
    const actions = [copy];
    if (typeof navigator.share === 'function') {
      actions.push(
        button(
          t.invite.share,
          () => {
            void navigator.share({ url: link, title: t.appName }).catch(() => undefined);
          },
          { testid: 'share-link' },
        ),
      );
    }

    body.append(
      h('p', { class: 'lead' }, t.invite.intro),
      qrBox,
      h('p', { class: 'hint center' }, t.invite.qrNote),
      h('label', { for: linkField.id, class: 'label' }, t.invite.linkLabel),
      linkField,
      buttonRow(...actions),
      feedback,
      h('section', { class: 'card' }, checkbox, explain),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t.invite.alwaysTitle),
        h('p', {}, t.invite.always),
      ),
      buttonRow(linkButton(t.invite.backToSpace, hashFor.space(id), { quiet: true })),
    );
    draw();
  })();
  return page;
}
