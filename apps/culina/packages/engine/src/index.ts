// The engine's only public entry. The general model comes from materia
// through model.ts; Culina's kitchen rules are added by their own issues.
export * from './model';

/** The engine's name; the app shows it until it has real screens. */
export const engineName = (): string => 'culina-engine';
