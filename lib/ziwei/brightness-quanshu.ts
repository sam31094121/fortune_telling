// 十四主星廟旺表：《紫微斗數全書》卷二〈安身命例〉廟旺表（明代文獻，公有領域）。
// 取得：維基文庫 https://zh.wikisource.org/wiki/紫微斗數全書/卷二（2026-10-12 逐字核對）。
// 為什麼要有這張表：排盤套件 iztro 2.5.8 的亮度與古籍在酉宮有三處不同
//   七殺@酉 古籍＝旺（iztro 廟）、太陰@酉 古籍＝旺（iztro 不）、太陽@酉 古籍＝平（iztro 陷）。
// 其餘 165 個主星×宮位條目兩者一致。亮度一律以古籍為準；iztro 只當後備。
// 每個字串依序是 子丑寅卯辰巳午未申酉戌亥 十二宮的亮度。
// 守門：tests/ziwei-brightness-quanshu.test.cjs
export const ZIWEI_BRIGHTNESS_SOURCE = '《紫微斗數全書》卷二〈安身命例〉廟旺表';

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

export const ZIWEI_MAJOR_BRIGHTNESS_QUANSHU: Record<string, string> = {
  紫微: '平廟旺旺得旺廟廟旺旺得旺',
  天機: '廟陷得旺利平廟陷得旺利平',
  太陽: '陷不旺廟旺旺旺得得平不陷',
  武曲: '旺廟得利廟平旺廟得利廟平',
  天同: '旺不利平平廟陷不旺平平廟',
  廉貞: '平利廟平利陷平利廟平利陷',
  天府: '廟廟廟得廟得旺廟得旺廟得',
  太陰: '廟廟旺陷陷陷不不利旺旺廟',
  貪狼: '旺廟平利廟陷旺廟平利廟陷',
  巨門: '旺不廟廟陷旺旺不廟廟陷旺',
  天相: '廟廟廟陷得得廟得廟陷得得',
  天梁: '廟旺廟廟廟陷廟旺陷得廟陷',
  七殺: '旺廟廟旺廟平旺廟廟旺廟平',
  破軍: '廟旺得陷旺平廟旺得陷旺平',
};

// 紫微斗數全書表格的七級名稱：廟、旺、得地、利益、平和、不得地、落陷；這裡沿用排盤慣用單字。
export function quanshuBrightness(starName: string, earthlyBranch: string): string | undefined {
  const row = ZIWEI_MAJOR_BRIGHTNESS_QUANSHU[starName];
  const at = BRANCHES.indexOf(earthlyBranch);
  if (!row || at < 0) return undefined;
  return row[at];
}
