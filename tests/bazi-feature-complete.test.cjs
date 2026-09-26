// 八字「功能完整」檢查——和 tests/bazi-traditional-gate.test.ts（只證明「擋得對」）刻意分開，
// 擋得對不能代替功能完整。這裡要求每一項客戶可見功能都真的放行（VERIFIED／ready），
// 任何一項未放行即 FAIL，並逐項列名。只讀來源登記，不修改。
const { loadTs } = require('../scripts/bazi-registry-completeness.cjs');
const fs = require('node:fs');
const path = require('node:path');

function evaluateFeatures(registryOverride) {
  const root = path.resolve(__dirname, '..');
  const registry = registryOverride ?? JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/八字/來源登記.json'), 'utf8'));
  const sourceGate = loadTs('lib/iching-source-gate.ts');
  const gateModule = loadTs('lib/bazi-traditional-gate.ts', {
    './iching-source-gate': sourceGate,
    '../docs/技能戰鬥檔案/八字/來源登記.json': registry,
  });
  const gate = gateModule.getBaziTraditionalOutputGate(true);
  const ruleNames = { tianyi: '天乙', wenchang: '文昌', taohua: '桃花', yima: '驛馬', huagai: '華蓋' };
  const rule = (key) => gate.shenShaRules[key];
  const capabilities = [
    { id: 'CORE_CHART', title: '基礎四柱排盤', ready: gate.coreReady, detail: `C-BAZI-CHART=${gate.coreStatus}` },
    ...Object.entries(ruleNames).map(([key, name]) => ({
      id: `SHENSHA_${key.toUpperCase()}`,
      title: `四柱神煞・${name}`,
      ready: Boolean(rule(key) && rule(key).ready),
      detail: `${gateModule.BAZI_SHENSHA_CLAIMS[key]}=${rule(key) ? rule(key).status : '缺登記'}${rule(key) && rule(key).reasons.length ? `（${rule(key).reasons.join('；')}）` : ''}`,
    })),
    { id: 'PILLAR_SHENSHA', title: '四柱神煞整列', ready: gate.shenShaReady, detail: `shenShaStatus=${gate.shenShaStatus}` },
    { id: 'TEACHER_INTERPRETATION', title: '八字老師進階判讀（格局、旺衰、斷語）', ready: gate.interpretationReady, detail: `C-BAZI-CLASSICS=${gate.classicsStatus}、C-BAZI-FIVE-GODS=${gate.fiveGodsStatus}` },
    { id: 'FIVE_GODS', title: '五神（用神、喜神、忌神、仇神、閒神）', ready: gate.coreReady && gate.fiveGodsStatus === 'VERIFIED', detail: `C-BAZI-FIVE-GODS=${gate.fiveGodsStatus}` },
    { id: 'RED_LUAN', title: '配對紅鸞', ready: gate.redLuanReady, detail: `C-RED-LUAN-SHENSHA=${gate.redLuanStatus}` },
  ];
  return { ok: capabilities.every((c) => c.ready), capabilities };
}

module.exports = { evaluateFeatures };

if (require.main === module) {
  const report = evaluateFeatures();
  for (const c of report.capabilities) console.log(`${c.ready ? 'READY' : 'NOT READY'}: ${c.title} — ${c.detail}`);
  const missing = report.capabilities.filter((c) => !c.ready);
  if (missing.length) {
    console.log(`FAIL: bazi feature complete — ${missing.length}/${report.capabilities.length} 項未放行：${missing.map((c) => c.title).join('、')}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: bazi feature complete — ${report.capabilities.length} 項客戶功能全數放行`);
  }
}
