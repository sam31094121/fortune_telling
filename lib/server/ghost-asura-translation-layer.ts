/**
 * 鬼魅阿修羅 — 四張卡共用的阿修羅翻譯層（server-only，唯一模組）。規格 nature-final 第 2–5、7 條。
 *
 * 只做翻譯，不做分析：
 *   - 本性卡：輸入只有人格解析層（lib/server/ghost-asura-persona.ts）給的 PersonaEvidence[]；
 *     每筆 evidence 依 traitKey 查固定意象表 NATURE_COPY_TABLE，一筆對一句，不增不減、不改順序。
 *     意象是阿修羅自創的說法，只換說法、不換意思；不出現任何命理名稱、星名、宮名。
 *   - 過去／現在／未來三卡：版面、篩選、項目不動；既有文字（含舊「白話」欄）過同一個翻譯桶 ASURA_TERM_BUCKET。
 * 本模組不得 import 任何命理引擎（測試：tests/ghost-asura-nature-card.test.cjs）。
 * 話術規範沿用 lib/server/ghost-asura-voice.ts 檔頭五柱（好戰、傲慢、知未來但無人理解、霸氣、底氣）與 lintAsuraVoice。
 */

import 'server-only';

import { ASURA_FORBIDDEN_TERMS as ALIAS_FORBIDDEN_TERMS } from '@/lib/asura-display-alias';
import type { AsuraDisplay, AsuraDisplaySection } from '@/lib/ghost-asura-display-contract';
import {
  NATURE_CARD_VERSION,
  type AsuraImageEntry,
  type AsuraNatureCardPublic,
  type AsuraNatureCardServer,
  type PersonaEvidence,
} from '@/lib/ghost-asura-nature-contract';

export const ASURA_TRANSLATION_LAYER = 'ghost-asura-translation/v1' as const;
export const NATURE_TITLE = '本性';

/* ───────────────────────── 禁用詞 ───────────────────────── */

/** 紫微斗數名稱全表（星名、宮名、四化、亮度、煞星），規格第 22 條。 */
export const ZIWEI_TERMS: readonly string[] = [
  '紫微', '紫薇', '紫微斗數',
  '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
  '天刑', '天姚', '解神', '天巫', '天月', '陰煞', '台輔', '封誥', '三台', '八座', '恩光', '天貴', '龍池', '鳳閣',
  '天才', '天壽', '天哭', '天虛', '紅鸞', '天喜', '孤辰', '寡宿', '蜚廉', '破碎', '華蓋', '咸池', '天德', '月德',
  '天空', '截路', '旬空', '天傷', '天使', '年解',
  '命宮', '身宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮', '遷移宮', '交友宮', '僕役宮', '官祿宮', '田宅宮', '福德宮', '父母宮',
  '宮位', '四化', '化祿', '化權', '化科', '化忌', '廟旺', '利陷', '入廟', '落陷', '平陷', '煞星', '主星', '星曜', '吉星', '凶星',
];

/** 規格第 7、13 條：命理通用術語。 */
const GENERAL_TERMS = ['八字', '易經', '卦', '干支', '五行', '命盤', '神煞', '四柱', '年柱', '月柱', '日柱', '時柱', '大運', '流年'] as const;

/** 四張卡前端禁用術語＝既有別名層清單（lib/asura-display-alias.ts）∪ 通用術語 ∪ 紫微名稱全表。 */
export const ASURA_CARD_FORBIDDEN_TERMS: readonly string[] = [...new Set<string>([...ALIAS_FORBIDDEN_TERMS, ...GENERAL_TERMS, ...ZIWEI_TERMS])];

export function forbiddenTermsIn(text: string, terms: readonly string[] = ASURA_CARD_FORBIDDEN_TERMS): string[] {
  return terms.filter((term) => text.includes(term));
}

/* ───────────────────────── 三卡：翻譯桶 ───────────────────────── */

/**
 * 翻譯桶：既有文案中出現的命理名稱 → 人話（固定對照，逐條列出供審查）。
 * 來源原文不改（lib/iching-shensha-teacher-readings.ts 第 144 行），只在上畫面前替換。
 */
export const ASURA_TERM_BUCKET: ReadonlyArray<readonly [from: string, to: string]> = [
  ['文昌的光', '文思的光'],
];

export function asuraTranslateLine(text: string): string;
export function asuraTranslateLine(text: string | null | undefined): string | null | undefined;
export function asuraTranslateLine(text: string | null | undefined) {
  if (typeof text !== 'string' || text === '') return text;
  let out = text;
  for (const [from, to] of ASURA_TERM_BUCKET) out = out.split(from).join(to);
  return out;
}

/** 三卡（過去／現在／未來）：只換字，不增刪項目、不改順序、不新增欄位。 */
export function asuraTranslateSection(section: AsuraDisplaySection): AsuraDisplaySection {
  const out: AsuraDisplaySection = {
    ...section,
    heading: asuraTranslateLine(section.heading),
    label: asuraTranslateLine(section.label),
    lead: asuraTranslateLine(section.lead),
    items: section.items.map((item) => ({
      ...item,
      label: asuraTranslateLine(item.label),
      text: asuraTranslateLine(item.text),
      ...(typeof item.plain === 'string' ? { plain: asuraTranslateLine(item.plain) } : {}), // 非字串（undefined）原樣由 ...item 保留
    })),
  };
  if ('narrative' in section) out.narrative = asuraTranslateLine(section.narrative);
  if ('blocks' in section) {
    out.blocks = section.blocks
      ? section.blocks.map((block) => ({
          text: asuraTranslateLine(block.text),
          plain: block.plain.map((line) => ({ label: asuraTranslateLine(line.label), plain: asuraTranslateLine(line.plain) })),
        }))
      : section.blocks;
  }
  if ('coda' in section) out.coda = asuraTranslateLine(section.coda);
  return out;
}

