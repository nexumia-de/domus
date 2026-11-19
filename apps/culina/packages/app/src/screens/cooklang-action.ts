// "Export as Cooklang" on a component's detail: one file for this version, then one quiet
// sentence that says what the file cannot carry.
import { exportCooklang } from '../exchange/cooklang-export';
import type { ComponentRecord } from '../records';
import { el } from '../shell/el';
import { strings } from '../strings';

export const cooklangAction = (component: ComponentRecord): HTMLElement => {
  const row = el('div', 'cooklang-export');
  const button = el('button', 'btn quiet', strings.cooklang.export);
  button.type = 'button';
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  button.addEventListener('click', () => {
    status.textContent = exportCooklang(component);
  });
  row.append(button, status);
  return row;
};
