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
const scaleBlockAll = scaleBlock;
yes(scaleBlock.includes('html { font-size: 125%; --ts: 1; }'), '預設「中」：手機基準字級 125%、倍率 1');
yes(scaleBlock.includes('.text-\\[10px\\],') && scaleBlock.includes('.text-\\[11px\\] { font-size: calc(15px * var(--ts, 1)) !important;'), '9–11px 的小字下限 15px（隨倍率）');
yes(scaleBlock.includes('.text-\\[12px\\] { font-size: calc(16px * var(--ts, 1)) !important;'), '12px 的小字下限 16px（隨倍率）');

// 6. 客戶自選字體大小：設定只有一份（lib/text-size.ts），CSS 四檔與設定一致，開關接在首頁與載入前腳本
const ts = read('lib/text-size.ts');
const options = [...ts.matchAll(/\{ id: '(\w+)', label: '([^']+)', rootPercent: ([\d.]+), scale: ([\d.]+), desktopRootPercent: [\d.]+ \}/g)].map((m) => ({ id: m[1], label: m[2], rootPercent: m[3], scale: m[4] }));
yes(options.length === 3 && options.map((o) => o.label).join('') === '中大特大', '字體大小三檔：中、大、特大（最小的一檔已拿掉，字太小沒有人會看）');
yes(!/'small'/.test(ts) && !scaleBlock.includes('data-text-size="small"'), '不得再出現「小」這一檔');
yes(options.every((o) => Number(o.scale) >= 1), '每一檔都不得比標準小');
yes(/TEXT_SIZE_DEFAULT: TextSizeId = 'medium'/.test(ts), '預設標準是「中」');
const medium = options.find((o) => o.id === 'medium');
yes(medium.rootPercent === '125' && medium.scale === '1', '「中」必須等於上線的放大版基準字級（125%、倍率 1）');
for (const o of options.filter((x) => x.id !== 'medium')) {
  const pct = o.rootPercent;
  yes(scaleBlock.includes('html[data-text-size="' + o.id + '"] { font-size: ' + pct + '%; --ts: ' + o.scale + '; }'), '檔位 ' + o.id + ' 的根字級與倍率要和設定一致');
}
yes(read('app/page.tsx').includes('<HomeToolsCard />'), '首頁要放工具卡片（語言＋存到桌面＋字體大小）');
yes(read('app/layout.tsx').includes('TEXT_SIZE_INIT_SCRIPT'), '載入前腳本要接在 layout，避免先閃標準大小');
yes(read('app/layout.tsx').includes('<html lang="zh-Hant" suppressHydrationWarning>'), '<html> 要加 suppressHydrationWarning，載入前腳本加的屬性才不會造成 hydration 警告');
yes(ts.includes("setAttribute('data-text-size'") && ts.includes("removeAttribute('data-text-size')"), '預設「中」不加屬性，其餘三檔才加');
const switchSource = read('components/HomeToolsCard.tsx');
yes(switchSource.includes('aria-pressed') && switchSource.includes('saveTextSize'), '開關要標示目前選擇並記住');
// 頁面自己寫死像素的手機字級也要隨倍率
for (const f of ['app/ghost-asura/ghost-asura.module.css', 'app/dual-chart/dual-chart.module.css']) {
  const tail = read(f).slice(read(f).lastIndexOf('手機字體再加大一階'));
  yes(!/font-size:\s*\d+px/.test(tail), f + ' 的手機字級要隨倍率（calc … var(--ts)）');
}

// 7. 首頁工具列：盾牌與字體大小是同一個整體（盾牌認領工具列的兩個位置，其他頁維持原位）
const bar = read('components/HomeToolsCard.tsx');
yes(bar.includes('data-install-shield-slot') && bar.includes('data-install-panel-slot'), '工具列要留盾牌按鈕與安裝說明兩個位置');
yes(bar.includes("'tdh:install-slots'"), '工具列掛好後要通知盾牌來認領');
const shield = read('components/InstallShield080.tsx');
yes(shield.includes("[data-install-shield-slot]") && shield.includes("[data-install-panel-slot]") && shield.includes("'tdh:install-slots'"), '盾牌元件要認領工具列的兩個位置');
yes(shield.includes('if (slots) {') && shield.includes('slots.tap') && shield.includes('slots.panel') && shield.includes('document.body.insertBefore(host, document.body.firstChild)'), '找不到工具列時盾牌仍放回整頁最上方，不會不見');;

// 8. 電腦、平板也要：卡片所有寬度都顯示；電腦的「中」＝原樣 100%，「大」「特大」才放大；浮動小盾牌改放進卡片
const desktopOptions = [...ts.matchAll(/id: '(\w+)'[^}]*desktopRootPercent: ([\d.]+)/g)].map((m) => ({ id: m[1], pct: m[2] }));
yes(desktopOptions.length === 3, '每一檔都要有電腦版根字級');
yes(desktopOptions.find((o) => o.id === 'medium').pct === '100', '電腦版「中」必須維持原本 100%（不能改變電腦版預設外觀）');
for (const o of desktopOptions.filter((x) => x.id !== 'medium')) {
  yes(scaleBlockAll.includes('html[data-text-size="' + o.id + '"] { font-size: ' + o.pct + '%; }'), '電腦版 ' + o.id + ' 的根字級要和設定一致');
}
const barCss = read('components/HomeToolsCard.module.css');
yes(barCss.includes('.wrap {\n  display: block;') || barCss.includes('.wrap {\r\n  display: block;'), '工具列卡片所有寬度都要顯示（含電腦與平板）');
yes(shield.includes('deskSlot') && shield.replace(/\r\n/g, '\n').includes('deskSlot,\n      ) : ('),'電腦、平板的浮動小盾牌要放進工具列卡片（找不到卡片才浮動）');

