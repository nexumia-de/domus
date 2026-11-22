// The AI part of the import screen: copy a prompt that asks a language model of the user's
// choice for Cooklang, and read the pasted answer through the Cooklang step. No model runs here
// (decision ai-prompt-import); the answer is handled like a .cook file.
import { loadCatalogue } from '../../catalogue/load';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { aiPrompt } from './ai-prompt';
import { renderCookImport } from './import-cook';

const text = strings.importing;

/**
 * Builds the AI block of the import screen.
 *
 * @param host - Where the Cooklang step is shown.
 * @param status - The screen's status line.
 * @returns The block with the prompt, its copy button, the paste field and the read button.
 */
export const aiPasteBlock = (host: HTMLElement, status: HTMLElement): HTMLElement => {
  const block = el('div', 'import-ai');
  const prompt = el('textarea', 'field area import-ai-prompt');
  prompt.readOnly = true;
  prompt.value = aiPrompt();
  prompt.setAttribute('aria-label', text.copyPrompt);
  const copy = el('button', 'btn', text.copyPrompt);
  copy.type = 'button';
  copy.addEventListener('click', () => {
    const done = (): void => {
      status.textContent = text.promptCopied;
    };
    const failed = (): void => {
      status.textContent = text.promptNotCopied;
      prompt.select();
    };
    if (navigator.clipboard === undefined) failed();
    else navigator.clipboard.writeText(aiPrompt()).then(done, failed);
  });
  const label = el('label', 'field-label', text.pasteLabel);
  const answer = el('textarea', 'field area import-ai-answer');
  answer.id = 'import-ai-answer';
  label.htmlFor = answer.id;
  const read = el('button', 'btn', text.readPasted);
  read.type = 'button';
  read.addEventListener('click', () => {
    const source = answer.value.trim();
    status.textContent = '';
    host.replaceChildren();
    if (source === '') {
      status.textContent = text.pasteEmpty;
      return;
    }
    void loadCatalogue().then((entries) => {
      renderCookImport(host, source, `${text.pastedName}.cook`, status, entries);
    });
  });
  block.append(
    el('h2', undefined, text.aiTitle),
    el('p', 'muted', text.aiIntro),
    copy,
    prompt,
    label,
    answer,
    read,
  );
  return block;
};
