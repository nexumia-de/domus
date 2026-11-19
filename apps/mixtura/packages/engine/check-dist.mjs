// What the built engine must not contain: imports, DOM, host and Node-only
// names (docs/engine.md). Strings and comments are not stripped, so a false
// positive means rewording the source.
const FORBIDDEN = [
  [/^\s*import\s|\bimport\s*\(/m, 'an import'],
  [/\brequire\s*\(/, 'require'],
  [
    // `document` as an object key (`{ document: doc }`) or inside a hyphenated
    // word (`'not-a-document'`) is materia's place document, not the DOM.
    /\b(?:window|navigator|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest)\b|(?<![\w$-])document\b(?!\s*:|-)/,
    'a DOM or browser name',
  ],
  [/\b(?:process|Buffer|__dirname|__filename)\b/, 'a Node-only name'],
  [/\bnode:/, 'a node: specifier'],
  [/\b(?:Date|performance|crypto)\b|\bMath\.random\b/, 'a clock or randomness'],
];

/** @param {string} text The bundle. @returns {string[]} One line per problem. */
export function checkDist(text) {
  return FORBIDDEN.flatMap(([pattern, what]) => (pattern.test(text) ? [`contains ${what}`] : []));
}
