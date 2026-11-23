// The prompt the import screen copies for a language model of the user's choice (decision
// ai-prompt-import). It is generated from the schema the import checks against
// (recipe-import.schema.json): the fields, which are required, their kinds, the closed lists of
// roles and the constants come from the schema; only the explanation of each field and the rules
// are written here, per language. The units are the reader's own table (`UNIT_WORDS`). A test
// proves the two agree (test/ai-prompt.test.ts). No model runs in or for Culina.
import { NO_FIXED_SIZE_WORDS, UNIT_WORDS, recipeImportSchema } from '@culina/engine';
import { currentLang } from '../../classics/lang';

export type PromptLang = 'en' | 'de';

interface SchemaNode {
  $ref?: string;
  type?: string;
  const?: unknown;
  enum?: unknown[];
  items?: SchemaNode;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
}

const schema = recipeImportSchema as unknown as SchemaNode & { $defs: Record<string, SchemaNode> };

/** The objects of the format, in the order the prompt explains them: schema path to its name. */
export const PROMPT_OBJECTS = ['', 'recipe', 'source', 'component', 'line', 'slot'] as const;
type ObjectName = (typeof PROMPT_OBJECTS)[number];

const objectNode = (name: ObjectName): SchemaNode =>
  name === '' ? schema : (schema.$defs[name] as SchemaNode);

/** Every field of the format as `object.field`, from the schema. */
export const schemaFields = (): string[] =>
  PROMPT_OBJECTS.flatMap((o) =>
    Object.keys(objectNode(o).properties ?? {}).map((f) => (o === '' ? f : `${o}.${f}`)),
  );

const resolve = (node: SchemaNode): { node: SchemaNode; ref?: string } => {
  if (node.$ref === undefined) return { node };
  const ref = node.$ref.replace('#/$defs/', '');
  const target = schema.$defs[ref] as SchemaNode;
  const deeper = resolve(target);
  return { node: deeper.node, ref: deeper.ref ?? ref };
};

interface Words {
  intro: string;
  rules: string[];
  units: (units: string, vague: string) => string;
  formatHeading: string;
  objectHeading: Record<ObjectName, string>;
  required: string;
  optional: string;
  exactly: (value: string) => string;
  oneOf: (values: string) => string;
  text: string;
  wholeNumber: (min?: number, max?: number) => string;
  trueFalse: string;
  listOf: (what: string, min?: number, max?: number) => string;
  object: (name: string) => string;
  fields: Record<string, string>;
  exampleHeading: string;
  recipeHeading: string;
}

