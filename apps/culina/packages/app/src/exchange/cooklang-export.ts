// Export of one component as a Cooklang file, handed to the browser as a download.
import { componentToCooklang } from '@culina/engine';
import type { CooklangComponent, Loss } from '@culina/engine';
import {
  allTastings,
  factsByIngredient,
  getComponent,
  ingredientName,
  tastingsOf,
  versionChain,
} from '../notebook';
import type { ComponentRecord } from '../records';
import { strings } from '../strings';
import { downloadText } from './download';

/** The sentence that says what was saved and, if anything, what the file cannot carry. */
export const savedSentence = (fileName: string, lost: readonly Loss[]): string =>
  lost.length === 0
    ? strings.cooklang.saved(fileName)
    : strings.cooklang.savedLosing(fileName, lost.map((l) => strings.cooklang.lost[l]).join(', '));

export function exportCooklang(component: ComponentRecord): string {
  const notes = tastingsOf(component.id);
  const latest = notes[notes.length - 1];
  const familyIds = new Set(versionChain('components', component.id).map((v) => v.id));
  const onFamily = allTastings().filter((t) => familyIds.has(t.ref.id)).length;
  const result = componentToCooklang(component as unknown as CooklangComponent, {
    ingredientName,
    componentName: (id) => getComponent(id)?.name ?? id,
    facts: factsByIngredient(),
    ...(latest === undefined ? {} : { tasting: latest.text }),
    otherNotes: Math.max(0, onFamily - (latest === undefined ? 0 : 1)),
  });
  downloadText(result.fileName, result.text, 'text/plain');
  return savedSentence(result.fileName, result.lost);
}
