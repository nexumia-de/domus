// The engine's only public entry (docs/engine.md). The general model and the
// drink-specific rules are separate files; test/index.test.ts pins the list of
// exported names, so nothing becomes public by accident.
export * from './model';
export * from './drink';