const EN: Words = {
  intro:
    "Turn the recipe or recipes below into JSON for Cook's Notebook, in the format described here. Answer with the JSON only, without any text before or after it.",
  rules: [
    'Copy no text beyond what the recipe states: names, amounts and steps as the recipe gives them, shortened where needed, nothing added, no tips, no comments.',
    'Do not invent amounts. Mark every amount you guessed with "guessed": true; leave "amount" out when the recipe gives none and you do not guess.',
    'Several recipes go into one answer, each as its own entry in "recipes".',
    'A recipe whose parts are made separately (dough and filling, pasta and sauce) gets one component per part; a simple recipe has one component.',
  ],
  units: (units, vague) =>
    `Write each amount as the recipe writes it, number first, then the unit word, in "amount" (never the ingredient there): "200 g", "1/2 TL", "3". Culina reads these units: ${units}; a count has no unit. Words without a fixed size (${vague}, a pinch, a dash) are written as the recipe says them; Culina keeps them without a number.`,
  formatHeading: 'The format:',
  objectHeading: {
    '': 'The answer is one object:',
    recipe: 'Each recipe:',
    source: 'Each source:',
    component: 'Each component:',
    line: 'Each line of a component:',
    slot: 'Each slot of a dish:',
  },
  required: 'required',
  optional: 'optional',
  exactly: (v) => `exactly ${v}`,
  oneOf: (v) => `one of ${v}`,
  text: 'text',
  wholeNumber: (min, max) =>
    min !== undefined && max !== undefined ? `whole number from ${min} to ${max}` : 'whole number',
  trueFalse: 'true or false',
  listOf: (what, min, max) =>
    `list of ${what}${min !== undefined && max !== undefined ? `, ${min} to ${max}` : max !== undefined ? `, at most ${max}` : ''}`,
  object: (name) => `object "${name}"`,
  fields: {
    format: 'names the format.',
    formatVersion: 'the version of the format.',
    recipes: 'one entry per recipe.',
    'recipe.title': "the recipe's name as the recipe gives it.",
    'recipe.persons':
      'how many persons or portions the recipe states; leave it out when it states none.',
    'recipe.yield':
      'what the recipe states it makes when it gives no persons ("1 kg", "12 pieces"); leave it out when it states none.',
    'recipe.source': 'where the recipe is from.',
    'recipe.components': 'the parts made separately.',
    'recipe.slots':
      'only for a dish of several parts: what fills each role. Left out, every component is one slot.',
    'recipe.steps': 'the assembly: what is done once the components are made.',
    'source.title': 'title of the book, site or card.',
    'source.author': 'the author as named in the source.',
    'source.url': 'the address of the page, when the recipe is from the web.',
    'source.where': 'where in the source: page, chapter, section.',
    'component.name': "the component's name, unique in its recipe.",
    'component.role': 'its role in the dish when no slot names it.',
    'component.lines': "the ingredients, in the recipe's order.",
    'component.steps': 'the steps of this component, in order, one step per entry.',
    'line.ingredient': "the ingredient's name as written, without amount and preparation.",
    'line.amount': 'the amount as written; left out when the recipe gives none.',
    'line.guessed': 'true when the recipe states no such amount and you guessed it.',
    'line.role': "the ingredient's role, only where one fits.",
    'line.note': 'the preparation as written ("finely chopped", "melted").',
    'slot.role': 'the role this slot fills.',
    'slot.component': 'the name of the component that fills it.',
    'slot.ingredient':
      'instead of a component: the name of an ingredient that fills it as it is (bread, rice). Exactly one of component and ingredient.',
    'slot.amount':
      'only with an ingredient: its amount as written, per dish. A component fills its slot with its whole recipe.',
    'slot.guessed': 'true when that amount was guessed.',
    'slot.optional': 'true when the recipe says the filling may be left out.',
    'slot.alternatives':
      'names of other components of this recipe that may fill the slot instead (another sauce); such a component is in no slot itself.',
  },
  exampleHeading: 'Example of an answer:',
  recipeHeading: 'Recipe:',
};

