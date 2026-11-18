import { engineName } from '@culina/engine';
import { strings } from './strings';

/** The app reaches the engine through its entry point only; Settings shows which engine it runs. */
export const engineLine = (): string => strings.settings.engineLine(engineName());
