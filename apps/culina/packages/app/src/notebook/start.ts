// Opens the store once at startup and loads every record into the cache. Never throws: a store
// that cannot open leaves the empty, read-only notebook and the reason for the screens to say.
import { openStore, type OpenOptions } from '../store';
import { load } from './load';
import { emit, reset, state } from './state';

type Options = Partial<Pick<OpenOptions, 'indexedDB'>> & {
  now?: () => string;
  newId?: () => string;
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
