/**
 * 禁止代填時辰守門測試
 * ============================================================================
 *
 * 2026-09-05 巡檢發現：lib/iching-engine.ts 的生辰起卦在時辰未知時
 * 自動以午時（第 7 支）計。沒填時辰的客戶，拿到的是用假時辰起的卦，
 * 而且在星座卡的「本週建議」與 AI 摘要的「易經卜卦判定」裡被寫成斷言。
 *
 * 這與 three-core-engine 自己寫的 unknownTimePolicy
 * 「不代填時辰、不硬排命宮、不硬起卦」直接矛盾。
 *
 * 這支測試把它釘死：寧可不出卦，不出假卦。
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/** 去掉註解，只留真的會執行的程式碼。
 *  註解為了說明舊 bug 而引用那句話是允許的——這一點先前在
 *  insight/page.tsx 的「超越全國」上踩過同樣的坑。
 *
 *  用逐行狀態機而不是正規表示式：區塊註解的內文常常不是以 * 開頭，
 *  只濾開頭符號會漏掉一整段（實測就是這樣漏的）。 */
function codeOnly(source) {
  const out = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      continue;
    }
    if (t.startsWith('/*')) {
      if (!t.includes('*/')) inBlock = true;
      continue;
    }
    if (t.startsWith('//')) continue;
    out.push(line);
  }
  return out.join('\n');
}

/* ── 一、引擎本身必須擋下未知時辰 ─────────────────────────────────── */
{
  const source = read('lib/iching-engine.ts');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  // 引擎裡的相對匯入要以 lib/ 為基準解析，不是 tests/
  const libRequire = (id) => require(id.startsWith('.') ? path.join(root, 'lib', id) : id);
  const ctx = { exports: {}, module: { exports: {} }, require: libRequire };
  ctx.module.exports = ctx.exports;
  vm.runInNewContext(compiled, ctx);
  const { castHexagramFromBirth, castHexagram } = ctx.exports;

  for (const bad of [null, undefined, NaN, -1, 12, 7.5, '3']) {
    assert.throws(
      () => castHexagramFromBirth('1974-07-02', bad),
      /ICHING_HOUR_FABRICATED/,
      `時辰為 ${String(bad)} 時必須擋下，不得代填`,
    );
  }

  // 有真時辰就要正常出卦，而且同一組輸入永遠同一卦（可回查）
  const yin = castHexagramFromBirth('1974-07-02', 2);
  const again = castHexagramFromBirth('1974-07-02', 2);
  assert.equal(yin.hexagramName, again.hexagramName, '同一生辰時辰必須是同一卦');
  assert.ok(yin.seedText.includes('時辰3'), '起卦依據要能回查：' + yin.seedText);

  // 不同時辰要有不同的起卦依據——否則代不代填根本沒差，這道鎖就沒有意義
  const noon = castHexagramFromBirth('1974-07-02', 6);
  assert.notEqual(
    yin.seedText,
    noon.seedText,
    '不同時辰必須產生不同的起卦依據，否則代填與否沒有差異',
  );

  // 時辰未知時的正當出路：象徵起卦，必須自己帶明示標籤
  const symbolic = castHexagram('王小明', '1974-07-02', '姓名象徵參考');
  assert.ok(symbolic.seedText.includes('姓名象徵參考'), '象徵起卦必須在依據裡標明不是生辰卦');
}

/* ── 二、原本那行代填不得回來 ─────────────────────────────────────── */
{
  const source = read('lib/iching-engine.ts');
  const code = codeOnly(source);
  assert.ok(
    !code.includes(': 7;') && !code.includes('未知時辰以午時'),
    'lib/iching-engine.ts 不得再以午時（第 7 支）代填未知時辰',
  );
  assert.ok(
    source.includes('ICHING_HOUR_FABRICATED'),
    '生辰起卦必須丟出 ICHING_HOUR_FABRICATED 擋下未知時辰',
  );
}

/* ── 三、呼叫端不得再傳死的 null 進生辰起卦 ───────────────────────── */
{
  const callers = [
    'lib/gemini.ts',
    'lib/zodiac-engine.ts',
    'lib/insight-engine.ts',
    'lib/iching-psychology.ts',
    'lib/red-luan-iching-reading.ts',
    'app/api/nameology-analyze/route.ts',
  ];
  for (const file of callers) {
    const code = codeOnly(read(file));
    assert.ok(
      !/castHexagramFromBirth\([^)]*,\s*null\s*\)/.test(code),
      `${file} 不得把 null 當時辰傳進生辰起卦——那等於要求引擎代填`,
    );
    assert.ok(
      !/castHexagramFromBirth\([^)]*\?\?\s*null\s*\)/.test(code),
      `${file} 不得用 ?? null 把未知時辰餵進生辰起卦`,
    );
  }
}

/* ── 四、沒有卦的地方，不得叫 AI 端出卦 ───────────────────────────── */
{
  // gemini 的兩支提示詞都沒有時辰可用，所以整份不該再出現生辰起卦，
  // 也不該再要求 AI 用「易經卜卦判定」開頭——那等於逼它自己編一個卦。
  const gemini = read('lib/gemini.ts');
  const geminiCode = codeOnly(gemini);
  assert.ok(
    !geminiCode.includes('castHexagramFromBirth'),
    'lib/gemini.ts 沒有時辰可用，不得起生辰卦',
  );
  assert.ok(
    !gemini.includes('全部使用「易經卜卦判定」'),
    '沒有卦時不得要求 AI 用「易經卜卦判定」開頭，那會逼它自己編卦',
  );
  assert.ok(
    gemini.includes('禁止使用「易經卜卦判定」'),
    '必須明文禁止 AI 把結論掛在不存在的卦上',
  );
}

/* ── 五、時辰未知時，畫面要給補時辰的出路，不是死路 ───────────────── */
{
  const zodiac = read('lib/zodiac-engine.ts');
  assert.ok(
    zodiac.includes('shichenFromClockHour'),
    '星座卡本來就收了 birthTime，有時間時必須用真時辰起卦',
  );
  assert.ok(
    zodiac.includes('補上出生時間'),
    '星座卡沒有出生時間時，必須給補時間的出路',
  );

  const insight = read('lib/insight-engine.ts');
  assert.ok(
    /補上時辰即可解鎖|補上時辰後/.test(insight),
    '紫微卡時辰未知時，必須給補時辰的出路',
  );
  assert.ok(
    insight.includes('沒有卦就不要提卦'),
    '沒有卦時必須明文禁止 AI 自行編卦',
  );
}

/* ── 六、共感層與紅鸞：時辰是必填，型別就要鎖死 ───────────────────── */
{
  const psychology = read('lib/iching-psychology.ts');
  assert.ok(
    /export function buildEmpathicReading\(name: string, birthDate: string, shichenIndex: number\)/.test(psychology),
    'buildEmpathicReading 的時辰必須是必填的 number，不得再接受 null',
  );

  const redLuan = read('lib/red-luan-iching-reading.ts');
  assert.ok(
    !/shichenIndex\?: number \| null/.test(redLuan),
    '紅鸞起卦的時辰必須是必填，不得是可選或可為 null',
  );
}

console.log('PASS: 生辰起卦不得代填午時；沒有時辰就不出卦，改給補時辰的出路');
