#!/usr/bin/env node
'use strict';
// 寶石捷連線手機穩健性（只測畫面狀態機與接線，不碰戰鬥數值）：
// 1. 戰鬥卡圖載入失敗：不留破圖示、連線恢復／回前景／定時重試原圖。
// 2. 手機橫向（高度不足）顯示轉向提示，直向與桌機不顯示。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const A = require('../lib/beast-game/match3/art-retry.ts');

let s = A.initialArtState('/a.webp');
assert.deepEqual([s.current, s.failed, s.retries], ['/a.webp', false, 0]);
// 原圖失敗 → 換備援
s = A.artOnError(s, '/b.webp');
assert.deepEqual([s.current, s.failed], ['/b.webp', false]);
// 備援也失敗 → failed（不再換、不無限迴圈）
s = A.artOnError(s, '/b.webp');
assert.equal(s.failed, true);
assert.equal(A.artOnError(s, '/b.webp'), s, 'failed 之後的 onError 不再改狀態');
// 沒有備援：第一次失敗就 failed
assert.equal(A.artOnError(A.initialArtState('/x.webp')).failed, true);
assert.equal(A.artOnError(A.initialArtState('/x.webp'), '/x.webp').failed, true, '備援等於原圖時不重抓同一張');
// 重試：回到原圖、attempt 變動（<img> 重新掛載才會真的再抓）
const r1 = A.artRetry(s);
assert.deepEqual([r1.current, r1.failed, r1.retries, r1.attempt > s.attempt], ['/a.webp', false, 1, true]);
// 未失敗時重試不動作
assert.equal(A.artRetry(r1), r1);
// 最多 MAX_ART_RETRIES 次
let t = s; for (let i = 0; i < A.MAX_ART_RETRIES + 2; i++) { t = A.artRetry(t); t = A.artOnError(A.artOnError(t, '/b.webp'), '/b.webp'); }
assert.equal(t.retries, A.MAX_ART_RETRIES); assert.equal(t.failed, true);
assert.equal(A.artRetry(t), t, '超過次數維持 failed');
// 載入成功清掉重試計數
const ok = A.artOnLoad(r1); assert.equal(ok.retries, 0);
assert.equal(A.ART_RETRY_DELAYS_MS.length >= 1 && A.ART_RETRY_DELAYS_MS.every(ms => ms >= 1000), true);

// 接線：Match3TargetArt 用狀態機、標 data-art-failed、聽 online／visibilitychange；CSS 隱藏破圖示。
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'components/battlefield/Match3RigAttack.tsx'), 'utf8');
const fn = src.slice(src.indexOf('export function Match3TargetArt'), src.indexOf('function Strike('));
for (const needle of ['artOnError', 'artRetry', 'data-art-failed', "addEventListener('online'", "addEventListener('visibilitychange'", 'key={art.attempt}', 'removeEventListener']) assert.ok(fn.includes(needle), 'Match3TargetArt 缺 ' + needle);
const css = fs.readFileSync(path.join(root, 'components/battlefield/Match3Board.module.css'), 'utf8');
assert.match(css, /\.foeArt img\[data-art-failed\][^{]*\{\s*visibility:\s*hidden/);
// 2. 轉向提示：只在 hard45 戰鬥、橫向＋高度 ≤500px＋觸控時顯示；不暫停、不改戰局。
const board = fs.readFileSync(path.join(root, 'components/battlefield/Match3Board.tsx'), 'utf8');
assert.match(board, /cfg\.id === 'hard45' && <div className=\{styles\.rotateHint\} data-testid="match3-rotate-hint"/);
const hintBlock = board.slice(board.indexOf('data-testid="match3-rotate-hint"'), board.indexOf('</div>}', board.indexOf('data-testid="match3-rotate-hint"')));
assert.ok(!/onClick|setBusy|setOver|release\(/.test(hintBlock), '轉向提示不得接任何戰局動作');
assert.match(css, /\.rotateHint \{ display: none; \}/);
const media = css.slice(css.indexOf('@media (orientation: landscape) and (max-height: 500px) and (pointer: coarse)'));
assert.ok(media.length > 0 && /\.wrap\[data-match3-battle-active="true"\] \.rotateHint \{ display: flex;/.test(media), '轉向提示只在戰鬥進行中的橫向手機顯示');
assert.ok(/font-size: 16px/.test(media.slice(0, 600)), '提示文字 ≥14px');
console.log('beast-match3-mobile-robustness: ok');
