/**
 * 易經姓名學：五格（天格、人格、地格、外格、總格）數理話術與五行連線
 * ============================================================================
 *
 * 後端運算、前端只顯示：每一句話、每一條連線、來源說明都在這裡算好，前端只照印。
 *
 * 來源與公信力（業主定案：凡有「易經」兩個字都要有來源）：
 *   - 登記：docs/技能戰鬥檔案/易經/來源登記.json 的 C-NAMEOLOGY-GRIDS
 *   - 狀態：由 lib/iching-source-gate.ts 的 evaluateClaim 算，這裡不手填 VERIFIED
 *   - 資料：data/nameology-81-numbers.json（本站依流派意象的白話改寫，不是古籍原文）
 *
 * 數字五行採姓名學慣用「1·2木、3·4火、5·6土、7·8金、9·0水」，
 * 與河圖「一六水、二七火…」是兩套不同配法，彼此不互為來源（與 nameology-engine 的 elementFromNumber 一致，測試會核對）。
 */
import numbersData from '../data/nameology-81-numbers.json';
import registryData from '../docs/技能戰鬥檔案/易經/來源登記.json';
import { evaluateClaim, indexSources, type SourceRegistry } from './iching-source-gate';
import { deriveNameologyTotalBeast } from './nameology-total-beast';

export type GridElement = '木' | '火' | '土' | '金' | '水';
export type GridKey = 'sky' | 'person' | 'earth' | 'outer' | 'total';

export const GRID_ELEMENT_ORDER: readonly GridElement[] = ['木', '火', '土', '金', '水'];
const GENERATES: Record<GridElement, GridElement> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<GridElement, GridElement> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

interface NumberEntry { n: number; keyword: string; reading: string; caution: string }
const NUMBERS = (numbersData as { numbers: NumberEntry[] }).numbers;

export interface GridInput { key: GridKey; label: string; value: number }

export interface NameologyGridReading {
  key: GridKey;
  label: string;
  /** 實際算出的筆畫數 */
  value: number;
  /** 查表用的數理（超過 81 取餘數，1–81） */
  numberUsed: number;
  /** 有沒有因超過 81 而換算 */
  wrapped: boolean;
  element: GridElement;
  keyword: string;
  reading: string;
  caution: string;
  /** 整句說明（後端組好，前端照印） */
  headline: string;
  wrapNote: string | null;
  /** 星宿神獸（沿用總格神獸規則：五行定同元素四宿，再以各字筆畫順序固定選一隻；不使用亂數） */
  beast: { id: number; name: string; imageUrl: string; direction: string; meaning: string };
}

export interface NameologyLinkageEdge {
  from: GridElement;
  to: GridElement;
  kind: '生' | '剋';
  /** 兩端五行都有出現在這個名字的五格裡 */
  active: boolean;
  /** 是三才（天→人、人→地）實際走的那一條，值為「天→人」或「人→地」 */
  chainRole: string | null;
}

export interface NameologyLinkageChainStep {
  from: { label: string; element: GridElement; value: number };
  to: { label: string; element: GridElement; value: number };
  relation: '比和' | '上生下' | '下生上' | '上剋下' | '下剋上';
  text: string;
}

export interface NameologyGridLinkage {
  nodes: { element: GridElement; grids: { key: GridKey; label: string; value: number }[]; present: boolean }[];
  edges: NameologyLinkageEdge[];
  chain: NameologyLinkageChainStep[];
  summary: string;
  legend: { generate: string; control: string; chain: string };
}

export interface NameologyGridCredibility {
  /** 閘門算出的狀態 */
  status: 'VERIFIED' | 'CONFLICT' | 'PENDING_POOL';
  headline: string;
  lines: string[];
  sources: { id: string; label: string; citation: string; trust: 'A' | 'B' | 'C' | 'D' }[];
}

export interface NameologyGridStudy {
  ruleVersion: 'nameology-grid-study-v1';
  readings: NameologyGridReading[];
  linkage: NameologyGridLinkage;
  credibility: NameologyGridCredibility;
}

/** 與 nameology-engine 的 elementFromNumber 相同；獨立寫一份，測試核對兩者一致。 */
export function elementOfNumber(value: number): GridElement {
  const tail = Math.abs(value) % 10;
  if (tail === 1 || tail === 2) return '木';
  if (tail === 3 || tail === 4) return '火';
  if (tail === 5 || tail === 6) return '土';
  if (tail === 7 || tail === 8) return '金';
  return '水';
}

