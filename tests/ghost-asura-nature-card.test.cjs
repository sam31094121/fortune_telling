// 鬼魅阿修羅｜本性卡（nature-final）單元測試：不需 dev server。
// 涵蓋：決定性、欄位契約、四道關順序與 null、命宮可追溯、翻譯層不 import 引擎、每句對一筆證據、
//       意象表零術語＋話術 lint、代號不含術數、三卡過同一翻譯層後零術語且項目不變。
// 執行：node tests/ghost-asura-nature-card.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { root, load } = require('./fixtures/ghost-asura-nature/load.cjs');

const persona = load('lib/server/ghost-asura-persona.ts');
const tl = load('lib/server/ghost-asura-translation-layer.ts');
const contract = load('lib/ghost-asura-nature-contract.ts');
const destiny = load('lib/ziwei-destiny-card.ts');
const threeCore = load('lib/three-core-engine.ts');
const ziweiEngine = load('lib/ziwei/engine.ts');

// 話術 lint（與 tests/ghost-asura-three-tiles-selection.test.cjs 同法載入）
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);
const { lintAsuraVoice } = voice.exports;


// 13:16 合併風險句：兩條部件證據都在 → 在較前者位置換成合併句，部件證據保留在 evidence
function expectRiskKeys(evidence) {
  let ks = evidence.filter((e) => e.kind === 'risk' && !e.listedOnly).map((e) => e.traitKey);
  for (const c of tl.ASURA_COMBINED_RISKS) {
    const idx = c.parts.map((k) => ks.indexOf(k));
    if (idx.some((i) => i < 0)) continue;
    const at = Math.min(...idx);
    ks = ks.flatMap((k, i) => (i === at ? [c.comboKey] : c.parts.includes(k) ? [] : [k]));
  }
  return ks;
}
const COMBO_KEYS = new Set(tl.ASURA_COMBINED_RISKS.map((c) => c.comboKey));
const voiceOk = (key, text) => (COMBO_KEYS.has(key) ? [] : lintAsuraVoice(text));

const CASES = {
  u0030: { birthDate: '1968-09-02', birthTime: '00:30', gender: 'female' },
  u2330: { birthDate: '1968-09-01', birthTime: '23:30', gender: 'female' },
  m1974: { birthDate: '1974-07-02', birthTime: '03:30', gender: 'male' },
};
const GATE_ORDER = ['bazi', 'ziwei', 'yijing', 'lifePalace'];
const PUBLIC_KEYS = ['version', 'title', 'essence', 'risk'];
const SERVER_KEYS = ['version', 'title', 'essence', 'risk', 'natureKey', 'riskKeys', 'evidence'];
const OPTIONAL_KEYS = ['strength', 'weakness'];
const KINDS = ['essence', 'strength', 'weakness', 'risk'];
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

function pipeline(input) {
  const run = persona.runNatureGates(input);
  const evidence = persona.analyzePersona(run.gates, run.materials);
  const card = evidence ? tl.translateAsNature(evidence) : null;
  return { run, evidence, card, pub: card ? tl.toPublic(card) : null };
}

// 1. 契約版本與關卡順序
ok(contract.NATURE_CARD_VERSION === 'nature-final', 'contract version');
assert.deepEqual(persona.PERSONA_GATES.map((g) => g.id), GATE_ORDER); checks++;

