export type ExperienceQualityGateInput = {
  inputComplete: boolean;
  sourceVerified: boolean;
  engineCompleted: boolean;
  resultComplete: boolean;
  semanticDedupCompleted: boolean;
  mobileLayoutPassed: boolean;
  sensitiveDataSanitized: boolean;
};

export type ExperienceQualityGateResult = ExperienceQualityGateInput & {
  readyForFrontend: boolean;
  failedKeys: Array<keyof ExperienceQualityGateInput>;
};

export function evaluateExperienceQualityGate(input: ExperienceQualityGateInput): ExperienceQualityGateResult {
  const failedKeys = (Object.keys(input) as Array<keyof ExperienceQualityGateInput>).filter((key) => !input[key]);
  return {
    ...input,
    readyForFrontend: failedKeys.length === 0,
    failedKeys,
  };
}

export function getFriendlyQualityGateError(result: ExperienceQualityGateResult) {
  if (result.readyForFrontend) return '';
  return '這一道確認尚未通過，系統已停止後續分析。請重新確認資料後安全重試。';
}