export function asuraTranslateDisplay(display: AsuraDisplay): AsuraDisplay {
  return { ...display, sections: display.sections.map(asuraTranslateSection) };
}

/* ───────────────────────── 本性卡：traitKey → 阿修羅意象（固定表，文案唯一來源） ─────────────────────────
 * 一個 traitKey 永遠對一句；意象是阿修羅自創說法，只換說法、不換意思（原意見人格解析層 refs）。零術語。
 * sortKey：90 空宮底色｜100–113 人格主軸｜200 才藝｜300 暗傷｜400 人前／心裡｜500 骨子。
 * kind：essence 本性｜strength 優勢｜weakness 弱點｜risk 風險（四段）。 */
export const ASURA_IMAGE_TABLE: ReadonlyArray<AsuraImageEntry> = [
  // 空宮底色（使用者提供 2026-10-09 13:02）
  { traitKey: 'NATURE.OPEN', kind: 'essence', sortKey: 90, text: '你這塊地，還沒人插過旗。插什麼旗，就長成什麼樣。什麼都容得下。什麼都做得成。' },
  // SOVEREIGN
  { traitKey: 'NATURE.SOVEREIGN', kind: 'essence', sortKey: 100, text: '你是陣心那面旗。位置和尊嚴，寸步不讓。' },
  { traitKey: 'STRENGTH.SOVEREIGN', kind: 'strength', sortKey: 100, text: '你一站出來，全局歸你管。標準由你立，人自然服。' },
  { traitKey: 'WEAKNESS.SOVEREIGN.OVERCONTROL', kind: 'weakness', sortKey: 100, text: '規矩你拉得太死。不照你規矩走的，你吞不下。' },
  { traitKey: 'RISK.SOVEREIGN.PRESSURE', kind: 'risk', sortKey: 100, text: '壓力一來，你沉下去。話，越來越少。' },
  // STRATEGIST
  { traitKey: 'NATURE.STRATEGIST', kind: 'essence', sortKey: 101, text: '你腦中擺著一盤棋。下一步，早算好了。' },
  { traitKey: 'STRENGTH.STRATEGIST', kind: 'strength', sortKey: 101, text: '你腦子轉得快。別人剛起步，你已看到第三步。' },
  { traitKey: 'WEAKNESS.STRATEGIST.OVERTHINK', kind: 'weakness', sortKey: 101, text: '棋算得太多，子遲遲不落。' },
  { traitKey: 'RISK.STRATEGIST.PRESSURE', kind: 'risk', sortKey: 101, text: '壓力一來，你話變多。腦子轉得更快。' },
  // TORCHBEARER
  { traitKey: 'NATURE.TORCHBEARER', kind: 'essence', sortKey: 102, text: '你是陣前那把火。事你扛，人你照。' },
  { traitKey: 'STRENGTH.TORCHBEARER', kind: 'strength', sortKey: 102, text: '你火足，扛得起事，帶得動人。' },
  { traitKey: 'WEAKNESS.TORCHBEARER.BURNOUT', kind: 'weakness', sortKey: 102, text: '照遍了別人，自己的油先燒乾。' },
  { traitKey: 'RISK.TORCHBEARER.PRESSURE', kind: 'risk', sortKey: 102, text: '壓力越大，你燒得越亮。反倒更去顧別人。' },
  // EXECUTOR
  { traitKey: 'NATURE.EXECUTOR', kind: 'essence', sortKey: 103, text: '你是一桿秤。只秤結果，只認效率。' },
  { traitKey: 'STRENGTH.EXECUTOR', kind: 'strength', sortKey: 103, text: '事交到你手上，就落地。成本算得清，手不軟。' },
  { traitKey: 'WEAKNESS.EXECUTOR.COLD', kind: 'weakness', sortKey: 103, text: '秤只看斤兩。過程和人情，都被你秤冷了。' },
  { traitKey: 'RISK.EXECUTOR.PRESSURE', kind: 'risk', sortKey: 103, text: '壓力一來，你下手更快更狠。眼裡只剩效率。' },
  // EASYGOING
  { traitKey: 'NATURE.EASYGOING', kind: 'essence', sortKey: 104, text: '你是一池溫水。心軟，誰都容得下。' },
  { traitKey: 'STRENGTH.EASYGOING', kind: 'strength', sortKey: 104, text: '你在哪，哪裡就鬆下來。心善，容得下人。一句反差話，僵局就破。' },
  { traitKey: 'WEAKNESS.EASYGOING.AVOID', kind: 'weakness', sortKey: 104, text: '水太溫。該起浪時，你先沉底。' },
  { traitKey: 'RISK.EASYGOING.PRESSURE', kind: 'risk', sortKey: 104, text: '壓力一來，你縮回殼裡，默默躲開。' },
  // BOUNDARY
  { traitKey: 'NATURE.BOUNDARY', kind: 'essence', sortKey: 105, text: '你手裡握著紅線。界線分明，魅力自帶。' },
  { traitKey: 'STRENGTH.BOUNDARY', kind: 'strength', sortKey: 105, text: '你一開口，人就被說動。界線清楚，場子歸你。' },
  { traitKey: 'WEAKNESS.BOUNDARY.HARSH', kind: 'weakness', sortKey: 105, text: '紅線繃太硬。話一出口就割人。' },
  { traitKey: 'RISK.BOUNDARY.PRESSURE', kind: 'risk', sortKey: 105, text: '壓力一來，你更銳，下手更狠。' },
  // KEEPER
  { traitKey: 'NATURE.KEEPER', kind: 'essence', sortKey: 106, text: '你是一座糧倉。守得住，底一直留著。' },
  { traitKey: 'STRENGTH.KEEPER', kind: 'strength', sortKey: 106, text: '你守得住。手上有糧，心裡有底。' },
  { traitKey: 'WEAKNESS.KEEPER.RIGID', kind: 'weakness', sortKey: 106, text: '倉門關太死。機會在門外走掉。' },
  { traitKey: 'RISK.KEEPER.PRESSURE', kind: 'risk', sortKey: 106, text: '壓力一來，倉門你守得更緊。' },
  // OBSERVER
  { traitKey: 'NATURE.OBSERVER', kind: 'essence', sortKey: 107, text: '你是夜裡那盞燈。心細，看得深。' },
  { traitKey: 'STRENGTH.OBSERVER', kind: 'strength', sortKey: 107, text: '別人漏掉的細處，你一眼看穿。想得也深。' },
  { traitKey: 'WEAKNESS.OBSERVER.BROOD', kind: 'weakness', sortKey: 107, text: '燈只照自己。想多了，悶著耗。' },
  { traitKey: 'RISK.OBSERVER.PRESSURE', kind: 'risk', sortKey: 107, text: '壓力一來，你往裡縮。自己耗自己。' },
  // SEEKER
  { traitKey: 'NATURE.SEEKER', kind: 'essence', sortKey: 108, text: '你是出獵的狼。要得多，愛闖。人緣，從不缺。' },
  { traitKey: 'STRENGTH.SEEKER', kind: 'strength', sortKey: 108, text: '你走到哪都吃得開。想要的，伸手就拿。' },
  { traitKey: 'WEAKNESS.SEEKER.IMPULSE', kind: 'weakness', sortKey: 108, text: '獵物太多，挑到手軟。一衝就咬。' },
  { traitKey: 'RISK.SEEKER.PRESSURE', kind: 'risk', sortKey: 108, text: '壓力一來，你更躁。拚命找出口。' },
  // QUESTIONER
  { traitKey: 'NATURE.QUESTIONER', kind: 'essence', sortKey: 109, text: '你嘴裡藏刀。凡事拆開，問到底。' },
  { traitKey: 'STRENGTH.QUESTIONER', kind: 'strength', sortKey: 109, text: '你邏輯硬，話講得透，不信邪。假的騙不過你。' },
  { traitKey: 'WEAKNESS.QUESTIONER.SHARP', kind: 'weakness', sortKey: 109, text: '你嘴太利，一句就割傷人。誰的話，你都先打折。' },
  { traitKey: 'RISK.QUESTIONER.QUARREL', kind: 'risk', sortKey: 109, text: '話鋒一碰，就起口角。' },
  { traitKey: 'RISK.QUESTIONER.SPEAK_BEFORE_CONFIRM', kind: 'risk', sortKey: 109, text: '刀還沒看清靶，就先出鞘。事沒確認，話先出口。' },
  // MEDIATOR
  { traitKey: 'NATURE.MEDIATOR', kind: 'essence', sortKey: 110, text: '你是桌上那枚印。懂場面，講公平，會協調。' },
  { traitKey: 'STRENGTH.MEDIATOR', kind: 'strength', sortKey: 110, text: '再亂的場子，你都擺得平。人人信你公道。' },
  { traitKey: 'WEAKNESS.MEDIATOR.PLEASE', kind: 'weakness', sortKey: 110, text: '印蓋得太圓。忍到連立場都沒了。' },
  { traitKey: 'RISK.MEDIATOR.PRESSURE', kind: 'risk', sortKey: 110, text: '壓力一來，你更謹慎。心思全花在圓場面。' },
  // GUARDIAN
  { traitKey: 'NATURE.GUARDIAN', kind: 'essence', sortKey: 111, text: '你是一根老梁。有原則，看得遠，人靠你護著。' },
  { traitKey: 'STRENGTH.GUARDIAN', kind: 'strength', sortKey: 111, text: '你看得遠，判得準。身邊的人，靠你撐著。' },
  { traitKey: 'WEAKNESS.GUARDIAN.OVERMANAGE', kind: 'weakness', sortKey: 111, text: '梁撐得太寬。管太多，話也說太重。' },
  { traitKey: 'RISK.GUARDIAN.PRESSURE', kind: 'risk', sortKey: 111, text: '壓力一來，你更沉。責任全往自己身上攬。' },
  // VANGUARD
  { traitKey: 'NATURE.DECIDER', kind: 'essence', sortKey: 112, text: '你是握令旗的將。拍板做主，天生就是。' },
  { traitKey: 'NATURE.VANGUARD', kind: 'essence', sortKey: 112, text: '你是先鋒那把刀。敢衝，敢扛，出手就快。' },
  { traitKey: 'STRENGTH.VANGUARD', kind: 'strength', sortKey: 112, text: '你拍板快，扛得住。說衝，就衝。' },
  { traitKey: 'WEAKNESS.VANGUARD.RASH', kind: 'weakness', sortKey: 112, text: '刀出得太快。沒想清楚，人已衝出去。' },
  { traitKey: 'RISK.VANGUARD.PRESSURE', kind: 'risk', sortKey: 112, text: '壓力一來，你馬上動手，又快又狠。' },
  // BREAKER
  { traitKey: 'NATURE.BREAKER', kind: 'essence', sortKey: 113, text: '你是拆城的錘。舊局看不慣，就拆。' },
  { traitKey: 'STRENGTH.BREAKER', kind: 'strength', sortKey: 113, text: '死局到你手上，你撕開一條新路。' },
  { traitKey: 'WEAKNESS.BREAKER.NO_BUILD', kind: 'weakness', sortKey: 113, text: '錘落得太勤。舊城倒了，新城沒起。' },
  { traitKey: 'RISK.BREAKER.PRESSURE', kind: 'risk', sortKey: 113, text: '壓力一來，你更反骨，拆得更兇。' },
  { traitKey: 'RISK.BREAKER.CANNOT_BUILD', kind: 'risk', sortKey: 113, text: '錘拆得動城，砌不起牆。一要建，處處卡。' },
  // 才藝／暗傷／骨子（易經只供措辭，不設特質）
  // 13:24 命宮四化（原意見 persona PERSONA_TRANSFORMATIONS）
  { traitKey: 'NATURE.MARK.FLOW', kind: 'essence', sortKey: 150, text: '你走到哪，資源跟到哪。人緣，也跟著來。' },
  { traitKey: 'NATURE.MARK.COMMAND', kind: 'essence', sortKey: 151, text: '擔子越給越重。拍板的權，落在你手上。' },
  { traitKey: 'NATURE.MARK.SEEN', kind: 'essence', sortKey: 152, text: '你做成的事，擺在明處。名聲反過來護著你。' },
  { traitKey: 'WEAKNESS.MARK.KNOT', kind: 'weakness', sortKey: 153, text: '你心裡有個結，放不下。那是你要補的缺口。' },
  { traitKey: 'NATURE.SCRIBE', kind: 'essence', sortKey: 200, text: '你袖裡藏著一支筆。開口落字，條理分明。' },
  { traitKey: 'NATURE.ARTIST', kind: 'essence', sortKey: 201, text: '你身上帶著琴音。有才氣，懂美，會說話。' },
  { traitKey: 'RISK.CLASH', kind: 'risk', sortKey: 300, text: '你腰間掛著刀。遇事，硬碰硬。' },
  { traitKey: 'RISK.DRAG', kind: 'risk', sortKey: 301, text: '你腳下纏著藤。事一拖，越纏越緊。' },
  { traitKey: 'RISK.TEMPER', kind: 'risk', sortKey: 302, text: '你胸口埋著火藥。火氣一點就著。' },
  { traitKey: 'RISK.SMOLDER', kind: 'risk', sortKey: 303, text: '你心裡懸著暗鈴。焦躁暗響，悶著不說。' },
  { traitKey: 'RISK.DRIFT', kind: 'risk', sortKey: 304, text: '你踩在雲上。想得遠，落地時空轉。' },
  { traitKey: 'RISK.LEAK', kind: 'risk', sortKey: 305, text: '你袋口破了洞。手上的東西，容易被分走。' },
];

