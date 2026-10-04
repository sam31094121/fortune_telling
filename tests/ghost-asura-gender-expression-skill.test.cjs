/**
 * 鬼魅阿修羅 — 客戶性別 × 剛柔人格 × 個人化話術技能單元驗證
 * 規格：GHOST_ASURA_GENDER_EXPRESSION_SKILL_V1
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

console.log('⚔️ 客戶性別 × 剛柔人格 × 個人化話術技能測試開始...\n');

// 1. 載入 voice 與 ziwei 模組
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);

const ziweiSrc = fs.readFileSync(path.join(root, 'lib/ghost-asura-ziwei-engine.ts'), 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const ziwei = { exports: {} };
new Function('module', 'exports', ts.transpileModule(ziweiSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(ziwei, ziwei.exports);

const { lintAsuraVoice } = voice.exports;
const { sanitizeZiweiOutput } = ziwei.exports;

// 2. 載入 skill 模組
const skillSrc = fs.readFileSync(path.join(root, 'lib/asura/ghost-asura-gender-expression-skill.ts'), 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const skill = { exports: {} };
new Function('module', 'exports', 'lintAsuraVoice', 'sanitizeZiweiOutput', ts.transpileModule(skillSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(skill, skill.exports, lintAsuraVoice, sanitizeZiweiOutput);

const {
  deriveGenderExpressionProfile,
  selectAsuraCommunicationStyle,
  generatePersonalizedCardSpeech,
  GENDER_EXPRESSION_VOICE_PACKS,
  lintGenderExpressionOutput,
} = skill.exports;

// 輔助函式
function createBaseProfile() {
  const core = {
    identityStability: 50, independence: 50, controlNeed: 50, responsibilityDrive: 50, achievementDrive: 50,
    emotionalSensitivity: 50, emotionalSuppression: 50, trustThreshold: 50, defensiveStrength: 50, dominance: 50,
    adaptability: 50, riskTolerance: 50, uncertaintyTolerance: 50, socialNeed: 50, recognitionNeed: 50, boundaryStrength: 50,
    innerConflict: [], coreNeeds: [], coreFears: [], coreDrives: [], evidenceIds: [],
  };
  const behavior = {
    decisionSpeed: 50, speechSpeed: 50, actionBias: 50, analysisBias: 50, stubbornness: 50,
    impulsiveness: 50, patience: 50, directness: 50, conflictTolerance: 50, helpSeeking: 50,
    selfReliance: 50, socialFlexibility: 50,
    pressureReaction: [], conflictReaction: [], relationshipReaction: [], repeatedPatterns: [], evidenceIds: [],
  };
  return { core, behavior };
}

console.log('【測試 1】外剛內柔推算與話術驗證（OUTER_HARD_INNER_SOFT）');
{
  const { core, behavior } = createBaseProfile();
  // 外在強快直：actionBias=85, directness=85, dominance=80, decisionSpeed=80
  behavior.actionBias = 85;
  behavior.directness = 85;
  core.dominance = 80;
  behavior.decisionSpeed = 80;
  // 內在軟脆弱/不願求助：helpSeeking=70(反向項扣除), stubbornness=30, controlNeed=35, defensiveStrength=35
  behavior.helpSeeking = 70;
  behavior.stubbornness = 30;
  core.controlNeed = 35;
  core.defensiveStrength = 35;

  const profile = deriveGenderExpressionProfile('MALE', core, behavior);
  assert.equal(profile.expressionStyle, 'OUTER_HARD_INNER_SOFT');
  console.log(`✓ 外剛內柔推算成功：外剛 ${profile.outerHardness} / 內剛 ${profile.innerHardness}`);

  const speech = generatePersonalizedCardSpeech({
    cardType: 'PRESENT',
    profile,
    clientName: '曾威諺',
  });
  assert.equal(speech.attackVector, 'SOFT_THEN_KNIFE');
  assert.ok(speech.openingStrike.includes('曾威諺'));
  console.log(`✓ 現在卡話術生成：${speech.openingStrike} ${speech.formationOrBlindSpot}`);
}

console.log('\n【測試 2】外柔內剛推算與話術驗證（OUTER_SOFT_INNER_HARD）');
{
  const { core, behavior } = createBaseProfile();
  // 外在柔禮貌：actionBias=30, directness=30, dominance=30, decisionSpeed=30
  behavior.actionBias = 30;
  behavior.directness = 30;
  core.dominance = 30;
  behavior.decisionSpeed = 30;
  // 內在底線硬：stubbornness=90, controlNeed=85, defensiveStrength=80, helpSeeking=10
  behavior.stubbornness = 90;
  core.controlNeed = 85;
  core.defensiveStrength = 80;
  behavior.helpSeeking = 10;

  const profile = deriveGenderExpressionProfile('FEMALE', core, behavior);
  assert.equal(profile.expressionStyle, 'OUTER_SOFT_INNER_HARD');
  console.log(`✓ 外柔內剛推算成功：外剛 ${profile.outerHardness} / 內剛 ${profile.innerHardness}`);

  const speech = generatePersonalizedCardSpeech({
    cardType: 'PAST',
    profile,
    clientName: '靜怡',
  });
  assert.equal(speech.attackVector, 'COLD_REVEAL');
  assert.ok(speech.openingStrike.includes('靜怡'));
  console.log(`✓ 過去卡話術生成：${speech.openingStrike} ${speech.formationOrBlindSpot}`);
}

console.log('\n【測試 3】性別非綁定驗證（女性高剛性 vs 男性外剛內柔）');
{
  const { core, behavior } = createBaseProfile();
  behavior.actionBias = 85;
  behavior.directness = 85;
  core.dominance = 85;
  behavior.decisionSpeed = 80;
  behavior.stubbornness = 85;
  core.controlNeed = 85;
  core.defensiveStrength = 80;
  behavior.helpSeeking = 10;

  // 女性宣告性別，但人格為內外皆剛
  const profileFemaleHard = deriveGenderExpressionProfile('FEMALE', core, behavior);
  assert.equal(profileFemaleHard.expressionStyle, 'HARD', '女性客戶若人格強悍，嚴禁強制柔化');
  
  const speech = generatePersonalizedCardSpeech({
    cardType: 'FUTURE',
    profile: profileFemaleHard,
    clientName: '女主管',
  });
  assert.equal(speech.attackVector, 'DIRECT_STRIKE');
  console.log(`✓ 女性高剛性驗證成功：風格 ${speech.style}，收尾刀: ${speech.finalStrike}`);
}

// 載入 time-cards 模組中的 calculateTextSimilarity
const timeCardsSrc = fs.readFileSync(path.join(root, 'lib/asura/ghost-asura-time-cards.ts'), 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const timeCards = { exports: {} };
new Function('module', 'exports', ts.transpileModule(timeCardsSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(timeCards, timeCards.exports);
const { calculateTextSimilarity } = timeCards.exports;

console.log('\n【測試 4】三張卡共用 ExpressionProfile 之去重與獨立性深度校驗');
{
  const { core, behavior } = createBaseProfile();
  behavior.actionBias = 85;
  behavior.directness = 85;
  core.dominance = 80;
  behavior.decisionSpeed = 80;
  behavior.helpSeeking = 70;
  behavior.stubbornness = 30;
  core.controlNeed = 35;
  core.defensiveStrength = 35;

  const profile = deriveGenderExpressionProfile('MALE', core, behavior);

  const past = generatePersonalizedCardSpeech({ cardType: 'PAST', profile, clientName: '威諺' });
  const present = generatePersonalizedCardSpeech({ cardType: 'PRESENT', profile, clientName: '威諺' });
  const future = generatePersonalizedCardSpeech({ cardType: 'FUTURE', profile, clientName: '威諺' });

  // 驗證 Opening、Joke、FinalStrike 彼此完全獨立，徹底消除三卡重複問題
  assert.notEqual(past.openingStrike, present.openingStrike, '開場白不可重複');
  assert.notEqual(present.openingStrike, future.openingStrike, '開場白不可重複');
  assert.notEqual(past.asuraJoke, present.asuraJoke, '黑色幽默梗不可重複');
  assert.notEqual(present.asuraJoke, future.asuraJoke, '黑色幽默梗不可重複');
  assert.notEqual(past.finalStrike, present.finalStrike, '收尾刀金句不可重複');
  assert.notEqual(present.finalStrike, future.finalStrike, '收尾刀金句不可重複');

  const textPast = `${past.openingStrike} ${past.formationOrBlindSpot} ${past.asuraJoke} ${past.finalStrike}`;
  const textPresent = `${present.openingStrike} ${present.formationOrBlindSpot} ${present.asuraJoke} ${present.finalStrike}`;
  const textFuture = `${future.openingStrike} ${future.formationOrBlindSpot} ${future.asuraJoke} ${future.finalStrike}`;

  const simPP = calculateTextSimilarity(textPast, textPresent);
  const simPF = calculateTextSimilarity(textPast, textFuture);
  const simPrF = calculateTextSimilarity(textPresent, textFuture);

  console.log(`✓ 三卡相似度檢驗：Past-Present: ${simPP}，Past-Future: ${simPF}，Present-Future: ${simPrF}`);
  assert.ok(simPP < 0.35, `Past-Present 相似度 ${simPP} 必須小於 0.35（遠低於 0.72 熔斷紅線）`);
  assert.ok(simPF < 0.35, `Past-Future 相似度 ${simPF} 必須小於 0.35`);
  assert.ok(simPrF < 0.35, `Present-Future 相似度 ${simPrF} 必須小於 0.35`);
}

console.log('\n【測試 5】姓名邊界防禦與聲律相容性（Sanitization & Length Bounds）');
{
  const { core, behavior } = createBaseProfile();
  const profile = deriveGenderExpressionProfile('UNSPECIFIED', core, behavior);

  // 測試異常與超長姓名注入
  const dirtyLongName = '亞歷山大·斯托揚諾夫！？';
  const speech = generatePersonalizedCardSpeech({
    cardType: 'PRESENT',
    profile,
    clientName: dirtyLongName,
  });

  const openingErrors = lintGenderExpressionOutput(speech.openingStrike);
  assert.deepEqual(openingErrors, [], `清洗後姓名開場違規: ${speech.openingStrike} -> ${openingErrors.join('; ')}`);
  console.log(`✓ 長名字與特殊符號防禦通過：原始「${dirtyLongName}」-> 開場句「${speech.openingStrike}」（零驚嘆/零過長）`);
}

console.log('\n【測試 6】全部六大風格三時態話術庫聲律檢測 (lintGenderExpressionOutput)');
{
  for (const [style, triplePack] of Object.entries(GENDER_EXPRESSION_VOICE_PACKS)) {
    for (const period of ['past', 'present', 'future']) {
      const item = triplePack[period];
      const texts = [
        item.openingTemplate('測試者'),
        item.narrative,
        item.asuraJoke,
        item.finalStrike,
      ];
      for (const text of texts) {
        const issues = lintGenderExpressionOutput(text);
        assert.deepEqual(issues, [], `風格 ${style}.${period} 違規: ${text} -> ${issues.join('; ')}`);
      }
    }
  }
  console.log('✓ 全部 6 大風格 × 3 時態（共 18 組文案）100% 通過聲律規範（≤16字斷句/零驚嘆/零發問/零命理術語/零性別刻板）');
}

console.log('\n【測試 7】6 大風格 × 3 時態路由互斥性與零共用全量驗證（Exhaustive Routing Independence Check）');
{
  const styles = Object.keys(GENDER_EXPRESSION_VOICE_PACKS);
  for (const style of styles) {
    const dummyProfile = {
      declaredSex: 'MALE',
      expressionStyle: style,
      outerHardness: 50,
      innerHardness: 50,
      emotionalDirectness: 50,
      emotionalSensitivity: 50,
      commandPreference: 50,
      confrontationTolerance: 50,
      careNeed: 50,
      autonomyNeed: 50,
      prideSensitivity: 50,
      trustThreshold: 50,
      communicationPreference: [],
      evidenceIds: [],
    };

    const past = generatePersonalizedCardSpeech({ cardType: 'PAST', profile: dummyProfile, clientName: '曾威諺' });
    const present = generatePersonalizedCardSpeech({ cardType: 'PRESENT', profile: dummyProfile, clientName: '曾威諺' });
    const future = generatePersonalizedCardSpeech({ cardType: 'FUTURE', profile: dummyProfile, clientName: '曾威諺' });

    // 1. 卡片週期標記正確路由
    assert.equal(past.period, 'PAST');
    assert.equal(present.period, 'PRESENT');
    assert.equal(future.period, 'FUTURE');

    // 2. 開場白 100% 互斥（不共用靜態開場）
    assert.notEqual(past.openingStrike, present.openingStrike, `${style}: Past 與 Present 開場白不可相同`);
    assert.notEqual(past.openingStrike, future.openingStrike, `${style}: Past 與 Future 開場白不可相同`);
    assert.notEqual(present.openingStrike, future.openingStrike, `${style}: Present 與 Future 開場白不可相同`);

    // 3. 核心解題主體 100% 互斥（過去解成因、現在解盲點、未來解代價）
    assert.notEqual(past.formationOrBlindSpot, present.formationOrBlindSpot, `${style}: 主體解題不可相同`);
    assert.notEqual(past.formationOrBlindSpot, future.formationOrBlindSpot, `${style}: 主體解題不可相同`);
    assert.notEqual(present.formationOrBlindSpot, future.formationOrBlindSpot, `${style}: 主體解題不可相同`);

    // 4. 黑色幽默梗 100% 互斥（不共用幽默梗）
    assert.notEqual(past.asuraJoke, present.asuraJoke, `${style}: Past 與 Present 幽默梗不可相同`);
    assert.notEqual(past.asuraJoke, future.asuraJoke, `${style}: Past 與 Future 幽默梗不可相同`);
    assert.notEqual(present.asuraJoke, future.asuraJoke, `${style}: Present 與 Future 幽默梗不可相同`);

    // 5. 致命收刀金句 100% 互斥（不共用收刀金句）
    assert.notEqual(past.finalStrike, present.finalStrike, `${style}: Past 與 Present 收刀金句不可相同`);
    assert.notEqual(past.finalStrike, future.finalStrike, `${style}: Past 與 Future 收刀金句不可相同`);
    assert.notEqual(present.finalStrike, future.finalStrike, `${style}: Present 與 Future 收刀金句不可相同`);

    console.log(`✓ 風格 ${style.padEnd(21)}：三時態 4 大欄位全部嚴格互斥，零靜態共用`);
  }
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('✅ GHOST_ASURA_GENDER_EXPRESSION_SKILL_V1 — 全部共用、防線與全量路由互斥驗證通過');
console.log('════════════════════════════════════════════════════════════\n');