const results = {};
for (const [name, input] of Object.entries(CASES)) {
  // 2. 決定性：連跑 10 次一字不差
  const first = JSON.stringify(pipeline(input));
  for (let i = 0; i < 9; i++) assert.equal(JSON.stringify(pipeline(input)), first, `${name} run ${i + 2} differs`);
  checks++;
  const r = pipeline(input);
  results[name] = r;
  // 3. 依序執行：order 為 GATE_ORDER 的前綴，且只有最後一關可能非 PASS
  ok(r.run.order.length === 4 && r.run.order.every((id, i) => id === GATE_ORDER[i]), `${name} gate order`);
  r.run.order.slice(0, -1).forEach((id) => ok(r.run.gates[id] === 'PASS', `${name} earlier gate ${id} must PASS`));
  if (r.card) {
    const keys = Object.keys(r.card);
    assert.deepEqual(keys.slice(0, SERVER_KEYS.length), SERVER_KEYS); checks++;
    ok(keys.slice(SERVER_KEYS.length).every((k) => OPTIONAL_KEYS.includes(k)), `${name} server optional keys`);
    const pk = Object.keys(r.pub);
    assert.deepEqual(pk.slice(0, PUBLIC_KEYS.length), PUBLIC_KEYS); checks++;
    ok(pk.slice(PUBLIC_KEYS.length).every((k) => OPTIONAL_KEYS.includes(k)), `${name} public optional keys`);
    // 4. 每句對應一筆 PersonaEvidence；四段各由該段意象依序串成；同一 traitKey 只出現一次
    const interp = r.card.evidence.filter((e) => !e.listedOnly && !e.material); // 14:23 素材不成句
    assert.equal(new Set(interp.map((e) => e.traitKey)).size, interp.length); checks++;
    for (const kind of KINDS) {
      const keysOf = kind === 'risk' ? expectRiskKeys(r.card.evidence) : r.card.evidence.filter((e) => e.kind === kind && !e.listedOnly && !e.material).map((e) => e.traitKey);
      const text = kind === 'risk' && tl.ASURA_UNIVERSAL_RISK.enabled && keysOf.length > 0 ? tl.ASURA_UNIVERSAL_RISK.text : keysOf.map((k) => tl.asuraImageOf(k).text).join('');
      ok((r.card[kind] ?? '') === text, `${name} ${kind} = images of ${kind} evidence`);
    }
    assert.deepEqual(r.card.riskKeys, expectRiskKeys(r.card.evidence)); checks++;
    ok(r.card.evidence.every((e) => e.refs.length > 0 && e.refs.every((ref) => ref.source && ref.layer && ref.item)), `${name} refs`);
    // 5. 命宮可追溯：主路＝命宮主星在既有命宮檔案；空宮＝底色＋遷移宮（對宮）主星在引擎 allPalaces
    const tc = threeCore.computeThreeCore(input);
    const src = destiny.mapZiweiToDestinySource(tc.ziwei.analysis);
    const travel = tc.ziwei.analysis.allPalaces.find((p) => p.key === persona.EMPTY_PALACE_BORROW_KEY);
    const lp = r.card.evidence.filter((e) => e.refs.some((ref) => ref.layer === 'lifePalace'));
    ok(lp.length >= 1 && lp[0].kind === 'essence', `${name} life-palace evidence leads`);
    for (const e of lp) for (const ref of e.refs) {
      ok(ref.source.includes('lib/ziwei-destiny-card.ts') || ref.source.includes('lib/ziwei-sanfang-engine.ts'), `${name} ${e.traitKey} traces to life-palace / chart file`);
      if (ref.item.startsWith('遷移宮（對宮）')) ok(travel.majorStars.some((n) => ref.item.startsWith(`遷移宮（對宮）${n}`)), `${name} borrowed ${ref.item}`);
      else if (ref.item.endsWith('空宮')) ok(src.primaryStars.length === 0 && e.traitKey === persona.EMPTY_PALACE_BASE.traitKey, `${name} empty base`);
      else if (persona.PERSONA_TRANSFORMATIONS.some((t) => ref.item.endsWith(t.name))) {
        const mingP = tc.ziwei.analysis.allPalaces.find((p) => p.key === src.palaceId);
        ok((mingP.transformations ?? []).some((m) => ref.item.endsWith(`化${m}`)), `${name} ${ref.item} transformation is in the life palace`);
      }
      else if (ref.source.includes(persona.LIFE_PALACE_DETAIL_SOURCE)) {
        // 14:13 命宮細項：逐值對回同一份輸入的 iztro 星盤 palaces[命宮]，且一律列出、不解讀
        const mingP = tc.ziwei.analysis.allPalaces.find((p) => p.key === src.palaceId);
        const astroP = ziweiEngine.createZiweiAstrolabe(tc.ziwei.analysis.ziweiBirthInput).palaces.find((p) => p.name === '命宮' && String(p.earthlyBranch) === mingP.branch);
        const vals = [astroP.changsheng12, astroP.boshi12, astroP.jiangqian12, astroP.suiqian12, `${astroP.decadal.range.join('-')}歲 ${astroP.decadal.heavenlyStem}${astroP.decadal.earthlyBranch}`, astroP.ages.join(',')].map(String);
        ok(vals.some((v) => ref.item.endsWith(`：${v}`)), `${name} ${ref.item} matches iztro palaces[命宮]`);
        ok(e.listedOnly === true || persona.LIFE_PALACE_DETAIL_MEANINGS.length > 0, `${name} ${ref.item} listed, no interpretation`);
      }
      else ok([...src.primaryStars, ...src.supportingStars].some((s) => ref.item.startsWith(s.name)) || tc.ziwei.analysis.allPalaces.find((p) => p.key === src.palaceId).minorStars.some((n) => ref.item.startsWith(n)), `${name} ${ref.item} is in the life palace`);
    }
    ok(r.card.natureKey.startsWith(r.card.evidence.find((e) => e.kind === 'essence').traitKey), `${name} natureKey from lead essence`);
  }
}

