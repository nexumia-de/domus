// The compiled schema validators in the shape the engine's `parseExport` takes.
import type { RecordValidators } from '@culina/engine';
import * as compiled from '../store/validators.generated.js';

export const recordValidators: RecordValidators = {
  ingredients: compiled.ingredients,
  templates: compiled.templates,
  components: compiled.components,
  dishes: compiled.dishes,
  affinities: compiled.affinities,
  tastings: compiled.tastings,
};
