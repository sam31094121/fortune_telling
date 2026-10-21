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
import { NAMEOLOGY_ARCHIVE, type InputTierId, type Provenance } from './nameology-skill-archive';
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
/** 話術只來自技能檔案（docs/技能戰鬥檔案/姓名學/姓名學.json）：81 數理、角色、筆畫概念、依據、公信力說明都在檔案裡，程式不自己寫。 */
const NUMBERS: NumberEntry[] = NAMEOLOGY_ARCHIVE.numbers.items;

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
  /** 這個格在流派裡代表什麼（流派說法，不是經典，也不是科學證實）；出處標籤＝出處層級・閘門狀態 */
  role: { title: string; text: string; provenanceLabel: string };
  /** 白話說明：這個筆畫數代表什麼（簡單說） */
  plainTalk: string;
  /** 白話說明的出處標籤 */
  meaningProvenanceLabel: string;
  /** 這段話的依據：每個說法對得上哪一份來源 */
  evidence: NameologyGridEvidence[];
}

export interface NameologyGridEvidence {
  topic: string;
  basis: string;
  /** 出處層級・閘門狀態 */
  provenanceLabel: string;
  sourceIds: string[];
  sourceLabels: string[];
  /** 這個說法目前的來源狀態（與閘門狀態一致，不說得比閘門更滿） */
  statusLine: string;
}

export interface StrokeChar { char: string; strokes: number }