/**
 * 13:39 使用者定稿文案（逐字，依命宮主星組合套用；只在後端翻譯層，元件不寫死）。
 * 觸發：本性證據同時含 武曲（NATURE.EXECUTOR）與 七殺（NATURE.DECIDER 或 NATURE.VANGUARD）。
 * 套用時四段改用此文案；evidence（武曲／七殺／化科等 refs）、natureKey、riskKeys 全部照舊保留。
 * 風險句取代 ASURA_UNIVERSAL_RISK（僅此組合；其他盤仍用通用句）。
 * 這些句子為使用者原句，超過話術 lint 單句 16 字上限，測試明列為使用者提供例外。
 */
export interface AsuraUserComboCopy {
  id: string;
  requiresAll: ReadonlyArray<ReadonlyArray<string>>; // 每組至少命中一個 traitKey
  stars: string;                                      // 後端註記：對應命宮主星
  source: string;
  essence: string;
  strength: string;
  weakness: string;
  risk: string;
  /** 本性句對應的星曜原意出處（後端註記） */
  essenceRefs: ReadonlyArray<string>;
}
export const ASURA_USER_COMBO_COPY: ReadonlyArray<AsuraUserComboCopy> = [
  {
    id: 'COMBO.EXECUTOR_DECIDER',
    requiresAll: [['NATURE.EXECUTOR'], ['NATURE.DECIDER', 'NATURE.VANGUARD']],
    stars: '武曲＋七殺（命宮雙主星）',
    source: '使用者提供 2026-10-09 13:39（武曲＋七殺 命宮組合定稿，逐字；本性依 13:41 使用者改定版）',
    // 13:40 使用者決定：去掉「命宮雙星」，兩顆星用意象帶出、不點名（武曲 coreDrive＝秤／結果效率；七殺強＝令旗／拍板做主）
    // 13:39 原句（僅留註解）：你向來都是硬骨加殺氣，不繞彎，命宮雙星，你的底色就是這樣。
    // 13:41 使用者改定：七殺殺氣加重＝戰場最前面的將軍（13:40 版「一手是令旗，你拍板，旁人照走」已替換）
    essence: '你向來都是硬骨加殺氣，不繞彎。兩股力在你身上：一手是秤，只秤結果，只秤效率；一手是戰旗，你走在最前面，軍隊跟著你衝。這就是你的底色。',
    essenceRefs: ['lib/asura/ziwei-personality-registry.ts:92 WUQU.coreDrive「效率、結果、資源、紀律、執行」', '使用者提供 2026-10-09 七殺（強）「老闆命、決策者」', 'lib/asura/ziwei-personality-registry.ts:263 QISHA.coreDrive「決斷、衝鋒、承擔、突破、快速行動」', '使用者提供 2026-10-09 13:41 七殺意象「戰場最前面的將軍」'],
    strength: '你不吃軟，不吃轟，你只認實力和結果。',
    weakness: '別指望誰來救場，你的路是你自己殺出來的，靠人不如靠自己，這點你比誰都清楚。習慣自己殺出來，不輕易交背，什麼都自己扛，避風得太緊。',
    risk: '記住，一旦你開始猶豫和退讓，你就把自己磨鈍了。別怕得罪人，該硬就硬到底。',
  },
];
export function asuraUserComboFor(evidence: PersonaEvidence[]): AsuraUserComboCopy | null {
  const keys = new Set(evidence.filter((e) => e.kind === 'essence' && e.axis === 'lifePalace' && e.listedOnly !== true && e.material !== true).map((e) => e.traitKey));
  return ASURA_USER_COMBO_COPY.find((c) => c.requiresAll.every((group) => group.some((k) => keys.has(k)))) ?? null;
}

