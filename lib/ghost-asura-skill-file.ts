/**
 * 鬼魅阿修羅｜技能檔案（後端運算、前端顯示）
 * ============================================================================
 * 這是技能檔案「唯一的輸出」：由後端把所有內容組成固定順序的資料，
 * 前端（/ghost-asura/skill）只依這份資料的順序照印，不內建任何文字、不自己排序或挑選。
 *
 * - 內容來源：lib/ghost-asura-skill-content.ts（原樣照錄的文字資料）＋ lib/asura-display-alias.ts（技能名相、四時語彙）。
 * - 顯示前換字（術數用語不上畫面）也在這裡做，前端不再處理。
 * - 順序由 SECTION_ORDER 固定；每個區塊與每個顯示單位都有穩定編號（key），測試會擋重複與缺漏。
 * - 純函式、可序列化（JSON）、無 server-only：同一份資料給頁面與 GET /api/ghost-asura/skill-file。
 * 規格與鐵律：docs/技能戰鬥檔案/鬼魅阿修羅/技能檔案後端化.md
 * ============================================================================
 */
import { ASURA_SKILLS, ASURA_TIME_TERMS, asuraDeepScrub } from './asura-display-alias';
import * as RAW_CONTENT from './ghost-asura-skill-content';
import type { FunctionCard } from './ghost-asura-skill-content';

export const ASURA_SKILL_FILE_VERSION = 'ASURA_SKILL_FILE_V1';

/** 區塊的固定順序（前後順序只在這裡定義）。 */
export const SECTION_ORDER = [
  'mark', 'law', 'cards', 'voice', 'layers', 'count', 'terms', 'names', 'reading', 'visual', 'promise', 'scope', 'skills',
] as const;
export type SectionKey = (typeof SECTION_ORDER)[number];

type Variant = 'must' | 'deny' | 'plain';
type Col = { head: { level: 'subTitle' | 'miniHead'; text: string }; items: string[]; variant: Variant };

/** 顯示單位：前端依 type 選對應的版型，內容與順序全由後端給。 */
export type SkillBlock =
  | { type: 'eyebrow'; text: string }
  | { type: 'skillName'; text: string }
  | { type: 'command'; label: string; word: string; note: string }
  | { type: 'facts'; rows: { label: string; value: string }[] }
  | { type: 'manifesto'; lines: string[] }
  | { type: 'motto'; text: string }
  | { type: 'ironRules'; items: string[] }
  | { type: 'subTitle'; text: string }
  | { type: 'chips'; items: string[]; tone?: 'gold' | 'ember' }
  | { type: 'flow'; steps: string[] }
  | { type: 'code'; text: string }
  | { type: 'division'; rows: { layer: string; duty: string }[] }
  | { type: 'twoCol'; left: Col; right: Col }
  | { type: 'list'; items: string[]; variant: Variant }
  | { type: 'details'; summary: string; blocks: SkillBlock[] }
  | { type: 'table'; head: string[]; rows: string[][]; rowHeader: boolean }
  | { type: 'note'; text: string }
  | { type: 'sourceNote'; text: string }
  | { type: 'verdict'; text: string }
  | { type: 'liveReading'; tableLabel: string; tablePillars: string[]; specCards: FunctionCard[] | null }
  | { type: 'coreLines'; items: string[] }
  | { type: 'persona'; text: string }
  | { type: 'creed'; rows: { line: string; note: string }[] }
  | { type: 'layers'; items: { name: string; desc: string }[] }
  | { type: 'showcase'; items: { title: string; lines: string[] }[] }
  | { type: 'formula'; ariaLabel: string; separator: string; terms: string[] }
  | { type: 'pairs'; rows: [string, string][] }
  | { type: 'pillars'; rows: [string, string][] }
  | { type: 'nameGrid'; items: string[] }
  | { type: 'families'; rows: { name: string; chars: string }[] }
  | { type: 'levels'; items: { level: string; name: string; items: string[] }[] }
  | { type: 'promises'; items: { title: string; items: string[] }[] }
  | { type: 'checklist'; items: string[] }
  | { type: 'skillList'; items: { order: number; anchor: string; name: string; use: string }[] };

