// The engine's only public entry. The general model comes from materia
// through model.ts; Culina's kitchen rules are added by their own issues.
export * from './model';

export { convert, toGrams } from './amounts/convert';
export {
  displayStep,
  householdMeasureOf,
  HOUSEHOLD_MEASURES,
  MEASURE_STEP,
  PIECE_STEP,
  roundMass,
  roundMeasure,
  roundPieces,
} from './amounts/round';
export type { HouseholdMeasure, ShownNumberResult } from './amounts/round';
export { UNIT_IDS, isUnitId, unitFactor, unitKind } from './amounts/units';
export type {
  Amount,
  ConvertError,
  ConvertErrorCode,
  ConvertResult,
  GramsResult,
  IngredientFacts,
  RoundResult,
  UnitId,
  UnitKind,
} from './amounts/types';

export { DEFAULT_SALT_ROLES, cautionsFor } from './scale/cautions';
export { scaleByFactor, scaleFromLine, scaleToTotal } from './scale/scale';
export type {
  Caution,
  FactsById,
  PercentAmount,
  ScalableLine,
  ScaleError,
  ScaleErrorCode,
  ScaleOptions,
  ScaleResult,
  UnscaledLine,
} from './scale/types';

export { fromBakersPercent } from './bakers/formula';
export { hydration } from './bakers/hydration';
export { bakersPercent } from './bakers/percent';
export type {
  BakersError,
  BakersErrorCode,
  BakersLine,
  BakersOptions,
  BakersPercentResult,
  Composition,
  FormulaLine,
  FormulaResult,
  FormulaTarget,
  HydrationLine,
  HydrationOptions,
  HydrationResult,
} from './bakers/types';

export { checkRatio } from './ratios/check';
export { templateAncestors, templateChildren, templateSiblings } from './ratios/family';
export { templatePercent } from './ratios/percent';
export { resolveTemplate } from './ratios/resolve';
export { scaleFromAnchor } from './ratios/scale';
export { SEED_TEMPLATES } from './ratios/seed';
export type {
  AncestorsResult,
  CheckResult,
  EffectivePart,
  EffectiveTemplate,
  PartRange,
  PercentResult,
  RangePosition,
  RatioError,
  RatioErrorCode,
  RatioTemplate,
  ResolveResult,
  RoleCheck,
  ScaleAnchorResult,
  TemplateChange,
  TemplateError,
  TemplateErrorCode,
  TemplatePart,
} from './ratios/types';

export { saltFor } from './salt/percent';
export type { SaltBasis, SaltErrorCode, SaltInput, SaltResult } from './salt/percent';

export { flourAndWater } from './components/composition';
export type { CompositionOptions } from './components/composition';
export { expandComponent, runWeight } from './components/expand';
export { convertComponentLines } from './components/convert';
export type { ConvertLinesResult, LineEntry } from './components/convert';
export { componentLineGrams } from './components/lines';
export { portionsFromYield, portionWeight } from './components/portions';
export { componentYield, runGrams } from './components/yield';
export type { RunGramsResult } from './components/yield';
export type {
  Component,
  ComponentError,
  ComponentErrorCode,
  ComponentLine,
  ComponentRef,
  ExpandOptions,
  ExpandResult,
  FactsByIngredient,
  FoodState,
  LineGrams,
  LinesResult,
  PortionsResult,
  PortionWeightResult,
  RawIngredient,
  UnconvertedIndex,
  UnconvertedLine,
  UnmeasuredLine,
  YieldFigures,
  YieldResult,
  KeepEntry,
} from './components/types';

export { toEdible, toPurchased, yieldFor } from './yields/edible';
export type { EdibleResult, IngredientYield, YieldError, YieldLookup } from './yields/edible';

export { stockExpiry } from './stock/expiry';
export { shelfLifeApplies } from './stock/types';
export { useBySuggestions } from './stock/suggest';
export { useAmount } from './stock/use';
export type { UseResult } from './stock/use';
export type {
  ExpiryBasis,
  ShelfLifeEntry,
  StockError,
  StockExpiry,
  StockExpiryResult,
  StockItem,
  StockStatus,
  StoragePlace,
  SuggestionsResult,
  UseBySuggestion,
} from './stock/types';

export { validateModel } from './validate/model';
export type {
  EntityKind,
  Finding,
  FindingCode,
  ModelAffinity,
  ModelComponent,
  ModelDish,
  ModelIngredient,
  ModelInput,
  ModelStock,
  ModelTasting,
  ModelVersion,
  ValidationResult,
} from './validate/types';

export {
  familyHeads,
  variationCycles,
  variationParent,
  variationsOf,
  versionFamily,
  versionNumber,
} from './versions/chain';
export { diffComponentVersions, diffDishVersions } from './versions/diff';
export type {
  DiffComponent,
  DiffDish,
  DiffLine,
  DiffResult,
  FamilyResult,
  FamilyVersions,
  FieldChange,
  LineChange,
  LineField,
  Variation,
  VariationParent,
  VersionChange,
  VersionDiff,
  VersionError,
  VersionErrorCode,
  VersionField,
  VersionMeta,
  Versioned,
} from './versions/types';

