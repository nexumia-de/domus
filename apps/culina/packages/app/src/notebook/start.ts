// Opens the store once at startup and loads every record into the cache. Never throws: a store
// that cannot open leaves the empty, read-only notebook and the reason for the screens to say.
import { openStore, type OpenOptions, type Store } from '../store';
import type { ComponentRecord, DishRecord, IngredientRecord, TastingRecord } from '../records';
import { emit, reset, sorted, state } from './state';

type Options = Partial<Pick<OpenOptions, 'indexedDB'>> & {
  now?: () => string;
  newId?: () => string;
};

const load = async (store: Store): Promise<boolean> => {
  const [ingredients, components, dishes, tastings] = await Promise.all([
    store.list('ingredients'),
    store.list('components'),
    store.list('dishes'),
    store.list('tastings'),
  ]);
  if (!ingredients.ok) return false;
  if (!components.ok || !dishes.ok || !tastings.ok) return false;
  state.ingredients = sorted(ingredients.records as unknown as IngredientRecord[]);
  state.components = sorted(components.records as unknown as ComponentRecord[]);
  state.dishes = sorted(dishes.records as unknown as DishRecord[]);
  state.tastings = tastings.records as unknown as TastingRecord[];
  return true;
};

export const startNotebook = async (options: Options = {}): Promise<void> => {
  reset();
  if (options.now) state.now = options.now;
  if (options.newId) state.newId = options.newId;
  const opened = await openStore({
    now: state.now,
    ...(options.indexedDB === undefined ? {} : { indexedDB: options.indexedDB }),
  });
  if (!opened.ok) {
    state.problem = opened.error.code;
    emit();
    return;
  }
  if (await load(opened.store)) state.store = opened.store;
  else {
    opened.store.close();
    state.problem = 'unavailable';
  }
  emit();
};
