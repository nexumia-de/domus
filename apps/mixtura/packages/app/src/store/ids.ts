// User ids: the check is the engine's (docs/data-model.md#ids); making a new
// one needs randomness and stays here.

import { isUserId } from '@mixtura/engine';

export { isUserId };

export const newUserId = (): string => `u-${crypto.randomUUID()}`;