/**
 * 13:32 使用者指定：風險段一律用此句（通用、逐字、不改字）。
 * 原為天同＋天梁那張盤寫的句子；使用者 13:32 指定給 曾威艷，並要求所有盤通用。
 * 只在有風險證據時套用（無證據仍留空）。要還原成「依各星風險意象」：把 enabled 改成 false 即可（後端 riskKeys／evidence 不受影響）。
 * 單句 38 字，超過話術 lint 單句 16 字上限；為使用者原句，測試明列例外。
 */
export const ASURA_UNIVERSAL_RISK = {
  enabled: true,
  text: '壓力一來，會先縮回去，不聲不響地撐著，可真正該扛的責任，你最後還是會往自己身上攬。',
  source: '使用者提供 2026-10-09 13:16／13:32（逐字；13:32 起所有盤通用）',
} as const;

/**
 * 合併風險句（2026-10-09 13:16 使用者提供原句，逐字，不改字）：
 * 同一張盤同時有「天同 stressResponse」＋「天梁 stressResponse」兩條風險證據時，
 * 兩句合成一句。兩條星曜證據原樣保留在 evidence（只存後端）；前台只見合併句。
 * 決定性：只看 traitKey 是否同時出現，位置取兩者中較前者。
 * 註：此句為使用者原句，整句 38 字，超過話術 lint 單句 16 字上限；依「使用者原句逐字」保留，lint 例外於測試中明列。
 */
