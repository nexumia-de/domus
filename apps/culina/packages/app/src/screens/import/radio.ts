import { el } from '../../shell/el';

/** A radio with its label, 44 px high like every choice. */
export const radioRow = (name: string, value: string, label: string, checked: boolean) => {
  const input = el('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  const wrap = el('label', 'choice');
  wrap.append(input, el('span', undefined, label));
  return { wrap, input };
};
