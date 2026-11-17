// Types of the generated file (compile-schemas.mjs writes the code).
export interface ValidationError {
  instancePath: string;
  message?: string;
}
export interface Validator {
  (value: unknown): boolean;
  errors?: ValidationError[] | null;
}
export const validators: Record<string, Validator | undefined>;