export interface AsuraCombinedRisk {
  comboKey: string;
  parts: readonly string[];
  text: string;
  source: string;
  userVerbatim: true;
}
export const ASURA_COMBINED_RISKS: ReadonlyArray<AsuraCombinedRisk> = [
  {
    comboKey: 'RISK.EASYGOING_GUARDIAN.PRESSURE',
    parts: ['RISK.EASYGOING.PRESSURE', 'RISK.GUARDIAN.PRESSURE'],
    text: '壓力一來，會先縮回去，不聲不響地撐著，可真正該扛的責任，你最後還是會往自己身上攬。',
    source: '使用者提供 2026-10-09 13:16（天同＋天梁 stressResponse 合併句，逐字）',
    userVerbatim: true,
  },
];
const COMBINED_RISK_IMAGES: AsuraImageEntry[] = ASURA_COMBINED_RISKS.map((c) => ({
  traitKey: c.comboKey,
  kind: 'risk',
  sortKey: Math.min(...c.parts.map((k) => ASURA_IMAGE_TABLE.find((e) => e.traitKey === k)?.sortKey ?? 999)),
  text: c.text,
}));
const IMAGE_BY_KEY = new Map([...ASURA_IMAGE_TABLE, ...COMBINED_RISK_IMAGES].map((entry) => [entry.traitKey, entry]));
export function asuraImageOf(traitKey: string): AsuraImageEntry | null {
  return IMAGE_BY_KEY.get(traitKey) ?? null;
}

