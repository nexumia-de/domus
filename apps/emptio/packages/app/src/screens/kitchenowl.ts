// The KitchenOwl part of the settings (docs/kitchenowl.md#setting-up): connect
// the shown space to a list of a KitchenOwl server, see how it was kept in
// step, sync now, disconnect with Undo.
import { button, h } from '../dom';
import { KitchenowlError, type KitchenowlFailure, type Named } from '../kitchenowl/client';
import { connectKitchenowl, disconnectKitchenowl, instanceUrl } from '../kitchenowl/config';
import { ago } from '../list/status';
import type { Ctx } from './context';
import type { KitchenowlStatusFailure } from '../app';

export function kitchenowlSection(ctx: Ctx): { node: HTMLElement; update(): void } {
  const { app, t } = ctx;
  const k = t.kitchenowl;
  const failureText = (failure: KitchenowlStatusFailure): string => k.failures[failure];
  const failureOf = (error: unknown): KitchenowlFailure =>
    error instanceof KitchenowlError ? error.failure : 'refused';

  const intro = h('p', { class: 'muted' });
  const notice = h('p', { class: 'notice notice-error', role: 'alert', hidden: true });
  const tell = (text: string | null): void => {
    notice.hidden = text === null;
    notice.textContent = text ?? '';
  };

  // Connected: what, how, and the two actions.
  const what = h('p', {});
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const connected = h(
    'div',
    { hidden: true },
    what,
    status,
    h(
      'p',
      { class: 'add-row' },
      button(k.syncNow, () => void app.syncNow()),
      button(k.disconnect, () => void disconnect(), { class: 'danger' }),
    ),
  );

  // Not connected: address and token, then household and list.
  const address = h('input', {
    id: 'kitchenowl-address',
    class: 'field',
    type: 'url',
    inputmode: 'url',
    autocomplete: 'url',
    placeholder: 'https://',
  });
  const token = h('input', {
    id: 'kitchenowl-token',
    class: 'field',
    type: 'password',
    autocomplete: 'off',
    'aria-describedby': 'kitchenowl-token-hint',
  });
  const check = h('button', { type: 'submit', class: 'primary' }, k.check);
  const households = h('select', { id: 'kitchenowl-household', class: 'field' });
  const lists = h('select', { id: 'kitchenowl-list', class: 'field' });
  const pick = h(
    'div',
    { hidden: true },
    h(
      'label',
      { class: 'form-field' },
      h('span', { class: 'form-label' }, k.household),
      households,
    ),
    h('label', { class: 'form-field' }, h('span', { class: 'form-label' }, k.list), lists),
    button(k.connect, () => void connect(), { class: 'primary' }),
  );
  const form = h(
    'form',
    { class: 'entry-form', novalidate: true },
    h('label', { class: 'form-field' }, h('span', { class: 'form-label' }, k.address), address),
    h(
      'label',
      { class: 'form-field' },
      h('span', { class: 'form-label' }, k.token),
      token,
      h('span', { id: 'kitchenowl-token-hint', class: 'muted' }, k.tokenHint),
    ),
    check,
  );
  const setup = h('div', {}, form, pick);

  /** What the last check found; the form is checked again when address or token change. */
  let checked: { url: string; token: string; households: Named[] } | null = null;
  const forget = (): void => {
    checked = null;
    pick.hidden = true;
  };
  address.addEventListener('input', forget);
  token.addEventListener('input', forget);

  const options = (select: HTMLSelectElement, items: Named[]): void => {
    select.replaceChildren(...items.map((i) => h('option', { value: i.id }, i.name)));
  };

  async function showLists(): Promise<void> {
    if (checked === null) return;
    const client = app.kitchenowlClient(checked.url, checked.token);
    if (client === null) return;
    try {
      const found = await client.lists(Number(households.value));
      options(lists, found);
      tell(found.length === 0 ? k.noLists : null);
    } catch (error) {
      tell(k.status.failed(failureText(failureOf(error))));
    }
  }
  households.addEventListener('change', () => void showLists());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const url = instanceUrl(address.value);
      if (url === null) {
        tell(k.badAddress);
        return;
      }
      const client = app.kitchenowlClient(url, token.value.trim());
      if (client === null || token.value.trim() === '') return;
      check.disabled = true;
      check.textContent = k.checking;
      try {
        const found = await client.households();
        checked = { url, token: token.value.trim(), households: found };
        options(households, found);
        pick.hidden = false;
        tell(null);
        await showLists();
      } catch (error) {
        forget();
        tell(k.status.failed(failureText(failureOf(error))));
      } finally {
        check.disabled = false;
        check.textContent = k.check;
      }
    })();
  });

  async function connect(): Promise<void> {
    if (checked === null || lists.value === '') return;
    const householdId = Number(households.value);
    const listId = Number(lists.value);
    const householdName = checked.households.find((x) => x.id === householdId)?.name;
    const listName = lists.selectedOptions[0]?.textContent ?? undefined;
    const config = {
      url: checked.url,
      token: checked.token,
      householdId,
      listId,
      ...(householdName === undefined ? {} : { householdName }),
      ...(listName === undefined ? {} : { listName }),
    };
    await app.act((deps, id) => connectKitchenowl(deps, id, config));
    token.value = '';
    forget();
    await app.syncNow();
  }

  async function disconnect(): Promise<void> {
    const config = app.state().kitchenowl;
    if (config === undefined) return;
    await app.act((deps, id) => disconnectKitchenowl(deps, id));
    ctx.say(k.disconnected, {
      label: k.undo,
      run: () => void app.act((deps, id) => connectKitchenowl(deps, id, config)),
    });
  }

  function update(): void {
    const state = app.state();
    const space = state.space;
    intro.textContent = k.intro(space?.name ?? '');
    const config = state.kitchenowl;
    connected.hidden = config === undefined;
    setup.hidden = config !== undefined;
    if (config === undefined || space === undefined) return;
    what.textContent = k.connected(config.listName ?? `#${config.listId}`, config.url);
    const now = app.kitchenowl(space.id);
    status.textContent =
      now === undefined
        ? k.status.never
        : now.last.state === 'failed'
          ? k.status.failed(failureText(now.last.failure))
          : now.syncedAt === undefined
            ? k.status.never
            : k.status.inStep(ago(t.status, now.syncedAt, ctx.now()));
  }

  const node = h('section', {}, h('h2', {}, k.title), intro, connected, setup, notice);
  update();
  return { node, update };
}