// 6. 已知結果（引擎現況）：1974 男 命宮武曲 → 主路；1968 兩盤 命宮空宮 → 空宮規則（底色＋借遷移宮天同、天梁）
ok(results.m1974.run.materials.lifePalace.mode === 'main' && results.m1974.card.natureKey.startsWith('NATURE.EXECUTOR'), '1974 main path');
for (const k of ['u0030', 'u2330']) {
  assert.deepEqual(results[k].run.gates, { bazi: 'PASS', ziwei: 'PASS', yijing: 'PASS', lifePalace: 'PASS' }); checks++;
  const m = results[k].run.materials.lifePalace;
  ok(m.mode === 'empty' && m.borrowed.palaceName === '遷移宮', `${k} empty palace borrows the travel palace`);
  assert.deepEqual(m.borrowed.majorStars.map((s) => s.name).sort(), ['天同', '天梁'].sort()); checks++;
  ok(results[k].card.natureKey === 'NATURE.OPEN', `${k} base tone leads`);
  for (const kind of KINDS) ok((results[k].card[kind] ?? '').length > 0, `${k} ${kind} non-empty`);
}
// 易經只供措辭：00:30 與 23:30 卦不同，但卡面一致
ok(JSON.stringify(results.u0030.pub) === JSON.stringify(results.u2330.pub), 'iching adds phrasing only');
// 空宮且遷移宮無資料：只剩底色（＋日主），其餘段落留空，不補字
{
  const base = persona.runNatureGates(CASES.u0030);
  const mat = JSON.parse(JSON.stringify(base.materials)); mat.lifePalace.borrowed = null;
  const card = tl.translateAsNature(persona.analyzePersona(base.gates, mat));
  ok(card.essence.length > 0 && card.risk === '' && card.strength === undefined && card.weakness === undefined, 'empty palace without borrowed stars keeps other sections empty');
}

// 7. 任一關 FAIL／MISSING → analyzePersona null
const base = persona.runNatureGates(CASES.m1974);
for (const id of GATE_ORDER) for (const status of ['FAIL', 'MISSING']) {
  ok(persona.analyzePersona({ ...base.gates, [id]: status }, base.materials) === null, `${id}=${status} → null`);
}
ok(persona.analyzePersona(base.gates, null) === null, 'no materials → null');
// 時辰代填 → 紫微起 MISSING → null
const assumed = persona.runNatureGates({ ...CASES.m1974, hourAssumed: true });
ok(assumed.gates.ziwei === 'MISSING' && persona.analyzePersona(assumed.gates, assumed.materials) === null, 'hourAssumed → null');
// 未知 traitKey → 翻譯層丟錯（不補字）
assert.throws(() => tl.translateAsNature([{ traitKey: 'NATURE.UNKNOWN', kind: 'essence', refs: [{ layer: 'bazi', item: 'x', source: 'y' }] }])); checks++;

// 8. 強弱改變解讀：同一素材只改亮度
const mat = JSON.parse(JSON.stringify(base.materials));
const swap = (star, brightness) => { mat.lifePalace.mode = 'main'; mat.lifePalace.majorStars = [{ name: star, brightness }]; return persona.analyzePersona(base.gates, mat).map((e) => e.traitKey); };
ok(swap('七殺', '廟').includes('NATURE.DECIDER') && swap('七殺', '平').includes('NATURE.VANGUARD'), 'strength changes 七殺 reading');
ok(swap('巨門', '陷').includes('RISK.QUESTIONER.SPEAK_BEFORE_CONFIRM') && swap('巨門', '旺').includes('RISK.QUESTIONER.QUARREL'), 'strength changes 巨門 reading');
ok(swap('破軍', '陷').includes('RISK.BREAKER.CANNOT_BUILD') && swap('破軍', '廟').includes('RISK.BREAKER.PRESSURE'), 'strength changes 破軍 reading');

