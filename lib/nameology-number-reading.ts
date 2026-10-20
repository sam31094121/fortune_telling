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
import { STATUS_WORDING } from './credibility-phrases';

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
  /** 這個格是怎麼算出來的（用這個名字實際的字與筆畫，後端組好） */
  formula: string;
  /** 這個格在流派裡代表什麼（流派說法，不是經典，也不是科學證實） */
  role: { title: string; text: string };
  /** 白話說明：這個筆畫數代表什麼（簡單說） */
  plainTalk: string;
  /** 這段話的依據：每個說法對得上哪一份來源 */
  evidence: NameologyGridEvidence[];
}

export interface NameologyGridEvidence {
  topic: string;
  basis: string;
  sourceIds: string[];
  sourceLabels: string[];
  /** 這個說法目前的來源狀態（與閘門狀態一致，不說得比閘門更滿） */
  statusLine: string;
}

export interface StrokeChar { char: string; strokes: number }

export interface NameologyStrokeConcept {
  title: string;
  paragraphs: string[];
  /** 筆畫採用哪一套、與傳統差在哪（照實說明） */
  strokeNote: string;
  characters: { char: string; strokes: number; part: '姓' | '名' }[];
  total: number;
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
  ruleVersion: 'nameology-grid-study-v2';
  /** 筆畫是什麼、這個名字的筆畫明細、本站用哪一套筆畫 */
  strokeConcept: NameologyStrokeConcept;
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

/** 五格各自代表什麼：流派說法（人格＝主運、地格＝前運、總格＝後運等通俗整理），不是經典，也不是科學證實。 */
const GRID_ROLES: Record<GridKey, { title: string; text: string }> = {
  sky: { title: '先天底色', text: '由姓氏算出，象徵家族與先天的底色；流派多把它看成不能自己改變的部分，影響比較間接。' },
  person: { title: '核心個性（主運）', text: '由姓與名的第一字相連而成，是整個名字的中心；流派常拿它看個性核心與主要的運勢。' },
  earth: { title: '基礎與前期（前運）', text: '由名字本身算出，流派常用來看成長與打基礎的階段，也牽涉與晚輩、部屬的互動。' },
  outer: { title: '外在人際（副運）', text: '用總格扣掉人格再加一，流派常用來看人際互動，以及外界帶給你的機會。' },
  total: { title: '整體與後期（後運）', text: '把全名的筆畫加總，流派常用來看整體的走向與中後期的累積。' },
};

const quote = (item: StrokeChar) => `「${item.char}」${item.strokes}畫`;

/** 用這個名字實際的字與筆畫，說明每個格是怎麼算出來的；算出來和引擎的數字不一致時回傳空字串，不硬說。 */
export function gridFormulaFor(key: GridKey, value: number, chars: StrokeChar[]): string {
  if (chars.length < 2) return '';
  const surname = chars[0];
  const given = chars.slice(1);
  const total = chars.reduce((sum, item) => sum + item.strokes, 0);
  const person = surname.strokes + given[0].strokes;
  let text = '';
  let result = 0;
  switch (key) {
    case 'sky':
      result = surname.strokes + 1;
      text = `姓${quote(surname)} ＋ 1 ＝ ${result}畫`;
      break;
    case 'person':
      result = person;
      text = `姓${quote(surname)} ＋ 名首字${quote(given[0])} ＝ ${result}畫`;
      break;
    case 'earth': {
      const sum = given.reduce((s, item) => s + item.strokes, 0);
      result = sum + (given.length === 1 ? 1 : 0);
      text = given.length === 1
        ? `名${quote(given[0])} ＋ 1（單名補 1）＝ ${result}畫`
        : `名 ${given.map(quote).join(' ＋ ')} ＝ ${result}畫`;
      break;
    }
    case 'outer': {
      const raw = total - person + 1;
      result = Math.max(2, raw);
      text = raw < 2
        ? `總格${total}畫 − 人格${person}畫 ＋ 1 ＝ ${raw}畫，外格最少取 2 畫，所以是 ${result}畫`
        : `總格${total}畫 − 人格${person}畫 ＋ 1 ＝ ${result}畫`;
      break;
    }
    default:
      result = total;
      text = `全名 ${chars.map(quote).join(' ＋ ')} ＝ ${result}畫`;
  }
  return result === value ? text : '';
}

export function buildGridEvidence(statusLine: string): NameologyGridEvidence[] {
  const item = (topic: string, basis: string, sourceIds: string[]): NameologyGridEvidence => ({
    topic, basis, sourceIds, sourceLabels: sourceIds.map((id) => SOURCE_LABELS[id] ?? id), statusLine,
  });
  return [
    item('筆畫從哪來', '每個字的筆畫採臺灣 CNS11643 全字庫的總筆畫（政府開放資料）。', ['S-CNS11643-OPENDATA']),
    item('這個格怎麼算、代表什麼', '算法與各格角色屬於熊崎氏五格剖象法的流派約定。可追到的一手出處是熊崎健翁著作的國立國會圖書館書目紀錄，角色說法來自通俗整理，尚未逐條對照原書。', ['S-KUMAZAKI-NDL-1939']),
    item('這個數字的意思', '本站依流派常見意象做的白話改寫，只講特質與提醒，不是古籍原文，也不下吉凶定論。', ['S-SITE-NAMEOLOGY-81']),
    item('五行與相生相剋', '數字尾數配五行採姓名學慣用法，與河圖數是兩套不同配法；木火土金水的相生相剋次序以《春秋繁露》為原典。', ['S-CHUNQIU-FANLU-WUXING']),
  ];
}

export function buildStrokeConcept(chars: StrokeChar[]): NameologyStrokeConcept {
  const total = chars.reduce((sum, item) => sum + item.strokes, 0);
  return {
    title: '筆畫是什麼',
    paragraphs: [
      '姓名學把名字每個字的筆畫數，依固定公式合成五個格的數字，再用 1 到 81 的數理與木火土金水去看。',
      chars.length >= 2
        ? `你的名字筆畫明細：${chars.map((item) => `${item.char}${item.strokes}畫`).join('、')}，全名共 ${total} 畫。`
        : '名字資料不足，暫時無法列出筆畫明細。',
      '五個格各看一個面向：天格看先天底色，人格看核心個性，地格看基礎與前期，外格看外在人際，總格看整體與後期。這是流派說法。',
      '筆畫數字大不代表比較好，數字只是一個象徵入口；它描述的是特質與提醒，不是命運定論。',
    ],
    strokeNote: '本站每個字的筆畫採臺灣 CNS11643 全字庫的總筆畫。傳統五格流派多半以《康熙字典》的筆畫計算，部首變形的字（例如三點水、草字頭、示字旁）有時會差一到三畫，本站沒有做康熙筆畫換算；若你慣用康熙筆畫，數字可能略有不同。',
    characters: chars.map((item, index) => ({ char: item.char, strokes: item.strokes, part: index === 0 ? '姓' as const : '名' as const })),
    total,
  };
}

export function buildGridReadings(grids: GridInput[], characters: StrokeChar[] = [], statusLine: string = STATUS_WORDING.PENDING_POOL): NameologyGridReading[] {
  const characterStrokes = characters.map((item) => item.strokes);
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
      formula: gridFormulaFor(grid.key, grid.value, characters),
      role: GRID_ROLES[grid.key],
      plainTalk: `${grid.label}${grid.value}畫的意思：「${entry.keyword}」。${entry.reading}`,
      evidence: buildGridEvidence(statusLine),
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
  'S-CNS11643-OPENDATA': '臺灣 CNS11643 全字庫開放資料：每個字的總筆畫',
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
    '每個字的筆畫採臺灣 CNS11643 全字庫的總筆畫；傳統流派多用《康熙字典》筆畫，部首變形的字可能差一到三畫，本站沒有換算。',
    ...(gate.status === 'VERIFIED' ? [] : gate.reasons.slice(0, 3)),
  ];
  return { status: gate.status, headline, lines, sources };
}

export function buildGridStudy(grids: GridInput[], characters: StrokeChar[] = []): NameologyGridStudy {
  const credibility = buildGridCredibility();
  return {
    ruleVersion: 'nameology-grid-study-v2',
    strokeConcept: buildStrokeConcept(characters),
    readings: buildGridReadings(grids, characters, STATUS_WORDING[credibility.status]),
    linkage: buildGridLinkage(grids),
    credibility,
  };
}