/**
 * 契約 translateAsNature：PersonaEvidence[] → 後端完整本性卡。只翻譯：一筆 evidence 對一句意象，
 * 依意象表 sortKey 升冪（同 sortKey 保留 evidence 原順序）。查不到意象、kind 不符、缺 refs、
 * 本性為空 → 丟錯（呼叫端改回 null，不補字）；優勢／弱點／風險無證據＝空。
 * natureKey＝第一句本性的 traitKey＋強弱（例 NATURE.EXECUTOR.STRONG）；riskKeys＝各句風險 traitKey。
 */
const axisRank = (ev: PersonaEvidence) => (ev.axis === 'auxiliary' ? 1 : 0);
export function translateAsNature(evidence: PersonaEvidence[]): AsuraNatureCardServer {
  // 13:29：列出、不解讀的星只留在後端證據，不產任何文字
  // 14:23：話術素材（material）只隨證據保留，供翻譯層取用（asuraWordingMaterials），不自動成句
  const listed = evidence.filter((ev) => ev.listedOnly === true || ev.material === true);
  const lines = evidence.filter((ev) => ev.listedOnly !== true && ev.material !== true).map((ev, index) => {
    const image = asuraImageOf(ev.traitKey);
    if (!image || image.kind !== ev.kind || !Array.isArray(ev.refs) || ev.refs.length === 0) throw new Error(`ASURA_NATURE_NO_IMAGE:${ev.traitKey}`);
    return { ev, image, index };
  })
    // 13:18：命宮主軸一律在前，輔助（八字／易經）只能殿後；同軸再依 sortKey
    .sort((a, b) => axisRank(a.ev) - axisRank(b.ev) || a.image.sortKey - b.image.sortKey || a.index - b.index);
  // 同一 traitKey 只說一次（空宮借星與命宮小星可能落在同一特質）
  const seen = new Set<string>();
  const uniq = lines.filter((l) => (seen.has(l.ev.traitKey) ? false : (seen.add(l.ev.traitKey), true)));
  const of = (kind: PersonaEvidence['kind']) => uniq.filter((l) => l.ev.kind === kind);
  const essence = of('essence');
  // 13:18：本性必須由命宮主軸起頭；沒有命宮主軸句＝不成卡
  if (essence.length === 0 || essence[0].ev.axis !== 'lifePalace') throw new Error('ASURA_NATURE_INCOMPLETE');
  const join = (ls: Array<{ image: AsuraImageEntry }>) => ls.map((l) => l.image.text).join('');
  const lead = essence[0].ev;
  // 風險段：套用合併句（兩條證據都在才合併；證據本身不刪）
  let riskLines: Array<{ key: string; image: AsuraImageEntry }> = of('risk').map((l) => ({ key: l.ev.traitKey, image: l.image }));
  for (const combo of ASURA_COMBINED_RISKS) {
    const idx = combo.parts.map((k) => riskLines.findIndex((r) => r.key === k));
    if (idx.some((i) => i < 0)) continue;
    const at = Math.min(...idx);
    const image = asuraImageOf(combo.comboKey)!;
    riskLines = riskLines.flatMap((r, i) => (i === at ? [{ key: combo.comboKey, image }] : combo.parts.includes(r.key) ? [] : [r]));
  }
  const card: AsuraNatureCardServer = {
    version: NATURE_CARD_VERSION,
    title: NATURE_TITLE,
    essence: join(essence),
    // 13:32：有風險證據才給（無證據仍留空）；給的時候一律用使用者通用句
    risk: riskLines.length === 0 ? '' : ASURA_UNIVERSAL_RISK.enabled ? ASURA_UNIVERSAL_RISK.text : join(riskLines),
    natureKey: lead.strength ? `${lead.traitKey}.${lead.strength.toUpperCase()}` : lead.traitKey,
    riskKeys: riskLines.map((r) => r.key),
    evidence: [...uniq.map((l) => l.ev), ...listed],
  };
  const strength = join(of('strength'));
  const weakness = join(of('weakness'));
  if (strength) card.strength = strength;
  if (weakness) card.weakness = weakness;
  // 13:39：命中使用者定稿組合 → 四段改用定稿文案（證據照舊）
  const userCopy = asuraUserComboFor(card.evidence);
  if (userCopy) {
    card.essence = userCopy.essence;
    card.strength = userCopy.strength;
    card.weakness = userCopy.weakness;
    card.risk = userCopy.risk;
    card.userCopyId = userCopy.id;
  }
  return card;
}

/** 14:23（使用者決定 2026-10-09 14:23）：翻譯層可取用的話術素材（有出處、後端專用）；不自動成句、不進前台 */
export function asuraWordingMaterials(evidence: PersonaEvidence[]): Array<{ traitKey: string; item: string; source: string }> {
  return evidence.filter((e) => e.material === true).map((e) => ({ traitKey: e.traitKey, item: e.refs[0]?.item ?? '', source: e.refs[0]?.source ?? '' }));
}

/** 契約 toPublic：只留 version／title／essence／risk（＋有證據才給的 strength／weakness）。plain 為相容欄，本卡不給。 */
export function toPublic(card: AsuraNatureCardServer): AsuraNatureCardPublic {
  const pub: AsuraNatureCardPublic = { version: card.version, title: card.title, essence: card.essence, risk: card.risk };
  if (card.strength) pub.strength = card.strength;
  if (card.weakness) pub.weakness = card.weakness;
  return pub;
}

