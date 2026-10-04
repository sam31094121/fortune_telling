/** Versioned transport contract, NOT a second calculation engine.
 * The independent list detects omissions even when a response silently shrinks.
 * Extend only together with a reviewed backend rule/version; no fixed UI count.
 */
export const ASURA_SOURCE_CONTRACT = {
  version: 'DUAL_SHENSHA_REFERENCE_CHART_V4',
  ruleIds: [
    'tiandehe', 'tiande', 'yuede', 'longde', 'tiangou', 'jinkui', 'wugui', 'zaisha', 'liue', 'muyu', 'yuepo', 'ripo',
    'jiangxing', 'yima', 'gejiao', 'yuanchen', 'yangren', 'taohua', 'waiTaohua', 'tianyi', 'wenchang', 'huagai',
    'kuigang', 'kongwang', 'jinyu', 'xuetang', 'hongyan', 'lushen', 'tianyiDoctor', 'jiesha', 'guchen', 'guasu',
    'guoyin', 'tianchu', 'tianshe', 'sanqi', 'wangshen', 'yinyangChacuo', 'guluan', 'shieDabai', 'liuxia', 'sifei',
    'yuedehe', 'feiren', 'jinshen', 'bazhuan', 'jiuchou', 'liuxiu', 'sangmen', 'baihu', 'bingfu', 'pima',
    'suipo', 'yuekong', 'jielu', 'tianzhuan', 'dizhuan', 'shiling', 'ride', 'rigui', 'panan', 'anlu',
    'jinshenDay', 'tuishen', 'gonglu',
  ],
} as const;
