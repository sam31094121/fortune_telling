// 《紫微斗數全書》卷二安星口訣的獨立計算器（不依賴 iztro）。
// 用途：當「古籍標準答案」逐盤核對排盤引擎，不當排盤引擎用。
// 來源：維基文庫《紫微斗數全書/卷二》（公有領域古籍；2026-10-12 取得，口訣原文存檔於 data/ziwei/quanshu-rules.md）。
// 約定：地支 index 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11；月 1–12；日 1–30；時 0–11（子時＝0）。

export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const STEMS = '甲乙丙丁戊己庚辛壬癸';
const mod = (n: number, m = 12) => ((n % m) + m) % m;

// 〈安十二宮例〉男女俱從逆轉
export const PALACE_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'];

// 〈安身命例〉從寅上起正月順數至生月；自生月起子時，逆至生時安命、順至生時安身
export function lifeAndBody(month: number, hour: number) {
  const monthPalace = mod(2 + (month - 1));
  return { life: mod(monthPalace - hour), body: mod(monthPalace + hour) };
}

// 〈起五行寅例〉甲己起丙寅、乙庚起戊寅、丙辛起庚寅、丁壬起壬寅、戊癸起甲寅
export function palaceStem(yearStem: number, branch: number) {
  const startOfYin = [2, 4, 6, 8, 0][yearStem % 5];
  return mod(startOfYin + mod(branch - 2), 10);
}

// 六十花甲子納音歌（三十對）
const NAYIN = ['金', '火', '木', '土', '金', '火', '水', '土', '金', '木', '水', '土', '火', '木', '水', '金', '火', '木', '土', '金', '火', '水', '土', '金', '木', '水', '土', '火', '木', '水'];
const BUREAU_BY_ELEMENT: Record<string, number> = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };
export function sixtyIndex(stem: number, branch: number) {
  for (let i = 0; i < 60; i += 1) if (i % 10 === stem && i % 12 === branch) return i;
  throw new Error('stem/branch parity mismatch');
}
export function bureauOf(lifeStem: number, lifeBranch: number) {
  return BUREAU_BY_ELEMENT[NAYIN[Math.floor(sixtyIndex(lifeStem, lifeBranch) / 2)]];
}

// 〈起紫微星〉水二局初一起丑、初二寅（「坎水宮中二歲行，初一起丑初二寅」）
export function ziweiBranch(bureau: number, day: number) {
  let x = 0;
  while ((day + x) % bureau !== 0) x += 1;
  const q = (day + x) / bureau;
  return mod(2 + (q - 1) + (x % 2 === 1 ? -x : x));
}

// 「紫微天機逆行旁，隔一陽武天同當，又隔二位廉貞地」「天府太陰與貪狼…七殺空三破軍位」
export function majorStars(ziwei: number) {
  const tianfu = mod(4 - ziwei);
  return {
    紫微: ziwei, 天機: mod(ziwei - 1), 太陽: mod(ziwei - 3), 武曲: mod(ziwei - 4), 天同: mod(ziwei - 5), 廉貞: mod(ziwei - 8),
    天府: tianfu, 太陰: mod(tianfu + 1), 貪狼: mod(tianfu + 2), 巨門: mod(tianfu + 3), 天相: mod(tianfu + 4), 天梁: mod(tianfu + 5), 七殺: mod(tianfu + 6), 破軍: mod(tianfu + 10),
  } as Record<string, number>;
}

const LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0]; // 甲祿寅，乙卯，丙戊巳，丁己午，庚申，辛酉，壬亥，癸子
const FIRE_START: Record<number, [number, number]> = {}; // 年支 → [火星起, 鈴星起]
[[2, 6, 10, 1, 3], [8, 0, 4, 2, 10], [5, 9, 1, 3, 10], [11, 3, 7, 9, 10]].forEach(([a, b, c, fire, bell]) => { for (const z of [a, b, c]) FIRE_START[z] = [fire, bell]; });
const HORSE: Record<number, number> = {};
[[2, 6, 10, 8], [8, 0, 4, 2], [5, 9, 1, 11], [11, 3, 7, 5]].forEach(([a, b, c, h]) => { for (const z of [a, b, c]) HORSE[z] = h; });

export interface QuanshuInput { yearStem: number; yearBranch: number; month: number; day: number; hour: number }

export function minorStars(i: QuanshuInput, left: number) {
  const lu = LU[i.yearStem];
  const [fire, bell] = FIRE_START[i.yearBranch];
  const redPhoenix = mod(3 - i.yearBranch);
  const out: Record<string, number> = {
    左輔: mod(4 + (i.month - 1)), 右弼: mod(10 - (i.month - 1)),
    文昌: mod(10 - i.hour), 文曲: mod(4 + i.hour),
    祿存: lu, 擎羊: mod(lu + 1), 陀羅: mod(lu - 1),
    火星: mod(fire + i.hour), 鈴星: mod(bell + i.hour),
    地劫: mod(11 + i.hour), 地空: mod(11 - i.hour),
    天馬: HORSE[i.yearBranch],
    紅鸞: redPhoenix, 天喜: mod(redPhoenix + 6),
    天刑: mod(9 + (i.month - 1)), 天姚: mod(1 + (i.month - 1)),
    天哭: mod(6 - i.yearBranch), 天虛: mod(6 + i.yearBranch),
    台輔: mod(6 + i.hour), 封誥: mod(2 + i.hour),
    解神: mod(10 - i.yearBranch),
  };
  out.三台 = mod(out.左輔 + (i.day - 1));
  out.八座 = mod(out.右弼 - (i.day - 1));
  void left;
  return out;
}

// 「甲戊庚牛羊，乙己鼠猴鄉，六辛逢虎馬，壬癸兔蛇藏，丙丁豬狗位」——口訣只列兩地，沒有標明哪個是魁、哪個是鉞。
export const KUIYUE_PAIRS: Record<number, [number, number]> = {
  0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 7: [2, 6], 8: [3, 5], 9: [3, 5], 2: [11, 9], 3: [11, 9],
};

// 〈安命主〉〈安身主〉
export const LIFE_MASTER = ['貪狼', '巨門', '祿存', '文曲', '廉貞', '武曲', '破軍', '武曲', '廉貞', '文曲', '祿存', '巨門'];
export const BODY_MASTER: Record<number, string> = { 0: '火星', 6: '火星', 1: '天相', 7: '天相', 2: '天梁', 8: '天梁', 3: '天同', 9: '天同', 4: '文昌', 10: '文昌', 5: '天機', 11: '天機' };

// 〈長生十二神〉火局寅、木局亥、水局申、金局巳、土局申起長生
export const CHANGSHENG_START: Record<number, number> = { 6: 2, 3: 11, 2: 8, 4: 5, 5: 8 };
