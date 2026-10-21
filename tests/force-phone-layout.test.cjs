'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const srcPath = path.join(__dirname, '..', 'lib', 'force-phone-layout.ts');
const src = fs.readFileSync(srcPath, 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
const fn = new Function('module', 'exports', js);
fn(mod, mod.exports);

const {
  shouldForcePhoneLayout,
  guessPhoneCssWidth,
  looksLikePhoneScreen,
} = mod.exports;

function signals(over) {
  return {
    innerWidth: 390,
    screenWidth: 390,
    screenHeight: 844,
    visualWidth: 390,
    maxTouchPoints: 5,
    pointerCoarse: true,
    standalone: false,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    ...over,
  };
}

assert.strictEqual(looksLikePhoneScreen(390, 844), true);
assert.strictEqual(looksLikePhoneScreen(768, 1024), false);

const desk = { innerWidth: 980, visualWidth: 980 };
const desktopSiteUa = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

assert.strictEqual(shouldForcePhoneLayout(signals()), false, '已經是手機寬，不必改');
assert.strictEqual(shouldForcePhoneLayout(signals(desk)), true, '手機 UA 被拉成 980，要鎖');
assert.strictEqual(shouldForcePhoneLayout(signals({ ...desk, userAgent: desktopSiteUa })), true, '手機開了電腦版網站（UA 變電腦、觸控＋手機螢幕），要鎖');
assert.strictEqual(shouldForcePhoneLayout(signals({ ...desk, standalone: true })), true, '加到主畫面／APK 也要鎖');
assert.strictEqual(shouldForcePhoneLayout(signals(desk), true), false, '使用者自己勾了電腦版才放行');
assert.strictEqual(shouldForcePhoneLayout(signals({ innerWidth: 1440, screenWidth: 1440, screenHeight: 900, visualWidth: 1440, maxTouchPoints: 0, pointerCoarse: false, userAgent: desktopSiteUa })), false, '真的電腦不要鎖');
assert.strictEqual(shouldForcePhoneLayout(signals({ innerWidth: 1024, screenWidth: 768, screenHeight: 1024, visualWidth: 1024, userAgent: desktopSiteUa })), false, '平板不鎖');

assert.strictEqual(guessPhoneCssWidth(signals({ visualWidth: 412, innerWidth: 980 })), 412);

console.log('force-phone-layout.test.cjs ok');