/**
 * 四張卡串連（後端專用，不送瀏覽器）：本性卡置頂，接 過去／現在／未來；以 natureKey／riskKeys 串連。
 * 三卡內容不動，這裡只產出串連紀錄，供日後三卡依 natureKey／riskKeys 取用。
 */
export const ASURA_STORY_ORDER = ['nature', 'hits', 'pillars', 'verdict'] as const;
export interface AsuraStoryLink {
  natureKey: string;
  riskKeys: string[];
  cards: Array<{ key: (typeof ASURA_STORY_ORDER)[number]; heading: string; layer: typeof ASURA_TRANSLATION_LAYER }>;
}
export function linkFourCards(card: AsuraNatureCardServer | null, display: Pick<AsuraDisplay, 'sections'>): AsuraStoryLink | null {
  if (!card) return null;
  const heading = (key: string) => display.sections.find((s) => s.key === key)?.heading ?? '';
  return {
    natureKey: card.natureKey,
    riskKeys: [...card.riskKeys],
    cards: ASURA_STORY_ORDER.map((key) => ({ key, heading: key === 'nature' ? card.title : heading(key), layer: ASURA_TRANSLATION_LAYER })),
  };
}

/**
 * 三卡接本性（13:06／13:10）：同一翻譯層、同一份本性卡證據，給 過去／現在／未來 各加一句「故事線」（新增選填欄 story，只增不改）。
 * 過去＝natureKey 那句本性；現在＝第一句優勢（無則第二句本性）；未來＝riskKeys 第一句風險。只取意象表既有句子，不新增意思。
 * 三卡原有欄位、項目、篩選、排序一律不動。本性卡為 null＝不加。
 */
export const ASURA_STORY_LEAD = {
  hits: '我先說你的底。',
  pillars: '眼下你憑的是這個。',
  verdict: '往後你要防的是這個。',
} as const;

export function asuraStoryFor(card: AsuraNatureCardServer | null): Partial<Record<keyof typeof ASURA_STORY_LEAD, string>> {
  if (!card) return {};
  // 13:39：使用者定稿組合 → 三卡故事句接同一份定稿（過去＝本性、現在＝優勢、未來＝風險）
  const userCopy = card.userCopyId ? ASURA_USER_COMBO_COPY.find((c) => c.id === card.userCopyId) : undefined;
  if (userCopy) return { hits: ASURA_STORY_LEAD.hits + userCopy.essence, pillars: ASURA_STORY_LEAD.pillars + userCopy.strength, verdict: ASURA_STORY_LEAD.verdict + userCopy.risk };
  const text = (key: string | undefined) => (key ? asuraImageOf(key)?.text ?? null : null);
  // 13:18：故事線只取命宮主軸句（輔助句不進三卡）
  const main = card.evidence.filter((e) => e.axis !== 'auxiliary' && e.listedOnly !== true && e.material !== true);
  const ess = main.filter((e) => e.kind === 'essence').map((e) => e.traitKey);
  const str = main.filter((e) => e.kind === 'strength').map((e) => e.traitKey);
  const lead = ess.find((k) => card.natureKey === k || card.natureKey.startsWith(`${k}.`));
  const out: Partial<Record<keyof typeof ASURA_STORY_LEAD, string>> = {};
  const past = text(lead);
  const now = text(str[0]) ?? text(ess[1]);
  const future = card.riskKeys.length === 0 ? null : ASURA_UNIVERSAL_RISK.enabled ? ASURA_UNIVERSAL_RISK.text : text(card.riskKeys[0]);
  if (past) out.hits = ASURA_STORY_LEAD.hits + past;
  if (now) out.pillars = ASURA_STORY_LEAD.pillars + now;
  if (future) out.verdict = ASURA_STORY_LEAD.verdict + future;
  return out;
}

/** 把故事線掛到三卡（只加 story 欄；其餘欄位原封不動） */
export function asuraLinkStory(display: AsuraDisplay, card: AsuraNatureCardServer | null): AsuraDisplay {
  const story = asuraStoryFor(card);
  if (Object.keys(story).length === 0) return display;
  // 14:41：過去段草稿接在「過去」故事線之後（依覺醒印記出句；見 ASURA_PAST_DRAFT）
  const pastDraft = asuraPastDraftFor(display).text;
  if (story.hits && pastDraft) story.hits = story.hits + pastDraft;
  return {
    ...display,
    sections: display.sections.map((section) => {
      const line = story[section.key as keyof typeof ASURA_STORY_LEAD];
      return line ? { ...section, story: line } : section;
    }),
  };
}

/**
 * 過去段草稿上卡（使用者 2026-10-09 14:41 授權；只在本機）。
 * 每句都走詞典四步（技能文件〈四之二〉）：詞＋檔案:行 → 教育部《重編國語辭典修訂本》釋義＋網址 → 推論（INFERENCE）→ 阿修羅意象。
 * 規則（14:42）：詞典優先；查無或推不出意象才退回封神框架（只限盤上主星）。本段六句都查得到詞典，fallback 一律 false。
 * 出句條件：對應的本命印記在四柱清單中是「覺醒」（tone='awakened'，即已過嚴格驗證）才出；不在就不出，不補字。
 * 只接在「過去」故事線（hits）之後；本性卡為 null 時整段不加（與故事線同規則）。證據只留後端，不送瀏覽器。
 */
