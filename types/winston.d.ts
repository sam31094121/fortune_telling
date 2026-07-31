declare module 'winston' {
  export type LogformTransform = unknown;
  export const format: {
    combine: (...formats: unknown[]) => unknown;
    timestamp: () => unknown;
    printf: (templateFunction: (info: { level: string; message: unknown; timestamp?: string; stack?: unknown; [key: string]: unknown }) => string) => unknown;
    json: () => unknown;
    errors: (options?: { stack?: boolean }) => unknown;
  };
  export const transports: {
    Console: new (...args: unknown[]) => unknown;
  };
  export function createLogger(options: { level?: string; format?: unknown; transports?: unknown[] }): unknown;
}