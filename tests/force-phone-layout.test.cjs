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

assert.strictEqual(shouldForcePhoneLayout(signals()), false, '瀏覽器裡已經是手機寬，不必改');

assert.strictEqual(
  shouldForcePhoneLayout(signals({
    innerWidth: 980,
    visualWidth: 390,
    standalone: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  })),
  true,
  'PWA 被開成電腦版（Android 去掉 Mobile、viewport 980）要鎖回手機',
);

assert.strictEqual(
  shouldForcePhoneLayout(signals({
    innerWidth: 1280,
    screenWidth: 390,
    screenHeight: 844,
    visualWidth: 390,
    standalone: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
  })),
  true,
  '加到主畫面後 innerWidth 變桌面寬，要鎖回手機',
);

assert.strictEqual(
  shouldForcePhoneLayout(signals({
    innerWidth: 1440,
    screenWidth: 1440,
    screenHeight: 900,
    visualWidth: 1440,
    maxTouchPoints: 0,
    pointerCoarse: false,
    standalone: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',
  })),
  false,
  '真的電腦不要鎖',
);

assert.strictEqual(guessPhoneCssWidth(signals({ visualWidth: 412, innerWidth: 980 })), 412);

console.log('force-phone-layout.test.cjs ok');
