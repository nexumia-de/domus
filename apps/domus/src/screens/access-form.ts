// The fields for the access to a storage, for joining and for changing it: a token for GitHub,
// a user name and password for WebDAV. The values are read once, when the person confirms, and
// the inputs are emptied when the screen goes away; nothing is written to an address or storage here.
import { h } from '../dom';
import type { Strings } from '../strings';
import { secretField, textField } from './parts';

export interface AccessForm {
  element: HTMLElement;
  /** The access to store, or undefined (and the problem shown) when a needed field is empty. */
  read(): Record<string, string> | undefined;
  /** Shows a problem under the fields. */
  complain(text: string): void;
  clear(): void;
}

export function accessForm(t: Strings, type: string): AccessForm {
  const message = h('p', { class: 'field-error', role: 'alert' });
  const element = h('div', { class: 'access-form' });
  if (type === 'github') {
    const token = secretField(t.fields.tokenLabel, {
      hint: t.create.github.tokenHint,
      showAria: t.fields.showTokenAria,
      hideAria: t.fields.hideTokenAria,
      show: t.common.show,
      hide: t.common.hide,
      testid: 'access-token',
    });
    element.append(token.element, message);
    return {
      element,
      read() {
        const value = token.input.value.trim();
        if (value === '') {
          message.textContent = t.fields.emptyToken;
          token.input.focus();
          return undefined;
        }
        message.textContent = '';
        return { token: value };
      },
      complain: (text) => {
        message.textContent = text;
      },
      clear: () => {
        token.input.value = '';
      },
    };
  }
  const user = textField(t.fields.user, { autocomplete: 'off', testid: 'access-user' });
  const password = secretField(t.fields.password, {
    showAria: t.fields.showPasswordAria,
    hideAria: t.fields.hidePasswordAria,
    show: t.common.show,
    hide: t.common.hide,
    testid: 'access-password',
  });
  element.append(
    h('p', { class: 'hint' }, t.fields.webdavOptional),
    user.element,
    password.element,
    message,
  );
  return {
    element,
    read() {
      message.textContent = '';
      const access: Record<string, string> = {};
      if (user.input.value !== '') access.username = user.input.value;
      if (password.input.value !== '') access.password = password.input.value;
      return access;
    },
    complain: (text) => {
      message.textContent = text;
    },
    clear: () => {
      user.input.value = '';
      password.input.value = '';
    },
  };
}
