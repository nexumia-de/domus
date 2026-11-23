// "Export as Cooklang" on a component's or an own dish's detail: one file for this version, then
// one quiet sentence that says what the file cannot carry.
import { exportCooklang, exportDishCooklang } from '../exchange/cooklang-export';
import type { ComponentRecord, DishRecord } from '../records';
import { el } from '../shell/el';
import { strings } from '../strings';

const action = (run: () => string): HTMLElement => {
  const row = el('div', 'cooklang-export');
  const button = el('button', 'btn quiet', strings.cooklang.export);
  button.type = 'button';
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  button.addEventListener('click', () => {
    status.textContent = run();
  });
  row.append(button, status);
  return row;
};

export const cooklangAction = (component: ComponentRecord): HTMLElement =>
  action(() => exportCooklang(component));

export const dishCooklangAction = (dish: DishRecord): HTMLElement =>
  action(() => exportDishCooklang(dish));
