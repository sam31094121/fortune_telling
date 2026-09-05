/**
 * 三合一整合控制層守門測試
 * ============================================================================
 *
 * 鐵律：八字完成 && 紫微完成 && 易經完成 && 八字紫微四柱核對通過
 *       四項缺一，完整結果禁止成立。
 *
 * CLAUDE.md：立下鐵律必須同時生出 CI 測試——沒有測試的鐵律等於沒有鐵律。
 *
 * 這支測試最重要的一段是「四柱不一致」那一條。
 * 它在正常情況下**永遠不會發生**（兩層同源），所以無法靠真實輸入觸發。
 * 因此這裡直接把紫微引擎換掉，餵一份對不上的四柱進去，
 * 確認整條流程真的會停在 VERIFYING_FOUR_PILLARS、真的不往下走。
 *
 * 不這樣做的話，那道閘就只是「看起來有寫」——
 * 先前儀式關卡就是這樣變成擺設的（條件與前面的分支重複，永遠不會獨立失敗）。
 */

import fs from 'node:fs';
import path from 'node:path';
import * as ziweiEngine from '../lib/ziwei-sanfang-engine';
import {
  PILLAR_LABELS,
  ThreeInOneStateMachine,
  assertThreeInOnePassed,
  runThreeInOne,
  verifyFourPillars,
  type FourPillars,
  type ThreeInOneResult,
  type ThreeInOneStatus,
  type UnifiedInput,
} from '../lib/three-in-one';

