/** Presentation only: readiness and validation still come from the battle core. */
export type PreparationStep = 1 | 2 | 3 | 4 | 5;

export function preparationGuidance(input: {
  ready: boolean;
  hasActive: boolean;
  formationReady: boolean;
  checkingRecords: boolean;
  recordProblem: boolean;
  trial: boolean;
  hasSelection?: boolean;
}) {
  const currentStep: PreparationStep = input.ready ? 5
    : input.checkingRecords || input.recordProblem ? 3
      : !input.hasActive ? 1 : !input.formationReady ? 4 : 3;
  const actionLabels = {
    1: input.hasSelection ? '前往放置卡片' : '前往選主戰卡',
    2: '前往補後備卡',
    3: input.recordProblem ? '查看紀錄提示' : input.trial ? '查看體驗戰說明' : '前往押注確認',
    4: '查看陣容提示',
    5: '前往開戰確認',
  };
  return { currentStep, actionLabels };
}

/** One tap toggles one real collection entry; formal battles cap the stake at five. */
export function nextStakeSelection(current: string[], cardId: string): string[] {
  return current.includes(cardId)
    ? current.filter(id => id !== cardId)
    : current.length < 5 ? [...current, cardId] : current;
}
