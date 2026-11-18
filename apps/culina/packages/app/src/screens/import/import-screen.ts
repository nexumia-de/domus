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
import { renderCookImport } from './import-cook';
import { renderJsonImport } from './json-import';

const text = strings.importing;

const isCooklang = (fileName: string): boolean => /\.cook$/i.test(fileName);

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
      const read = readExportText(content);
      if (!read.ok) status.textContent = read.message;
      else void renderJsonImport(host, read.content, status);
    });
  });
  section.append(el('p', 'muted', text.intro), pick, status, host);
  return section;
};