// 9. 意象表：每個 traitKey 一句、零術語、過話術 lint；解析層所有代號都有意象；代號不含術數拼音
const keys = tl.ASURA_IMAGE_TABLE.map((e) => e.traitKey);
assert.equal(new Set(keys).size, keys.length, 'traitKey unique'); checks++;
for (const e of tl.ASURA_IMAGE_TABLE) {
  assert.deepEqual(tl.forbiddenTermsIn(e.text), [], `image ${e.traitKey} has forbidden term`); checks++;
  assert.deepEqual(lintAsuraVoice(e.text), [], `image ${e.traitKey} violates voice: ${e.text}`); checks++;
  ok(/^(NATURE|STRENGTH|WEAKNESS|RISK)(\.[A-Z_]+)+$/.test(e.traitKey), `traitKey format ${e.traitKey}`);
}
const PINYIN = ['ZIWEI', 'TIANJI', 'TAIYANG', 'WUQU', 'TIANTONG', 'LIANZHEN', 'TIANFU', 'TAIYIN', 'TANLANG', 'JUMEN', 'TIANXIANG', 'TIANLIANG', 'QISHA', 'POJUN',
  'WENCHANG', 'WENQU', 'QINGYANG', 'TUOLUO', 'HUOXING', 'LINGXING', 'DIKONG', 'DIJIE', 'QIAN', 'DUI', 'ZHEN', 'XUN', 'KAN', 'GEN', 'KUN', 'WOOD', 'FIRE', 'EARTH', 'METAL', 'WATER', 'BAZI', 'ICHING', 'PALACE', 'STAR'];
for (const k of keys) ok(!k.split('.').some((part) => PINYIN.includes(part) || part.startsWith('TRI')), `traitKey ${k} must not encode a term`);
const personaKeys = [
  persona.EMPTY_PALACE_BASE.traitKey,
  ...persona.PERSONA_MAJOR_STARS.flatMap((s) => [s.essence.base, s.essence.strong, s.essence.weak, s.strength, s.weakness, s.risk.base, s.risk.strong, s.risk.weak].filter(Boolean).map((t) => t.traitKey)),
  ...persona.PERSONA_MINOR_STARS.map((s) => s.traitKey), ...persona.PERSONA_MALEFIC_STARS.map((s) => s.traitKey),
  ...persona.PERSONA_TRANSFORMATIONS.map((x) => x.traitKey),
];
for (const k of personaKeys) ok(tl.asuraImageOf(k), `persona trait ${k} has an image`);
assert.deepEqual([...new Set(personaKeys)].sort(), [...keys].sort(), 'image table == persona traits (no orphan images)'); checks++;

// 10. 翻譯層不 import 任何命理引擎（只准契約、別名層與 server-only）
const tlSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-translation-layer.ts'), 'utf8');
const imports = [...tlSrc.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
assert.deepEqual(imports.sort(), ['@/lib/asura-display-alias', '@/lib/ghost-asura-display-contract', '@/lib/ghost-asura-nature-contract', 'server-only'].sort()); checks++;
for (const dep of ['lib/asura-display-alias.ts', 'lib/ghost-asura-nature-contract.ts']) {
  ok(!/^import\s(?!type)/m.test(fs.readFileSync(path.join(root, dep), 'utf8')), `${dep} has no runtime imports`);
}
ok(/^import type/m.test(fs.readFileSync(path.join(root, 'lib/ghost-asura-display-contract.ts'), 'utf8')) && !/^import\s(?!type)/m.test(fs.readFileSync(path.join(root, 'lib/ghost-asura-display-contract.ts'), 'utf8')), 'display contract type-only imports');

// 11. 三卡過同一翻譯層：項目數、順序不變；文字零術語；只有翻譯桶造成的字差
for (const name of Object.keys(CASES)) {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures/ghost-asura-nature/baseline-${name}.json`), 'utf8')).data;
  const translated = tl.asuraTranslateDisplay(fixture);
  translated.sections.forEach((s, i) => {
    const b = fixture.sections[i];
    assert.deepEqual([s.key, s.items.length, (s.blocks || []).length], [b.key, b.items.length, (b.blocks || []).length]); checks++;
    const text = JSON.stringify(s);
    assert.deepEqual(tl.forbiddenTermsIn(text, tl.ZIWEI_TERMS), [], `${name} ${s.key} still has ziwei terms`); checks++;
  });
  ok(JSON.stringify(tl.asuraTranslateDisplay(translated)) === JSON.stringify(translated), `${name} translation idempotent`);
}

// 11b. 故事線：三卡只多 story 欄，文字＝固定開頭＋意象表既有句子，零術語、過話術 lint
for (const name of Object.keys(CASES)) {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures/ghost-asura-nature/baseline-${name}.json`), 'utf8')).data;
  const translated = tl.asuraTranslateDisplay(fixture);
  const linked = tl.asuraLinkStory(translated, results[name].card);
  linked.sections.forEach((s, i) => {
    const { story, ...rest } = s;
    assert.deepEqual(rest, translated.sections[i]); checks++;
    ok(typeof story === 'string' && story.startsWith(tl.ASURA_STORY_LEAD[s.key]), `${name} ${s.key} story`);
    assert.deepEqual(tl.forbiddenTermsIn(story), []); checks++;
    const comboStory = s.key === 'verdict' && (tl.ASURA_UNIVERSAL_RISK.enabled || COMBO_KEYS.has(results[name].card.riskKeys[0]));
    assert.deepEqual(comboStory ? lintAsuraVoice(tl.ASURA_STORY_LEAD.verdict) : lintAsuraVoice(story), [], `${name} ${s.key} story voice: ${story}`); checks++;
  });
  ok(linked.sections.find((s) => s.key === 'verdict').story.endsWith(tl.ASURA_UNIVERSAL_RISK.enabled ? tl.ASURA_UNIVERSAL_RISK.text : tl.asuraImageOf(results[name].card.riskKeys[0]).text), `${name} future story = risk section`);
  ok(JSON.stringify(tl.asuraLinkStory(translated, null)) === JSON.stringify(translated), `${name} no nature → no story`);
}

