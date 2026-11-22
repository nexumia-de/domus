// The prompt the import screen copies for a language model of the user's choice: it asks for
// Cooklang that the existing Cooklang step reads (decision ai-prompt-import). Kept apart from the
// UI strings because it is long text for a model, not for the screen. Only the units the reader
// knows are named (docs/exchange.md#cooklang).
import { currentLang } from '../../classics/lang';

const EN = `Convert the recipe below into Cooklang. Rules:
- Start with front matter: title, source (where the recipe is from) and servings.
- Mark every ingredient as @name{amount%unit}, for example @flour{200%g}, @milk{250%ml}, @eggs{3}.
- Use only these units: g, kg, ml, l, tsp, tbsp, cup, oz, lb; a count gets no unit. If an amount cannot be given in these units (a pinch, a packet), write @salt{} and put the amount into the step text.
- Write each step as its own paragraph. Mark equipment as #name{} and times as ~{20%minutes}.
- Do not invent amounts: an ingredient without an amount in the recipe is written as @name{}.
- Answer with the Cooklang text only.

Recipe:
`;

const DE = `Wandle das Rezept unten in Cooklang um. Regeln:
- Beginne mit Front Matter: title, source (woher das Rezept stammt) und servings.
- Markiere jede Zutat als @Name{Menge%Einheit}, zum Beispiel @Mehl{200%g}, @Milch{250%ml}, @Eier{3}.
- Verwende nur diese Einheiten: g, kg, ml, l, tsp, tbsp, cup, oz, lb; eine Stückzahl bekommt keine Einheit. Schreibe EL als tbsp und TL als tsp. Lässt sich eine Menge nicht in diesen Einheiten angeben (eine Prise, ein Päckchen), schreibe @Salz{} und nenne die Menge im Text des Schritts.
- Schreibe jeden Schritt als eigenen Absatz. Markiere Geräte als #Name{} und Zeiten als ~{20%minutes}.
- Erfinde keine Mengen: Eine Zutat ohne Menge im Rezept wird als @Name{} geschrieben.
- Antworte nur mit dem Cooklang-Text.

Rezept:
`;

/** The prompt in the app's language. */
export const aiPrompt = (): string => (currentLang() === 'de' ? DE : EN);
