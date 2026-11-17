export function applyCorrections<T extends { id: string; parentId?: string }>(
  ingredients: readonly T[],
  corrections: readonly { id: string; parentId: string }[],
): T[];
