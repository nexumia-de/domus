// Export of one component, or one dish with a section per slot, as a Cooklang file, handed to the
// browser as a download.
import { componentToCooklang, dishToCooklang } from '@culina/engine';
import type { CooklangComponent, CooklangDish, Loss } from '@culina/engine';
import { techniques } from '../classics/content';
import { currentLang } from '../classics/lang';
import { dishStepLines, stepLines } from '../components/steps-view';
import {
  allTastings,
  factsByIngredient,
  getComponent,
  ingredientName,
  notebook,
  tastingsOf,
  versionChain,
} from '../notebook';
import type { ComponentRecord, DishRecord } from '../records';
import { strings } from '../strings';
import { downloadText } from './download';

/** The sentence that says what was saved and, if anything, what the file cannot carry. */
export const savedSentence = (fileName: string, lost: readonly Loss[]): string =>
  lost.length === 0
    ? strings.cooklang.saved(fileName)
    : strings.cooklang.savedLosing(fileName, lost.map((l) => strings.cooklang.lost[l]).join(', '));

/** The latest tasting note of a version and how many other notes its family has. */
function notesOf(
  kind: 'components' | 'dishes',
  id: string,
): { tasting?: string; otherNotes: number } {
  const notes = tastingsOf(id);
  const latest = notes[notes.length - 1];
  const familyIds = new Set(versionChain(kind, id).map((v) => v.id));
  const onFamily = allTastings().filter((t) => familyIds.has(t.ref.id)).length;
  return {
    ...(latest === undefined ? {} : { tasting: latest.text }),
    otherNotes: Math.max(0, onFamily - (latest === undefined ? 0 : 1)),
  };
}

export function exportCooklang(component: ComponentRecord): string {
  const result = componentToCooklang(component as unknown as CooklangComponent, {
    ingredientName,
    componentName: (id) => getComponent(id)?.name ?? id,
    facts: factsByIngredient(),
    steps: stepLines(notebook(component), component, currentLang(), techniques()),
    ...notesOf('components', component.id),
  });
  downloadText(result.fileName, result.text, 'text/plain');
  return savedSentence(result.fileName, result.lost);
}

export function exportDishCooklang(dish: DishRecord): string {
  const nb = notebook();
  const lang = currentLang();
  // A slot follows the current version of its component's family, as the dish shows it.
  const resolved = (id: string): ComponentRecord | undefined =>
    nb.components.find((c) => c.id === id);
  const result = dishToCooklang(dish as unknown as CooklangDish, {
    ingredientName,
    componentName: (id) => resolved(id)?.name ?? id,
    component: (id) => resolved(id) as unknown as CooklangComponent | undefined,
    componentSteps: (id) => {
      const component = resolved(id);
      return component === undefined ? [] : stepLines(nb, component, lang, techniques());
    },
    facts: factsByIngredient(),
    assembly: dishStepLines(nb, dish, lang, techniques()),
    assemblyName: strings.cooklang.assembly,
    ...notesOf('dishes', dish.id),
  });
  downloadText(result.fileName, result.text, 'text/plain');
  return savedSentence(result.fileName, result.lost);
}
