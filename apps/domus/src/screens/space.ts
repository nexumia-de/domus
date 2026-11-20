import { isDeviceOnly } from '@nexumia-de/hospes';
import { h } from '../dom';
import { COLLECTION, renameSpace, syncSpace } from '../logic/actions';
import { cleanName } from '../logic/names';
import { clearFailure, noteFailure } from '../logic/status';
import { storageWords } from '../logic/storage';
import { hashFor } from '../router';
import type { Ctx } from './context';
import { busy, button, buttonRow, linkButton, notice, textField } from './parts';
import { statusView } from './status-view';

export function spaceScreen(ctx: Ctx, id: string): HTMLElement {
  const { t } = ctx;
  const page = h('div', { class: 'screen' });
  const heading = h('h1', { 'data-testid': 'space-title' }, t.common.loading);
  page.append(heading);
  const flash = ctx.flash.text;
  ctx.flash.text = undefined;
  const body = h('div');
  page.append(body);

  void (async () => {
    let space;
    try {
      space = await ctx.deps.store.getSpace(id);
    } catch {
      space = undefined;
    }
    if (!space) {
      heading.textContent = t.space.notFound;
      body.append(buttonRow(linkButton(t.space.home, hashFor.home, { primary: true })));
      return;
    }
    const type = space.storage.type;
    // On this device only: no cycle, no invite, no access; a storage can be connected.
    const local = isDeviceOnly(space);
    heading.textContent = space.name ?? t.join.unnamed;
    document.title = `${heading.textContent} - ${t.appName}`;

    const messages = h('div', { 'data-testid': 'space-messages' });
    if (flash !== undefined) messages.append(notice('ok', flash));

    // Name
    const name = textField(t.space.nameLabel, { value: space.name ?? '', testid: 'rename-input' });
    const nameError = h('p', { class: 'field-error', role: 'alert' });
    const renameForm = h('form', { novalidate: true, class: 'rename' });
    const renameButton = h(
      'button',
      { type: 'submit', class: 'button', 'data-testid': 'rename' },
      t.space.rename,
    );
    renameForm.append(name.element, nameError, buttonRow(renameButton));

    // Storage and state
    const statusBox = h('div');
    const drawStatus = async (): Promise<void> => {
      const state = await ctx.deps.store.readCollection(id, COLLECTION);
      statusBox.replaceChildren(statusView(t, type, state.syncedAt, id, ctx.deps.now()));
    };
    const report = (outcome: Awaited<ReturnType<typeof syncSpace>>): void => {
      const at = ctx.deps.now();
      if (outcome.ok) clearFailure(id);
      else
        noteFailure(id, at, {
          failure: outcome.failure,
          ...(outcome.detail === undefined ? {} : { detail: outcome.detail }),
        });
    };
    const refreshTitle = async (): Promise<void> => {
      const current = await ctx.deps.store.getSpace(id);
      if (current?.name !== undefined && current.name !== heading.textContent) {
        heading.textContent = current.name;
        name.input.value = current.name;
        document.title = `${current.name} - ${t.appName}`;
      }
    };

    const sync = button(
      t.space.syncNow,
      () => {
        void busy([sync], async () => {
          statusBox.replaceChildren(h('p', { class: 'status-line' }, t.space.syncing));
          const current = (await ctx.deps.store.getSpace(id)) ?? space;
          report(await syncSpace(current, ctx.deps));
          await refreshTitle();
          await drawStatus();
        });
      },
      { primary: true, testid: 'sync-now' },
    );

    renameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (cleanName(name.input.value) === undefined) {
        nameError.textContent = t.space.invalidName;
        name.input.focus();
        return;
      }
      nameError.textContent = '';
      void busy([renameButton, sync], async () => {
        if (!local) statusBox.replaceChildren(h('p', { class: 'status-line' }, t.space.syncing));
        const result = await renameSpace(id, name.input.value, ctx.deps);
        if (result.outcome) report(result.outcome);
        messages.replaceChildren(notice('ok', t.space.nameSaved));
        await refreshTitle();
        if (!local) await drawStatus();
      });
    });

    // Remove
    const confirmBox = h('div', {
      class: 'confirm',
      hidden: true,
      'data-testid': 'confirm-remove',
    });
    const remove = button(
      t.space.remove,
      () => {
        confirmBox.hidden = false;
        confirmBox.querySelector<HTMLElement>('h2')?.focus();
      },
      { danger: true, testid: 'remove' },
    );
    confirmBox.append(
      h('h2', { tabindex: '-1' }, t.space.removeTitle),
      h('p', {}, local ? t.space.removeDeviceOnlyText : t.space.removeText),
      buttonRow(
        button(
          t.common.cancel,
          () => {
            confirmBox.hidden = true;
            remove.focus();
          },
          { testid: 'remove-cancel' },
        ),
        button(
          t.space.removeConfirm,
          () => {
            void (async () => {
              await ctx.deps.store.removeSpace(id);
              clearFailure(id);
              ctx.flash.text = t.space.removed;
              ctx.go(hashFor.home);
            })();
          },
          { danger: true, testid: 'remove-confirm' },
        ),
      ),
    );

    const storageCard = h(
      'section',
      { class: 'card' },
      h('h2', {}, t.space.storageTitle),
      h('p', { 'data-testid': 'storage-words' }, storageWords(t, space.storage)),
    );
    if (local) {
      storageCard.append(
        h('p', { 'data-testid': 'device-only' }, t.space.deviceOnlyText),
        buttonRow(
          linkButton(t.space.connect, hashFor.connect(id), {
            primary: true,
            testid: 'connect-storage',
          }),
        ),
      );
    } else storageCard.append(h('h2', {}, t.space.lastTitle), statusBox, buttonRow(sync));
    body.append(messages, storageCard, renameForm);
    if (!local) {
      body.append(
        buttonRow(
          linkButton(t.space.invite, hashFor.invite(id), { testid: 'invite' }),
          linkButton(t.space.changeAccess, hashFor.access(id), {
            quiet: true,
            testid: 'change-access',
          }),
        ),
      );
    }
    body.append(h('hr'), buttonRow(remove), confirmBox);
    if (!local) await drawStatus();
  })();
  return page;
}