export interface NameologyStrokeConcept {
  title: string;
  /** 每段都帶出處標籤（來自技能檔案的標層級・狀態；筆畫明細是算出來的事實，標「由字典筆畫算出」） */
  paragraphs: { text: string; provenanceLabel: string }[];
  /** 筆畫採用哪一套、與傳統差在哪（照實說明） */
  strokeNote: { text: string; provenanceLabel: string };
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

/** 貫通：五格五行 × 姓名字義五行 × 八字五行 × 易經卦（接在既有的 baziCrossCheck、iching 後面，不另算一套） */
export interface NameologyGridCrossLink {
  /** 這份結果用了哪些輸入（姓名＋性別即可運算；生日、時辰選填）；說明文字來自技能檔案 */
  tier: { id: InputTierId; label: string; note: string; provenanceLabel: string };
  /** baziCount 為 null＝沒有提供出生日期，沒有八字可對照 */
  nodes: { element: GridElement; baziCount: number | null; baziLabel: string; gridLabels: string[]; nameChars: string[]; relation: string }[];
  /** 圖上圓形徽章的說明（沒有八字時為空字串） */
  badgeLegend: string;
  steps: { order: number; title: string; text: string; locked: boolean }[];
  limitation: string;
}

export interface NameologyGridStudy {
  ruleVersion: 'nameology-grid-study-v3';
  /** 由 API 在八字對照與易經卦都完成後補上；舊結果或缺資料時沒有 */
  crossLink?: NameologyGridCrossLink;
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

/** 出處標籤：出處層級＋閘門狀態的標準說法（例如「流派意象改寫・仍在查證中，僅作自我反思參考」），不說得比閘門更滿。 */
export const provenanceLabel = (provenance: Provenance, statusLine: string) => `${provenance}・${statusLine}`;

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

/** 四項依據全部來自技能檔案的 evidence；後端只負責附上來源標籤與閘門狀態。 */
export function buildGridEvidence(statusLine: string): NameologyGridEvidence[] {
  return NAMEOLOGY_ARCHIVE.evidence.map((entry) => ({
    topic: entry.topic,
    basis: entry.text,
    provenanceLabel: provenanceLabel(entry.provenance, statusLine),
    sourceIds: entry.source_ids,
    sourceLabels: entry.source_ids.map((id) => NAMEOLOGY_ARCHIVE.sourceLabels[id] ?? id),
    statusLine,
  }));
}

/**
 * 筆畫概念：說明文字全部來自技能檔案；只有「你的名字筆畫明細」是用字典筆畫算出來的事實（標「由字典筆畫算出」），不是解讀。
 */
export function buildStrokeConcept(chars: StrokeChar[], statusLine: string = STATUS_WORDING.PENDING_POOL): NameologyStrokeConcept {
  const total = chars.reduce((sum, item) => sum + item.strokes, 0);
  const archive = NAMEOLOGY_ARCHIVE.strokeConcept;
  const fromArchive = (index: number) => ({ text: archive.paragraphs[index].text, provenanceLabel: provenanceLabel(archive.paragraphs[index].provenance, statusLine) });
  const computed = {
    text: chars.length >= 2
      ? `你的名字筆畫明細：${chars.map((item) => `${item.char}${item.strokes}畫`).join('、')}，全名共 ${total} 畫。`
      : '名字資料不足，暫時無法列出筆畫明細。',
    provenanceLabel: '由字典筆畫算出',
  };
  return {
    title: archive.title,
    paragraphs: [fromArchive(0), computed, fromArchive(1), fromArchive(2)],
    strokeNote: { text: archive.strokeNote.text, provenanceLabel: provenanceLabel(archive.strokeNote.provenance, statusLine) },
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
      role: { title: NAMEOLOGY_ARCHIVE.gridRoles[grid.key].title, text: NAMEOLOGY_ARCHIVE.gridRoles[grid.key].text, provenanceLabel: provenanceLabel(NAMEOLOGY_ARCHIVE.gridRoles[grid.key].provenance, statusLine) },
      plainTalk: `${grid.label}${grid.value}畫的意思：「${entry.keyword}」。${entry.reading}`,
      meaningProvenanceLabel: provenanceLabel(NAMEOLOGY_ARCHIVE.numbers.provenance, statusLine),
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
export function staticEdges(): { from: GridElement; to: GridElement; kind: '生' | '剋' }[] {
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
    .map((s) => ({ id: s.source_id, label: NAMEOLOGY_ARCHIVE.sourceLabels[s.source_id] ?? s.author, citation: s.locator, trust: s.trust }));
  const headline = gate.status === 'VERIFIED'
    ? '已通過來源交叉比對。'
    : '來源整理中：尚未通過全部閘門，內容僅供自我反思參考。';
  const lines = [
    ...NAMEOLOGY_ARCHIVE.credibilityLines.map((entry) => entry.text),
    ...(gate.status === 'VERIFIED' ? [] : gate.reasons.slice(0, 3)),
  ];
  return { status: gate.status, headline, lines, sources };
}

export function buildGridStudy(grids: GridInput[], characters: StrokeChar[] = []): NameologyGridStudy {
  const credibility = buildGridCredibility();
  return {
    ruleVersion: 'nameology-grid-study-v3',
    strokeConcept: buildStrokeConcept(characters, STATUS_WORDING[credibility.status]),
    readings: buildGridReadings(grids, characters, STATUS_WORDING[credibility.status]),
    linkage: buildGridLinkage(grids),
    credibility,
  };
}

/** 與 nameology-bazi-crosscheck、nameology-iching-presentation 的輸出對得上的最小形狀（這裡不重算八字，也不重新起卦）。 */
export interface CrossCheckInput {
  chartMode: string;
  dayMaster: { stem: string; element: string };
  comparison: { element: string; nameCharacters: string[]; baziCount: number }[];
  limitation: string;
}
export interface IChingInput { hexagramName: string; method: string }

const ICHING_METHOD_LABEL: Record<string, string> = {
  'birth-date-hour': '生辰起卦（有出生時辰）',
  'name-date-symbolic': '姓名象徵參考（沒有時辰，不是生辰卦）',
};

/**
 * 貫通：把五格的五行接上既有的「姓名字義五行 → 八字五行 → 易經卦」這條線。
 * 只做結構對照：不以缺少某個五行直接判定喜用神、改名或吉凶（沿用 docs/nameology-hexagram-spec.md）。
 */
export function buildGridCrossLink(
  study: NameologyGridStudy,
  crossCheck: CrossCheckInput | null | undefined,
  iching: IChingInput | null | undefined,
  nameChars: { char: string; element: string }[] = [],
): NameologyGridCrossLink {
  const hasBirth = Boolean(crossCheck && Array.isArray(crossCheck.comparison));
  const hasHour = hasBirth && crossCheck?.chartMode === 'FULL_BAZI';
  const tierId: InputTierId = hasHour ? 'FULL' : hasBirth ? 'NAME_GENDER_BIRTH' : 'NAME_GENDER';
  const tiers = NAMEOLOGY_ARCHIVE.inputTiers;
  const statusLine = study.readings[0]?.meaningProvenanceLabel.split('・')[1] ?? STATUS_WORDING.PENDING_POOL;
  const tier = {
    id: tierId,
    label: tiers[tierId].label,
    note: tiers[tierId].note.text,
    provenanceLabel: provenanceLabel(tiers[tierId].note.provenance, statusLine),
  };

  const nodes = GRID_ELEMENT_ORDER.map((element) => {
    const row = hasBirth ? crossCheck!.comparison.find((item) => item.element === element) : undefined;
    const gridLabels = study.readings.filter((item) => item.element === element).map((item) => `${item.label}${item.value}`);
    const chars = row ? row.nameCharacters : nameChars.filter((item) => item.element === element).map((item) => item.char);
    const inName = gridLabels.length > 0 || chars.length > 0;
    if (!hasBirth) {
      return { element, baziCount: null, baziLabel: '未提供生日', gridLabels, nameChars: chars, relation: inName ? `名字裡有${element}。` : `名字裡沒有出現${element}。` };
    }
    const baziCount = row?.baziCount ?? 0;
    let relation: string;
    if (inName && baziCount > 0) relation = `八字與名字都有${element}，彼此呼應。`;
    else if (inName) relation = `八字裡沒有出現${element}，名字裡有，結構上是名字多出來的一塊。`;
    else if (baziCount > 0) relation = `八字有${element}，名字裡沒有出現。`;
    else relation = `八字與名字都沒有出現${element}。`;
    return { element, baziCount, baziLabel: `八字 ${baziCount}`, gridLabels, nameChars: chars, relation };
  });

  const gridElements = [...new Set(study.readings.map((item) => item.element))];
  const last = study.linkage.chain[study.linkage.chain.length - 1];
  const chain = study.linkage.chain.map((step) => `${step.from.label}${step.from.element}`).concat(last ? [`${last.to.label}${last.to.element}`] : []);
  const step1 = { order: 1, title: '姓名五格', locked: false, text: `五格的五行落在${gridElements.join('、')}${chain.length ? `；三才走向是${chain.join('→')}` : ''}。` };
  const counts = hasBirth ? crossCheck!.comparison.map((item) => `${item.element}${item.baziCount}`).join('、') : '';
  const step2 = hasBirth
    ? { order: 2, title: '八字對照', locked: false, text: `八字（${hasHour ? '完整四柱' : '年月日三柱，時柱不推定'}）日主${crossCheck!.dayMaster.stem}${crossCheck!.dayMaster.element}，五行計數是${counts}。` }
    : { order: 2, title: '八字對照', locked: true, text: tiers.locked.bazi.text };
  const step3 = iching
    ? { order: 3, title: '易經卦', locked: false, text: `${iching.hexagramName}，${ICHING_METHOD_LABEL[iching.method] ?? iching.method}；卦義只作文化解說，不更改五格與八字。` }
    : hasBirth
      ? { order: 3, title: '易經卦', locked: false, text: '易經卦資料尚未產生。' }
      : { order: 3, title: '易經卦', locked: true, text: tiers.locked.iching.text };

  return {
    tier,
    nodes,
    badgeLegend: hasBirth ? '圓形徽章＝八字裡這個五行的個數' : '',
    steps: [step1, step2, step3],
    limitation: hasBirth
      ? `${crossCheck!.limitation} 姓名為主、八字為輔，三者是各自算出來再並排對照，不是互相證明，也不宣稱已交叉驗證。`
      : '姓名為主：這份結果只用姓名與性別，不涉及八字與易經卦，也不宣稱已交叉驗證。',
  };
}
