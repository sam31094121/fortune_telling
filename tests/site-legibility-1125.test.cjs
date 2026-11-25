// 2026-11-25 字級／對比／點擊目標補強：鎖住這次的修正，避免之後被改回去。
const assert = require('assert');
const fs = require('fs');
const read = (f) => fs.readFileSync(f, 'utf8');
const css = read('app/globals.css');

// 1. 電腦版小字下限：固定像素小字與 text-xs 在 641px 以上至少 14px，跟著 rem（大／特大）放大
const block = css.slice(css.indexOf('2026-11-25 字級／對比／點擊目標補強'));
assert(block.length > 0, '要有 2026-11-25 字級補強段落');
assert(/@media \(min-width: 641px\)/.test(block), '電腦版下限只在 641px 以上');
assert(/font-size: max\(14px, 0\.875rem\)/.test(block), '下限 14px，且跟著 rem 放大');
for (const cls of ['8px', '9px', '10px', '11px', '12px', '13px']) assert(block.includes('.text-\\[' + cls + '\\]'), '要涵蓋 text-[' + cls + ']');
// 業主保護區不能被這段改到
for (const guard of ['#home-trust-strip', 'TodayDirectionQuest_', 'BeastCardTile_', 'ghost-asura_', 'Taiji', 'ModelLab_', 'Ziwei']) assert(block.includes(guard), '字級下限要排除保護區 ' + guard);
// 選擇器之間不能有空白（否則變成「子孫」選擇器，整段失效）
assert(/\.text-xs\):not\(\[class\*="sm:text-sm"\]/.test(block), ':is(...) 與 :not(...) 要黏在一起');
// 已有 sm:/md:/lg: 放大字級的元素不可被壓回 14px
assert(block.includes('[class*="sm:text-base"]') && block.includes('[class*="lg:text-lg"]'), '有 sm:/lg: 放大字級的元素要排除');

for (const c of ['.choice-signal', '.zodiac-brand-hero__eyebrow', '.tarot-question-entry__field-hint', '.music-landing-eyebrow', '.growth-module-route__helper']) assert(block.includes(c), '電腦版小標籤 ' + c + ' 要補到 14px');

// 2. 金色主按鈕最深的金不能再暗到讓深色字低於 AA
assert(!/linear-gradient\(135deg, #c9a24a 0%, #f7efd2 50%, #8a6a2f 100%\)/.test(css), '金色按鈕最深色不可回到 #8a6a2f（對比 3.99）');
assert(css.includes('linear-gradient(135deg, #c9a24a 0%, #f7efd2 50%, #a6803a 100%)'), '金色按鈕最深色 #a6803a');

// 3. 停用中的按鈕不用半透明壓字
assert(/\.submit:disabled \{ opacity: 1;/.test(read('components/PasswordGate.module.css')), '密碼頁「解鎖」停用時不可半透明');
assert(/\.login button:disabled\{opacity:1;/.test(read('app/dual-chart/dual-chart.module.css')), '神煞「解鎖神煞易經」停用時不可半透明');
assert(/\[class\*="to-amber-"\]:not\(:disabled\) \{ --tw-gradient-to/.test(read('app/lx-cards.css')), '皮革金漸層不可蓋到停用按鈕');

// 4. 點擊目標至少 44px
assert(read('components/LunarBirthdayInput.tsx').split('min-h-[44px] rounded-lg px-3 py-2.5').length === 3, '國曆／農曆切換鈕至少 44px 高');
assert(read('app/numerology/page.tsx').includes('<summary className="min-h-[44px]'), '「這組數字要用在哪裡？」至少 44px 高');
assert(/min-h-\[44px\][^"]*">⌂ 返回首頁/.test(read('app/red-luan-heartbeat/page.tsx')), '桃花頁「返回首頁」至少 44px 高');

// 5. 版面位移
assert(/#home-top-empty-shell-card \{ min-height: 390px; \}/.test(css), '電腦版太極外框先保留最終高度');
assert(read('app/nameology/page.tsx').includes("style={modeChecked ? undefined : { visibility: 'hidden' }}"), '姓名學表單要等讀到網址模式才顯示');

// 6. 星宿神獸頁的大「28」是裝飾字
assert(/<div aria-hidden="true" className="pointer-events-none absolute right-5 top-5/.test(read('app/star-beasts/page.tsx')), '裝飾用的「28」要 aria-hidden');

console.log('site-legibility-1125: 全部通過');
