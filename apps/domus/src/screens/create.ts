// Create a space: name, storage, access, create; one decision per step and back always possible.
// The storage and access steps are the ones Connect a storage uses too (storage-steps.ts).
import { h } from '../dom';
import { createSpace } from '../logic/actions';
import { cleanName } from '../logic/names';
import { storageWords } from '../logic/storage';
import { failureText } from '../logic/words';
import { hashFor } from '../router';
import type { Ctx } from './context';
import { button, busy, buttonRow, notice, textField } from './parts';
import {
  chosenStorage,
  forgetAccess,
  newStorageState,
  storageSteps,
  type StorageStep,
} from './storage-steps';
import { createWizard, type Wizard } from './wizard';

type Step = 'name' | StorageStep | 'finish';

const NUMBER: Record<Step, number> = {
  name: 1,
  type: 2,
  github: 3,
  pick: 3,
  verdict: 3,
  webdav: 3,
  finish: 4,
};

export function createScreen(ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const state = { name: t.create.name.suggestion };
  const access = newStorageState();
  const page = h('div', { class: 'screen' });
  page.append(h('h1', {}, t.create.title));
  const body = h('div', { class: 'wizard' });
  page.append(body);

  const wizard: Wizard<Step> = createWizard<Step>({
    t,
    body,
    first: 'name',
    numbers: NUMBER,
    total: 4,
    steps: () => steps,
    leave: () => ctx.go(hashFor.home),
  });
  const { goTo, header, backButton } = wizard;

  // 1. Name
  const nameStep = (): HTMLElement[] => {
    const field = textField(t.create.name.label, { value: state.name, testid: 'name-input' });
    const message = h('p', { class: 'field-error', role: 'alert' });
    const form = h('form', { novalidate: true });
    const next = h(
      'button',
      { type: 'submit', class: 'button primary', 'data-testid': 'next' },
      t.common.continue,
    );
    form.append(field.element, message, buttonRow(backButton(), next));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = cleanName(field.input.value);
      if (name === undefined) {
        message.textContent = t.create.name.invalid;
        field.input.focus();
        return;
      }
      state.name = name;
      goTo('type');
    });
    return [...header(t.create.name.heading), h('p', {}, t.create.name.explain), form];
  };

  // 2. and 3. Storage and access: storage-steps.ts

  // 4. Create
  const finishStep = (): HTMLElement[] => {
    const f = t.create.finish;
    const storage = chosenStorage(access);
    const message = h('div', { 'data-testid': 'finish-message' });
    const create = button(
      f.button,
      () => {
        void busy([create], async () => {
          message.replaceChildren(notice('info', f.creating));
          const result = await createSpace({ name: state.name, storage }, ctx.deps);
          if (!result.ok) {
            message.replaceChildren(
              notice(
                'error',
                h('strong', {}, f.failedTitle),
                h('br'),
                failureText(t, result, access.kind),
                h('br'),
                f.failedHint,
              ),
            );
            return;
          }
          forgetAccess(access);
          ctx.flash.text = t.space.created;
          ctx.go(hashFor.space(result.id));
        });
      },
      { primary: true, testid: 'create' },
    );
    const summary = h(
      'dl',
      { class: 'summary' },
      h('dt', {}, f.nameLine),
      h('dd', { 'data-testid': 'summary-name' }, state.name),
      h('dt', {}, f.storageLine),
      h('dd', { 'data-testid': 'summary-storage' }, storageWords(t, storage)),
    );
    return [
      ...header(f.heading),
      h('p', {}, f.explain),
      summary,
      message,
      buttonRow(backButton(), create),
    ];
  };

  const steps: Record<Step, () => HTMLElement[]> = {
    name: nameStep,
    ...storageSteps(ctx, access, wizard),
    finish: finishStep,
  };
  wizard.draw();
  window.addEventListener('hashchange', () => forgetAccess(access), { once: true });
  return page;
}