export interface SkillSection {
  /** 固定順序編號（從 1 起） */
  order: number;
  key: SectionKey;
  id: string;
  seal: string;
  title: string;
  lead: string;
  blocks: SkillBlock[];
}

export interface AsuraSkillFile {
  version: typeof ASURA_SKILL_FILE_VERSION;
  meta: { title: string; description: string; siteName: string; keywords: string[] };
  hero: { name: string };
  sections: SkillSection[];
  closing: { voice: string; signature: string; status: string };
}

/** 融會技能：把多套既有運算接成一條阿修羅話術（細則見 docs/技能戰鬥檔案/鬼魅阿修羅/九宮融會.md）。排在名相技能之後。 */
export const ASURA_FUSION_SKILLS = [
  { anchor: 'jiugong-ronghui', name: '九宮融會', use: '融九宮、命數與名。根、盤、合、位、名、斷，一氣貫之。' },
] as const;

/** 技能清單區塊的標題與引言（固定在最後，不動前十二區的順序）。 */
const SKILLS_HEAD = { id: 'skills', seal: '拾參', title: '技能清單', lead: '我會的，都在這張單上。' } as const;

const list = (items: string[], variant: Variant = 'plain'): SkillBlock => ({ type: 'list', items, variant });
const sub = (text: string): SkillBlock => ({ type: 'subTitle', text });
const col = (level: Col['head']['level'], text: string, items: string[], variant: Variant): Col => ({ head: { level, text }, items, variant });

