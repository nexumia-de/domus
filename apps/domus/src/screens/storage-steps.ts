// The storage and access steps that Create a space and Connect a storage share: the choice of a
// storage, GitHub's three guided steps (with the pick and the verdict on the repository) and
// WebDAV with its test. The GitHub token lives in the state the screen holds: in an input while
// it is typed, then in a variable until the space is stored (the host package puts it into the
// local database) or the screen goes.
import { setupLinks, type RepositoryEntry, type StoredStorage } from '@nexumia-de/hospes';
import { h } from '../dom';
import { checkStorage } from '../logic/actions';
import { chooseRepository, verdictOf, type Verdict } from '../logic/github-setup';
import { parseWebdavAddress, storageOf, type StorageKind } from '../logic/storage';
import { failureText } from '../logic/words';
import type { Ctx } from './context';
import { button, busy, buttonRow, linkButton, notice, secretField, textField } from './parts';
import type { Wizard } from './wizard';

export type StorageStep = 'type' | 'github' | 'pick' | 'verdict' | 'webdav';

export interface StorageState {
  kind: StorageKind;
  token: string;
  repository: string;
  repositories: RepositoryEntry[];
  verdict: Verdict | undefined;
  webdav: { address: string; user: string; password: string };
}

export const newStorageState = (): StorageState => ({
  kind: 'github',
  token: '',
  repository: '',
  repositories: [],
  verdict: undefined,
  webdav: { address: '', user: '', password: '' },
});

/** Drops the token and the password from the state. */
export const forgetAccess = (state: StorageState): void => {
  state.token = '';
  state.webdav.password = '';
};

const webdavStorage = (state: StorageState): StoredStorage => {
  const { address, user, password } = state.webdav;
  const access: Record<string, string> = {};
  if (user !== '') access.username = user;
  if (password !== '') access.password = password;
  return storageOf('webdav', address, Object.keys(access).length > 0 ? access : undefined);
};

/** The storage the steps led to, with its access. */
export const chosenStorage = (state: StorageState): StoredStorage =>
  state.kind === 'github'
    ? storageOf('github', state.repository, { token: state.token })
    : webdavStorage(state);

/**
 * The steps, drawn into the wizard of the screen that uses them; the wizard's `finish` step is
 * where they lead when the storage answered.
 */