const DE: Words = {
  intro:
    "Wandle das Rezept oder die Rezepte unten in JSON für Cook's Notebook um, im hier beschriebenen Format. Antworte nur mit dem JSON, ohne Text davor oder danach.",
  rules: [
    'Übernimm keinen Text über das hinaus, was das Rezept sagt: Namen, Mengen und Schritte so, wie das Rezept sie gibt, wo nötig gekürzt, nichts hinzugefügt, keine Tipps, keine Kommentare.',
    'Erfinde keine Mengen. Markiere jede Menge, die du geschätzt hast, mit "guessed": true; lass "amount" weg, wenn das Rezept keine nennt und du nicht schätzt.',
    'Mehrere Rezepte kommen in eine Antwort, jedes als eigener Eintrag in "recipes".',
    'Ein Rezept, dessen Teile getrennt zubereitet werden (Teig und Füllung, Nudeln und Soße), bekommt einen Bestandteil (component) je Teil; ein einfaches Rezept hat einen.',
  ],
  units: (units, vague) =>
    `Schreibe jede Menge so, wie das Rezept sie schreibt, zuerst die Zahl, dann das Wort der Einheit, in "amount" (nie die Zutat dort): "200 g", "1/2 TL", "3". Culina liest diese Einheiten: ${units}; eine Stückzahl hat keine Einheit. Wörter ohne feste Größe (${vague}, ein Schuss) schreibst du so, wie das Rezept sie nennt; Culina behält sie ohne Zahl.`,
  formatHeading: 'Das Format:',
  objectHeading: {
    '': 'Die Antwort ist ein Objekt:',
    recipe: 'Jedes Rezept (recipe):',
    source: 'Jede Quelle (source):',
    component: 'Jeder Bestandteil (component):',
    line: 'Jede Zeile (line) eines Bestandteils:',
    slot: 'Jeder Platz (slot) eines Gerichts:',
  },
  required: 'Pflicht',
  optional: 'freiwillig',
  exactly: (v) => `genau ${v}`,
  oneOf: (v) => `eines von ${v}`,
  text: 'Text',
  wholeNumber: (min, max) =>
    min !== undefined && max !== undefined ? `ganze Zahl von ${min} bis ${max}` : 'ganze Zahl',
  trueFalse: 'true oder false',
  listOf: (what, min, max) =>
    `Liste von ${what}${min !== undefined && max !== undefined ? `, ${min} bis ${max}` : max !== undefined ? `, höchstens ${max}` : ''}`,
  object: (name) => `Objekt "${name}"`,
  fields: {
    format: 'nennt das Format.',
    formatVersion: 'die Version des Formats.',
    recipes: 'ein Eintrag je Rezept.',
    'recipe.title': 'der Name des Rezepts, wie das Rezept ihn nennt.',
    'recipe.persons':
      'für wie viele Personen oder Portionen das Rezept ist; weglassen, wenn es keine nennt.',
    'recipe.yield':
      'was das Rezept ergibt, wenn es keine Personen nennt ("1 kg", "12 Stück"); weglassen, wenn es nichts nennt.',
    'recipe.source': 'woher das Rezept stammt.',
    'recipe.components': 'die Teile, die getrennt zubereitet werden.',
    'recipe.slots':
      'nur für ein Gericht aus mehreren Teilen: was jede Rolle füllt. Fehlt es, ist jeder Bestandteil ein Platz.',
    'recipe.steps': 'das Anrichten: was getan wird, wenn die Bestandteile fertig sind.',
    'source.title': 'Titel des Buchs, der Seite oder der Karte.',
    'source.author': 'die Autorin oder der Autor, wie die Quelle sie nennt.',
    'source.url': 'die Adresse der Seite, wenn das Rezept aus dem Netz stammt.',
    'source.where': 'wo in der Quelle: Seite, Kapitel, Abschnitt.',
    'component.name': 'der Name des Bestandteils, in seinem Rezept nur einmal.',
    'component.role': 'seine Rolle im Gericht, wenn kein Platz ihn nennt.',
    'component.lines': 'die Zutaten, in der Reihenfolge des Rezepts.',
    'component.steps': 'die Schritte dieses Bestandteils, der Reihe nach, ein Schritt je Eintrag.',
    'line.ingredient': 'der Name der Zutat, wie notiert, ohne Menge und Zubereitung.',
    'line.amount': 'die Menge, wie notiert; weglassen, wenn das Rezept keine nennt.',
    'line.guessed': 'true, wenn das Rezept diese Menge nicht nennt und du sie geschätzt hast.',
    'line.role': 'die Rolle der Zutat, nur wo eine passt.',
    'line.note': 'die Zubereitung, wie notiert ("fein gehackt", "geschmolzen").',
    'slot.role': 'die Rolle, die dieser Platz füllt.',
    'slot.component': 'der Name des Bestandteils, der ihn füllt.',
    'slot.ingredient':
      'statt eines Bestandteils: der Name einer Zutat, die ihn so füllt, wie sie ist (Brot, Reis). Genau eines von component und ingredient.',
    'slot.amount':
      'nur mit einer Zutat: ihre Menge, wie notiert, je Gericht. Ein Bestandteil füllt seinen Platz mit seinem ganzen Rezept.',
    'slot.guessed': 'true, wenn diese Menge geschätzt ist.',
    'slot.optional': 'true, wenn das Rezept sagt, dass die Füllung wegbleiben kann.',
    'slot.alternatives':
      'Namen anderer Bestandteile dieses Rezepts, die den Platz stattdessen füllen können (eine andere Soße); ein solcher Bestandteil steht selbst in keinem Platz.',
  },
  exampleHeading: 'Beispiel einer Antwort:',
  recipeHeading: 'Rezept:',
};

export const PROMPT_WORDS: Record<PromptLang, Words> = { en: EN, de: DE };

