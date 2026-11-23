// The import step for an AI's answer in the recipe import format: what was read, each name asked
// once for the whole answer, per recipe its name, portions or output weight, its components with
// their roles and lines, guessed amounts marked, and one Save for all. Nothing is stored before.
import type { RecipeAnswer } from '@culina/engine';
import { roleLabel } from '../../components/names';
import { ROLE_IDS } from '../../editor/units';
import {
  aiNamed,
  buildAiModel,
  componentLines,
  guessedLines,
  slotLine,
  sourceText,
  type AiRecipeRow,
} from '../../exchange/ai-model';
import { saveAiImport } from '../../exchange/ai-save';
import { candidateComponents, candidateIngredients, importFacts } from '../../exchange/candidates';
import { gramsAllowed, portionsAllowed, unresolvedNames } from '../../exchange/cook-model';
import { undoImport } from '../../exchange/json-apply';
import type { IngredientRecord } from '../../records';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { textField } from '../editor/form-bits';
import { selectField } from '../fields';
import { cookText } from './cook-text';
import { lineList, linesUsable, rolesList } from './cook-lines';
import { namesSection } from './cook-names';

const text = strings.importing;

const roleOptions = (current: string) => [
  ...ROLE_IDS.map((r) => ({ value: r, label: roleLabel(r) })),
  ...(ROLE_IDS.some((r) => r === current) ? [] : [{ value: current, label: current }]),
];

/** One recipe of the answer: its fields, components and ingredient slots. */
function recipeSection(
  recipe: AiRecipeRow,
  number: number,
  roles: string,
  changed: () => void,
): HTMLElement {
  const box = el('section', 'ai-recipe');
  const entry = recipe.entry;
  box.append(
    el('h3', undefined, text.aiPlace.recipe(number, entry.title)),
    el(
      'p',
      'note',
      recipe.dish ? text.aiBecomesDish(entry.components.length) : text.aiBecomesComponent,
    ),
  );
  const source = sourceText(entry);
  box.append(el('p', 'muted', source === '' ? text.aiNoSource : text.aiSource(source)));

  const name = textField(recipe.dish ? text.cookDishNameField : text.cookNameField, recipe.name);
  name.control.addEventListener('input', () => {
    recipe.name = name.control.value;
    changed();
  });
  box.append(name.wrap);
  if (recipe.dish) {
    const portions = textField(text.cookPortionsField, recipe.portions, true);
    portions.control.inputMode = 'numeric';
    const hint = el('p', 'hint');
    portions.control.addEventListener('input', () => {
      recipe.portions = portions.control.value;
      hint.textContent = portionsAllowed(recipe.portions) ? '' : text.cookPortionsNotAllowed;
      portions.control.setAttribute('aria-invalid', String(hint.textContent !== ''));
      changed();
    });
    box.append(portions.wrap, hint);
    if (recipe.yieldLeftOut !== undefined) {
      box.append(el('p', 'note-quiet', text.aiDishYield(recipe.yieldLeftOut)));
    }
  } else {
    const yieldField = textField(text.cookYieldField, recipe.yieldGrams, true);
    yieldField.control.inputMode = 'decimal';
    const hint = el('p', 'hint');
    yieldField.control.addEventListener('input', () => {
      recipe.yieldGrams = yieldField.control.value;
      hint.textContent =
        recipe.yieldGrams.trim() === '' || gramsAllowed(recipe.yieldGrams)
          ? ''
          : text.cookGramsNotAllowed;
      changed();
    });
    box.append(yieldField.wrap, hint);
    if (recipe.yieldLeftOut !== undefined) {
      box.append(el('p', 'note-quiet', text.aiYieldNotWeight(recipe.yieldLeftOut)));
    }
  }

  for (const [i, component] of recipe.components.entries()) {
    const part = el('div', 'cook-part');
    part.append(el('h4', 'cook-part-origin', entry.components[i]?.name ?? ''));
    if (component.alternativeFor !== undefined) {
      part.append(el('p', 'note-quiet', text.aiAlternativeFor(component.alternativeFor)));
    }
    if (recipe.dish) {
      const cname = textField(text.cookNameField, component.name);
      cname.control.addEventListener('input', () => {
        component.name = cname.control.value;
        changed();
      });
      part.append(cname.wrap);
    }
    const role = selectField(text.cookSlotRole, roleOptions(component.role), component.role);
    role.control.addEventListener('change', () => {
      component.role = role.control.value;
      changed();
    });
    part.append(role.wrap, lineList(recipe.model, componentLines(recipe, i), roles, changed));
    box.append(part);
  }
  for (const [si, slot] of (entry.slots ?? []).entries()) {
    const line = slotLine(recipe, si);
    if (line === undefined) continue;
    const part = el('div', 'cook-part');
    part.append(el('h4', 'cook-part-origin', text.aiSlotIngredient(roleLabel(slot.role))));
    part.append(lineList(recipe.model, [line], roles, changed));
    box.append(part);
  }
  if ((entry.steps ?? []).length > 0 && recipe.dish) {
    box.append(el('p', 'muted', text.aiAssembly(entry.steps?.length ?? 0)));
  }
  return box;
}