/** 數理只到 81：超過 81 減 80 取餘（81 之後從 1 再起）。 */
export function normalizeGridNumber(value: number): { numberUsed: number; wrapped: boolean } {
  const safe = Math.max(1, Math.round(value));
  if (safe <= 81) return { numberUsed: safe, wrapped: false };
  return { numberUsed: ((safe - 1) % 80) + 1, wrapped: true };
}

export function numberEntryFor(numberUsed: number): NumberEntry {
  return NUMBERS[numberUsed - 1];
}

export function buildGridReadings(grids: GridInput[], characterStrokes: number[] = []): NameologyGridReading[] {
  // 總格先選，確保與「姓名總格神獸」卡是同一隻；其餘格同五行時順位往後，避免五張卡同一隻神獸。
  const used: number[] = [];
  const beastByKey = new Map<GridKey, ReturnType<typeof deriveNameologyTotalBeast>>();
  const priority = [...grids].sort((a, b) => (a.key === 'total' ? -1 : 0) - (b.key === 'total' ? -1 : 0));
  for (const grid of priority) {
    const picked = deriveNameologyTotalBeast({ value: grid.value, element: elementOfNumber(grid.value) }, characterStrokes, used);
    used.push(picked.beast.id);
    beastByKey.set(grid.key, picked);
  }
  return grids.map((grid) => {
    const { numberUsed, wrapped } = normalizeGridNumber(grid.value);
    const entry = numberEntryFor(numberUsed);
    const element = elementOfNumber(grid.value);
    const picked = beastByKey.get(grid.key) as ReturnType<typeof deriveNameologyTotalBeast>;
    return {
      key: grid.key,
      label: grid.label,
      value: grid.value,
      numberUsed,
      wrapped,
      element,
      keyword: entry.keyword,
      reading: entry.reading,
      caution: entry.caution,
      headline: `${grid.label}${grid.value}畫，五行屬${element}，意象為「${entry.keyword}」。`,
      wrapNote: wrapped ? `${grid.value}畫超過 81，依數理慣例減 80 取 ${numberUsed} 來看。` : null,
      beast: {
        id: picked.beast.id,
        name: picked.beast.name,
        imageUrl: `/star-beasts/adult-divine-v2/${String(picked.beast.id).padStart(2, "0")}.png`,
        direction: picked.direction,
        meaning: picked.beast.coreMeaning,
      },
    };
  });
}

function relationOf(from: GridElement, to: GridElement): NameologyLinkageChainStep['relation'] {
  if (from === to) return '比和';
  if (GENERATES[from] === to) return '上生下';
  if (GENERATES[to] === from) return '下生上';
  if (CONTROLS[from] === to) return '上剋下';
  return '下剋上';
}

function relationText(fromLabel: string, from: GridElement, toLabel: string, to: GridElement, relation: NameologyLinkageChainStep['relation']): string {
  const head = `${fromLabel}（${from}）→${toLabel}（${to}）：`;
  switch (relation) {
    case '比和': return `${head}同屬${from}，彼此呼應，力量集中、風格一致。`;
    case '上生下': return `${head}${from}生${to}，前一格滋養後一格，力量順著往下傳，推進順暢。`;
    case '下生上': return `${head}${to}生${from}，後一格回補前一格，付出多、回收慢，要留意體力與資源。`;
    case '上剋下': return `${head}${from}剋${to}，前一格壓過後一格，帶來要求與張力，也能磨出紀律。`;
    default: return `${head}${to}剋${from}，後一格牽制前一格，想法與條件容易拉扯，需要多協調。`;
  }
}

/** 先生後剋的固定十條邊（五行相生、相剋次序；原典：《春秋繁露》〈五行相生〉〈五行相勝〉）。 */
function staticEdges(): { from: GridElement; to: GridElement; kind: '生' | '剋' }[] {
  return [
    ...GRID_ELEMENT_ORDER.map((el) => ({ from: el, to: GENERATES[el], kind: '生' as const })),
    ...GRID_ELEMENT_ORDER.map((el) => ({ from: el, to: CONTROLS[el], kind: '剋' as const })),
  ];
}

