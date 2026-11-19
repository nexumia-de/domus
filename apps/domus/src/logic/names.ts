export const NAME_MAX = 60;

/** A space's name as stored: trimmed, one to 60 characters; undefined when it is empty or too long. */
export function cleanName(text: string): string | undefined {
  const name = text.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= NAME_MAX ? name : undefined;
}
