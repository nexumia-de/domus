// `#/settings/import`: choose a file, read it, then the step for its kind. Nothing is stored
// until the user confirms in that step; a file that is refused changes nothing.
import { readExportText } from '../../exchange/read-file';
import { loadCatalogue } from '../../catalogue/load';
import { storeProblem } from '../../notebook';
import { state } from '../../notebook/state';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import {
  checkAnswer,
  isRecipeAnswer,
  MAX_ANSWER_CHARS,
  mayBeRecipeAnswer,
} from '../../exchange/ai-answer';
import { aiPasteBlock } from './ai-paste';
import { renderAiImport, renderAnswerErrors } from './ai-import';
import { renderCookImport } from './import-cook';
import { renderJsonImport } from './json-import';

const text = strings.importing;

const isCooklang = (fileName: string): boolean => /\.cook$/i.test(fileName);

/** The parsed JSON of a file when it is in the recipe import format, else undefined. */
const recipeAnswerOf = (content: string): unknown => {
  if (!mayBeRecipeAnswer(content)) return undefined;
  try {
    const data: unknown = JSON.parse(content);
    return isRecipeAnswer(data) ? data : undefined;
  } catch {
    return undefined;
  }
};

export const importScreen = (): HTMLElement => {
  const section = el('section', 'screen import');
  const back = el('a', 'back-link', text.back);
  back.href = hashFor('settings');
  const status = el('p', 'note');
  status.setAttribute('role', 'status');
  const host = el('div', 'import-host');
  section.append(back, el('h1', undefined, text.title));

  const problem = storeProblem();
  if (problem !== undefined || state.store === undefined) {
    section.append(el('p', 'note', problem === undefined ? text.noStore : storeText(problem)));
    return section;
  }

  let latest = 0;
  const input = el('input', 'sr-only');
  input.type = 'file';
  input.accept = '.json,.cook,application/json,text/plain';
  const pick = el('label', 'btn file-pick');
  pick.append(el('span', undefined, text.chooseFile), input);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file === undefined) return;
    status.textContent = '';
    host.replaceChildren();
    const mine = ++latest;
    void file.text().then(async (content) => {
      if (isCooklang(file.name)) {
        // The catalogue comes from the app's own origin; a failed load leaves the notebook's own.
        const entries = await loadCatalogue();
        if (mine === latest) renderCookImport(host, content, file.name, status, entries);
        return;
      }
      if (mine !== latest) return;
      // A saved AI answer (format culina-recipes) goes to the AI step; any other JSON is an export.
      // One too long to read is refused before it is parsed.
      if (mayBeRecipeAnswer(content) && content.length > MAX_ANSWER_CHARS) {
        renderAnswerErrors(host, [text.aiTooLong(MAX_ANSWER_CHARS)]);
        status.textContent = text.nothingChanged;
        return;
      }
      const answer = recipeAnswerOf(content);
      if (answer !== undefined) {
        const checked = checkAnswer(answer);
        if (!checked.ok) {
          renderAnswerErrors(host, checked.sentences);
          status.textContent = text.nothingChanged;
          return;
        }
        const entries = await loadCatalogue();
        if (mine === latest) renderAiImport(host, checked.answer, status, entries);
        return;
      }
      const read = readExportText(content);
      if (!read.ok) status.textContent = read.message;
      else void renderJsonImport(host, read.content, status);
    });
  });
  section.append(el('p', 'muted', text.intro), pick, aiPasteBlock(host, status), status, host);
  return section;
};
