// The engine's only public entry. The general model comes from materia
// through model.ts; Culina's kitchen rules are added by their own issues.
export * from './model';

export { convert, toGrams } from './amounts/convert';
export { displayStep, roundMass } from './amounts/round';
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
export { expandComponent } from './components/expand';
export { convertComponentLines } from './components/convert';
export type { ConvertLinesResult, LineEntry } from './components/convert';
export { componentLineGrams } from './components/lines';
export { portionsFromYield, portionWeight } from './components/portions';
export { componentYield } from './components/yield';
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
  UnmeasuredLine,
  YieldFigures,
  YieldResult,
} from './components/types';

export { toEdible, toPurchased, yieldFor } from './yields/edible';
export type { EdibleResult, IngredientYield, YieldError, YieldLookup } from './yields/edible';

export { stockExpiry } from './stock/expiry';
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
export { EXPORT_KINDS } from './exchange/types';
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
export { componentToCooklang, fileStem } from './cooklang/serialize';
export type {
  CooklangComponent,
  Loss,
  SerializeContext,
  SerializeResult,
} from './cooklang/serialize';
export { availableModes, givenAmount, quantityText, resolveAmount } from './cooklang/amount';
export type { AmountErrorCode, AmountMode, AmountResult } from './cooklang/amount';
export { importComponent } from './cooklang/import';
export type { ImportErrorCode, ImportOptions, ImportResult, LineDecision } from './cooklang/import';
export { unitFromWord } from './cooklang/units';
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
  makeable,
  openDishRoles,
  stockForRole,
  usesIngredient,
} from './makeable';
export type {
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
  MakeableUrgency,
  MakeableUseUp,
  RoleStockItem,
  StockForRoleResult,
  UsesIngredientResult,
} from './makeable';

export { LANGS, isI18nText, pickText } from './text/i18n';
export type { I18nText, Lang } from './text/i18n';
export { contentResult } from './content/types';
export type { ContentFinding, ContentFindingCode, ContentResult } from './content/types';
export { validateSteps } from './steps/validate';
export type { StepsOwner } from './steps/validate';
export type { Step, StepTemperature, StepTime } from './steps/types';

export { TECHNIQUES, techniqueById } from './techniques/shipped';
export { techniqueNotes } from './techniques/notes';
export type { NotesResult, TechniqueNote } from './techniques/notes';
export { MAX_SENTENCE_WORDS, validateTechnique, validateTechniques } from './techniques/validate';
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
export type { CopiedComponent, CopiedDish, CopyOptions, CopyResult, Origin } from './classics/copy';
export { resolveSourceUnit } from './classics/units';
export type { UnitSize } from './classics/units';
export { classicsMakeable, isWater } from './classics/makeable';
export type {
  ClassicCandidate,
  ClassicsMakeableError,
  ClassicsMakeableInput,
  ClassicsMakeableResult,
} from './classics/makeable';
export { wantedLines } from './classics/wanted';
export type { WantedLine } from './classics/wanted';
export type {
  AmountWord,
  Classic,
  ClassicComponent,
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
export type {
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
