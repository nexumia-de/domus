// Reads an answer in the recipe import format (decision ai-prompt-import): the pasted text or a
// .json file, checked against the schema (the compiled validator, as the app's CSP forbids eval)
// and the engine's `checkRecipes`. Every error is one sentence that names its place; nothing is
// stored here.
import { checkRecipes, RECIPE_FORMAT } from '@culina/engine';
import type { RecipeAnswer, RecipeProblem } from '@culina/engine';
import { recipeImport, type ValidationIssue } from '../store/validators.generated.js';
import { strings } from '../strings';

const text = strings.importing;

export type AnswerResult = { ok: true; answer: RecipeAnswer } | { ok: false; sentences: string[] };

/**
 * The JSON of an answer: a model often wraps it in a Markdown code fence (```json … ```), which
 * is taken off; any other text around it is not, so the answer stays the model's whole answer.
 */
export const unfenced = (raw: string): string => {
  const s = raw.trim();
  const fence = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n\s*```$/.exec(s);
  return fence ? (fence[1] ?? '').trim() : s;
};

/** True when a text looks like JSON (after a fence): the paste field reads it as an answer. */
export const looksLikeJson = (raw: string): boolean => unfenced(raw).startsWith('{');

/**
 * True when a file's text may be an answer in the recipe format, read without parsing it: it
 * names the format and not the export's. A file too long to parse is told so by this.
 */
export const mayBeRecipeAnswer = (content: string): boolean =>
  /"format"\s*:\s*"culina-recipes"/.test(content) &&
  !/"format"\s*:\s*"culina-export"/.test(content);

/** True when parsed JSON says it is in the recipe import format. */
export const isRecipeAnswer = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (value as { format?: unknown }).format === RECIPE_FORMAT;

type Json = Record<string, unknown>;
const at = (value: unknown, key: string | number): unknown =>
  typeof value === 'object' && value !== null ? (value as Json)[key] : undefined;
/** How many characters of a name from the answer an error sentence shows before "…". */
export const NAME_IN_SENTENCE = 40;

/** A name or value from the answer, shortened for a sentence: "A very long title that goes o…". */
export const short = (value: string, max = NAME_IN_SENTENCE): string =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;

const str = (value: unknown): string => (typeof value === 'string' ? short(value) : '');

/**
 * The longest answer read, in characters: 1,000,000. Twenty full recipes of 60 lines with long
 * steps are well under 200,000; a longer text is refused before it is parsed.
 */
export const MAX_ANSWER_CHARS = 1_000_000;

/** The place of a JSON pointer in words: "Recipe 1 (Pancakes), component 2 (Batter), line 3". */
function placeOf(data: unknown, pointer: string): { place: string; field: string } {
  const parts = pointer
    .split('/')
    .slice(1)
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  const words: string[] = [];
  let node: unknown = data;
  let field = '';
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i] ?? '';
    const next = parts[i + 1];
    const child = at(node, key);
    if (next !== undefined && /^\d+$/.test(next)) {
      const n = Number(next);
      const item = at(child, n);
      const word =
        key === 'recipes'
          ? text.aiPlace.recipe(n + 1, str(at(item, 'title')))
          : key === 'components'
            ? text.aiPlace.component(n + 1, str(at(item, 'name')))
            : key === 'lines'
              ? text.aiPlace.line(n + 1, str(at(item, 'ingredient')))
              : key === 'slots'
                ? text.aiPlace.slot(n + 1)
                : key === 'alternatives'
                  ? text.aiPlace.alternative(n + 1)
                  : key === 'steps'
                    ? text.aiPlace.step(n + 1)
                    : `${key} ${n + 1}`;
      words.push(word);
      node = item;
      field = key;
      i++;
      continue;
    }
    if (key === 'source' && next !== undefined) {
      words.push(text.aiPlace.source);
      node = child;
      continue;
    }
    field = key;
    node = child;
  }
  const place = words.length === 0 ? text.aiPlace.answer : words.join(', ');
  return { place, field };
}

/** The place of an issue on an object (required, unknown field): the object itself. */
const objectPlace = (data: unknown, pointer: string): string => placeOf(data, pointer + '/x').place;

function issueSentence(data: unknown, issue: ValidationIssue): string {
  const e = text.aiError;
  const p = issue.params;
  const { place, field } = placeOf(data, issue.instancePath);
  switch (issue.keyword) {
    case 'required':
      return e.required(objectPlace(data, issue.instancePath), String(p.missingProperty ?? ''));
    case 'additionalProperties':
      return e.unknownField(
        objectPlace(data, issue.instancePath),
        short(String(p.additionalProperty ?? '')),
      );
    case 'type':
      return e.type(place, field, e.kinds[String(p.type)] ?? String(p.type));
    case 'const':
      return field === 'format' ? text.aiNotFormat : e.version;
    case 'enum':
      return e.role(
        place,
        field,
        short(valueAt(data, issue.instancePath)),
        ((p.allowedValues as unknown[]) ?? []).join(', '),
      );
    case 'minLength':
      return e.empty(place, field);
    case 'maxLength':
      return e.tooLong(place, field, Number(p.limit));
    case 'minItems':
      return e.tooFew(place, field, Number(p.limit));
    case 'maxItems':
      return e.tooMany(place, field, Number(p.limit));
    case 'minimum':
    case 'maximum':
      // Only `persons` has bounds in the format: 1 to 100.
      return e.range(place, field, 1, 100);
    case 'pattern':
      return e.url(place);
    case 'oneOf':
      return e.slotFill(objectPlace(data, issue.instancePath));
    case 'dependentRequired':
      return e.guessedNeedsAmount(objectPlace(data, issue.instancePath));
    case 'minProperties':
      return e.sourceEmpty(place);
    case 'uniqueItems':
      return e.twice(place, field);
    default:
      return e.other(place, field);
  }
}

const valueAt = (data: unknown, pointer: string): string => {
  let node = data;
  for (const key of pointer.split('/').slice(1))
    node = at(node, /^\d+$/.test(key) ? Number(key) : key);
  return typeof node === 'string' ? node : JSON.stringify(node);
};

/** One sentence per schema issue; the branches of a `oneOf` speak through the `oneOf` itself. */
export function schemaSentences(data: unknown, issues: readonly ValidationIssue[]): string[] {
  const kept = issues.filter((i) => !i.schemaPath.includes('/oneOf/'));
  return [...new Set(kept.map((i) => issueSentence(data, i)))];
}

/** One sentence per problem the engine finds beyond the schema. */
export function problemSentences(
  answer: RecipeAnswer,
  problems: readonly RecipeProblem[],
): string[] {
  return problems.map((p) => {
    const recipe = answer.recipes[p.recipe];
    const head = text.aiPlace.recipe(p.recipe + 1, short(recipe?.title ?? ''));
    const place = p.slot === undefined ? head : `${head}, ${text.aiPlace.slot(p.slot + 1)}`;
    return text.aiProblem[p.code](place, short(p.name));
  });
}

/** Checks parsed JSON as an answer: format, schema, then the names. */
export function checkAnswer(data: unknown): AnswerResult {
  if (!isRecipeAnswer(data)) return { ok: false, sentences: [text.aiNotFormat] };
  if (!recipeImport(data)) {
    return { ok: false, sentences: schemaSentences(data, recipeImport.errors ?? []) };
  }
  const answer = data as RecipeAnswer;
  const problems = checkRecipes(answer);
  return problems.length === 0
    ? { ok: true, answer }
    : { ok: false, sentences: problemSentences(answer, problems) };
}

/** Reads the pasted text or a file's text as an answer. */
export function readAnswer(raw: string): AnswerResult {
  if (raw.length > MAX_ANSWER_CHARS) {
    return { ok: false, sentences: [text.aiTooLong(MAX_ANSWER_CHARS)] };
  }
  let data: unknown;
  try {
    data = JSON.parse(unfenced(raw));
  } catch {
    return { ok: false, sentences: [text.aiNotJson] };
  }
  return checkAnswer(data);
}