export function renderAiImport(
  host: HTMLElement,
  answer: RecipeAnswer,
  status: HTMLElement,
  /** The shipped catalogue's entries; undefined when it could not be loaded. */
  catalogue?: readonly IngredientRecord[],
): void {
  const model = buildAiModel(answer, {
    ingredients: candidateIngredients(catalogue),
    components: candidateComponents(),
    facts: importFacts(catalogue),
  });
  const head = el('div', 'cook-head');
  head.append(
    el('h2', undefined, text.aiHeading),
    el('p', 'note', text.aiRead(model.recipes.length, model.lines.length)),
  );
  const guessed = guessedLines(model).length;
  if (guessed > 0) head.append(el('p', 'note ai-guessed-count', text.aiGuessedCount(guessed)));
  if (catalogue === undefined) head.append(el('p', 'note-quiet', text.cookCatalogueUnavailable));

  const namesHost = el('div');
  const recipesHost = el('div', 'ai-recipes');
  const need = el('p', 'note-quiet');
  need.setAttribute('role', 'status');
  const save = el('button', 'btn primary', text.aiSave);
  save.type = 'button';

  const refresh = (): void => {
    const open = unresolvedNames(model);
    const named = aiNamed(model);
    const usable = linesUsable(model);
    const fields = model.recipes.every((r) =>
      r.dish
        ? portionsAllowed(r.portions)
        : r.yieldGrams.trim() === '' || gramsAllowed(r.yieldGrams),
    );
    need.textContent = [open > 0 ? text.cookNeedsNames(open) : '', named ? '' : text.aiNeedsNames]
      .filter((t) => t !== '')
      .join(' ');
    save.disabled = open > 0 || !named || !usable || !fields;
  };
  const drawRecipes = (): void => {
    const roles = rolesList(model);
    recipesHost.replaceChildren(
      roles.list,
      el('p', 'muted', text.cookRoleHint),
      ...model.recipes.map((r, i) => recipeSection(r, i + 1, roles.id, refresh)),
    );
  };
  const drawNames = (): void => {
    namesHost.replaceChildren(
      namesSection(model, (rebuild) => {
        if (rebuild) drawNames();
        drawRecipes();
        refresh();
      }),
    );
  };

  save.addEventListener('click', () => {
    save.disabled = true;
    void saveAiImport(
      model,
      catalogue === undefined ? undefined : new Map(catalogue.map((e) => [e.id, e])),
    ).then((done) => {
      if (!done.ok) {
        save.disabled = false;
        status.textContent = cookText(done.error.code, storeText);
        return;
      }
      status.textContent = '';
      showToast(text.aiImported(done.saved.length), {
        label: text.undo,
        run() {
          void undoImport().then((r) => showToast(r.ok ? text.undone : storeText(r.error.code)));
        },
      });
      const result = el('div', 'cook-result');
      result.append(el('h2', undefined, text.aiSaved(done.saved.length)));
      const links = el('ul', 'summary-list');
      for (const s of done.saved) {
        const item = el('li');
        const link = el('a', undefined, s.name);
        link.href = hashFor(s.kind, s.id);
        item.append(link);
        links.append(item);
      }
      result.append(links, el('h3', undefined, text.aiGuessedHeading));
      if (done.guessed.length === 0) result.append(el('p', 'note', text.aiNoneGuessed));
      else {
        const list = el('ul', 'summary-list');
        for (const g of done.guessed) list.append(el('li', undefined, `${g.name}: ${g.text}`));
        result.append(list);
      }
      result.append(el('h3', undefined, text.cookUnmeasuredHeading));
      if (done.unmeasured.length === 0) result.append(el('p', 'note', text.cookNoneOpen));
      else {
        const list = el('ul', 'summary-list');
        for (const u of done.unmeasured) {
          list.append(el('li', undefined, text.cookUnmeasuredLine(u.name, u.text)));
        }
        result.append(list);
      }
      host.replaceChildren(result);
    });
  });

  host.replaceChildren(head, namesHost, recipesHost, need, save);
  drawNames();
  drawRecipes();
  refresh();
}

/** The errors of an answer, one sentence each; nothing was imported. */
export function renderAnswerErrors(host: HTMLElement, sentences: readonly string[]): void {
  const box = el('section', 'ai-errors');
  const list = el('ul', 'summary-list');
  for (const s of sentences) list.append(el('li', undefined, s));
  box.append(el('h2', undefined, text.aiErrorsHeading), el('p', 'note', text.aiErrorsHint), list);
  host.replaceChildren(box);
}