// 11c. 合併風險句（使用者 13:16 原句，逐字）：使用者盤風險段＝合併句；兩星證據都留；決定性；不寫死在元件
{
  const USER_RISK = '壓力一來，會先縮回去，不聲不響地撐著，可真正該扛的責任，你最後還是會往自己身上攬。';
  const combo = tl.ASURA_COMBINED_RISKS.find((c) => c.comboKey === 'RISK.EASYGOING_GUARDIAN.PRESSURE');
  ok(combo && combo.text === USER_RISK && combo.userVerbatim === true && /使用者提供/.test(combo.source), 'combo is user verbatim');
  assert.deepEqual(tl.forbiddenTermsIn(USER_RISK), []); checks++;
  for (const k of ['u0030', 'u2330']) {
    const c = results[k].card;
    ok(c.risk === USER_RISK, `${k} risk = user combined line`);
    assert.deepEqual(c.riskKeys, ['RISK.EASYGOING_GUARDIAN.PRESSURE']); checks++;
    for (const part of combo.parts) ok(c.evidence.some((e) => e.traitKey === part && e.kind === 'risk' && e.refs.length > 0), `${k} keeps evidence ${part}`);
    ok(results[k].pub.risk === USER_RISK, `${k} public risk`);
    const again = tl.translateAsNature(JSON.parse(JSON.stringify(c.evidence)));
    ok(JSON.stringify(again) === JSON.stringify(c), `${k} combined risk deterministic`);
  }
  // 13:32：使用者句改為所有盤通用（單一設定常數 ASURA_UNIVERSAL_RISK，可還原）
  ok(tl.ASURA_UNIVERSAL_RISK.enabled === true && tl.ASURA_UNIVERSAL_RISK.text === USER_RISK && /使用者提供/.test(tl.ASURA_UNIVERSAL_RISK.source), 'universal risk = user verbatim');
  ok(results.m1974.card.risk === USER_RISK && results.m1974.pub.risk === USER_RISK, 'm1974 risk = universal user line');
  ok(JSON.stringify(results.m1974.card.riskKeys) === JSON.stringify(['RISK.EXECUTOR.PRESSURE']), 'm1974 backend riskKeys unchanged');
  // 只有一顆部件 → 不合併
  const one = results.u0030.card.evidence.filter((e) => e.traitKey !== 'RISK.GUARDIAN.PRESSURE');
  ok(JSON.stringify(tl.translateAsNature(one).riskKeys) === JSON.stringify(['RISK.EASYGOING.PRESSURE']), 'single part not combined');
  const comp = fs.readFileSync(path.join(root, 'features/ghost-asura/components/AsuraNatureCard.tsx'), 'utf8');
  ok(!comp.includes('不聲不響'), 'combined line not hardcoded in component');
}