export function storageSteps(
  ctx: Ctx,
  state: StorageState,
  wizard: Wizard<StorageStep | 'finish'>,
): Record<StorageStep, () => HTMLElement[]> {
  const { t } = ctx;
  const { goTo, goBack, header, backButton } = wizard;

  // Storage type
  const typeStep = (): HTMLElement[] => {
    const choose = (kind: StorageKind): void => {
      state.kind = kind;
      goTo(kind === 'github' ? 'github' : 'webdav');
    };
    const option = (kind: StorageKind, title: string, what: string): HTMLElement => {
      const b = h(
        'button',
        { type: 'button', class: 'choice', 'data-testid': `type-${kind}` },
        h('span', { class: 'name' }, title),
        h('span', { class: 'what' }, what),
      );
      b.addEventListener('click', () => choose(kind));
      return b;
    };
    return [
      ...header(t.create.type.heading),
      h('p', {}, t.create.type.explain),
      option('github', t.create.type.github.title, t.create.type.github.what),
      option('webdav', t.create.type.webdav.title, t.create.type.webdav.what),
      buttonRow(backButton()),
    ];
  };

  // GitHub: three guided steps
  const githubStep = (): HTMLElement[] => {
    const g = t.create.github;
    const links = setupLinks();
    const token = secretField(t.fields.tokenLabel, {
      hint: g.tokenHint,
      showAria: t.fields.showTokenAria,
      hideAria: t.fields.hideTokenAria,
      show: t.common.show,
      hide: t.common.hide,
      testid: 'token-input',
    });
    token.input.value = state.token;
    const message = h('div', { 'data-testid': 'github-message' });
    const next = h(
      'button',
      { type: 'submit', class: 'button primary', 'data-testid': 'next' },
      t.common.continue,
    );
    const form = h('form', { novalidate: true });
    form.append(token.element, message, buttonRow(backButton(), next));

    const lookRepository = async (repository: string): Promise<void> => {
      message.replaceChildren(notice('info', g.checking));
      const test = verdictOf(await ctx.deps.testGithub(repository, state.token));
      state.repository = repository;
      state.verdict = test;
      if (test.kind === 'ok') {
        message.replaceChildren();
        goTo('finish');
      } else if (test.kind === 'failed') {
        message.replaceChildren(notice('error', failureText(t, test.problem, 'github')));
      } else goTo('verdict');
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = token.input.value.trim();
      if (value === '') {
        message.replaceChildren(notice('error', t.fields.emptyToken));
        token.input.focus();
        return;
      }
      state.token = value;
      void busy([next], async () => {
        message.replaceChildren(notice('info', g.checking));
        const choice = chooseRepository(await ctx.deps.findRepositories(value));
        if (choice.kind === 'failed') {
          message.replaceChildren(notice('error', failureText(t, choice.problem, 'github')));
        } else if (choice.kind === 'none' || choice.kind === 'none-writable') {
          message.replaceChildren(
            notice('error', choice.kind === 'none' ? g.none : g.noneWritable),
          );
        } else if (choice.kind === 'pick') {
          message.replaceChildren();
          state.repositories = choice.repositories;
          goTo('pick');
        } else await lookRepository(choice.repository);
      });
    });

    const section = (title: string, ...content: Node[]): HTMLElement =>
      h('section', { class: 'guide-step' }, h('h3', {}, title), ...content);
    const list = h('ol', { class: 'steps' });
    for (const item of g.step2List) list.append(h('li', {}, item));
    return [
      ...header(g.heading),
      h('p', {}, g.explain),
      section(
        `1. ${g.step1}`,
        h('p', {}, g.step1Text),
        linkButton(g.step1Button, links.repositoryUrl, {
          external: true,
          testid: 'open-new-repository',
        }),
      ),
      section(
        `2. ${g.step2}`,
        h('p', {}, g.step2Text),
        list,
        linkButton(g.step2Button, links.tokenUrl, { external: true, testid: 'open-new-token' }),
      ),
      section(`3. ${g.step3}`, form),
    ];
  };

  // Several repositories: pick one
  const pickStep = (): HTMLElement[] => {
    const g = t.create.github;
    const message = h('div');
    const list = h('ul', { class: 'choices' });
    for (const repository of state.repositories) {
      const b = h(
        'button',
        { type: 'button', class: 'choice', 'data-testid': 'repository' },
        h('span', { class: 'name' }, repository.fullName),
        h('span', { class: 'what' }, repository.private ? g.private : g.public),
      );
      b.addEventListener('click', () => {
        void busy([b], async () => {
          message.replaceChildren(notice('info', g.checking));
          const test = verdictOf(await ctx.deps.testGithub(repository.fullName, state.token));
          state.repository = repository.fullName;
          state.verdict = test;
          if (test.kind === 'ok') goTo('finish');
          else if (test.kind === 'failed')
            message.replaceChildren(notice('error', failureText(t, test.problem, 'github')));
          else goTo('verdict');
        });
      });
      list.append(h('li', {}, b));
    }
    return [
      ...header(g.pickHeading),
      h('p', {}, g.pickExplain),
      list,
      message,
      buttonRow(backButton()),
    ];
  };

  // The repository was looked at: public (warn) or read-only (block)
  const verdictStep = (): HTMLElement[] => {
    const g = t.create.github;
    if (state.verdict?.kind === 'public') {
      return [
        ...header(g.publicTitle),
        notice('warn', g.publicText(state.repository)),
        buttonRow(
          button(g.publicOther, goBack, { quiet: true, testid: 'back' }),
          button(g.publicUse, () => goTo('finish'), { primary: true, testid: 'public-use' }),
        ),
      ];
    }
    return [
      ...header(g.readonlyTitle),
      notice('error', g.readonlyText(state.repository)),
      buttonRow(backButton()),
    ];
  };

  // WebDAV
  const webdavStep = (): HTMLElement[] => {
    const w = t.create.webdav;
    const address = textField(w.address, {
      value: state.webdav.address,
      hint: w.addressHint,
      inputmode: 'url',
      testid: 'webdav-address',
    });
    const user = textField(t.fields.user, { value: state.webdav.user, testid: 'webdav-user' });
    const password = secretField(t.fields.password, {
      showAria: t.fields.showPasswordAria,
      hideAria: t.fields.hidePasswordAria,
      show: t.common.show,
      hide: t.common.hide,
      testid: 'webdav-password',
    });
    password.input.value = state.webdav.password;
    const message = h('div', { 'data-testid': 'webdav-message' });
    const form = h('form', { novalidate: true });
    const test = h(
      'button',
      { type: 'button', class: 'button', 'data-testid': 'webdav-test' },
      w.test,
    );
    const next = h(
      'button',
      { type: 'submit', class: 'button primary', 'data-testid': 'next' },
      t.common.continue,
    );
    form.append(
      address.element,
      user.element,
      password.element,
      message,
      buttonRow(backButton(), test, next),
    );

    const read = (): boolean => {
      state.webdav = {
        address: address.input.value.trim(),
        user: user.input.value,
        password: password.input.value,
      };
      if (parseWebdavAddress(state.webdav.address) === undefined) {
        message.replaceChildren(notice('error', w.badAddress));
        address.input.focus();
        return false;
      }
      return true;
    };
    const run = async (goOn: boolean): Promise<void> => {
      if (!read()) return;
      message.replaceChildren(notice('info', w.testing));
      const result = await checkStorage(webdavStorage(state), ctx.deps);
      if (!result.ok) {
        message.replaceChildren(
          notice(
            'error',
            failureText(
              t,
              {
                failure: result.failure ?? 'unexpected',
                ...(result.detail === undefined ? {} : { detail: result.detail }),
              },
              'webdav',
            ),
          ),
        );
        return;
      }
      message.replaceChildren(notice('ok', w.connected));
      if (goOn) goTo('finish');
    };
    test.addEventListener('click', () => void busy([test, next], () => run(false)));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void busy([test, next], () => run(true));
    });
    return [...header(w.heading), h('p', {}, w.explain), form];
  };

  return {
    type: typeStep,
    github: githubStep,
    pick: pickStep,
    verdict: verdictStep,
    webdav: webdavStep,
  };
}
