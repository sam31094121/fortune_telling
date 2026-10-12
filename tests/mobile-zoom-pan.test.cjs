// 手機縮放與拖動守門：客戶用兩指放大之後，必須能上下左右移動畫面（2026-10-12 客戶回報）。
// 擋下四種會讓放大畫面動不了的寫法：
//  1. viewport 禁止縮放（maximum-scale、user-scalable=no）
//  2. 全站 CSS 把觸控限制成只能上下（pan-y）——橫向拖動會被整頁吃掉
//  3. 全視窗的 touchmove 攔截器在放大狀態下仍呼叫 preventDefault
//  4. 首頁太極球（touch-action: none）在放大狀態下仍吃掉拖動
// 執行：node tests/mobile-zoom-pan.test.cjs（不需 dev server）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let checks = 0;
const yes = (c, m) => { assert.ok(c, m); checks += 1; };

// 1. viewport 不得禁止縮放
const layout = read('app/layout.tsx');
const viewportBlock = layout.slice(layout.indexOf('export const viewport'), layout.indexOf('};', layout.indexOf('export const viewport')) + 2);
yes(!/maximumScale|userScalable/.test(viewportBlock), 'viewport 不得設定 maximumScale／userScalable');
yes(!/maximum-scale|user-scalable\s*=\s*no/i.test(layout), 'layout 不得出現 maximum-scale／user-scalable=no');

// 2. 全站 CSS 不得再把觸控限制成只能上下
for (const file of ['app/globals.css', 'lib/performance-css.ts']) {
  const code = read(file).split('\n').filter((line) => !/^\s*(\/\*|\*|\/\/)/.test(line)).join('\n');
  yes(!/touch-action:\s*pan-y\b/.test(code), `${file} 不得有 touch-action: pan-y（會擋住放大後的橫向拖動）`);
}

// 3. 首頁第一畫面的觸控攔截器：放大狀態必須放行，橫向為主的拖動也要放行
const hook = read('components/taiji/useTaijiFirstScreenScroll.ts');
yes(/visualViewport/.test(hook) && /isPinchZoomed\(\)/.test(hook), '攔截器要偵測捏合放大狀態');
const touchMove = hook.slice(hook.indexOf('const onTouchMove'), hook.indexOf('const onTouchEnd'));
yes(touchMove.indexOf('isPinchZoomed()') !== -1 && touchMove.indexOf('isPinchZoomed()') < touchMove.indexOf('preventDefault()'), '放大狀態要在 preventDefault 之前就放行');
yes(/Math\.abs\(dx\)\s*>\s*Math\.abs\(dy\)/.test(touchMove), '橫向為主的拖動要放行');
const onTouchStart = hook.slice(hook.indexOf('const onTouchStart'), hook.indexOf('const onTouchMove'));
yes(/isPinchZoomed\(\)/.test(onTouchStart), '放大狀態不得開始追蹤');

// 4. 太極球：放大時改 auto（規則放在全站樣式，太極核心檔案有雜湊鎖不能動）
const globalCss = read('app/globals.css');
yes(globalCss.includes('html[data-pinch-zoomed] [class*="TaijiSystem_sphereWrapper"] { touch-action: auto !important; }'), '太極球在放大狀態必須 touch-action: auto');
yes(/data-pinch-zoomed/.test(hook), '攔截器要設定 data-pinch-zoomed 旗標');
yes(!/data-pinch-zoomed/.test(read('components/TaijiSystem.module.css')), '太極核心樣式檔有雜湊鎖，不得在裡面加規則');

// 5. 手機字體：全站基準放大，且過小的固定像素字有下限
const css = read('app/globals.css');
const typeStart = css.indexOf('手機字體（唯一一份');
yes(typeStart > 0, '手機字體只留一份規則區塊');
yes(css.indexOf('手機字體（唯一一份', typeStart + 1) === -1, '手機字體規則不得重複出現第二份');
yes(!css.includes('手機首頁字體放大') && !css.includes('手機全站字體等比例放大'), '舊版分開寫的字體規則已移除');
const scaleBlock = css.slice(typeStart, css.indexOf('客戶用兩指放大之後'));
yes(scaleBlock.includes('html { font-size: 125%; }'), '手機基準字級要放大到 125%');
yes(scaleBlock.includes('.text-\\[10px\\],') && scaleBlock.includes('.text-\\[11px\\] { font-size: 15px !important;'), '9–11px 的小字下限 15px');
yes(scaleBlock.includes('.text-\\[12px\\] { font-size: 16px !important;'), '12px 的小字下限 16px');

console.log(`mobile-zoom-pan: ${checks} checks passed`);
