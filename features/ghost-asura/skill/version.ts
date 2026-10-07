/**
 * 鬼魅阿修羅 Skill 母版版本與變更紀錄。
 * 回滾：把 ASURA_SKILL_VERSION 指回前一版並還原 seeds.ts／charGlossary.ts 同版內容（git revert 該版提交即可）。
 */
export const ASURA_SKILL_VERSION = 'ASURA_SKILL_V1.0';

export const ASURA_SKILL_CHANGELOG: ReadonlyArray<{ version: string; date: string; note: string }> = [
  {
    version: 'ASURA_SKILL_V1.0',
    date: '2026-10-07',
    note: '建立以 asuraId（＝後端規則編號）為唯一索引的 Skill 母版：65 筆完整條目、字義詞庫、解析器、驗證、覆蓋率稽核；'
      + '話術改以編號查找，不再用顯示名稱當索引。',
  },
];
