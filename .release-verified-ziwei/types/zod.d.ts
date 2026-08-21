declare module 'zod' {
  export type ZodIssue = { path: Array<string | number>; message: string };
  export type SafeParseSuccess<T> = { success: true; data: T };
  export type SafeParseFailure = { success: false; error: { errors: ZodIssue[] } };
  export interface ZodSchema<T = unknown> {
    safeParse(data: unknown): SafeParseSuccess<T> | SafeParseFailure;
  }
}