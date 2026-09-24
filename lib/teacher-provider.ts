/** 暫停 Google 外部生成；保留環境設定，恢復供應商須另行驗證。 */
export const TEACHER_DISPLAY_NAME = '易經老師';
export const TEACHER_SOURCE = 'local-iching';

export function googleGenerationKey(): string | undefined {
  return undefined;
}
