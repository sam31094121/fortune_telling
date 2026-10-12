/**
 * tests/support/jest-style-runner.cjs 提供的全域函式型別（零新增依賴；取代 @types/jest 的最小子集）。
 * 純型別宣告，不產生任何執行碼。
 */
interface JestStyleMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toMatch(expected: RegExp | string): void;
  toHaveLength(length: number): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toThrow(expected?: RegExp | string): void;
}
interface JestStyleExpectation extends JestStyleMatchers {
  not: JestStyleMatchers;
}
type JestStyleFn = () => void | Promise<void>;
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: JestStyleFn): void;
declare function it(name: string, fn: JestStyleFn): void;
declare function beforeAll(fn: JestStyleFn): void;
declare function afterAll(fn: JestStyleFn): void;
declare function beforeEach(fn: JestStyleFn): void;
declare function afterEach(fn: JestStyleFn): void;
declare function expect(actual: unknown): JestStyleExpectation;