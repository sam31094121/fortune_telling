/**
 * 鬼魅阿修羅｜印記卡「打開後收不回」回歸守門（2026-10-15）
 * ============================================================================
 * 病因（在真實頁面用滑鼠點擊重現）：覺醒印記打開後，卡片被加上 3D 傾斜（rotateX）與永不停的浮動動畫，
 * 整張卡（含標題列）在瀏覽器裡點不到——點第二下落在外層 UL 上，卡片就收不回去。
 * 守門：打開狀態不得有 transform／animation，卡片本身不得有 3D 透視或 preserve-3d。
 * ============================================================================
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('features/ghost-asura/components/GhostAsuraCard.module.css', 'utf8').replace(/\r\n/g, '\n');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };

/** 取出某個選擇器的規則本文（一層大括號）。同一個選擇器出現多次就全部串起來。 */
function bodiesOf(selector) {
  const bodies = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector + ' {', from);
    if (at < 0) break;
    const start = css.indexOf('{', at);
    const end = css.indexOf('\n}', start);
    bodies.push(css.slice(start + 1, end));
    from = end;
  }
  return bodies;
}

const openRules = bodiesOf('.itemAwakened:has(details[open])');
ok(openRules.length >= 1, '找不到打開狀態的規則');
for (const body of openRules) {
  const noComments = body.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/\btransform\s*:/.test(noComments), '打開的印記卡不得有 transform（3D 傾斜會讓卡片點不到）');
  ok(!/\banimation\s*:/.test(noComments), '打開的印記卡不得有持續動畫（浮動會讓卡片點不到）');
}
const awakened = bodiesOf('.itemAwakened').join('\n');
ok(!/preserve-3d/.test(awakened), '印記卡不得使用 preserve-3d');
ok(!/perspective\s*:/.test(awakened), '印記卡不得使用 perspective');
ok(!/transition\s*:\s*all/.test(awakened), '不要 transition: all（會連 transform 一起動畫）');

const tsx = fs.readFileSync('features/ghost-asura/components/GhostAsuraCard.tsx', 'utf8');
ok(!/onClick=\{[^}]*preventDefault/.test(tsx.split('data-asura-detail')[1] ?? ''), '印記卡標題列不得攔截點擊');
console.log(`ghost-asura-card-toggle: ${checks} checks passed`);
