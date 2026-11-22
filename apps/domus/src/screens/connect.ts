// Connect a storage: for a space that is on this device only. The storage and access steps are
// those of Create a space (storage-steps.ts); the end keeps the space, its secret and its data
// and gives it the storage.
import { isDeviceOnly } from '@nexumia-de/hospes';
import { h } from '../dom';
import { connectStorage } from '../logic/actions';
import { storageWords } from '../logic/storage';
import { failureText } from '../logic/words';
import { hashFor } from '../router';
import type { Ctx } from './context';
import { button, busy, buttonRow, linkButton, notice } from './parts';
import {
  chosenStorage,
  forgetAccess,
  newStorageState,
  storageSteps,
  type StorageStep,
} from './storage-steps';
import { createWizard, type Wizard } from './wizard';

type Step = StorageStep | 'finish';

const NUMBER: Record<Step, number> = {
  type: 1,
  github: 2,
  pick: 2,
  verdict: 2,
  webdav: 2,
  finish: 3,
};

export function connectScreen(ctx: Ctx, id: string): HTMLElement {
  const { t } = ctx;
  const access = newStorageState();
  const page = h('div', { class: 'screen' });
  page.append(h('h1', {}, t.connect.title));
  const body = h('div', { class: 'wizard' });
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
    if (!isDeviceOnly(space)) {
      // The space has a storage already: its page says which.
      ctx.go(hashFor.space(id), true);
      return;
    }
    const name = space.name ?? t.join.unnamed;
    const lead = h('p', { class: 'lead', 'data-testid': 'connect-intro' }, t.connect.intro(name));
    page.insertBefore(lead, body);

    const wizard: Wizard<Step> = createWizard<Step>({
      t,
      body,
      first: 'type',
      numbers: NUMBER,
      total: 3,
      steps: () => steps,
      leave: () => ctx.go(hashFor.space(id)),
    });
    const { header, backButton } = wizard;

    const finishStep = (): HTMLElement[] => {
      const c = t.connect;
      const storage = chosenStorage(access);
      const message = h('div', { 'data-testid': 'finish-message' });
      const connect = button(
        c.button,
        () => {
          void busy([connect], async () => {
            message.replaceChildren(notice('info', c.connecting));
            const result = await connectStorage(id, storage, ctx.deps);
            if (!result.ok) {
              message.replaceChildren(
                notice(
                  'error',
                  h('strong', {}, c.failedTitle),
                  h('br'),
                  result.readonly
                    ? t.join.readonly(storage.address)
                    : failureText(
                        t,
                        {
                          failure: result.failure ?? 'unexpected',
                          ...(result.detail === undefined ? {} : { detail: result.detail }),
                        },
                        access.kind,
                      ),
                  h('br'),
                  c.failedHint,
                ),
              );
              return;
            }
            forgetAccess(access);
            ctx.flash.text = t.space.connected(storageWords(t, storage));
            ctx.go(hashFor.space(id));
          });
        },
        { primary: true, testid: 'connect' },
      );
      const summary = h(
        'dl',
        { class: 'summary' },
        h('dt', {}, c.spaceLine),
        h('dd', { 'data-testid': 'summary-name' }, name),
        h('dt', {}, c.storageLine),
        h('dd', { 'data-testid': 'summary-storage' }, storageWords(t, storage)),
      );
      return [
        ...header(c.heading),
        h('p', {}, c.explain),
        summary,
        message,
        buttonRow(backButton(), connect),
      ];
    };

    const steps: Record<Step, () => HTMLElement[]> = {
      ...storageSteps(ctx, access, wizard),
      finish: finishStep,
    };
    wizard.draw();
  })();
  window.addEventListener('hashchange', () => forgetAccess(access), { once: true });
  return page;
}
