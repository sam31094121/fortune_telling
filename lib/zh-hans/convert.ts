/**
 * 繁體（台灣）→ 简体（中国大陆）轉換：只換字形與大陸慣用詞，不做語意翻譯。
 * 資料：./opencc-tw2cn-data.ts（由 OpenCC 字典產生，Apache-2.0）。流程與 OpenCC「twp → cn」相同：
 *   1. 台灣詞彙 → 標準繁體（軟體→軟件、螢幕→屏幕…）
 *   2. 繁體 → 简体（詞組優先、再逐字）
 * 本站覆寫（PROJECT_OVERRIDES、乾卦保護）優先於 OpenCC；覆寫內容不再進入後續轉換。
 * 只供顯示：轉換結果不可再拿去當排盤或計算的輸入。
 */
import { TS_CHARS, TS_PHRASES, TW_PHRASES, TW_VARIANT_PHRASES, TW_VARIANTS } from './opencc-tw2cn-data';

/** 本站覆寫：大陸慣用詞（OpenCC 沒換到的）。鍵是繁體原文，值是最終简体輸出。 */
export const PROJECT_OVERRIDES: Record<string, string> = {
  帳號: '账号', 帳戶: '账户', 預設: '默认', 品質: '质量', 行動裝置: '移动设备', 個資: '个人信息', 回饋: '反馈', 捲動: '滚动',
  // 「資料」：個人填寫的資料用「资料」；技術語境（資料庫、資料流…）用「数据」。
  資料: '资料', 資料庫: '数据库', 資料夾: '文件夹', 資料來源: '数据来源', 資料流: '数据流', 資料格式: '数据格式', 資料驗證: '数据验证', 資料交換: '数据交换', 資料品質: '数据质量',
  社群: '社群', 社群媒體: '社交媒体',
  // 人與人之間的「互動」大陸也用「互动」（OpenCC 會換成介面用語「交互」）。
  互動: '互动',
  // 存到桌面／安裝說明：照 iOS 简体中文的「添加到主屏幕」、Android Chrome 的「安装应用」用詞（2026-10-17）。
  存到桌面: '添加到主屏幕', 加入主畫面: '添加到主屏幕', 加到主畫面: '添加到主屏幕', 安裝到主畫面: '添加到主屏幕',
  儲存本站到主畫面: '将本站添加到主屏幕', 用瀏覽器開啟以儲存本站: '用浏览器打开后添加到主屏幕', 安裝應用程式: '安装应用',
  放到手機桌面: '添加到手机主屏幕', 怎麼安裝到桌面: '如何添加到主屏幕', 桌面就會出現: '主屏幕就会出现',
  主畫面: '主屏幕', 網址列: '地址栏', 三星網際網路: '三星浏览器', 臉書: 'Facebook', 鎖定主畫面版面配置: '锁定主屏幕布局',
  // 易經八卦「乾」：OpenCC 會把單字「乾」轉成「干」（乾燥義），卦名必須保留「乾」。
  乾為: '乾为', 乾宮: '乾宫', 乾金: '乾金', 乾兌: '乾兑', 乾天: '乾天', 乾位: '乾位', 乾方: '乾方', 乾三連: '乾三连',
  乾道: '乾道', 乾陽: '乾阳', 乾健: '乾健', 乾宅: '乾宅', 乾山: '乾山', 乾離: '乾离', 乾震: '乾震', 乾巽: '乾巽', 乾坎: '乾坎', 乾艮: '乾艮',
};

type Dict = { map: Map<string, string>; max: number };
let stages: Dict[][] | null = null;
let overrideKeys: string[] = [];

function build(...sources: string[]): Dict {
  const map = new Map<string, string>(); let max = 1;
  for (const source of sources) for (const entry of source.split('|')) {
    const space = entry.indexOf(' ');
    if (space <= 0) continue;
    const key = entry.slice(0, space); const value = entry.slice(space + 1).split(' ')[0];
    if (!map.has(key)) { map.set(key, value); if (key.length > max) max = key.length; }
  }
  return { map, max };
}

function init() {
  if (stages) return stages;
  stages = [
    [build(TW_PHRASES, TW_VARIANT_PHRASES, TW_VARIANTS)],
    [build(TS_PHRASES), build(TS_CHARS)],
  ];
  overrideKeys = Object.keys(PROJECT_OVERRIDES).sort((a, b) => b.length - a.length);
  return stages;
}

/** 一組字典：每個位置取這組裡最長的詞。 */
function applyGroup(text: string, group: Dict[]): string {
  let out = ''; let i = 0;
  const max = Math.max(...group.map(d => d.max));
  while (i < text.length) {
    let hit: string | undefined; let len = 0;
    for (let n = Math.min(max, text.length - i); n >= 1 && !hit; n--) {
      const piece = text.slice(i, i + n);
      for (const dict of group) { if (n <= dict.max) { const v = dict.map.get(piece); if (v !== undefined) { hit = v; len = n; break; } } }
    }
    if (hit !== undefined) { out += hit; i += len; } else { out += text[i]; i += 1; }
  }
  return out;
}

const TRIGRAM_NEIGHBOUR = /[坤兌兑離离震巽坎艮☰☱☲☳☴☵☶☷]/;
const HAS_CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

/** 把一段（不含覆寫詞的）文字轉成简体；單獨的卦名「乾」保留。 */
function convertPlain(text: string, groups: Dict[][]): string {
  if (!HAS_CJK.test(text)) return text;
  // 單字「乾」在卦名語境（獨立成段、前後是其他卦名或卦符、後接括號）時先保護起來。
  let protectedText = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '乾') {
      const prev = text[i - 1] ?? ''; const next = text[i + 1] ?? '';
      const prev2 = text[i - 2] ?? '';
      const isolated = text.trim() === '乾';
      const nearTrigram = TRIGRAM_NEIGHBOUR.test(prev) || TRIGRAM_NEIGHBOUR.test(next) || (prev === '、' && TRIGRAM_NEIGHBOUR.test(prev2)) || (next === '、' && TRIGRAM_NEIGHBOUR.test(text[i + 2] ?? ''));
      const beforeBracket = next === '（' || next === '(';
      if (isolated || nearTrigram || beforeBracket) { protectedText += '\uE000'; continue; }
    }
    protectedText += ch;
  }
  let out = protectedText;
  for (const group of groups) out = applyGroup(out, group);
  return out.replace(/\uE000/g, '乾');
}

/** 繁體 → 简体（大陸用語）。非中文、已是简体的文字原樣返回。 */
export function toSimplified(text: string): string {
  if (!text || !HAS_CJK.test(text)) return text;
  const groups = init();
  let out = ''; let i = 0; let plainStart = 0;
  while (i < text.length) {
    const key = overrideKeys.find(k => text.startsWith(k, i));
    if (key) {
      out += convertPlain(text.slice(plainStart, i), groups) + PROJECT_OVERRIDES[key];
      i += key.length; plainStart = i;
    } else i += 1;
  }
  return out + convertPlain(text.slice(plainStart), groups);
}
