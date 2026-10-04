/**
 * 鬼魅阿修羅 — 受測者姓名功能臺運算與親友話術貫穿回歸測試
 * ============================================================================
 * 驗證維度：
 * 1. 輸入標準化：name 與 identityTarget（'self' / 'guest'）精準接收
 * 2. 話術到位度：composeTime 直呼其名，且符合 lintAsuraVoice 全套嚴格規範
 * 3. 向後相容性：未輸入姓名時 100% 保持既有開場與判語格式
 * 4. 契約完整性：AsuraDisplay 與前端卡片、複製話術/代碼全流程貫穿受測者標籤
 * ============================================================================
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

console.log('⚔️ 鬼魅阿修羅姓名功能臺運算與身分話術貫穿測試開始...\n');

// 1. 載入 voice 模組
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);
const { composeTime, lintAsuraVoice, TIME_VOICE } = voice.exports;

// 2. 載入 uiText 模組
const uiTextSrc = fs.readFileSync(path.join(root, 'features/ghost-asura/uiText.ts'), 'utf8');
const uiText = { exports: {} };
new Function('module', 'exports', ts.transpileModule(uiTextSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(uiText, uiText.exports);

// 3. 載入 display 模組
const displaySrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-display.ts'), 'utf8')
  .replace("import 'server-only';", '');
const displayEnv = { exports: {} };
new Function('module', 'exports', 'require', ts.transpileModule(displaySrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(displayEnv, displayEnv.exports, (id) => {
  if (id.startsWith('@/lib/server/ghost-asura-voice')) return voice.exports;
  if (id.includes('uiText') || id.includes('features/ghost-asura')) return uiText.exports;
  return {};
});
const { normalizeAsuraInput } = displayEnv.exports;

// 測試用印記 mock
const mockMarks = [
  { resultId: 'yangren', name: '血刃之鋒', pillar: 'day', fallback: ['刀一直在手。'] },
];

console.log('【測試 1】輸入標準化 normalizeAsuraInput 驗證');
{
  const inputSelf = normalizeAsuraInput({
    birthDate: '1990-05-15',
    gender: 'male',
    name: '曾威諺',
    identityTarget: 'self',
  });
  assert.equal(inputSelf.name, '曾威諺');
  assert.equal(inputSelf.identityTarget, 'self');

  const inputGuest = normalizeAsuraInput({
    birthDate: '1992-08-20',
    gender: 'female',
    name: '王小華',
    analysisTarget: 'guest',
  });
  assert.equal(inputGuest.name, '王小華');
  assert.equal(inputGuest.identityTarget, 'guest');

  const inputDefault = normalizeAsuraInput({
    birthDate: '1985-01-01',
    gender: 'male',
  });
  assert.equal(inputDefault.identityTarget, 'self');
  console.log('✓ normalizeAsuraInput 成功解析姓名與本人/親朋好友身分');
}

console.log('\n【測試 2】話術到位度：指名道姓與阿修羅話術規範檢驗');
{
  for (const when of ['past', 'present', 'future']) {
    const reading = composeTime(when, mockMarks, { name: '曾威諺', target: 'self' });
    assert(reading !== null, `${when} reading must not be null`);
    
    // 開頭必須以受測者名字喚醒，霸氣開場
    const lines = reading.narrative.split('\n');
    assert(lines[0].startsWith('曾威諺。'), `${when} 開場必須指名道姓`);
    
    // 嚴格檢驗每一行與每個分句是否符合阿修羅性格五要素與規範（≤16字短句、無驚嘆號、無反問、無空洞詞等）
    for (const line of lines) {
      const lintIssues = lintAsuraVoice(line);
      assert.deepEqual(lintIssues, [], `${when} 話術行違背阿修羅規範: ${line}`);
    }
  }
  console.log('✓ composeTime 帶入姓名後開場指名道姓，且 100% 通過 lintAsuraVoice 規範');
}

console.log('\n【測試 3】向後相容性：無姓名輸入時的保全測試');
{
  for (const when of ['past', 'present', 'future']) {
    const readingWithoutName = composeTime(when, mockMarks);
    assert(readingWithoutName !== null);
    const firstLine = readingWithoutName.narrative.split('\n')[0];
    assert(!firstLine.includes('。你的路') && !firstLine.includes('。此刻'), '未帶姓名時不得有前置姓名斷句');
    assert.equal(firstLine, TIME_VOICE[when].opening.day);
  }
  console.log('✓ 無姓名時話術 100% 保持既有格式，相容既有排盤契約');
}

console.log('\n【測試 4】前端組件契約：姓名標籤、親友切換與複製話術標記驗證');
{
  const cardCode = fs.readFileSync(path.join(root, 'features/ghost-asura/components/GhostAsuraCard.tsx'), 'utf8');
  assert(cardCode.includes('display.targetName'), 'GhostAsuraCard 必須支援 targetName 呈現');
  assert(cardCode.includes('data-asura-target-badge'), 'GhostAsuraCard 必須包含受測者名牌標籤');
  assert(cardCode.includes('【${display.identityTarget === \'guest\' ? \'親友\' : \'本人\'}：${display.targetName}】'), '複製話術標題必須包含受測者與對象資訊');

  const pageClientCode = fs.readFileSync(path.join(root, 'app/ghost-asura/GhostAsuraPageClient.tsx'), 'utf8');
  assert(pageClientCode.includes('IdentitySplitSelector'), 'GhostAsuraPageClient 必須包含 IdentitySplitSelector 親友切換');
  assert(pageClientCode.includes('identityTarget'), 'GhostAsuraPageClient 必須傳遞 identityTarget 至後端');
  console.log('✓ 前端卡片名牌、親友切換組件與修羅檔案複製契約均已完備');
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('✅ 鬼魅阿修羅 姓名功能臺運算與身分話術貫穿回歸測試 — 全部通過');
console.log('════════════════════════════════════════════════════════════\n');