/** The example of the prompt, per language; a test validates it against the schema. */
export const PROMPT_EXAMPLE: Record<PromptLang, unknown> = {
  en: {
    format: 'culina-recipes',
    formatVersion: 1,
    recipes: [
      {
        title: 'Pancakes with apple sauce',
        persons: 4,
        source: { title: 'Family recipe card', where: 'back side' },
        components: [
          {
            name: 'Pancakes',
            lines: [
              { ingredient: 'flour', amount: '250 g', role: 'flour' },
              { ingredient: 'milk', amount: '500 ml', role: 'liquid' },
              { ingredient: 'eggs', amount: '3', role: 'egg' },
              { ingredient: 'salt', amount: '1 pinch' },
              { ingredient: 'butter', amount: '2 tbsp', guessed: true, note: 'for the pan' },
            ],
            steps: ['Whisk flour, milk, eggs and salt.', 'Bake thin pancakes in the butter.'],
          },
          { name: 'Apple sauce', lines: [{ ingredient: 'apples', amount: '4' }] },
          {
            name: 'Cinnamon sugar',
            lines: [
              { ingredient: 'sugar', amount: '2 tbsp' },
              { ingredient: 'cinnamon', amount: '1 tsp' },
            ],
          },
        ],
        slots: [
          { role: 'main', component: 'Pancakes' },
          { role: 'sauce', component: 'Apple sauce', alternatives: ['Cinnamon sugar'] },
        ],
        steps: ['Serve the pancakes with the apple sauce.'],
      },
    ],
  },
  de: {
    format: 'culina-recipes',
    formatVersion: 1,
    recipes: [
      {
        title: 'Pfannkuchen mit Apfelmus',
        persons: 4,
        source: { title: 'Rezeptkarte der Familie', where: 'Rückseite' },
        components: [
          {
            name: 'Pfannkuchen',
            lines: [
              { ingredient: 'Mehl', amount: '250 g', role: 'flour' },
              { ingredient: 'Milch', amount: '500 ml', role: 'liquid' },
              { ingredient: 'Eier', amount: '3', role: 'egg' },
              { ingredient: 'Salz', amount: '1 Prise' },
              { ingredient: 'Butter', amount: '2 EL', guessed: true, note: 'für die Pfanne' },
            ],
            steps: [
              'Mehl, Milch, Eier und Salz verquirlen.',
              'In der Butter dünne Pfannkuchen backen.',
            ],
          },
          { name: 'Apfelmus', lines: [{ ingredient: 'Äpfel', amount: '4' }] },
          {
            name: 'Zimtzucker',
            lines: [
              { ingredient: 'Zucker', amount: '2 EL' },
              { ingredient: 'Zimt', amount: '1 TL' },
            ],
          },
        ],
        slots: [
          { role: 'main', component: 'Pfannkuchen' },
          { role: 'sauce', component: 'Apfelmus', alternatives: ['Zimtzucker'] },
        ],
        steps: ['Die Pfannkuchen mit dem Apfelmus servieren.'],
      },
    ],
  },
};

const quote = (v: unknown): string => JSON.stringify(v);

/** The kind of a field in words, read from the schema. */
function kindOf(node: SchemaNode, w: Words): string {
  const { node: n, ref } = resolve(node);
  if (n.const !== undefined) return w.exactly(quote(n.const));
  if (n.enum !== undefined) return w.oneOf(n.enum.map((v) => String(v)).join(', '));
  if (n.type === 'integer') return w.wholeNumber(n.minimum, n.maximum);
  if (n.type === 'boolean') return w.trueFalse;
  if (n.type === 'array' && n.items !== undefined) {
    const item = resolve(n.items);
    const what =
      item.node.type === 'object' && item.ref !== undefined ? `"${item.ref}"` : kindOf(n.items, w);
    return w.listOf(what, n.minItems, n.maxItems);
  }
  if (n.type === 'object' || n.properties !== undefined) return w.object(ref ?? '');
  return w.text;
}

/** The prompt in one language, generated from the schema. */
export function promptFor(lang: PromptLang): string {
  const w = PROMPT_WORDS[lang];
  const out: string[] = [w.intro, ''];
  for (const rule of w.rules) out.push(`- ${rule}`);
  out.push(
    `- ${w.units(UNIT_WORDS.join(', '), NO_FIXED_SIZE_WORDS.join(', '))}`,
    '',
    w.formatHeading,
  );
  for (const o of PROMPT_OBJECTS) {
    const node = objectNode(o);
    out.push('', w.objectHeading[o]);
    for (const [field, child] of Object.entries(node.properties ?? {})) {
      const path = o === '' ? field : `${o}.${field}`;
      const explanation = w.fields[path];
      if (explanation === undefined) throw new Error(`no explanation for ${path} (${lang})`);
      const flag = node.required?.includes(field) ? w.required : w.optional;
      out.push(`- "${field}" (${flag}, ${kindOf(child, w)}): ${explanation}`);
    }
  }
  out.push(
    '',
    w.exampleHeading,
    JSON.stringify(PROMPT_EXAMPLE[lang], null, 2),
    '',
    w.recipeHeading,
    '',
  );
  return out.join('\n');
}

/** The prompt in the app's language. */
export const aiPrompt = (): string => promptFor(currentLang() === 'de' ? 'de' : 'en');
