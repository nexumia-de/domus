// The import step for a file exported from this app: summary, then merge (with matches of
// ingredients that may be here already, and conflicts the user resolves) or replace everything.
import { conflictKey } from '@culina/engine';
import type { Choice, Conflict, ExportContent } from '@culina/engine';
import { candidateIngredients } from '../../exchange/candidates';
import { liveRecords } from '../../exchange/export-file';
import { applyMerge, applyReplace, heldKinds, undoImport } from '../../exchange/json-apply';
import { proposeMatches, setupMerge, type FileMatch } from '../../exchange/merge-model';
import { formatDate } from '../../shared/locale';
import { showToast } from '../../shell/toast';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { radioRow } from './radio';
import { fullSets, recordLabel, summaryList, total } from './summary';

const text = strings.importing;

const undoAction = {
  label: text.undo,
  run(): void {
    void undoImport().then((done) => showToast(done.ok ? text.undone : storeText(done.error.code)));
  },
};

const button = (label: string, className = 'btn'): HTMLButtonElement => {
  const b = el('button', className, label);
  b.type = 'button';
  return b;
};

export async function renderJsonImport(
  host: HTMLElement,
  content: ExportContent,
  status: HTMLElement,
): Promise<void> {
  const live = await liveRecords();
  if (!live.ok) {
    status.textContent = storeText(live.error.code);
    return;
  }
  const mine = fullSets(live.records);
  const file = content.records;
  const sections = el('div', 'import-body');
  host.replaceChildren(sections);
  sections.append(el('h2', undefined, text.summaryHeading));
  if (content.exportedAt !== undefined) {
    sections.append(el('p', 'muted', text.exportedOn(formatDate(content.exportedAt))));
  }
  // An older file's stock is not imported: stock is the shared collection of a space now.
  if (content.stockLeftOut !== undefined) {
    sections.append(el('p', 'note stock-left-out', text.stockLeftOut(content.stockLeftOut)));
  }
  // An older file could not hold the skill state: it is neither imported nor replaced.
  const held = heldKinds(content.fileVersion);
  if (!held.includes('skills'))
    sections.append(el('p', 'note skills-not-in-file', text.skillsNotInFile));
  // Nor, before format 4, the days a dish was cooked: the days kept here stay.
  if (!held.includes('cooked'))
    sections.append(el('p', 'note cooked-not-in-file', text.cookedNotInFile));
  // Nor, before format 5, the favourites: the favourites kept here stay.
  if (!held.includes('favourites'))
    sections.append(el('p', 'note favourites-not-in-file', text.favouritesNotInFile));
  if (total(file) === 0) {
    sections.append(el('p', 'note', text.nothingInFile));
    return;
  }
  sections.append(summaryList(file));

  const mode = el('fieldset', 'choices');
  mode.append(el('legend', undefined, text.modeLegend));
  const merge = radioRow('mode', 'merge', text.modeMerge, true);
  const replace = radioRow('mode', 'replace', text.modeReplace, false);
  mode.append(
    merge.wrap,
    el('p', 'muted', text.modeMergeHint),
    replace.wrap,
    el('p', 'muted', text.modeReplaceHint),
  );
  const mergePanel = el('div', 'merge-panel');
  const replacePanel = el('div', 'replace-panel');
  replacePanel.hidden = true;
  sections.append(mode, mergePanel, replacePanel);
  const showMode = (): void => {
    mergePanel.hidden = !merge.input.checked;
    replacePanel.hidden = merge.input.checked;
  };
  merge.input.addEventListener('change', showMode);
  replace.input.addEventListener('change', showMode);

  // ---- merge
  const matches = proposeMatches(file, mine, candidateIngredients());
  const chosen = new Map<string, string>(
    matches.flatMap((m): [string, string][] =>
      m.match.exact === undefined ? [] : [[m.fileId, m.match.exact.id]],
    ),
  );
  const choices = new Map<string, Choice>();
  const planHost = el('div', 'plan');

  const drawPlan = (): void => {
    const { plan } = setupMerge(file, mine, chosen);
    const same = Object.values(plan.same).reduce((a, b) => a + b, 0);
    const added = total(plan.add);
    const summary = el('p', 'note', text.mergeSummary(added, same, plan.conflicts.length));
    planHost.replaceChildren(summary);
    if (plan.skippedNotes.length > 0) {
      planHost.append(el('p', 'note-quiet', text.skippedNotes(plan.skippedNotes.length)));
    }
    if (plan.conflicts.length > 0) planHost.append(conflictsView(plan.conflicts, choices));
    const apply = button(text.mergeNow, 'btn primary');
    apply.addEventListener('click', () => {
      apply.disabled = true;
      void applyMerge(plan, choices, mine).then((done) => {
        if (!done.ok) {
          apply.disabled = false;
          status.textContent = storeText(done.error.code);
          return;
        }
        status.textContent = '';
        showToast(text.merged(done.added, done.taken), undoAction);
        host.replaceChildren(el('p', 'note', text.merged(done.added, done.taken)));
      });
    });
    planHost.append(apply);
  };

  if (matches.length > 0) mergePanel.append(matchesView(matches, chosen, drawPlan));
  mergePanel.append(planHost);
  drawPlan();

  // ---- replace
  const ask = el('div', 'confirm-row');
  const open = button(text.replaceNow, 'btn primary');
  open.addEventListener('click', () => {
    open.hidden = true;
    ask.replaceChildren(
      el('p', 'note', text.replaceAsk(total(mine, held), total(file))),
      button(text.replaceConfirm, 'btn primary'),
      button(text.replaceCancel),
    );
    const [, yes, no] = [...ask.children] as HTMLElement[];
    no?.addEventListener('click', () => {
      ask.replaceChildren();
      open.hidden = false;
    });
    yes?.addEventListener('click', () => {
      void applyReplace(file, mine, content.fileVersion).then((done) => {
        if (!done.ok) {
          status.textContent = storeText(done.error.code);
          return;
        }
        showToast(text.replaced(total(file)), undoAction);
        host.replaceChildren(el('p', 'note', text.replaced(total(file))));
      });
    });
  });
  replacePanel.append(open, ask);
}

