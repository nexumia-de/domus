/** The engine's name; the first exported function, replaced by real engine code later. */
export function engineName(): string {
  return 'mixtura-engine';
}

export * from './ingredients/index';
export * from './balance/index';
export * from './batch/index';
export * from './templates/index';