export function buildAsuraSkillFile(): AsuraSkillFile {
  // 顯示前一次換字：原文不動，術數用語不上畫面（lib/asura-display-alias.ts）
  const C = asuraDeepScrub(RAW_CONTENT);
  const { BACKEND_LAW, CHECKLIST, CLOSING, COUNT_LAW, FIXED_COPY, FIXED_NAMES, NAME_FAMILIES, PILLARS_NOTE, PROMISES, READING_LEVELS, SCOPE, SECTIONS, SKILL_MARK, TERMS, TERMS_NOTE, THREE_LAYERS, FUNCTION_CARDS, USAGE_RULES, VISUAL, VOICE } = C;
  const pillarRows: [string, string][] = (['year', 'month', 'day', 'hour'] as const).map((k) => [ASURA_TIME_TERMS[k].unit, ASURA_TIME_TERMS[k].term]);

  const blocks: Record<SectionKey, SkillBlock[]> = {
    // 壹 技能印記
    mark: [
      { type: 'eyebrow', text: '技能檔案' },
      { type: 'skillName', text: SKILL_MARK.name },
      { type: 'command', label: '口令', word: `「${SKILL_MARK.command}」`, note: SKILL_MARK.commandNote },
      { type: 'facts', rows: SKILL_MARK.facts.map((f) => ({ label: f.label, value: f.value })) },
      { type: 'manifesto', lines: [...SKILL_MARK.manifesto] },
    ],
    // 貳 最高鐵律
    law: [
      { type: 'motto', text: BACKEND_LAW.motto },
      { type: 'ironRules', items: [...BACKEND_LAW.rules] },
      sub('後端維持正統'),
      { type: 'chips', items: [...BACKEND_LAW.orthodox] },
      sub('正式資料流程'),
      { type: 'flow', steps: [...BACKEND_LAW.flow] },
      { type: 'code', text: BACKEND_LAW.endpoint },
      sub('最終鎖定'),
      { type: 'division', rows: BACKEND_LAW.division.map((r) => ({ layer: r.layer, duty: r.duty })) },
      { type: 'twoCol', left: col('subTitle', '前端紅線', [...BACKEND_LAW.redLines], 'deny'), right: col('subTitle', '前端只做', [...BACKEND_LAW.allowed], 'must') },
    ],
    // 參 三張功能卡：過去／現在／未來
    cards: [
      { type: 'motto', text: FUNCTION_CARDS.rule },
      list([...FUNCTION_CARDS.shared], 'must'),
      {
        type: 'details', summary: '引自魔之卷：兩張卡，一神一魔',
        blocks: [
          { type: 'table', head: ['項目', FUNCTION_CARDS.yijunHead.a, FUNCTION_CARDS.yijunHead.b], rows: FUNCTION_CARDS.yijun.map((r) => [r.aspect, r.a, r.b]), rowHeader: true },
          { type: 'note', text: FUNCTION_CARDS.yijunBackend },
          { type: 'sourceNote', text: FUNCTION_CARDS.source },
        ],
      },
      // false＝顯示後端實盤時間軸（與卡頭三格同一份輸出）；要還原規格說明卡時，這裡改成 FUNCTION_CARDS.cards。
      { type: 'liveReading', tableLabel: FUNCTION_CARDS.tableLabel, tablePillars: [...FUNCTION_CARDS.tablePillars], specCards: null },
    ],
    // 肆 話術核心
    voice: [
      { type: 'coreLines', items: [...VOICE.core] },
      { type: 'note', text: VOICE.notFear },
      sub('目的'),
      { type: 'chips', items: [...VOICE.purpose] },
      sub('文案必須'),
      { type: 'chips', items: [...VOICE.tone], tone: 'ember' },
      { type: 'persona', text: VOICE.persona },
      { type: 'twoCol', left: col('subTitle', '必須清單', [...VOICE.must], 'must'), right: col('subTitle', '禁止清單', [...VOICE.forbidVoice], 'deny') },
      sub('規格禁止'),
      list([...VOICE.forbidSpec], 'deny'),
      sub('宣言'),
      { type: 'creed', rows: VOICE.creed.map((c) => ({ line: c.line, note: c.note })) },
    ],
    // 伍 三層話術結構
    layers: [
      { type: 'layers', items: THREE_LAYERS.map((l) => ({ name: `【${l.name}】`, desc: l.desc })) },
      sub('固定話術方向'),
      { type: 'showcase', items: FIXED_COPY.map((c) => ({ title: c.asura, lines: [...c.lines] })) },
    ],
    // 陸 數量鐵律 + 禁止隨機命名
    count: [
      { type: 'formula', ariaLabel: '數量鐵律', separator: '＝', terms: [...COUNT_LAW.formula] },
      { type: 'verdict', text: COUNT_LAW.verdict },
      { type: 'table', head: ['狀態', '後端', '轉譯', '前端', '結果'], rows: COUNT_LAW.examples.map((r) => [r.state, r.backend, r.translated, r.shown, r.result]), rowHeader: false },
      { type: 'note', text: COUNT_LAW.never },
      { type: 'note', text: COUNT_LAW.perItem },
      { type: 'note', text: COUNT_LAW.notCap },
      sub('新印延伸'),
      { type: 'flow', steps: [...COUNT_LAW.extend] },
      { type: 'note', text: COUNT_LAW.extendNote },
      sub('禁止隨機命名'),
      { type: 'note', text: '同一個原名，無論在：' },
      { type: 'chips', items: [...COUNT_LAW.stableDevices] },
      { type: 'verdict', text: COUNT_LAW.stableRule },
      list([...COUNT_LAW.mapping]),
      { type: 'motto', text: COUNT_LAW.sameInOut },
    ],
    // 柒 前端用語對照 + 柱位
    terms: [
      sub('前端用語對照'),
      { type: 'pairs', rows: TERMS.map(([a, b]) => [a, b] as [string, string]) },
      { type: 'note', text: TERMS_NOTE },
      sub('四有顯示'),
      { type: 'pillars', rows: pillarRows },
      { type: 'note', text: PILLARS_NOTE },
    ],
    // 捌 固定名稱表
    names: [
      { type: 'note', text: '工程師規格〈鬼魅阿修羅固定名稱〉逐列照錄。固定名稱不是上限。' },
      { type: 'nameGrid', items: FIXED_NAMES.map(([, asura]) => asura) },
      { type: 'details', summary: '阿修羅名稱延伸語系', blocks: [{ type: 'families', rows: NAME_FAMILIES.map((f) => ({ name: f.name, chars: f.chars })) }] },
    ],
    // 玖 四層解盤
    reading: [{ type: 'levels', items: READING_LEVELS.map((l) => ({ level: l.level, name: l.name, items: [...l.items] })) }],
    // 拾 視覺規則
    visual: [
      sub('風格'),
      { type: 'chips', items: [...VISUAL.style] },
      { type: 'verdict', text: VISUAL.noCheap },
      { type: 'twoCol', left: col('subTitle', '畫面建議', [...VISUAL.do], 'must'), right: col('subTitle', '禁止', [...VISUAL.dont], 'deny') },
      sub('卡片視覺順序'),
      { type: 'flow', steps: [...VISUAL.order] },
    ],
    // 拾壹 三大承諾
    promise: [
      { type: 'promises', items: PROMISES.map((p) => ({ title: p.title, items: [...p.items] })) },
      sub('使用規則（鐵律）'),
      { type: 'twoCol', left: col('miniHead', '允許', [...USAGE_RULES.allow], 'must'), right: col('miniHead', '禁止', [...USAGE_RULES.deny], 'deny') },
      { type: 'verdict', text: USAGE_RULES.consequence },
    ],
    // 拾參 技能清單：名相技能（依序）＋融會技能
    skills: [
      sub('名相技能'),
      { type: 'skillList', items: buildSkillList().map((s) => ({ order: s.order, anchor: s.anchor, name: s.name, use: s.use })) },
      sub('融會技能'),
      { type: 'skillList', items: ASURA_FUSION_SKILLS.map((s, i) => ({ order: ASURA_SKILLS.length + i + 1, anchor: s.anchor, name: s.name, use: s.use })) },
    ],
    // 拾貳 修改範圍 + 驗收清單
    scope: [
      { type: 'motto', text: SCOPE.top },
      { type: 'details', summary: '禁止項與防誤改', blocks: [list([...SCOPE.forbid], 'deny'), { type: 'note', text: SCOPE.isolation }, { type: 'note', text: SCOPE.regression }] },
      { type: 'details', summary: '工程師驗收清單', blocks: [{ type: 'checklist', items: [...CHECKLIST] }] },
    ],
  };

  const sections: SkillSection[] = SECTION_ORDER.map((key, index) => {
    const head = key === 'skills' ? SKILLS_HEAD : SECTIONS[key];
    return { order: index + 1, key, id: head.id, seal: head.seal, title: head.title, lead: head.lead, blocks: blocks[key] };
  });

  return {
    version: ASURA_SKILL_FILE_VERSION,
    meta: {
      title: '鬼魅阿修羅｜技能檔案',
      description: '鬼魅阿修羅檔案技能：後端算、前端顯。阿修羅的口吻、鐵律、真名錄與視覺規則。',
      siteName: '鬼魅阿修羅',
      keywords: ['鬼魅阿修羅', '阿修羅', '業鏡', '四有'],
    },
    hero: { name: '鬼魅阿修羅' },
    sections,
    closing: { voice: CLOSING.voice, signature: CLOSING.signature, status: CLOSING.status },
  };
}

/** 技能名相清單（技能清單.md 的程式來源）：固定順序，編號從 1 起。 */
export function buildSkillList() {
  return ASURA_SKILLS.map((s, i) => ({ order: i + 1, anchor: s.anchor, name: s.name, unit: s.unit, use: s.use }));
}