function matchesView(
  matches: FileMatch[],
  chosen: Map<string, string>,
  changed: () => void,
): HTMLElement {
  const box = el('section', 'matches');
  box.append(el('h2', undefined, text.matchesHeading), el('p', 'muted', text.matchesHint));
  for (const m of matches) {
    const select = el('select', 'field');
    select.setAttribute('aria-label', text.matchFor(m.name));
    for (const option of m.options) {
      const node = el('option', undefined, text.matchOption(option.name));
      node.value = option.id;
      select.append(node);
    }
    const keep = el('option', undefined, text.matchKeepNew);
    keep.value = '';
    select.append(keep);
    select.value = chosen.get(m.fileId) ?? '';
    select.addEventListener('change', () => {
      if (select.value === '') chosen.delete(m.fileId);
      else chosen.set(m.fileId, select.value);
      changed();
    });
    const wrap = el('div', 'field-wrap');
    const label = el('span', 'field-label', m.name);
    wrap.append(label, select);
    box.append(wrap);
  }
  return box;
}

function conflictsView(conflicts: Conflict[], choices: Map<string, Choice>): HTMLElement {
  const box = el('section', 'conflicts');
  box.append(el('h2', undefined, text.conflictsHeading), el('p', 'muted', text.conflictsHint));
  const free = conflicts.filter((c) => !c.immutable);
  const inputs = new Map<string, { mine: HTMLInputElement; theirs: HTMLInputElement }>();
  if (free.length > 1) {
    const all = el('div', 'actions');
    const setAll = (choice: Choice): void => {
      for (const c of free) {
        choices.set(conflictKey(c), choice);
        const pair = inputs.get(conflictKey(c));
        if (pair) (choice === 'mine' ? pair.mine : pair.theirs).checked = true;
      }
    };
    const mine = button(text.keepMineAll);
    mine.addEventListener('click', () => setAll('mine'));
    const theirs = button(text.takeFileAll);
    theirs.addEventListener('click', () => setAll('theirs'));
    all.append(mine, theirs);
    box.append(all);
  }
  for (const c of conflicts) {
    const group = el('fieldset', 'choices conflict');
    group.append(
      el('legend', undefined, `${strings.importing.kinds[c.kind]}: ${recordLabel(c.kind, c.mine)}`),
    );
    if (c.immutable) {
      group.append(el('p', 'muted', text.versionStays));
    } else {
      const key = conflictKey(c);
      const current = choices.get(key) ?? 'mine';
      choices.set(key, current);
      const keepMine = radioRow(key, 'mine', text.keepMine, current === 'mine');
      const takeFile = radioRow(key, 'theirs', text.takeFile, current === 'theirs');
      keepMine.input.addEventListener('change', () => choices.set(key, 'mine'));
      takeFile.input.addEventListener('change', () => choices.set(key, 'theirs'));
      inputs.set(key, { mine: keepMine.input, theirs: takeFile.input });
      group.append(keepMine.wrap, takeFile.wrap);
    }
    box.append(group);
  }
  return box;
}
