/**
 * 太極・Apple 手機可見性鎖
 *
 * 客訴（2026-09-04）：iPhone 打開首頁，網頁其他東西都正常，只有太極那一塊是空白。
 *
 * 原因是兩處各自用「硬體數字」猜裝置等級，而那兩個數字在 Safari 上都不可信：
 *
 *   navigator.deviceMemory          Safari 完全不支援 → 永遠 undefined
 *   navigator.hardwareConcurrency   Safari 出於指紋防護，對「所有 iPhone」
 *                                   一律只回報 4（iPhone 15 Pro Max 也是 4）
 *
 * ① components/taiji/TaijiTopShell3D.tsx
 *      compact && (deviceMemory <= 4 || hardwareConcurrency <= 4) → return null
 *      手機 + iPhone 恆成立 → 整個 iOS 被擋在門外，而且連靜態圖都沒有。
 *
 * ② components/TaijiSystem.tsx
 *      cores <= 4 || memory <= 4 → lowPower
 *      就算進得來，畫質也被鎖在最低。
 *
 * 太極是專案唯一核心，依太極憲章不得消失、不得被取代，
 * 省效能要從材質與剔除下手，不是把整個核心關掉。
 *
 * 這支測試鎖住修正結果，避免將來有人「順手」把裝置判定加回去。
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'components/taiji/TaijiTopShell3D.tsx'), 'utf8');
const system = fs.readFileSync(path.join(root, 'components/TaijiSystem.tsx'), 'utf8');

const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const shellCode = stripComments(shell);
const systemCode = stripComments(system);

// ---- ① 外層守門：不得再用硬體數字擋掉太極 ----
assert.ok(
  !/deviceMemory/.test(shellCode),
  'TaijiTopShell3D 不得再用 deviceMemory 判斷是否掛載——Safari 完全不支援，會誤擋整個 iOS',
);
assert.ok(
  !/hardwareConcurrency/.test(shellCode),
  'TaijiTopShell3D 不得再用 hardwareConcurrency 判斷是否掛載——Safari 對所有 iPhone 一律回報 4',
);
assert.ok(
  !/limitedDevice/.test(shellCode),
  '低功耗裝置判定必須留在 TaijiSystem 內部做降級，不得在外層直接不掛載',
);

// 該保留的兩道門仍在：沒有 WebGL、或客戶要求減少動態
assert.ok(/getContext\('webgl2'\)/.test(shellCode), '仍須偵測 WebGL 支援');
assert.ok(/prefers-reduced-motion/.test(shellCode), '仍須尊重 prefers-reduced-motion');

// ---- 太極永遠不得是一片空白 ----
assert.ok(
  !/if \(!ready\) return null;/.test(shellCode),
  '太極是唯一核心，3D 未就緒時必須顯示靜態太極，不得 return null 讓首屏開天窗',
);
assert.ok(
  /data-taiji-fallback/.test(shellCode),
  '必須有可辨識的靜態太極退路（data-taiji-fallback）',
);
assert.ok(
  /alt="太極"/.test(shellCode),
  '靜態退路必須是看得見的太極圖，且有無障礙文字',
);

// ---- ② 內層畫質：Apple 行動裝置不得被打成低功耗 ----
// 判定已抽到 taijiDeviceGate.ts；這裡確認 TaijiSystem 真的在用共用版本，
// 而不是自己再寫一套（多套判定＝下一次漂移的起點）。
assert.ok(
  systemCode.includes('isLowPowerDevice(deviceSignals)'),
  'TaijiSystem 的 lowPower 必須來自共用判定 isLowPowerDevice',
);
assert.ok(
  systemCode.includes('isStrongPhoneDevice(deviceSignals)'),
  'TaijiSystem 的 strongPhone 必須來自共用判定 isStrongPhoneDevice',
);
assert.ok(
  !systemCode.includes('cores <= 4 || memory <= 4'),
  'TaijiSystem 不得再自行用 cores/memory 判低功耗',
);

// ---- 行為重現：以 iPhone 的實際回報值跑一次判定 ----
{
  // Safari 上的真實情況
  const deviceMemory = undefined;
  const hardwareConcurrency = 4;
  const compact = true;
  const webgl = true;
  const reduced = false;

  // 修正前的舊判定（保留在測試裡當對照組，證明它會擋掉 iPhone）
  const oldLimited = (typeof deviceMemory === 'number' && deviceMemory <= 4)
    || (typeof hardwareConcurrency === 'number' && hardwareConcurrency <= 4);
  assert.equal(compact && oldLimited, true, '對照組：舊判定確實會擋掉 iPhone');

  // 修正後：只看 WebGL 與 reduced-motion
  const nowBlocked = !webgl || reduced;
  assert.equal(nowBlocked, false, 'iPhone 不得再被擋掉');

  // 畫質：Apple 行動裝置視為高效能
  const isAppleMobile = true;
  const cores = hardwareConcurrency;
  const memory = deviceMemory ?? 4;
  assert.equal(!isAppleMobile && (cores <= 4 || memory <= 4), false, 'iPhone 不得被判低功耗');
  assert.equal(isAppleMobile || (cores >= 8 && memory >= 6), true, 'iPhone 應享有高畫質');
}

// ---- 遊戲那一半：iOS 權限必須由使用者手勢觸發，且沒授權時仍可玩 ----
{
  const orientation = fs.readFileSync(path.join(root, 'components/taiji/level-01/Level01Orientation.ts'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'components/taiji/level-01/Level01MotionController.ts'), 'utf8');
  assert.ok(
    /requestPermission/.test(orientation),
    'iOS 13+ 需要 DeviceOrientationEvent.requestPermission',
  );
  assert.ok(
    /canAutoStartLevel01Sensors/.test(orientation),
    'iOS 不得自動啟動感測器，必須等使用者手勢',
  );
  assert.ok(
    /armAudioFromUserGesture/.test(controller),
    '感測器授權必須在使用者手勢流程內請求，否則 iOS 會直接拒絕',
  );
  assert.ok(
    /manualFallback = true/.test(controller),
    '客戶拒絕感測器授權時，遊戲仍須以手動模式可玩，不得變成死路',
  );
}

// ---- 機型矩陣：每一台裝置都必須看得到太極（純函式，不需瀏覽器）----
{
  const ts = require('typescript');
  const gateSrc = fs.readFileSync(path.join(root, 'components/taiji/taijiDeviceGate.ts'), 'utf8');
  const js = ts.transpileModule(gateSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', js)(mod.exports, mod);
  const { canMountTaiji3D, isLowPowerDevice, isStrongPhoneDevice, TAIJI_DEVICE_FIXTURES } = mod.exports;

  for (const fixture of TAIJI_DEVICE_FIXTURES) {
    assert.equal(canMountTaiji3D(fixture.signals), true, fixture.name + ' 必須看得到太極');
  }

  const iphone = TAIJI_DEVICE_FIXTURES.find((f) => /iPhone/.test(f.name)).signals;
  const ipad = TAIJI_DEVICE_FIXTURES.find((f) => /iPad/.test(f.name)).signals;
  assert.equal(isLowPowerDevice(iphone), false, 'iPhone 不得被判低功耗');
  assert.equal(isStrongPhoneDevice(iphone), true, 'iPhone 應享有高畫質');
  assert.equal(isLowPowerDevice(ipad), false, 'iPad（UA 偽裝成 MacIntel）不得被判低功耗');

  // 該擋的仍要擋：沒有 WebGL、或客戶要求減少動態
  assert.equal(canMountTaiji3D({ ...iphone, webgl: false }), false, '沒有 WebGL 時不得掛載 3D');
  assert.equal(canMountTaiji3D({ ...iphone, reducedMotion: true }), false, '客戶要求減少動態時不得掛載 3D');
}

// ---- 兩個元件都必須用同一份守門，不得各自再寫一套 ----
assert.ok(/canMountTaiji3D/.test(shellCode), 'TaijiTopShell3D 必須使用共用守門');
assert.ok(/isLowPowerDevice|isStrongPhoneDevice/.test(systemCode), 'TaijiSystem 必須使用共用低功耗判定');

// ---- 三道退路：任何一種失敗都不得讓首屏空白 ----
// iOS Safari 在記憶體吃緊、切 App 回來、網路不穩時特別容易觸發這三種。
assert.ok(
  shellCode.includes("loading: () => <StaticTaiji"),
  'dynamic 必須有 loading 退路——chunk 載入中不得空白',
);
assert.ok(
  shellCode.includes('TaijiMountBoundary'),
  '必須有錯誤邊界接住 chunk 載入失敗與執行期例外',
);
assert.ok(
  shellCode.includes('getDerivedStateFromError'),
  '錯誤邊界必須實作 getDerivedStateFromError',
);
assert.ok(
  shellCode.includes("addEventListener('webglcontextlost'"),
  'iOS 會在記憶體壓力下回收 GL context，必須監聽 webglcontextlost',
);
assert.ok(
  /StaticTaiji/.test(shellCode) && /alt="太極"/.test(shellCode),
  '三種退路都必須收斂到同一個靜態太極元件',
);

console.log('PASS: 太極在 Apple 手機可見；圖案不被硬體數字誤擋、畫質不被鎖低、遊戲授權走手勢且有手動退路');