// 9. 工具卡片的位置與整合：語言、盾牌、字體大小在同一張卡片；卡片在「今日定向關卡」下面、「古老塔羅牌」上面（＝原本語言選擇的位置）
const page = read('app/page.tsx');
const cardAt = page.indexOf('<HomeToolsCard />');
const stackAt = page.indexOf('home-feature-stack flex w-full flex-col');
yes(cardAt > 0 && stackAt > cardAt, '工具卡片要在卡片列（塔羅牌那一排）之前');
yes(page.indexOf('home-primary-quest-wrap') < cardAt, '工具卡片要在「今日定向關卡」之後');
yes(!page.includes('<InterfaceLanguagePicker />'), '首頁不再另外放一條獨立的語言選擇（已併進工具卡片）');
const card = read('components/HomeToolsCard.tsx');
yes(card.includes('<InterfaceLanguagePicker variant="card" />') && card.includes('data-install-shield-slot') && card.includes('data-text-size-option'), '一張卡片裡要同時有語言、盾牌位置、字體大小');
yes(read('components/InterfaceLanguage.tsx').includes("variant = 'standalone'"), '語言選擇要有 card 版本（無自己的外框，與卡片融為一體）');

// 10. 換頁還原放大倍率：首頁放大後點進其他頁，新頁面不得停在放大狀態（2026-10-17 客戶回報）；只還原、不禁止放大
const resetSrc = read('components/ViewportZoomReset.tsx');
yes(read('app/layout.tsx').includes('<ViewportZoomReset />'), '全站 layout 要掛換頁還原倍率');
yes(resetSrc.includes('usePathname') && resetSrc.includes('visualViewport') && resetSrc.includes('pageshow'), '換頁與返回頁面時都要檢查放大倍率');
yes(resetSrc.includes("setAttribute('content', original)"), '暫時鎖 1 倍之後必須還原 viewport 原內容，不能永久禁止放大');
yes(!/maximum-scale|user-scalable/.test(read('app/layout.tsx')), 'layout 本身仍不得寫死 maximum-scale／user-scalable');

console.log(`mobile-zoom-pan: ${checks} checks passed`);