// 11d. 13:18 主軸：每筆證據標 axis；命宮主軸＝lifePalace 層、輔助＝八字／易經層；本性由命宮起頭；輔助只殿後；三卡故事線不取輔助句
for (const name of Object.keys(CASES)) {
  const c = results[name].card;
  ok(c.evidence.every((e) => e.axis === 'lifePalace' || e.axis === 'auxiliary'), `${name} every evidence has axis`);
  ok(c.evidence.every((e) => (e.axis === 'lifePalace') === e.refs.every((r) => r.layer === 'lifePalace')), `${name} axis matches ref layer`);
  for (const kind of KINDS) {
    const ax = c.evidence.filter((e) => e.kind === kind).map((e) => e.axis);
    ok(ax.indexOf('auxiliary') < 0 || ax.slice(ax.indexOf('auxiliary')).every((a) => a === 'auxiliary'), `${name} ${kind} auxiliary trailing`);
  }
  const firstEss = c.evidence.find((e) => e.kind === 'essence');
  ok(firstEss.axis === 'lifePalace' && c.natureKey.startsWith(firstEss.traitKey), `${name} nature leads from life palace`);
  const story = tl.asuraStoryFor(c);
  const aux = c.evidence.filter((e) => e.axis === 'auxiliary').map((e) => tl.asuraImageOf(e.traitKey).text);
  ok(Object.values(story).every((t) => aux.every((a) => !t.includes(a))), `${name} story uses life-palace lines only`);
}
// 輔助句單獨存在不成卡
{
  const auxOnly = results.u0030.card.evidence.filter((e) => e.axis === 'auxiliary');
  assert.throws(() => tl.translateAsNature(auxOnly), /ASURA_NATURE_INCOMPLETE/); checks++;
}

// 11e. 13:29：八字只做交叉驗證，不參與本性文字——任何一段都沒有八字（輔助）證據、也沒有日主句；列出不解讀的星不產文字
for (const name of Object.keys(CASES)) {
  const c = results[name].card;
  ok(c.evidence.every((e) => e.axis === 'lifePalace' && e.refs.every((r) => r.layer === 'lifePalace')), `${name} no auxiliary / bazi evidence`);
  const pubText = JSON.stringify(results[name].pub);
  for (const line of ['骨子裡硬，凡事要精要純。', '骨子裡有股往上長的勁，愛開新局。', '骨子裡燒著熱，衝勁足。', '骨子裡穩，扛得住事。']) ok(!pubText.includes(line), `${name} no day-master line ${line}`);
  ok(!tl.ASURA_IMAGE_TABLE.some((e) => e.traitKey.startsWith('NATURE.CORE.')), 'day-master images removed');
  // 14:23：話術素材（material）不自動成句、不進前台
  for (const e of c.evidence.filter((x) => x.material)) { ok(!x_listed(e) && /可產話術/.test(e.refs[0].source), `${name} material evidence flagged`); for (const q of (e.refs[0].source.match(/「([^」]+)」/) || []).slice(1)) ok(!pubText.includes(q), `${name} material ${q} not in public`); }
  for (const e of c.evidence.filter((x) => x.listedOnly)) {
    ok(e.traitKey === persona.LISTED_NO_INTERPRETATION && /列出、不解讀/.test(e.refs[0].source), `${name} listed-only evidence`);
    const star = e.refs[0].item.replace(/（.*$/, '');
    ok(!pubText.includes(star), `${name} listed star ${star} not in public`);
  }
}

function x_listed(e) { return e.listedOnly === true; }

// 12. 四張卡串連紀錄
const link = tl.linkFourCards(results.m1974.card, tl.asuraTranslateDisplay(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/ghost-asura-nature/baseline-m1974.json'), 'utf8')).data));
assert.deepEqual(link.cards.map((c) => c.key), ['nature', 'hits', 'pillars', 'verdict']); checks++;
ok(link.cards.every((c) => c.layer === tl.ASURA_TRANSLATION_LAYER) && link.natureKey === results.m1974.card.natureKey, 'four cards linked through one layer');

console.log(`ghost-asura-nature-card: ${checks} checks passed`);
for (const k of Object.keys(results)) console.log(k, 'public:', JSON.stringify(results[k].pub));
console.log('m1974 natureKey/riskKeys:', results.m1974.card.natureKey, JSON.stringify(results.m1974.card.riskKeys));
