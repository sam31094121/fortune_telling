// 《神煞易經》字的意境：從姓名學字庫抽出神煞名稱用到的字，存成小檔給後端用。
// 字庫 30MB，排盤時不重新載入；本檔只做「抽取」，不改任何字義文字。
// 重跑：node scripts/build-shensha-char-imagery.mjs
// 守門：tests/dual-chart-shensha-extension.test.ts 會比對本檔與字庫是否一致。
import fs from 'node:fs';

const NAMES = ['天德合', '天德', '月德', '龍德', '天狗', '金匱', '五鬼', '災煞', '六厄', '沐浴', '月破', '日破', '將星', '驛馬', '隔角', '元辰', '羊刃', '桃花', '外桃花', '天乙貴人', '文昌貴人', '華蓋', '魁罡', '空亡', '金輿', '學堂', '紅艷', '祿神', '天醫', '劫煞', '孤辰', '寡宿', '國印', '天廚', '天赦', '三奇', '亡神', '陰陽差錯', '孤鸞', '十惡大敗', '流霞', '四廢', '月德合', '飛刃', '金神', '八專', '九醜', '六秀', '喪門', '白虎', '病符', '披麻', '歲破', '月空', '截路空亡', '天轉', '地轉', '十靈', '日德', '日貴', '攀鞍', '暗祿', '進神', '退神'];
const manifest = JSON.parse(fs.readFileSync('data/dictionaries/nameology/manifest.json', 'utf8'));
const characters = JSON.parse(fs.readFileSync('data/dictionaries/nameology/characters.json', 'utf8'));
const byChar = new Map(characters.map(entry => [entry.normalizedCharacter, entry]));
const entries = {};
for (const char of [...new Set(NAMES.join(''))]) {
  const entry = byChar.get(char);
  if (!entry) throw new Error(`字庫缺字：${char}`);
  entries[char] = {
    element: entry.element,
    meanings: entry.meanings,
    curated: entry.sourceId !== 'cns11643_official',
    sourceId: entry.sourceId,
    moeSourceUrl: entry.dictionarySources?.moeDictionary?.sourceUrl ?? null,
    cnsCode: entry.cnsCode ?? entry.dictionarySources?.cns11643?.cnsCode ?? null,
  };
}
const out = {
  note: '由 scripts/build-shensha-char-imagery.mjs 從 data/dictionaries/nameology 抽出，字義原文不改。',
  dictionaryVersion: manifest.version,
  attribution: {
    moe: `${manifest.authoritySources.moeDictionary.name}（${manifest.authoritySources.moeDictionary.license}）`,
    cns: `${manifest.authoritySources.cns11643.name}（${manifest.authoritySources.cns11643.license}）`,
    curated: '本站姓名學精修字義',
  },
  entries,
};
fs.writeFileSync('data/shensha-char-imagery.json', JSON.stringify(out, null, 2) + '\n');
console.log(`已抽出 ${Object.keys(entries).length} 字`);
