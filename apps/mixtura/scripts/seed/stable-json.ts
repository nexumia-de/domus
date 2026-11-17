// Deterministic JSON: object keys sorted, one record per line in the big
// arrays, so a rerun produces no diff and a change shows as few lines.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json | undefined };

function sorted(value: Json | undefined): Json | undefined {
  if (Array.isArray(value)) return value.map((v) => sorted(v) as Json);
  if (value !== null && typeof value === 'object') {
    const out: { [key: string]: Json } = {};
    for (const key of Object.keys(value).sort()) {
      const v = sorted(value[key]);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

export const compact = (value: unknown): string => JSON.stringify(sorted(value as Json));

/** `{ attribution, <key>: [records] }` with the records one per line. */
export function serializeFile(
  key: string,
  attribution: unknown,
  records: readonly unknown[],
): string {
  const lines = records.map((r) => compact(r));
  return `{\n"attribution":${compact(attribution)},\n"${key}":[\n${lines.join(',\n')}\n]\n}\n`;
}
