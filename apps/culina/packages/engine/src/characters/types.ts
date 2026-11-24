// Types of the characters module: what is known about a dish (its ingredient lines with their
// classes and mass, the techniques of its steps), a rule of the character table and the result.
// A character is derived at read time and never stored; a rule is data, each one a judgement.

/** One ingredient line of a dish, components written out. */
export interface CharacterLine {
  /** The ingredient's id, the ids of its ancestors and its category tags (`category:<name>`). */
  classes: readonly string[];
  /** Mass in grams; absent when the line has no amount or it cannot be converted. */
  g?: number;
  /** Fat in grams per 100 g of the ingredient; absent when unknown. */
  fatPer100g?: number;
  /** Energy in kcal per 100 g of the ingredient; absent when unknown. */
  kcalPer100g?: number;
}

/** What the rules read of one dish. */
export interface CharacterFacts {
  lines: readonly CharacterLine[];
  /** Technique ids named by the steps. */
  techniques: readonly string[];
  /**
   * Plain action ids named by the steps (`heat`, `cook`, `serve`); absent counts as none. A step
   * names a technique or an action, not both, so heat written as a plain action is only here.
   */
  actions?: readonly string[];
  /** Whether the dish has steps that name what is done; without them no technique rule is judged. */
  stepsKnown: boolean;
  /** The course the dish states (`main`, `soup`, `dessert`, ...); absent when it states none. */
  course?: string;
}

/** A bound on a figure per 100 g of the counted mass. */
export interface FigureBound {
  min?: number;
  max?: number;
}

/**
 * One way a character comes about; every condition given must hold.
 *
 * `ingredients` alone asks for presence. With `minShare` the lines of these classes must reach
 * that share of the dish's mass; where the share cannot be known (see `shareOf`), `presence`
 * decides instead (default: presence is enough).
 */
export interface CharacterClause {
  ingredients?: readonly string[];
  minShare?: number;
  presence?: boolean;
  /** Each of these lists has a line of one of its classes as well (presence only, no share). */
  alsoIngredients?: readonly (readonly string[])[];
  /** Any of these techniques is named by a step. */
  techniques?: readonly string[];
  /** None of these techniques is named by a step; holds only when the steps are known. */
  withoutTechniques?: readonly string[];
  /** None of these plain actions is named by a step; holds only when the steps are known. */
  withoutActions?: readonly string[];
  /** The dish states one of these courses; a dish without a course never matches. */
  courses?: readonly string[];
  /** Fat in g per 100 g of the dish; judged only where `MIN_MEASURED_FIGURES` of the lines have a mass. */
  fat?: FigureBound;
  /** Energy in kcal per 100 g of the dish; judged under the same condition as `fat`. */
  kcal?: FigureBound;
}

/** A row of the character table. */
export interface CharacterRule {
  id: string;
  /** Any of these clauses makes the character. */
  when: readonly CharacterClause[];
  /** Any of these clauses takes it away again. */
  unless?: readonly CharacterClause[];
}

/** What made a character: the clause, and the share where one was read. */
export interface CharacterReason {
  clause: number;
  /**
   * `share`: by mass; `presence`: an ingredient is there; `technique`; `course`: the course the
   * dish states; `figures`: fat or energy.
   */
  by: 'share' | 'presence' | 'technique' | 'course' | 'figures';
  share?: number;
}

export interface DishCharacter {
  id: string;
  reason: CharacterReason;
}

/** How much of the dish the shares rest on. */
export interface CharacterCoverage {
  /** Ingredient lines of the dish. */
  lines: number;
  /** Lines whose mass is known. */
  measured: number;
  /** Whether shares were judged: at least `MIN_MEASURED` of the lines have a mass. */
  covered: boolean;
}

export interface CharactersResult {
  characters: DishCharacter[];
  coverage: CharacterCoverage;
}
