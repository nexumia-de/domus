// The wording rule (docs/behaviour.md): no text says that a recipe or a ratio is wrong. The same
// words apply to the shipped texts of techniques and classics, in English and in German.

/** English words that judge a dish. */
export const FORBIDDEN =
  /\b(wrong|errors?|invalid|incorrect|mistakes?|failed|fail|too much|too little|missing|bad)\b/i;

/** German words that judge a dish. */
export const FORBIDDEN_DE =
  /\b(falsch\w*|fehler\w*|fehlerhaft\w*|ungültig\w*|inkorrekt\w*|misslungen\w*|gescheitert|zu viel|zu wenig|fehlt|fehlen|schlecht\w*|verkehrt\w*)\b/i;
