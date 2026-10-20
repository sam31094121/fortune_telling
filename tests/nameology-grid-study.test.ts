/**
 * 易經姓名學五格數理守門測試
 * 規則：後端算好每一句話與每一條連線；來源狀態由閘門算、不手填 VERIFIED；
 * 話術只講特質與提醒，不下吉凶定論、不用恐嚇字眼。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildGridLinkage, buildGridReadings, buildGridStudy, buildGridCredibility,
  elementOfNumber, normalizeGridNumber,
} from '../lib/nameology-number-reading';
import { evaluateClaim, indexSources, type SourceRegistry } from '../lib/iching-source-gate';
import { deriveNameologyTotalBeast } from '../lib/nameology-total-beast';

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  ✓ ${name}`); }

const data = JSON.parse(fs.readFileSync('data/nameology-81-numbers.json', 'utf8')) as { numbers: { n: number; keyword: string; reading: string; caution: string }[]; sources: string[] };
const registry = JSON.parse(fs.readFileSync('docs/技能戰鬥檔案/易經/來源登記.json', 'utf8')) as SourceRegistry;
const FORBIDDEN = ['必定', '註定', '大凶', '血光', '剋夫', '剋妻', '短命', '災難', '兇', '凶', '大吉', '絕症', '橫禍'];

console.log('易經姓名學五格數理守門');

check('81 筆數理齊全、順序 1–81、每筆都有關鍵詞／話術／提醒', () => {
  assert.equal(data.numbers.length, 81);
  data.numbers.forEach((item, index) => {
    assert.equal(item.n, index + 1);
    assert.ok(item.keyword.length >= 2 && item.keyword.length <= 6, `${item.n} 關鍵詞長度`);
    assert.ok(item.reading.length >= 12 && item.reading.length <= 60, `${item.n} 話術長度`);
    assert.ok(item.caution.length >= 8 && item.caution.length <= 40, `${item.n} 提醒長度`);
  });
});

check('話術只講特質與提醒：不得出現吉凶定論與恐嚇字眼', () => {
  for (const item of data.numbers) {
    for (const word of FORBIDDEN) {
      assert.ok(!item.keyword.includes(word) && !item.reading.includes(word) && !item.caution.includes(word), `${item.n} 含「${word}」`);
    }
  }
});

check('數字五行配法固定：1·2木、3·4火、5·6土、7·8金、9·0水（且與引擎 elementFromNumber 原始碼一致）', () => {
  const expected: Record<number, string> = { 1: '木', 2: '木', 3: '火', 4: '火', 5: '土', 6: '土', 7: '金', 8: '金', 9: '水', 0: '水' };
  for (let n = 1; n <= 200; n += 1) assert.equal(elementOfNumber(n), expected[n % 10], `${n}`);
  const engine = fs.readFileSync('lib/nameology-engine.ts', 'utf8');
  for (const [pair, element] of [['1', '木'], ['3', '火'], ['5', '土'], ['7', '金']] as const) {
    const first = Number(pair); const second = first + 1;
    assert.ok(engine.includes(`tail === ${first} || tail === ${second}) return '${element}'`), `引擎配法 ${first}·${second}${element} 不一致`);
  }
});

check('超過 81 取餘：81 不換算、82 看 2、161 看 1', () => {
  assert.deepEqual(normalizeGridNumber(81), { numberUsed: 81, wrapped: false });
  assert.deepEqual(normalizeGridNumber(82), { numberUsed: 2, wrapped: true });
  assert.deepEqual(normalizeGridNumber(161), { numberUsed: 1, wrapped: true });
  assert.deepEqual(normalizeGridNumber(0), { numberUsed: 1, wrapped: false });
});

const SAMPLE = [
  { key: 'sky', label: '天格', value: 13 }, { key: 'person', label: '人格', value: 21 }, { key: 'earth', label: '地格', value: 25 },
  { key: 'outer', label: '外格', value: 17 }, { key: 'total', label: '總格', value: 37 },
] as const;

check('業主範例 天13 人21 地25 外17 總37：五行與話術由後端算好', () => {
  const readings = buildGridReadings([...SAMPLE]);
  assert.deepEqual(readings.map((r) => r.element), ['火', '木', '土', '金', '金']);
  assert.equal(readings[0].keyword, '才智巧思');
  assert.equal(readings[1].keyword, '獨立領袖');
  for (const r of readings) {
    assert.ok(r.headline.includes(`${r.value}畫`) && r.headline.includes(r.element) && r.headline.includes(r.keyword));
    assert.ok(r.reading && r.caution);
    assert.equal(r.wrapNote, null);
  }
});

check('五行連線：三才 天火→人木 是下生上、人木→地土 是上剋下，且對應的邊標上金色', () => {
  const linkage = buildGridLinkage([...SAMPLE]);
  assert.equal(linkage.chain.length, 2);
  assert.equal(linkage.chain[0].relation, '下生上');
  assert.equal(linkage.chain[1].relation, '上剋下');
  assert.ok(linkage.chain[0].text.includes('天格') && linkage.chain[0].text.includes('人格'));
  const lit = linkage.edges.filter((e) => e.chainRole);
  assert.equal(lit.length, 2);
  assert.ok(lit.some((e) => e.from === '木' && e.to === '火' && e.kind === '生' && e.chainRole === '天→人'));
  assert.ok(lit.some((e) => e.from === '木' && e.to === '土' && e.kind === '剋' && e.chainRole === '人→地'));
  assert.equal(linkage.edges.length, 10);
  assert.equal(linkage.nodes.length, 5);
  assert.deepEqual(linkage.nodes.find((n) => n.element === '金')?.grids.map((g) => g.label), ['外格', '總格']);
  assert.equal(linkage.nodes.find((n) => n.element === '水')?.present, false);
});

check('同五行是比和，不畫生剋線；缺天或人時不硬湊連線', () => {
  const same = buildGridLinkage([{ key: 'sky', label: '天格', value: 11 }, { key: 'person', label: '人格', value: 12 }, { key: 'earth', label: '地格', value: 2 }]);
  assert.deepEqual(same.chain.map((c) => c.relation), ['比和', '比和']);
  assert.equal(same.edges.filter((e) => e.chainRole).length, 0);
  const lack = buildGridLinkage([{ key: 'person', label: '人格', value: 5 }]);
  assert.equal(lack.chain.length, 0);
  assert.ok(lack.summary.includes('不足'));
});

check('來源狀態只由閘門算：登記表狀態＝閘門結果，且目前不得是 VERIFIED（授權與原書逐條尚未查核）', () => {
  const claim = registry.claims.find((c) => c.claim_id === 'C-NAMEOLOGY-GRIDS');
  assert.ok(claim, '登記表缺 C-NAMEOLOGY-GRIDS');
  const gate = evaluateClaim(claim, indexSources(registry));
  assert.equal(claim.status, gate.status, '登記狀態必須等於閘門算出的狀態');
  const cred = buildGridCredibility();
  assert.equal(cred.status, gate.status);
  assert.notEqual(cred.status, 'VERIFIED');
  assert.ok(cred.headline.includes('僅供自我反思參考'));
  assert.ok(cred.lines.some((l) => l.includes('河圖')), '要說明與河圖數不同');
  assert.ok(cred.lines.some((l) => l.includes('不是易經經典')));
});

check('來源登記真實可查：NDL 書目紀錄的書名、作者、館藏與網址', () => {
  const ndl = registry.sources.find((s) => s.source_id === 'S-KUMAZAKI-NDL-1939');
  assert.ok(ndl);
  assert.ok(ndl.locator.includes('最新姓名学：開運の礎') && ndl.locator.includes('ndlsearch.ndl.go.jp/books/R100000002-I000000651672'));
  assert.ok(ndl.author.includes('熊崎健翁'));
  assert.equal(ndl.trust, 'A');
  assert.equal(ndl.kind, '研究圖書館書目');
  const cred = buildGridCredibility();
  assert.ok(cred.sources.some((s) => s.id === 'S-KUMAZAKI-NDL-1939' && s.trust === 'A'));
  for (const id of data.sources) assert.ok(registry.sources.some((s) => s.source_id === id), `登記表缺 ${id}`);
});

check('星宿神獸：與該格同五行、圖檔存在、五格不重複，且總格與「姓名總格神獸」卡是同一隻', () => {
  const strokes = [12, 9, 16];
  const readings = buildGridReadings([...SAMPLE], strokes);
  for (const r of readings) {
    assert.ok(r.beast.name.includes(r.element), `${r.label} 神獸 ${r.beast.name} 五行應為${r.element}`);
    assert.ok(r.beast.imageUrl.startsWith('/star-beasts/adult-divine-v2/'));
    assert.ok(fs.existsSync(`public${r.beast.imageUrl}`), `${r.beast.imageUrl} 圖檔不存在`);
    assert.ok(r.beast.direction && r.beast.meaning);
  }
  assert.equal(new Set(readings.map((r) => r.beast.id)).size, 5, '五格神獸不得重複');
  const total = readings.find((r) => r.key === 'total');
  const same = deriveNameologyTotalBeast({ value: 37, element: '金' }, strokes);
  assert.equal(total?.beast.id, same.beast.id, '總格神獸必須與總格神獸卡一致');
  assert.deepEqual(buildGridReadings([...SAMPLE], strokes).map((r) => r.beast.id), readings.map((r) => r.beast.id), '同輸入必須同結果（不使用亂數）');
});

check('前端只照印：元件裡不得出現含「，。；」的中文句子（句子一律由後端組好）', () => {
  const raw = fs.readFileSync('components/nameology/NameologyGridCards.tsx', 'utf8');
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const offenders = code.split('\n').filter((line) => /[一-鿿]/.test(line) && /[，。；]/.test(line));
  assert.deepEqual(offenders, [], '前端不得自己組句：' + offenders.join(' | '));
  assert.ok(!/Math\.random/.test(code), '不得使用亂數');
});

check('整合輸出 buildGridStudy：五格＋連線＋公信力三件齊全且版本固定', () => {
  const study = buildGridStudy([...SAMPLE]);
  assert.equal(study.ruleVersion, 'nameology-grid-study-v1');
  assert.equal(study.readings.length, 5);
  assert.equal(study.linkage.chain.length, 2);
  assert.ok(study.credibility.sources.length >= 3);
});

console.log(`\n五格數理守門 ${passed} 項全過`);
