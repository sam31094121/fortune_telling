// iPhone／iPad 沒有一鍵安裝 API；按鈕必須直接叫出分享面板（navigator.share），
// 兩個入口（首頁卡片、手機版大盾牌）都要接上，且不得宣稱「已安裝」。
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const lib = read('lib/install-shield.ts');
const card = read('components/HomeInstallCard.tsx');
const shield = read('components/InstallShield080.tsx');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };

ok(/export async function openIosShareSheet/.test(lib), 'lib 要匯出 openIosShareSheet');
ok(/navigator\.share/.test(lib), '要用 navigator.share 叫出分享面板');
ok(/AbortError/.test(lib), '使用者關閉面板不得當成錯誤');
ok(/guide === 'ios'[\s\S]{0,80}openIosShareSheet/.test(card), '首頁卡片 iOS 要叫分享面板');
ok(/guide === 'ios'[\s\S]{0,80}openIosShareSheet/.test(shield), '大盾牌 iOS 要叫分享面板');
ok(!/setInstalled\(true\)[^;]*openIosShareSheet|openIosShareSheet[^;]*setInstalled\(true\)/.test(card + shield), 'iOS 不能偵測到已安裝，不得在叫面板後設為已安裝');

console.log(`install-ios-share-sheet: ${n} checks passed`);
