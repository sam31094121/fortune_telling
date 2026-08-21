// lib/core/validator.ts

/**
 * 統一驗證工具，使用 Zod 定義 schema，返回符合型別的資料或拋出錯誤。
 */
import { ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')} - ${e.message}`).join('; ');
    throw new Error(`Invalid input: ${messages}`);
  }
  return result.data;
}
