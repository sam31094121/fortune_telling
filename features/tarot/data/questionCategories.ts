import type { TarotQuestionCategory } from '@/features/tarot/types';

export const tarotQuestionCategories: TarotQuestionCategory[] = [
  {
    id: 'love',
    title: '感情與關係',
    description: '整理目前的感情狀態、相處模式與下一步方向。',
    suggestedQuestions: [
      '這段關係目前最需要我注意什麼？',
      '我應該如何改善目前的相處狀態？',
      '這段關係下一步適合如何發展？',
    ],
  },
  {
    id: 'career',
    title: '工作與事業',
    description: '了解工作現況、發展機會與需要調整的地方。',
    suggestedQuestions: [
      '我目前在工作上最需要注意什麼？',
      '現階段適合繼續發展目前的工作嗎？',
      '我下一步應該加強哪個方向？',
    ],
  },
  {
    id: 'finance',
    title: '金錢與財務',
    description: '整理目前的資源、風險與財務行動方向。',
    suggestedQuestions: [
      '我目前的財務狀態最需要注意什麼？',
      '現階段應該保守，還是可以開始行動？',
      '我應該如何改善目前的資源配置？',
    ],
  },
  {
    id: 'business',
    title: '創業與合作',
    description: '了解創業、合作或商業計畫目前的發展條件。',
    suggestedQuestions: [
      '這項合作目前最需要確認什麼？',
      '這個創業方向適合繼續推進嗎？',
      '目前最大的合作風險是什麼？',
    ],
  },
  {
    id: 'family',
    title: '家庭與親情',
    description: '整理家庭關係、責任與溝通問題。',
    suggestedQuestions: [
      '目前家庭關係最需要改善的是什麼？',
      '我應該如何處理這次家庭問題？',
      '這段親情關係需要我做出什麼調整？',
    ],
  },
  {
    id: 'social',
    title: '朋友與人際',
    description: '了解人際互動、信任與界線問題。',
    suggestedQuestions: [
      '這段人際關係目前值得我注意什麼？',
      '我應該如何處理與對方的關係？',
      '目前的人際阻礙來自哪個方向？',
    ],
  },
  {
    id: 'study',
    title: '學習與考試',
    description: '整理學習狀態、準備方式與下一步策略。',
    suggestedQuestions: [
      '我目前的學習方式需要如何調整？',
      '這次考試準備最需要加強什麼？',
      '現階段我應該把重點放在哪裡？',
    ],
  },
  {
    id: 'decision',
    title: '選擇與決定',
    description: '協助整理選項、風險與目前較適合的方向。',
    suggestedQuestions: [
      '面對這個選擇，我最需要考慮什麼？',
      '目前適合立刻決定，還是先等待？',
      '哪一個方向更符合我現在的狀態？',
    ],
  },
  {
    id: 'project',
    title: '計畫能否推進',
    description: '了解計畫目前的條件、阻礙與推進時機。',
    suggestedQuestions: [
      '這項計畫目前適合繼續推進嗎？',
      '這件事情成功的關鍵是什麼？',
      '目前應該先執行，還是先補足條件？',
    ],
  },
  {
    id: 'obstacle',
    title: '當下阻礙',
    description: '找出目前停滯、反覆或無法前進的原因。',
    suggestedQuestions: [
      '目前真正阻礙我前進的是什麼？',
      '我需要先放下或調整什麼？',
      '這個問題現階段應該如何突破？',
    ],
  },
  {
    id: 'growth',
    title: '個人成長',
    description: '整理自己的狀態、能力與需要練習的方向。',
    suggestedQuestions: [
      '現階段我最需要學習的課題是什麼？',
      '我應該如何突破目前的自我限制？',
      '下一步最值得培養的能力是什麼？',
    ],
  },
  {
    id: 'near_future',
    title: '未來一段時間的方向',
    description: '觀察近期趨勢與適合採取的行動方向。',
    suggestedQuestions: [
      '未來一段時間我最需要注意什麼？',
      '近期適合積極行動，還是先穩定準備？',
      '接下來最值得投入的方向是什麼？',
    ],
  },
  {
    id: 'custom',
    title: '我有自己的問題',
    description: '輸入你真正想釐清的個人問題。',
    suggestedQuestions: [],
  },
];