export function buildGridLinkage(grids: GridInput[]): NameologyGridLinkage {
  const withElement = grids.map((g) => ({ ...g, element: elementOfNumber(g.value) }));
  const find = (key: GridKey) => withElement.find((g) => g.key === key);
  const sky = find('sky');
  const person = find('person');
  const earth = find('earth');

  const chain: NameologyLinkageChainStep[] = [];
  const pairs: [typeof sky, typeof person, string][] = [[sky, person, '天→人'], [person, earth, '人→地']];
  const chainRoles = new Map<string, string>();
  for (const [a, b, role] of pairs) {
    if (!a || !b) continue;
    const relation = relationOf(a.element, b.element);
    chain.push({
      from: { label: a.label, element: a.element, value: a.value },
      to: { label: b.label, element: b.element, value: b.value },
      relation,
      text: relationText(a.label, a.element, b.label, b.element, relation),
    });
    if (relation === '上生下') chainRoles.set(`${a.element}>${b.element}>生`, role);
    if (relation === '下生上') chainRoles.set(`${b.element}>${a.element}>生`, role);
    if (relation === '上剋下') chainRoles.set(`${a.element}>${b.element}>剋`, role);
    if (relation === '下剋上') chainRoles.set(`${b.element}>${a.element}>剋`, role);
  }

  const present = new Set(withElement.map((g) => g.element));
  const edges: NameologyLinkageEdge[] = staticEdges().map((edge) => ({
    ...edge,
    active: present.has(edge.from) && present.has(edge.to),
    chainRole: chainRoles.get(`${edge.from}>${edge.to}>${edge.kind}`) ?? null,
  }));

  const nodes = GRID_ELEMENT_ORDER.map((element) => ({
    element,
    present: present.has(element),
    grids: withElement.filter((g) => g.element === element).map((g) => ({ key: g.key, label: g.label, value: g.value })),
  }));

  const generates = chain.filter((c) => c.relation === '上生下' || c.relation === '下生上').length;
  const controls = chain.filter((c) => c.relation === '上剋下' || c.relation === '下剋上').length;
  const same = chain.filter((c) => c.relation === '比和').length;
  const summary = chain.length === 0
    ? '三才資料不足，暫無連線可看。'
    : `三才（天格、人格、地格）兩段關係：相生 ${generates} 段、相剋 ${controls} 段、比和 ${same} 段。`;

  return {
    nodes,
    edges,
    chain,
    summary,
    legend: { generate: '實線＝相生', control: '虛線＝相剋', chain: '金線＝三才實際走的一段' },
  };
}

const SOURCE_LABELS: Record<string, string> = {
  'S-KUMAZAKI-NDL-1939': '熊崎健翁《最新姓名学：開運の礎》（1939）— 日本國立國會圖書館書目紀錄',
  'S-CHUNQIU-FANLU-WUXING': '董仲舒《春秋繁露》〈五行相生〉〈五行相勝〉— 五行相生相剋次序',
  'S-SITE-NAMEOLOGY-81': '本站整理：八十一數理的特質與提醒白話改寫',
};

export function buildGridCredibility(): NameologyGridCredibility {
  const registry = registryData as unknown as SourceRegistry;
  const claim = registry.claims.find((c) => c.claim_id === 'C-NAMEOLOGY-GRIDS');
  const index = indexSources(registry);
  if (!claim) {
    return { status: 'PENDING_POOL', headline: '來源登記尚未建立，僅供自我反思參考。', lines: [], sources: [] };
  }
  const gate = evaluateClaim(claim, index);
  const sources = [...new Set([...claim.authority_files, ...claim.cross_references])]
    .map((id) => index[id])
    .filter(Boolean)
    .map((s) => ({ id: s.source_id, label: SOURCE_LABELS[s.source_id] ?? s.author, citation: s.locator, trust: s.trust }));
  const headline = gate.status === 'VERIFIED'
    ? '已通過來源交叉比對。'
    : '來源整理中：尚未通過全部閘門，內容僅供自我反思參考。';
  const lines = [
    '五格與八十一數理屬姓名學流派的約定，不是易經經典，也不是科學已證實的預測。',
    '可追到的一手出處是熊崎健翁著作的國立國會圖書館書目紀錄；書內逐條原文尚未取得，本站話術是依流派意象的白話改寫。',
    '數字五行採姓名學慣用「1·2木、3·4火、5·6土、7·8金、9·0水」，與河圖數是兩套不同配法。',
    ...(gate.status === 'VERIFIED' ? [] : gate.reasons.slice(0, 3)),
  ];
  return { status: gate.status, headline, lines, sources };
}

export function buildGridStudy(grids: GridInput[], characterStrokes: number[] = []): NameologyGridStudy {
  return {
    ruleVersion: 'nameology-grid-study-v1',
    readings: buildGridReadings(grids, characterStrokes),
    linkage: buildGridLinkage(grids),
    credibility: buildGridCredibility(),
  };
}