/** The engine's name; the app shows it until it has real screens. */
export const engineName = (): string => 'culina-engine';

export {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  buildExport,
  exportFileName,
  serializeExport,
} from './exchange/build';
export { EXPORT_MIGRATIONS, parseExport } from './exchange/parse';
export type { ParseOptions } from './exchange/parse';
export { IMMUTABLE_KINDS, conflictKey, mergeWrites, planMerge, sameRecord } from './exchange/merge';
export type { Choice, Conflict, MergePlan } from './exchange/merge';
export { remapIngredients } from './exchange/remap';
export { matchIngredients, nameWords, normaliseName } from './exchange/match';
export type { Candidate, NameMatch } from './exchange/match';
export { EXPORT_KINDS, KIND_SINCE } from './exchange/types';
export type {
  ExportContent,
  ExportEnvelope,
  ExportError,
  ExportErrorCode,
  ExportKind,
  ExportMigration,
  ExportRecord,
  FullRecordSets,
  ParseResult,
  RecordSets,
  RecordValidator,
  RecordValidators,
} from './exchange/types';

export { parseCooklang, ingredientUses } from './cooklang/parse';
export { parseInline, parseQuantity, plainText } from './cooklang/inline';
export { componentToCooklang, dishToCooklang, fileStem } from './cooklang/serialize';
export type {
  CooklangComponent,
  CooklangDish,
  DishSerializeContext,
  Loss,
  SerializeContext,
  SerializeResult,
} from './cooklang/serialize';
export {
  availableModes,
  givenAmount,
  quantityText,
  resolveAmount,
  writtenInSizedWord,
} from './cooklang/amount';
export type { AmountErrorCode, AmountMode, AmountResult } from './cooklang/amount';
export { importComponent, importDish } from './cooklang/import';
export { cooklangParts, hasSections } from './cooklang/sections';
export type { CookPart } from './cooklang/sections';
export type {
  DishComponentOptions,
  DishImportErrorCode,
  DishImportOptions,
  DishImportResult,
  ImportErrorCode,
  ImportOptions,
  ImportResult,
  LineDecision,
} from './cooklang/import';
export {
  NO_FIXED_SIZE_WORDS,
  UNIT_WORDS,
  noFixedSizeWord,
  sizedIn,
  sizedWord,
  unitFromWord,
} from './cooklang/units';
export type { SizedEntry, SizedWord } from './cooklang/units';
export { readWrittenAmount } from './recipes/amount';
export { checkRecipes } from './recipes/check';
export type { RecipeProblem, RecipeProblemCode } from './recipes/check';
export {
  DEFAULT_RECIPE_ROLE,
  alternativeOf,
  componentRoles,
  importRecipe,
  isDishRecipe,
  recipeLines,
} from './recipes/import';
export type {
  RecipeComponentOptions,
  RecipeImportErrorCode,
  RecipeImportOptions,
  RecipeImportResult,
  RecipeLineUse,
} from './recipes/import';
export { RECIPE_FORMAT, RECIPE_FORMAT_VERSION, recipeImportSchema } from './recipes/types';
export type {
  RecipeAnswer,
  RecipeComponent,
  RecipeEntry,
  RecipeLine,
  RecipeSlot,
  RecipeSource,
} from './recipes/types';
export type {
  Block,
  CookIngredient,
  CooklangDocument,
  IngredientUse,
  MetaValue,
  Segment,
} from './cooklang/types';

export {
  DEFAULT_DISH_ROLES,
  KITCHEN_ROLE,
  dishReport,
  makeable,
  openDishRoles,
  rankCandidates,
  stockForRole,
  usesIngredient,
} from './makeable';
export type {
  DishReportResult,
  MakeableCandidate,
  MakeableComponent,
  MakeableDish,
  MakeableError,
  MakeableErrorCode,
  MakeableIngredient,
  MakeableInput,
  MakeableLine,
  MakeableLineReport,
  MakeableLineStatus,
  MakeableOptions,
  MakeableResult,
  MakeableStockItem,
  MakeableSubstitution,
  MakeableThrough,
  MakeablePart,
  MakeableUrgency,
  MakeableUseUp,
  RankedCandidate,
  RoleStockItem,
  StockForRoleResult,
  UsesIngredientResult,
} from './makeable';

export { LANGS, isI18nText, pickText } from './text/i18n';
export type { I18nText, Lang } from './text/i18n';
export { contentResult } from './content/types';
export type { ContentFinding, ContentFindingCode, ContentResult } from './content/types';
export { validateSteps } from './steps/validate';
export type { StepOptions, StepsOwner } from './steps/validate';
export { stepWord } from './steps/types';
export type { Step, StepTemperature, StepTime, StepWord, TextStep } from './steps/types';
export { STEP_VOCABULARY, proposeStep } from './steps/propose';
export type { ProposalLine, StepProposal, StepVocabulary } from './steps/propose';
export { ACTIONS, actionById } from './actions/shipped';
export type { Action } from './actions/types';

