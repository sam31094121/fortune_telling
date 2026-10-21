/**
 * 九宮格靈動數字守門測試
 * 規則：檔案 → 技能 → 話術 → 後端運算 → 前端美化。解說只來自技能檔案，程式不自己寫；
 * 每一句標出處層級與來源編號；來源狀態由閘門算；素材自稱而查不到佐證的說法不得出現；不編造。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildLuoshuStudy, buildNineGridStudy, buildNineGridCredibility, buildNineGridGuidance, parseBirthDate } from '../lib/nine-grid-numbers';
import { NINEGRID_ARCHIVE, listNineGridSentences, validateNineGridArchive } from '../lib/nine-grid-skill-archive';
import { evaluateClaim, indexSources, type SourceRegistry } from '../lib/iching-source-gate';
import { STATUS_WORDING } from '../lib/credibility-phrases';

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  ✓ ${name}`); }

const registry = JSON.parse(fs.readFileSync('docs/技能戰鬥檔案/易經/來源登記.json', 'utf8')) as SourceRegistry;
const registryIds = registry.sources.map((s) => s.source_id);
const registryNotes = Object.fromEntries(registry.sources.map((s) => [s.source_id, String(s.note ?? '')]));
const TODAY = new Date(2026, 9, 21);
const ok = (input: string) => { const p = parseBirthDate(input, TODAY); assert.equal(p.ok, true, input); return p as Extract<ReturnType<typeof parseBirthDate>, { ok: true }>; };

console.log('九宮格靈動數字守門');

check('技能檔案驗收：每一句都有出處層級與來源編號、來源在登記表找得到、無吉凶定論、無查不到佐證的行銷說法、排法與連線自洽', () => {
  assert.deepEqual(validateNineGridArchive(registryNotes), []);
  assert.ok(listNineGridSentences().length >= 63, '句數不得少於通行版原有的 63 句');
  assert.ok(listNineGridSentences().filter((s) => s.where.startsWith('洛書')).some((s) => s.provenance === '引自來源'), '洛書古籍版要有引自來源的原文');
  assert.ok(listNineGridSentences().filter((s) => !s.where.startsWith('洛書')).every((s) => s.provenance !== '引自來源'), '通行版沒有取得原文，不得標引自來源');
  const bad = JSON.parse(JSON.stringify(NINEGRID_ARCHIVE));
  bad.digits[0].source_ids = [];
  bad.lines[0].digits = [1, 2, 9];
  bad.credibilityLines[0].text = '這是全世界最權威的系統。';
  bad.layout.rows = [[1, 2, 3], [4, 5, 6], [7, 8, 8]];
  const issues = validateNineGridArchive(registryIds, bad);
  assert.ok(issues.some((x) => x.includes('沒有來源編號')), '要抓出沒有來源的句子');
  assert.ok(issues.some((x) => x.includes('不在同一條直線上')), '要抓出不在直線上的連線');
  assert.ok(issues.some((x) => x.includes('全世界最權威')), '要抓出查不到佐證的行銷說法');
  assert.ok(issues.some((x) => x.includes('1 到 9 各出現一次')), '要抓出不合法的九宮格');
});

check('排法：上排 3 6 9、中排 2 5 8、下排 1 4 7；兩份素材都有的 5 條連線都落在這個排法的直線上；只有一份素材提到的連線先不用', () => {
  assert.deepEqual(NINEGRID_ARCHIVE.layout.rows, [[3, 6, 9], [2, 5, 8], [1, 4, 7]]);
  assert.deepEqual(NINEGRID_ARCHIVE.lines.map((l) => l.digits.join('-')), ['1-4-7', '2-5-8', '3-6-9', '7-8-9', '1-5-9']);
  for (const line of NINEGRID_ARCHIVE.lines) assert.deepEqual(line.source_ids, ['S-NINEGRID-MATERIAL-1', 'S-NINEGRID-MATERIAL-2'], `${line.id} 必須兩份素材都有`);
  assert.deepEqual(NINEGRID_ARCHIVE.pendingLines.map((l) => l.digits.join('-')).sort(), ['1-2-3', '3-5-7', '4-5-6']);
  const study = buildNineGridStudy(ok('1990-05-20'));
  assert.equal(study.lines.length, 5, '後端只使用兩份素材都有的連線');
  assert.deepEqual(study.cells.map((c) => c.digit), [3, 6, 9, 2, 5, 8, 1, 4, 7], '九宮格由上到下、由左到右的順序');
});

check('日期驗證：只收西元、真實存在的日期，0 不計；不合法的給友善說明', () => {
  const p = ok('1990-05-20');
  assert.deepEqual(p.digits, [1, 9, 9, 5, 2]);
  assert.equal(p.zeroCount, 3);
  assert.equal(ok('2000-1-1').birthDate, '2000-01-01');
  assert.deepEqual(ok('2000-01-01').digits, [2, 1, 1]);
  for (const [input, word] of [['', '先填'], ['abc', '格式'], ['2023-02-30', '不存在'], ['1899-12-31', '1900'], ['2026-10-22', '未來'], [20000101, '先填']] as const) {
    const r = parseBirthDate(input, TODAY);
    assert.equal(r.ok, false, String(input));
    assert.ok(!r.ok && r.message.includes(word), `${input} → ${(r as { message?: string }).message}`);
  }
  assert.equal(parseBirthDate('2026-10-21', TODAY).ok, true, '今天出生可以');
});

check('後端運算：數字出現次數、亮起的連線、缺少的數字都是算出來的事實（1990-05-20 手算核對）', () => {
  // 數字 1 9 9 5 2：1×1、2×1、5×1、9×2
  const study = buildNineGridStudy(ok('1990-05-20'));
  const count = (d: number) => study.cells.find((c) => c.digit === d)?.count;
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(count), [1, 1, 0, 0, 1, 0, 0, 0, 2]);
  assert.deepEqual(study.summary.dominant, [9]);
  assert.equal(study.summary.maxCount, 2);
  assert.deepEqual(study.summary.missing, [3, 4, 6, 7, 8]);
  const lit = study.lines.filter((l) => l.lit).map((l) => l.digits.join('-'));
  assert.deepEqual(lit, ['1-5-9'], '只有 1-5-9 三個數字都有出現');
  assert.equal(study.summary.litLines, 1);
  assert.ok(study.lines.find((l) => l.id === 'L147')?.fact.includes('少了 4、7'));
  assert.ok(study.lines.find((l) => l.id === 'L159')?.fact.includes('這條線亮起'));
  assert.equal(study.digits.find((d) => d.digit === 9)?.countNote, '生日數字裡 9 出現 2 次。');
  assert.equal(study.digits.find((d) => d.digit === 3)?.countNote, '生日數字裡沒有出現 3。');
  assert.ok(study.summary.text.includes('1990-05-20') && study.summary.text.includes('共 5 個'));
  // 另一個日期：數字 1 9 8 7 6 2 3，缺 4 與 5，所以只有 3-6-9 與 7-8-9 兩條線的三個數字都在
  const other = buildNineGridStudy(ok('1987-06-23'));
  assert.deepEqual(other.summary.missing, [4, 5]);
  assert.deepEqual(other.lines.filter((l) => l.lit).map((l) => l.digits.join('-')), ['3-6-9', '7-8-9'], '連線只在三個數字都有出現時才亮，不亂亮');
  assert.deepEqual(other.lines.filter((l) => !l.lit).map((l) => l.missing), [[4], [5], [5]]);
});

check('話術只來自技能檔案：解說句子等於檔案、程式碼裡不得再寫一份；每一段都帶「出處層級・閘門狀態」標籤', () => {
  const study = buildNineGridStudy(ok('1990-05-20'));
  const status = STATUS_WORDING[study.credibility.status];
  for (const d of study.digits) {
    const entry = NINEGRID_ARCHIVE.digits[d.digit - 1];
    assert.equal(d.trait, entry.trait); assert.equal(d.caution, entry.caution); assert.equal(d.title, entry.title);
    assert.equal(d.provenanceLabel, `流派意象改寫・${status}`);
  }
  for (const l of study.lines) {
    const entry = NINEGRID_ARCHIVE.lines.find((x) => x.id === l.id)!;
    assert.equal(l.text, entry.text); assert.equal(l.name, entry.name);
    assert.equal(l.provenanceLabel, `流派意象改寫・${status}`);
  }
  assert.equal(study.layout.note.text, NINEGRID_ARCHIVE.layout.note.text);
  assert.equal(study.layout.note.provenanceLabel, `本站自撰・${status}`);
  assert.deepEqual(study.credibility.lines.slice(0, 4), NINEGRID_ARCHIVE.credibilityLines.map((e) => e.text));
  assert.deepEqual(study.guidance.steps.map((s) => s.text), NINEGRID_ARCHIVE.guidance.steps.map((s) => s.text));
  const lib = fs.readFileSync('lib/nine-grid-numbers.ts', 'utf8');
  const leaked = listNineGridSentences().map((s) => s.text).filter((text) => text.length >= 10 && lib.includes(text));
  assert.deepEqual(leaked, [], '這些解說句子出現在程式碼裡，必須只留在技能檔案：' + leaked.slice(0, 3).join(' | '));
});

check('來源狀態只由閘門算：登記表狀態＝閘門結果，目前不得是 VERIFIED；素材是 D 級、不得當交叉依據；學術書目只引用書目事實', () => {
  const claim = registry.claims.find((c) => c.claim_id === NINEGRID_ARCHIVE.claimId);
  assert.ok(claim, '登記表缺 C-NINEGRID-NUMBERS');
  const gate = evaluateClaim(claim, indexSources(registry));
  assert.equal(claim.status, gate.status, '登記狀態必須等於閘門算出的狀態');
  const cred = buildNineGridCredibility();
  assert.equal(cred.status, gate.status);
  assert.notEqual(cred.status, 'VERIFIED');
  assert.equal(cred.headline, STATUS_WORDING.PENDING_POOL);
  for (const id of ['S-NINEGRID-MATERIAL-1', 'S-NINEGRID-MATERIAL-2']) {
    const s = registry.sources.find((x) => x.source_id === id)!;
    assert.equal(s.trust, 'D'); assert.ok(s.note?.includes('不得當成已驗證來源'));
    assert.ok(fs.existsSync(s.tracked_path!), `${id} 的素材檔要存在`);
  }
  const dudley = registry.sources.find((x) => x.source_id === 'S-DUDLEY-NUMEROLOGY-1997')!;
  assert.ok(dudley.author.includes('Underwood Dudley') && dudley.locator.includes('Mathematical Association of America') && dudley.locator.includes('1997'));
  assert.ok(dudley.note?.includes('不得宣稱書中說了什麼'));
  assert.ok(cred.lines.some((l) => l.includes('查不到歷史文獻佐證')) && cred.lines.some((l) => l.includes('找不到任何官方或公權力機構')));
  assert.ok(cred.sources.length >= 3);
});

check('不造假：素材自稱的「全世界最權威、兩千五百年前創立」不得出現在任何客人看得到的內容；缺數與主命數不編解釋', () => {
  const study = buildNineGridStudy(ok('1990-05-20'));
  const all = JSON.stringify(study);
  for (const claim of NINEGRID_ARCHIVE.forbiddenClaims) assert.ok(!all.includes(claim), `出現「${claim}」`);
  for (const word of NINEGRID_ARCHIVE.forbiddenWords) assert.ok(!all.includes(word), `出現「${word}」`);
  assert.ok(!all.includes('主命數') && !all.includes('天賦數'), '素材沒有給公式，不得編');
  // 沒有出現的數字只列事實，不給意義
  const three = study.digits.find((d) => d.digit === 3)!;
  assert.equal(three.count, 0);
  assert.ok(NINEGRID_ARCHIVE.digits[2].trait === three.trait, '沒出現的數字仍只顯示檔案裡的特質說明，不另編「缺數」意義');
  assert.ok(NINEGRID_ARCHIVE.pendingLines.every((l) => !all.includes(l.name)), '只有一份素材提到的連線名稱不得出現');
});

check('填寫引導來自技能檔案，後端在送出前就給前端（不需要生日）；輸入只要西元生日', () => {
  const g = buildNineGridGuidance();
  assert.equal(g.title.text, NINEGRID_ARCHIVE.guidance.title.text);
  assert.equal(g.steps.length, 3);
  assert.ok(g.inputHint.text.includes('只需要出生年月日') && g.inputHint.text.includes('不用登入'));
  assert.equal(NINEGRID_ARCHIVE.input.label, '西元出生年月日');
  const route = fs.readFileSync('app/api/nine-grid/route.ts', 'utf8');
  assert.ok(route.includes('export async function GET') && route.includes('export async function POST'));
  assert.ok(route.includes('parseBirthDate(birthDate)') && route.includes('status: 400'));
  const page = fs.readFileSync('app/nine-grid/page.tsx', 'utf8');
  assert.ok(page.includes("fetch('/api/nine-grid')") && page.includes('LunarBirthdayInput'));
  assert.ok(!page.includes('MegaInputGuide'), '全站隱藏的手機大字引導不得被重新啟用');
});

check('前端只照印：結果卡片裡不得出現含「，。；」的中文句子、不使用亂數；舊格式結果直接不顯示不讓整頁當掉', () => {
  const raw = fs.readFileSync('components/nine-grid/NineGridCard.tsx', 'utf8');
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const offenders = code.split('\n').filter((line) => /[一-鿿]/.test(line) && /[，。；]/.test(line));
  assert.deepEqual(offenders, [], '前端不得自己組句：' + offenders.join(' | '));
  assert.ok(!/Math\.random/.test(code), '不得使用亂數');
  assert.ok(raw.includes("study?.ruleVersion === 'nine-grid-v2'") && raw.includes('if (!compatible) return null'));
  assert.ok(raw.includes('prefers-reduced-motion'), '動畫要尊重減少動態設定');
  const lib = fs.readFileSync('lib/nine-grid-numbers.ts', 'utf8');
  assert.ok(lib.includes("ruleVersion: 'nine-grid-v2'"), '資料版本要與元件檢查一致');
});

check('首頁入口：卡片在功能卡片最下方、樣式沿用易經姓名學卡、連到 /nine-grid；英日韓文字齊全', () => {
  const home = fs.readFileSync('app/page.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.equal((home.match(/href="\/nine-grid"/g) ?? []).length, 1, '首頁只能有一張九宮格卡');
  const idx3D = home.indexOf('href="/3D"\n            className="home-feature-launch');
  const idxNine = home.indexOf('href="/nine-grid"');
  assert.ok(idxNine > idx3D && idx3D > 0, '九宮格卡片要在最下方（立體太極模型之後）');
  assert.ok(home.includes('order-[16]'), '排序要在最後');
  const block = home.slice(idxNine, idxNine + 3000);
  assert.ok(block.includes('home-feature-launch') && block.includes('home-feature-tier-explore') && block.includes('home-oracle-3d-emblem'), '要沿用既有卡片的樣式類別');
  for (const file of ['lib/home-english-copy.ts', 'lib/home-japanese-copy.ts', 'lib/korean-copy/home.ts']) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(text.includes("'九宮格靈動數字'"), `${file} 缺卡片名稱翻譯`);
  }
});


check('洛書九宮（古籍版）：和為 15 的幻方、引文都能在登記表逐字找到、狀態等於閘門、不編造坤方位與兌「西」', () => {
  const lu = NINEGRID_ARCHIVE.luoshu;
  assert.deepEqual(lu.layout.rows, [[4, 9, 2], [3, 5, 7], [8, 1, 6]]);
  const bad = JSON.parse(JSON.stringify(NINEGRID_ARCHIVE));
  bad.luoshu.classics[0].quote = '本站自己編的一句古文';
  assert.ok(validateNineGridArchive(registryNotes, bad).some((x) => x.includes('找不到')), '編造的引文要被抓出來');
  const bad2 = JSON.parse(JSON.stringify(NINEGRID_ARCHIVE));
  bad2.luoshu.layout.rows = [[4, 9, 2], [3, 5, 7], [8, 6, 1]];
  assert.ok(validateNineGridArchive(registryNotes, bad2).some((x) => x.includes('幻方')), '不是幻方要被抓出來');
  const kun = lu.palaces.find((p) => p.palace.includes('坤'));
  assert.ok(kun && kun.direction === null && kun.directionNote, '坤在說卦傳沒有寫方位，不得編造');
  const dui = lu.palaces.find((p) => p.trigram === '兌');
  assert.ok(dui && !(dui.direction?.text ?? '').includes('西'), '兌只寫正秋，不得補成西');
  const study = buildLuoshuStudy();
  const claim = registry.claims.find((c) => c.claim_id === lu.claimId)!;
  assert.equal(study.credibility.status, evaluateClaim(claim, indexSources(registry)).status, '狀態只能由閘門算');
  assert.notEqual(study.credibility.status, 'VERIFIED', '底本尚未核對，不得顯示已通過交叉比對');
  assert.equal(study.layout.sum, 15);
  assert.ok(buildNineGridStudy(ok('1987-06-23')).luoshu.palaces.length === 9);
});

check('五行寶珠連線：數字配五行與姓名學同一套（1·2木…9水）、十條邊與姓名學一致、前端只照印不組句', () => {
  const st = buildNineGridStudy(ok('1987-06-23'));
  assert.deepEqual(st.fiveStar.elementOfDigit, { 1: '木', 2: '木', 3: '火', 4: '火', 5: '土', 6: '土', 7: '金', 8: '金', 9: '水' });
  assert.equal(st.fiveStar.edges.length, 10);
  assert.deepEqual(st.fiveStar.nodes.find((n) => n.element === '金')?.digits, [7, 8]);
  const none = buildNineGridStudy(ok('2001-01-01'));
  assert.equal(none.fiveStar.nodes.find((n) => n.element === '水')?.present, false, '沒出現 9 就沒有水');
  const src = fs.readFileSync('components/nine-grid/FiveStarLink.tsx', 'utf8');
  assert.ok(!/[\u4e00-\u9fff][^\n]*[，。；][^\n]*[\u4e00-\u9fff]/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), '前端不得組含「，。；」的句子');
  assert.ok(!src.includes('Math.random'));
});

check('易經取象：八卦取象原文逐字在登記表、8 種卦畫互異、乾坤震巽坎離艮兌卦畫正確、中宮不編八卦', () => {
  const lu = NINEGRID_ARCHIVE.luoshu;
  const yao = Object.fromEntries(lu.palaces.filter((p) => p.trigram).map((p) => [p.trigram, (p.yao ?? []).join('')]));
  assert.deepEqual(yao, { 坎: '010', 坤: '000', 震: '100', 巽: '011', 乾: '111', 兌: '110', 艮: '001', 離: '101' });
  assert.equal(lu.palaces.find((p) => p.digit === 5)?.image, undefined);
  for (const pal of lu.palaces.filter((x) => x.trigram)) assert.ok(registryNotes['S-SHUOGUA-WIKISOURCE'].includes(pal.image!.text), pal.trigram + ' 取象要能逐字找到');
});

check('延伸話術：每宮都有、延伸原文逐字在登記表、不含對個性或運勢的解讀字眼', () => {
  const lu = NINEGRID_ARCHIVE.luoshu;
  assert.equal(lu.palaces.filter((p) => p.story?.text).length, 9);
  assert.equal(lu.palaces.filter((p) => p.scene).length, 8, '中宮沒有說卦傳原文，不編');
  for (const p of lu.palaces) if (p.scene) assert.ok(registryNotes[p.scene.source_ids[0]].includes(p.scene.text), p.palace + ' 延伸原文要逐字找到');
  for (const p of lu.palaces) assert.ok(!/(運勢|個性|命運|適合你|你會)/.test(p.story.text), p.palace + ' 不得推到個性或運勢');
});

console.log(`\n九宮格靈動數字守門 ${passed} 項全過`);
