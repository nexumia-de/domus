// The passphrase of a place: generated as 100 bits in Crockford's base32,
// 5 groups of 4 characters. The user may choose their own text instead.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUPS = 5;
const GROUP_SIZE = 4;
const GENERATED = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/;

export type RandomSource = (array: Uint8Array<ArrayBuffer>) => Uint8Array;

/**
 * 20 characters from 20 random bytes; each byte keeps its low 5 bits, and
 * 256 is a multiple of 32, so every character has probability exactly 1/32.
 */
export function generatePassphrase(
  random: RandomSource = (a) => crypto.getRandomValues(a),
): string {
  const bytes = random(new Uint8Array(GROUPS * GROUP_SIZE));
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = '';
    for (let i = 0; i < GROUP_SIZE; i++)
      group += ALPHABET.charAt((bytes[g * GROUP_SIZE + i] ?? 0) & 31);
    groups.push(group);
  }
  return groups.join('-');
}

/**
 * The text to derive the key from. Text of the generated form is trimmed,
 * upper-cased and has the look-alikes O, I and L mapped to 0, 1 and 1; any
 * other text is used exactly as typed.
 */
export function normalisePassphrase(text: string): string {
  const mapped = text.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  return GENERATED.test(mapped) ? mapped : text;
}
