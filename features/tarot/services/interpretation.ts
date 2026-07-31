import {
  TAROT_CATEGORY_LABELS,
  TAROT_FIXED_DISCLAIMER,
  type TarotInterpretationInput,
  type TarotInterpretationOutput,
} from '@/features/tarot/types';

const CATEGORY_LENSES: Record<TarotInterpretationInput['category'], string> = {
  love: '感情裡的互動、期待、界線與真實需要',
  career: '工作中的角色定位、機會與可控行動',
  finance: '資源配置、風險感與現實安排',
  business: '合作條件、信任基礎與推進節奏',
  family: '家庭責任、親情界線與溝通方式',
  social: '人際互動、信任感與彼此界線',
  study: '學習策略、準備方式與專注配置',
  decision: '選項背後的代價、風險與內在優先順序',
  project: '計畫條件、阻礙與適合推進的時機',
  obstacle: '反覆卡住的原因與目前需要調整的位置',
  growth: '自我理解、習慣模式與需要練習的能力',
  near_future: '近期趨勢、能量分配與下一步方向',
  custom: '你提出的具體情境與真正想釐清的核心',
};

const ACTIONS: Record<TarotInterpretationInput['category'], string> = {
  love: '今天先寫下你最想被理解的一句話，再決定是否用平穩語氣和對方確認。',
  career: '把目前工作問題拆成三個可控事項，先完成最小、最明確的一項。',
  finance: '列出一筆可調整的支出或資源安排，先做低風險的小修正。',
  business: '先列出合作中還沒說清楚的條件，挑一項最重要的去確認。',
  family: '選一個不帶責備的句子，向相關的人確認彼此真正需要的是什麼。',
  social: '回想最近一次互動，寫下你需要保留的界線與可以釋出的善意。',
  study: '把準備內容分成會、半會、不會三欄，今天只處理一個最需要補強的小題。',
  decision: '列出每個選項的最低成本測試方式，不急著一次押上全部資源。',
  project: '把計畫拆成條件、阻礙、下一步三欄，先補上最關鍵的一個條件。',
  obstacle: '寫下目前卡住的三個原因，圈出唯一一個今天能調整的原因。',
  growth: '留 10 分鐘記錄你的感受、念頭與身體狀態，只做觀察不急著評分。',
  near_future: '先安排一個未來 7 天內能完成的小行動，用結果觀察方向是否合適。',
  custom: '把問題拆成「我知道的事」「我猜測的事」「我下一步能做的事」三欄。',
};

export function generateTarotInterpretation(input: TarotInterpretationInput): TarotInterpretationOutput {
  const categoryLabel = TAROT_CATEGORY_LABELS[input.category];
  const orientationLabel = input.orientation === 'upright' ? '正位' : '逆位';
  const keywordText = input.keywords.slice(0, 5).join('、');
  const question = input.question.trim();

  if (!question) {
    throw new Error('缺少塔羅問題，暫時無法產生解讀。');
  }

  return {
    summary: `${input.cardName}${orientationLabel}帶出的核心是「${keywordText}」。${input.baseMeaning} 這張牌可能提醒你，先把注意力放在可觀察、可調整的部分。`,
    questionConnection: `以「${categoryLabel}」來看，你問的是「${question}」。這不代表固定結果，而是一種觀察角度：目前值得思考的是${CATEGORY_LENSES[input.category]}，以及你是否正在把焦點放在真正能推動改變的位置。`,
    reflectionQuestion: input.reflectionPrompt,
    actionSuggestion: ACTIONS[input.category],
    disclaimer: TAROT_FIXED_DISCLAIMER,
  };
}
