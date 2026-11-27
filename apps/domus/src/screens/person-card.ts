// "Who uses this device": pick a person of the space or add a new one. Persons are records of the
// collection `space` (hospes persons.ts), so a sync of the space carries them to the other
// devices; which person this device is stays on the device. See docs/persons.md.
import { addPerson, devicePerson, readPersons, setDevicePerson } from '@nexumia-de/hospes';
import { h } from '../dom';
import type { Ctx } from './context';
import { busy, button, buttonRow, textField } from './parts';

/**
 * @param afterChange Runs after a person was added (the screen syncs the space so the other devices
 *   learn the new person).
 */
export function personCard(ctx: Ctx, id: string, afterChange: () => Promise<void>): HTMLElement {
  const { t } = ctx;
  const card = h('section', { class: 'card', 'data-testid': 'person-card' });
  const draw = async (): Promise<void> => {
    const [persons, me] = await Promise.all([
      readPersons(ctx.deps.store, id),
      devicePerson(ctx.deps.store, id),
    ]);
    const choices = persons.map((person) => {
      const chosen = person.id === me?.id;
      const choice = button(
        person.name,
        () => {
          void setDevicePerson(ctx.deps.store, id, person.id).then(draw);
        },
        { primary: chosen, testid: 'person-choice' },
      );
      choice.setAttribute('aria-pressed', String(chosen));
      return choice;
    });
    const name = textField(t.person.newLabel, { testid: 'person-name' });
    const error = h('p', { class: 'field-error', role: 'alert' });
    const add = h(
      'button',
      { type: 'submit', class: 'button', 'data-testid': 'person-add' },
      t.person.add,
    );
    const form = h('form', { novalidate: true }, name.element, error, buttonRow(add));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void busy([add], async () => {
        const person = await addPerson(id, name.input.value, ctx.deps);
        if (!person) {
          error.textContent = t.space.invalidName;
          name.input.focus();
          return;
        }
        await afterChange();
        await draw();
      });
    });
    card.replaceChildren(
      h('h2', {}, t.person.title),
      h('p', { 'data-testid': 'person-current' }, me ? t.person.current(me.name) : t.person.none),
      ...(choices.length > 0 ? [buttonRow(...choices)] : []),
      form,
    );
  };
  void draw();
  return card;
}