export { TECHNIQUES, techniqueById } from './techniques/shipped';
export { techniqueNotes } from './techniques/notes';
export type { NotesResult, TechniqueNote } from './techniques/notes';
export { MAX_SENTENCE_WORDS, validateTechnique, validateTechniques } from './techniques/validate';
export { TECHNIQUE_LEVELS } from './techniques/types';
export type { Technique, TechniqueLevel, TechniqueSource } from './techniques/types';

export { validateHandlingRule, validateHandlingRules } from './handling/validate';
export type { HandlingContext } from './handling/validate';
export { handlingRules } from './handling/rules';
export type { HandlingOptions, HandlingResult, ShownRule, TreeNode } from './handling/rules';
export type { HandlingLevel, HandlingRule, HandlingSource } from './handling/types';
export { SUBSTITUTES, substituteById } from './substitutes/shipped';
export { substituteEffects } from './substitutes/lookup';
export { validateSubstitute, validateSubstitutes } from './substitutes/validate';
export type { SubstituteChecks } from './substitutes/validate';
export type { Substitute, SubstituteLevel, SubstituteSource } from './substitutes/types';

export { learnedTechniques, skillId, skillRecord } from './skills/skill';
export type { SkillRecord } from './skills/skill';
export {
  byNotCookedForLong,
  cookedDates,
  cookedId,
  cookedRecord,
  isCalendarDay,
} from './cooked/cooked';
export type { CookedRecord } from './cooked/cooked';

export { validateClassic } from './classics/validate';
export type { ClassicContext } from './classics/validate';
export { DEFAULT_PORTIONS, deriveClassic } from './classics/derive';
export type {
  DeriveErrorCode,
  DeriveOptions,
  DeriveResult,
  DerivedComponent,
  DerivedDish,
  DerivedLine,
  DerivedRange,
  DerivedSlot,
  Unmeasured,
} from './classics/derive';
export { copyClassic } from './classics/copy';
export {
  chooseAlternative,
  componentsInDish,
  componentsReached,
  componentsUsed,
  isBase,
  isDishOfItsOwn,
  slotAlternatives,
  withoutAlternatives,
} from './classics/base';
export { copyClassicComponent } from './classics/copy-component';
export type { CopyComponentResult } from './classics/copy-component';
export type { CopiedComponent, CopiedDish, CopyOptions, CopyResult, Origin } from './classics/copy';
export { resolveSourceUnit } from './classics/units';
export type { UnitSize } from './classics/units';
export { classicReport, classicsMakeable, isWater } from './classics/makeable';
export type {
  ClassicCandidate,
  ClassicReportInput,
  ClassicReportResult,
  ClassicsMakeableError,
  ClassicsMakeableInput,
  ClassicsMakeableResult,
} from './classics/makeable';
export { wantedLines } from './classics/wanted';
// lackingLines and freeLines carry the list package's usual items: the app's main script uses only
// lackingItems, and its hand-over module the two (the app's test/build.test.ts).
export { freeLines, lackingLines } from './handover/lacking';
export type { LackingLines, LackingOptions } from './handover/lacking';
export type { LackingReport } from './handover/reading';
export { lackingItems } from './handover/reading';
export type { LackingItem, LackingItems } from './handover/reading';
export type { WantedLine } from './classics/wanted';
export { COUNTRY_CODES, COURSE_IDS } from './classics/types';
export type {
  AmountWord,
  Classic,
  ClassicComponent,
  ClassicKind,
  ClassicSource,
  ComponentFrom,
  ClassicLine,
  ClassicSlot,
  ClassicUnit,
  Country,
  Course,
  Settled,
  SourceAmount,
} from './classics/types';

export { SALT_PER_SODIUM, dishNutrition } from './nutrition/dish';
export type { DishNutritionInput } from './nutrition/dish';
export { ROUNDING_SOURCE, roundNutrition } from './nutrition/round';
export { lineFigures } from './nutrition/figures';
export type { FigureLookup, FigureOrigin, FigureRecord, LineFigures } from './nutrition/figures';
export type {
  NutritionShown,
  NotCountedLine,
  NotCountedReason,
  NutrientsPer100g,
  NutritionById,
  NutritionCoverage,
  NutritionError,
  NutritionErrorCode,
  NutritionResult,
  PortionNutrients,
  RoundNutritionResult,
} from './nutrition/types';

export {
  MIN_MOLECULES,
  MIN_SHARED,
  entityByName,
  familyOf,
  flavoursOf,
  moleculeWeights,
  pairingBaselines,
  pairingsFor,
  pairingsForDish,
  sharedMolecules,
} from './pairing/pair';
export type {
  DishPairing,
  Pairing,
  PairingBaseline,
  PairingData,
  PairingEntity,
  PairingMolecule,
  PairingOptions,
} from './pairing/types';

export { MIN_MEASURED, MIN_MEASURED_FIGURES, dishCharacters, shareOf } from './characters/evaluate';
export { correctCharacters, correctionOf, correctionText } from './characters/correct';
export type { CharacterCorrection } from './characters/correct';
export type {
  CharacterClause,
  CharacterCoverage,
  CharacterFacts,
  CharacterLine,
  CharacterReason,
  CharacterRule,
  CharactersResult,
  DishCharacter,
  FigureBound,
} from './characters/types';