const assertGate = (cond: boolean, label: string) => check(label, cond);
let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
  } else {
    fail += 1;
    console.error(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(label, same, same ? String(actual) : `實際 ${JSON.stringify(actual)}／應為 ${JSON.stringify(expected)}`);
}

function throws(label: string, fn: () => unknown, expectFragment: string) {
  try {
    fn();
    check(label, false, '沒有丟出例外');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(label, message.includes(expectFragment), message.slice(0, 110));
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   判準素材（專業命理師客訴後永久鎖定，見 CLAUDE.md）
   1974-07-02 03:30 女 → 甲寅／庚午／甲辰／丙寅
   ────────────────────────────────────────────────────────────────────────── */
const ANCHOR: UnifiedInput = {
  birthDate: '1974-07-02',
  birthTime: '03:30',
  gender: 'female',
};
const ANCHOR_PILLARS: FourPillars = { year: '甲寅', month: '庚午', day: '甲辰', hour: '丙寅' };

async function main() {
  console.log('\n【一】四柱核對函式本身');
  {
    const same = verifyFourPillars(ANCHOR_PILLARS, { ...ANCHOR_PILLARS });
    check('四柱逐字相同 → passed', same.passed === true && same.differences.length === 0);

    // 三柱相同也不算過。規格寫死：不是相近、不是三柱、不容錯。
    const threeOnly = verifyFourPillars(ANCHOR_PILLARS, { ...ANCHOR_PILLARS, hour: '丁卯' });
    check('只有三柱相同 → 不得通過', threeOnly.passed === false);
    eq('差異只列出時柱', threeOnly.differences.map((d) => d.pillar), ['hour']);
    eq('差異保留兩邊原值', threeOnly.differences[0], { pillar: 'hour', bazi: '丙寅', ziwei: '丁卯' });

    const allDiff = verifyFourPillars(ANCHOR_PILLARS, { year: '乙卯', month: '辛未', day: '乙巳', hour: '丁卯' });
    eq('四柱全不同 → 列四項', allDiff.differences.map((d) => d.pillar), ['year', 'month', 'day', 'hour']);

    // 空字串不等於「略過」。時柱缺值就是不一致，不得當成通過。
    const emptyHour = verifyFourPillars(ANCHOR_PILLARS, { ...ANCHOR_PILLARS, hour: '' });
    check('時柱為空 → 不得通過', emptyHour.passed === false);
  }

  console.log('\n【二】狀態機：異常與失敗都是終點');
  {
    const m = new ThreeInOneStateMachine();
    eq('起點為 WAITING_INPUT', m.status, 'WAITING_INPUT');
    m.to('BAZI_RUNNING');
    m.to('ZIWEI_RUNNING');
    m.to('VERIFYING_FOUR_PILLARS');
    m.to('YIJING_RUNNING');
    m.to('PASSED');
    eq('正常路徑走得完', m.trace, [
      'WAITING_INPUT', 'BAZI_RUNNING', 'ZIWEI_RUNNING', 'VERIFYING_FOUR_PILLARS', 'YIJING_RUNNING', 'PASSED',
    ]);

    throws('PASSED 之後不得再轉移', () => m.to('FAILED'), 'ILLEGAL_TRANSITION');

    const abnormal = new ThreeInOneStateMachine();
    abnormal.to('BAZI_RUNNING');
    abnormal.to('ZIWEI_RUNNING');
    abnormal.to('VERIFYING_FOUR_PILLARS');
    abnormal.to('ABNORMAL');
    throws('ABNORMAL → YIJING_RUNNING 必須被擋', () => abnormal.to('YIJING_RUNNING'), 'ILLEGAL_TRANSITION');
    throws('ABNORMAL → PASSED 必須被擋', () => abnormal.to('PASSED'), 'ILLEGAL_TRANSITION');

    const failed = new ThreeInOneStateMachine();
    failed.to('FAILED');
    throws('FAILED → PASSED 必須被擋', () => failed.to('PASSED'), 'ILLEGAL_TRANSITION');

    const skipper = new ThreeInOneStateMachine();
    throws('不得跳過八字直接跑紫微', () => skipper.to('ZIWEI_RUNNING'), 'ILLEGAL_TRANSITION');

    const skipVerify = new ThreeInOneStateMachine();
    skipVerify.to('BAZI_RUNNING');
    skipVerify.to('ZIWEI_RUNNING');
    throws('不得跳過四柱核對直接起卦', () => skipVerify.to('YIJING_RUNNING'), 'ILLEGAL_TRANSITION');
  }

  console.log('\n【三】正常流程：三套全部成立才算完整');
  const ok = await runThreeInOne(ANCHOR);
  {
    eq('狀態為 PASSED', ok.status, 'PASSED');
    check('success 與 completed 同時為真', ok.success === true && ok.completed === true);
    eq('走過的關卡順序固定', ok.trace, [
      'WAITING_INPUT', 'BAZI_RUNNING', 'ZIWEI_RUNNING', 'VERIFYING_FOUR_PILLARS', 'YIJING_RUNNING', 'PASSED',
    ]);

    assertThreeInOnePassed(ok);
    eq('八字四柱＝判準素材', {
      year: ok.result.bazi.year, month: ok.result.bazi.month,
      day: ok.result.bazi.day, hour: ok.result.bazi.hour,
    }, ANCHOR_PILLARS);
    eq('紫微四柱＝判準素材', ok.fourPillars.ziwei, ANCHOR_PILLARS);
    eq('核對零差異', ok.fourPillars.differences, []);
    eq('四項驗證全過', ok.verification, { fourPillars: true, bazi: true, ziwei: true, yijing: true });
    eq('前端四塊全開', ok.display, { bazi: true, ziwei: true, yijing: true, combined: true });
    check('易經卦象成立', ok.result.yijing.status === 'READY' && ok.result.yijing.reading.hexagramName.length > 0,
      `${ok.result.yijing.reading.hexagramName} → ${ok.result.yijing.patternName}`);
    check('儀式已走完', ok.result.yijing.ritual.completed === true);
    eq('命盤指紋綁四柱', ok.result.yijing.ritual.chartFingerprint, '甲寅|庚午|甲辰|丙寅');
    eq('檢核清單五項全過', ok.checklist.map((i) => i.state), ['PASSED', 'PASSED', 'PASSED', 'PASSED', 'PASSED']);
  }

  console.log('\n【三之二】四張紫微神獸卡：後端產出，綁在三合一裡');
  {
    assertThreeInOnePassed(ok);
    const cards = ok.result.starBeasts;
    eq('四張卡：命宮、遷移、官祿、財帛', cards.map((c) => c.palaceKey), ['MING', 'QIAN_YI', 'GUAN_LU', 'CAI_BO']);

    for (const card of cards) {
      check(`${card.palaceName}：有神獸`, card.beastName.length > 0, `${card.beastName}（${card.seasonLabel}）`);
      check(`${card.palaceName}：有圖`, card.beastImage.length > 0);
      check(`${card.palaceName}：卡號在 1–28`, card.beastId >= 1 && card.beastId <= 28, String(card.beastId));
      // 依據要說得出來——前端只顯示，不自己補說明
      check(`${card.palaceName}：有推導依據`, card.evidence.includes(card.palaceName) && card.evidence.length >= 10,
        card.evidence.slice(0, 40));
      check(`${card.palaceName}：依據要標明四象方位`, card.evidence.includes(card.seasonLabel));
    }

    // 同一張命盤跑兩次，四張卡必須一模一樣（可回查）
    const again = await runThreeInOne(ANCHOR);
    if (again.status === 'PASSED') {
      eq('同一命盤 → 同樣四張卡',
        again.result.starBeasts.map((c) => c.beastId), cards.map((c) => c.beastId));
    }

    // 換一個人就該是另一組（否則等於沒在看命盤）
    const other = await runThreeInOne({ birthDate: '1990-05-20', birthTime: '14:00', gender: 'male' });
    if (other.status === 'PASSED') {
      check('換人 → 神獸組合不得完全相同',
        JSON.stringify(other.result.starBeasts.map((c) => c.beastId)) !== JSON.stringify(cards.map((c) => c.beastId)),
        other.result.starBeasts.map((c) => `${c.palaceName}:${c.beastName}`).join(' '));
    }
  }

  console.log('\n【四】三套共用同一份出生資料');
  {
    const again = await runThreeInOne({ ...ANCHOR });
    assertThreeInOnePassed(again);
    eq('同一份輸入跑兩次，四柱完全一致', again.fourPillars.bazi, ok.fourPillars.bazi);
    eq('同一份輸入跑兩次，卦象一致', again.result.yijing.reading.hexagramName, ok.result.yijing.reading.hexagramName);

    // 換一個人就必須是另一張命盤，不得共用上一次的結果。
    const other = await runThreeInOne({ birthDate: '1990-05-20', birthTime: '14:00', gender: 'male' });
    assertThreeInOnePassed(other);
    check('換人 → 命盤指紋不同',
      other.result.yijing.ritual.chartFingerprint !== ok.result.yijing.ritual.chartFingerprint,
      other.result.yijing.ritual.chartFingerprint);
  }

  console.log('\n【四之二】直接給時辰地支序（姓名學、紅鸞這類本來就讓客戶選十二時辰的卡）');
  {
    const byIndex = await runThreeInOne({
      birthDate: ANCHOR.birthDate, birthTime: null, hourBranchIndex: 2, gender: 'female',
    });
    eq('地支序也走得完整流程', byIndex.status, 'PASSED');
    if (byIndex.status === 'PASSED') {
      eq('與 HH:mm 走出同一組四柱', byIndex.fourPillars.bazi, ok.fourPillars.bazi);
      eq('與 HH:mm 走出同一顆卦',
        byIndex.result.yijing.reading.hexagramName, ok.result.yijing.reading.hexagramName);
    }
    // 地支序優先於 birthTime——兩者衝突時不得各算各的
    const conflict = await runThreeInOne({
      birthDate: ANCHOR.birthDate, birthTime: '23:00', hourBranchIndex: 2, gender: 'female',
    });
    if (conflict.status === 'PASSED') {
      eq('地支序優先，不受 birthTime 干擾', conflict.fourPillars.bazi.hour, '丙寅');
    } else {
      check('地支序優先，不受 birthTime 干擾', false, conflict.status);
    }
  }

  console.log('\n【五】無時辰：要有「沒有時辰」的算法，而且要照實講');
  {
    const noTime = await runThreeInOne({ ...ANCHOR, birthTime: null });
    eq('狀態為 TIME_UNKNOWN（不是 FAILED——這不是壞掉）', noTime.status, 'TIME_UNKNOWN');
    eq('八字算完就分流，不再空跑紫微', noTime.trace, ['WAITING_INPUT', 'BAZI_RUNNING', 'TIME_UNKNOWN']);
    check('三合一不得成立', noTime.completed === false);

    if (noTime.status === 'TIME_UNKNOWN') {
      // 三柱本來就不依賴時辰，照給
      eq('年月日三柱照給', noTime.threePillars, { year: '甲寅', month: '庚午', day: '甲辰' });
      eq('八字可顯示', noTime.display.bazi, true);
      eq('紫微不顯示', noTime.display.ziwei, false);
      eq('三合一不成立', noTime.display.combined, false);

      const m = noTime.noHourMethod;
      eq('四層都要交代（含神獸卡）', m.layers.map((l) => l.layer), ['八字', '紫微', '神獸卡', '易經']);
      eq('八字算得出來', m.layers[0].available, true);
      eq('紫微不算', m.layers[1].available, false);
      eq('神獸卡不給', m.layers[2].available, false);
      eq('易經改走象徵起卦，算得出來', m.layers[3].available, true);

      // 每一層都要有「怎麼算」與「為什麼只能這樣」，不能只有一句系統限制
      for (const layer of m.layers) {
        check(`${layer.layer}：說明方法`, layer.method.length >= 15, layer.method.slice(0, 30));
        check(`${layer.layer}：說明原因`, layer.reason.length >= 15, layer.reason.slice(0, 30));
      }

      check('紫微要講出命宮定不了的機制', m.layers[1].reason.includes('命宮'));
      check('神獸卡要講出依賴命宮', m.layers[2].reason.includes('命宮'));
      check('神獸卡要說明時柱那張也不給', m.layers[2].method.includes('時柱那張不給'));
      check('易經要明說不是生辰卦', m.layers[3].reason.includes('不是你的生辰卦'));
      check('要說明核對為何不執行', m.crossCheck.includes('沒有排盤'));
      check('要說明補時辰能解鎖什麼', m.unlock.includes('補上出生時辰'));

      // 不能用騙的
      check('誠實聲明：沒有用預設時辰補', m.honesty.includes('沒有用預設時辰'));
      check('誠實聲明：沒有把象徵卦說成生辰卦', m.honesty.includes('象徵卦說成生辰卦'));

      const allText = JSON.stringify(m);
      check('全份說明不得提到以午時代替', !allText.includes('以午時計') && !allText.includes('預設午時'));
    }

    throws('未通過時 assert 仍要擋下', () => assertThreeInOnePassed(noTime), 'THREE_IN_ONE_NOT_PASSED');
  }

  console.log('\n【六】輸入無法辨識：什麼都不顯示');
  {
    const bad = await runThreeInOne({ ...ANCHOR, birthDate: '74/7/2' });
    eq('狀態為 FAILED', bad.status, 'FAILED');
    check('失敗類型為輸入無效', bad.status === 'FAILED' && bad.failureType === 'INPUT_INVALID');
    eq('四塊全關', bad.display, { bazi: false, ziwei: false, yijing: false, combined: false });
  }

  /* ────────────────────────────────────────────────────────────────────────
     【七】四柱不一致 —— 這一段是整份規格的核心

     正常情況下兩層同源，永遠不會不一致，所以這裡直接把紫微引擎換掉，
     餵一份對不上的四柱進去，確認流程真的會停住。

     不做這件事，這道閘就只是「看起來有寫」。
     ──────────────────────────────────────────────────────────────────────── */
  console.log('\n【七】四柱不一致：立即停止、不顯示、不自動修正');
  {
    const original = ziweiEngine.calculateZiweiSanFang;
    const patched = (...args: Parameters<typeof original>) => {
      const real = original(...args);
      // 只動月柱，其餘照真實結果——模擬「某一段資料傳遞跑掉」。
      return { ...real, bazi: { ...real.bazi, month: '辛未' } };
    };
    (ziweiEngine as { calculateZiweiSanFang: typeof original }).calculateZiweiSanFang = patched;

    let abnormal: ThreeInOneResult;
    try {
      abnormal = await runThreeInOne(ANCHOR);
    } finally {
      (ziweiEngine as { calculateZiweiSanFang: typeof original }).calculateZiweiSanFang = original;
    }

    // 先確認注入本身真的生效——注入沒觸發 ≠ 防線有效。
    check('注入確實生效（狀態不是 PASSED）', abnormal.status !== 'PASSED', abnormal.status);

    eq('狀態為 ABNORMAL', abnormal.status, 'ABNORMAL');
    if (abnormal.status === 'ABNORMAL') {
      eq('異常類型', abnormal.abnormalType, 'FOUR_PILLARS_MISMATCH');
      eq('異常來源', abnormal.source, 'BAZI_ZIWEI_CROSS_CHECK');
      eq('停在核對那一關，沒有進入易經', abnormal.trace, [
        'WAITING_INPUT', 'BAZI_RUNNING', 'ZIWEI_RUNNING', 'VERIFYING_FOUR_PILLARS', 'ABNORMAL',
      ]);
      check('trace 不得出現 YIJING_RUNNING',
        !abnormal.trace.includes('YIJING_RUNNING' as ThreeInOneStatus));

      eq('報告指出是月柱', abnormal.report.differences.map((d) => d.pillar), ['month']);
      eq('報告保留兩邊原值', abnormal.report.differences[0], { pillar: 'month', bazi: '庚午', ziwei: '辛未' });

      // 禁止自動把其中一套改成另一套——這個機制本身就是用來抓系統跑掉。
      eq('八字月柱原封不動', abnormal.fourPillars.bazi.month, '庚午');
      eq('紫微月柱原封不動（不得被偷偷改成八字的）', abnormal.fourPillars.ziwei.month, '辛未');

      eq('紫微不顯示', abnormal.display.ziwei, false);
      eq('易經不顯示', abnormal.display.yijing, false);
      eq('三合一不成立', abnormal.display.combined, false);
      eq('八字仍可顯示', abnormal.display.bazi, true);
      eq('yijing 驗證為假', abnormal.verification.yijing, false);
      eq('fourPillars 驗證為假', abnormal.verification.fourPillars, false);

      // 不能只寫 Console：給客戶看的整段文字要由後端產出，前端只顯示。
      const message = abnormal.report.customerMessage;
      check('客戶訊息載明已停止運算', message.includes('系統已停止本次運算'));
      check('客戶訊息列出異常項目', message.includes(PILLAR_LABELS.month));
      check('客戶訊息列出兩邊的值', message.includes('庚午') && message.includes('辛未'));
      check('客戶訊息載明紫微不顯示', message.includes('本次紫微結果不顯示'));
      check('客戶訊息載明三合一不成立', message.includes('三合一結果不成立'));

      const states = abnormal.checklist.map((i) => `${i.id}:${i.state}`);
      eq('檢核清單：八字紫微打勾、核對打叉、其後未進入', states, [
        'BAZI:PASSED', 'ZIWEI:PASSED', 'FOUR_PILLARS:ABNORMAL', 'YIJING:PENDING', 'COMBINED:PENDING',
      ]);

      throws('異常時 assert 必須擋下', () => assertThreeInOnePassed(abnormal), 'THREE_IN_ONE_NOT_PASSED');
    }
  }

  console.log('\n【八】還原後必須回到正常');
  {
    const restored = await runThreeInOne(ANCHOR);
    eq('注入還原後回到 PASSED', restored.status, 'PASSED');
  }

  console.log('\n【九】前端顯示閘：不能偷偷跳過');
  {
    const gate = fs.readFileSync(path.resolve(process.cwd(), 'components/ThreeInOneGate.tsx'), 'utf8');

    // children＝完整結果。只有 PASSED 那一支可以渲染它，其餘兩支都不行。
    const passedBranch = gate.slice(
      gate.indexOf("result.status === 'PASSED'"),
      gate.indexOf("result.status === 'ABNORMAL'"),
    );
    const restBranches = gate.slice(gate.indexOf("result.status === 'ABNORMAL'"));
    check('PASSED 分支才渲染完整結果', passedBranch.includes('{children}'));
    check('異常與失敗分支一律不得渲染完整結果', !restBranches.includes('{children}'));

    check('三種狀態都要有可辨識標記',
      gate.includes('data-three-in-one="PASSED"')
      && gate.includes('data-three-in-one="ABNORMAL"')
      && gate.includes('data-three-in-one="FAILED"'));

    // 前端不准編結論：異常說明必須來自後端，不得在元件裡自己寫一段。
    check('客戶訊息來自後端欄位', gate.includes('result.report.customerMessage'));
    check('差異兩邊原值都照實顯示', gate.includes('diff.bazi') && gate.includes('diff.ziwei'));
    check('不得在前端自行判斷是否通過', !/verifyFourPillars|differences\.length ===/.test(gate));
  }

  console.log('\n【九之二】無時辰說明必須攤開，不得折疊藏起來');
  {
    const gate = fs.readFileSync(path.resolve(process.cwd(), 'components/ThreeInOneGate.tsx'), 'utf8');
    const branch = gate.slice(gate.indexOf("result.status === 'TIME_UNKNOWN'"), gate.indexOf('data-three-in-one="FAILED"'));
    assertGate(branch.length > 0, '必須有無時辰模式的分支');
    check('三層說明逐一列出', branch.includes('noHourMethod.layers.map'));
    check('每一層標明算不算得出來', branch.includes('layer.available'));
    check('顯示怎麼算', branch.includes('layer.method'));
    check('顯示為什麼只能這樣算', branch.includes('layer.reason'));
    check('顯示誠實聲明', branch.includes('noHourMethod.honesty'));
    check('顯示補時辰能解鎖什麼', branch.includes('noHourMethod.unlock'));
    // 藏起來就不算告知：這一段不得包在 details/summary 裡
    check('說明不得折疊', !branch.includes('<details') && !branch.includes('<summary'));
    check('無時辰時不得渲染完整結果', !branch.includes('{children}'));
  }

  console.log('\n【九之三】神獸卡：前端不得自己推，也不得無條件渲染');
  {
    const insight = fs.readFileSync(path.resolve(process.cwd(), 'app/insight/page.tsx'), 'utf8');
    check('前端不得再自行推導神獸', !insight.includes('deriveZiweiStarBeastLink'));
    check('神獸改由後端三合一提供', insight.includes('starBeasts?.find((card) => card.palaceKey === key)'));
    check('沒有卡就不畫，改講為什麼', insight.includes('data-star-beasts="UNAVAILABLE"'));
    check('有卡才畫神獸區塊', insight.includes('data-star-beasts="READY"'));
    check('無時辰時原因取自後端無時辰算法', insight.includes("layer.layer === '神獸卡'"));

    // 推導規則本身仍留在既有引擎，沒有被重寫成第二套
    const link = fs.readFileSync(path.resolve(process.cwd(), 'lib/ziwei-star-beast-link.ts'), 'utf8');
    check('神獸推導規則仍在既有引擎', link.includes('export function deriveZiweiStarBeastLink'));
    const tio = fs.readFileSync(path.resolve(process.cwd(), 'lib/three-in-one.ts'), 'utf8');
    check('三合一是呼叫既有引擎，不是另寫一套', tio.includes('deriveZiweiStarBeastLink('));
    check('三合一沒有自己重寫四象對照表',
      !/SEASON_BY_BRANCH|STAR_ELEMENT\s*[:=]\s*\{/.test(tio));
  }

  console.log(`\n三合一整合層 — PASS ${pass} / FAIL ${fail}`);
  if (fail > 0) process.exit(1);
  console.log('THREE_IN_ONE_CERTIFIED=true');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
