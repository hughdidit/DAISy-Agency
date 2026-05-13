import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export function validateWithSchema<T>(schema: TSchema, value: unknown): ValidationResult<T> {
  if (Value.Check(schema, value)) {
    return { ok: true, value: value as T };
  }
  const errors = [...Value.Errors(schema, value)].map((error) => {
    const path = error.path || "/";
    return `${path}: ${error.message}`;
  });
  return { ok: false, errors };
}

export function assertValid<T>(schema: TSchema, value: unknown, label: string): T {
  const result = validateWithSchema<T>(schema, value);
  if (result.ok) {
    return result.value;
  }
  throw new Error(`${label} validation failed: ${result.errors.join("; ")}`);
}