export interface AsuraPastDraftEvidence {
  word: string;
  wordSource: string;
  moeDefinition: string;
  moeUrl: string;
  inference: string;
  image: string;
  fallback: false;
}
export interface AsuraPastDraftLine {
  id: string;
  text: string;
  /** 需在場的本命印記（顯示名） */
  seal: string;
  source: string;
  dictionary: AsuraPastDraftEvidence[];
}
export const ASURA_PAST_DRAFT: ReadonlyArray<AsuraPastDraftLine> = [
  {
    id: 'PAST.BLADE_UNSHEATHED', text: '以前的你，刀沒入過鞘。', seal: '血刃之鋒', source: 'lib/ghost-asura-wordings-core.ts:143「刀鋒已經出鞘。」',
    dictionary: [
      { word: '刀鋒', wordSource: 'lib/ghost-asura-wordings-core.ts:143', moeDefinition: '刀刃。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=42605&la=0&powerMode=0', inference: 'INFERENCE：刀刃已出鞘＝刀在手、可用', image: '刀', fallback: false },
      { word: '鞘', wordSource: 'lib/ghost-asura-wordings-core.ts:143', moeDefinition: '刀套。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=6404&la=0&powerMode=0', inference: 'INFERENCE：刀不入刀套＝一直在手', image: '刀沒入過鞘', fallback: false },
    ],
  },
  {
    id: 'PAST.AHEAD_OF_WIND', text: '別人還在看風向，你已經站上去了。', seal: '血刃之鋒', source: 'lib/ghost-asura-wordings-core.ts:144「不是等著被激怒，而是隨時準備好一刀決出。」',
    dictionary: [
      { word: '風向', wordSource: '技能文件 6.2（草稿句）', moeDefinition: '指情勢或形勢的變化。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=37157&la=0&powerMode=0', inference: 'INFERENCE：原文「不是等著」＝不等情勢變化；看風向＝等情勢變化', image: '別人還在看風向，你已經站上去了', fallback: false },
    ],
  },
  {
    id: 'PAST.NOT_TRAPPED', text: '哪一處都困不住你。', seal: '逐界行者', source: 'lib/ghost-asura-wordings-core.ts:129「不穩定的人，往往是最難被困住的人。」',
    dictionary: [
      { word: '困住', wordSource: 'lib/ghost-asura-wordings-core.ts:129', moeDefinition: '陷在艱難的環境中，無法解脫。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=78528&la=0&powerMode=0', inference: 'INFERENCE：最難被困住＝不會陷在一處無法解脫', image: '哪一處都困不住你', fallback: false },
    ],
  },
  {
    id: 'PAST.STOPS_ARE_POSITIONS', text: '停下的地方，都是你的陣地。', seal: '逐界行者', source: 'lib/ghost-asura-wordings-core.ts:129「每一個停靠點都是一個陣地。」',
    dictionary: [
      { word: '陣地', wordSource: 'lib/ghost-asura-wordings-core.ts:129', moeDefinition: '軍隊作戰時據守的地區。通常築有工事，可攻可守。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=116815&la=0&powerMode=0', inference: 'INFERENCE：停靠點＝陣地＝據守、可攻可守之地', image: '停下的地方，都是你的陣地', fallback: false },
    ],
  },
  {
    id: 'PAST.SEE_AND_AVOID', text: '路上的暗障，你先看見，先避開。', seal: '幽辰之障', source: 'lib/ghost-asura-wordings-core.ts:92「元辰在暗處，障礙是隱性的。」；:95「先看見，才能先避開。」',
    dictionary: [
      { word: '障礙', wordSource: 'lib/ghost-asura-wordings-core.ts:92', moeDefinition: '阻礙通行的東西。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=117224&la=0&powerMode=0', inference: 'INFERENCE：原文「在暗處」＋阻礙通行的東西＝路上看不見的阻礙', image: '路上的暗障', fallback: false },
      { word: '避開', wordSource: 'lib/ghost-asura-wordings-core.ts:95', moeDefinition: '躲避、離開。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=18145&la=0&powerMode=0', inference: 'INFERENCE：先看見才能先躲避', image: '你先看見，先避開', fallback: false },
    ],
  },
  {
    id: 'PAST.BURST', text: '撐過來的，靠的是那一股爆發。', seal: '血刃之鋒', source: 'lib/ghost-asura-wordings-core.ts:144「爆發力就在邊界。」',
    dictionary: [
      { word: '爆發力', wordSource: 'lib/ghost-asura-wordings-core.ts:144', moeDefinition: '瞬間突然產生的猛烈力量。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=16360&la=0&powerMode=0', inference: 'INFERENCE：瞬間的猛烈力量＝關鍵時那一股勁', image: '那一股爆發', fallback: false },
    ],
  },
];

/** 依四柱清單「覺醒」印記挑出過去段草稿句（照 ASURA_PAST_DRAFT 順序，不改字） */
export function asuraPastDraftFor(display: Pick<AsuraDisplay, 'columns'>): { text: string; lines: AsuraPastDraftLine[] } {
  const awake = new Set((display.columns ?? []).flatMap((c) => c.seals ?? []).filter((s) => s.tone === 'awakened').map((s) => s.name));
  const lines = ASURA_PAST_DRAFT.filter((l) => awake.has(l.seal));
  return { text: lines.map((l) => l.text).join(''), lines };
}
