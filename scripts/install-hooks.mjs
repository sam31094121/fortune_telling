/**
 * 安裝 git hooks。
 *
 * .git/hooks 不在版控裡——換一台機器、重新 clone，掛在那裡的閘門就消失了。
 * 所以真正的來源放在 scripts/hooks/，用這支複製過去。
 *
 *   node scripts/install-hooks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'scripts/hooks');
const dest = path.join(root, '.git/hooks');

if (!fs.existsSync(dest)) {
  console.error('找不到 .git/hooks——這裡不是 git 工作區？');
  process.exit(1);
}

for (const name of fs.readdirSync(src)) {
  const from = path.join(src, name);
  const to = path.join(dest, name);
  fs.copyFileSync(from, to);
  try { fs.chmodSync(to, 0o755); } catch { /* Windows 沒有執行位元，忽略。 */ }
  console.log(`  已安裝 ${name}`);
}
console.log('完成。要跳過某一次推送：SKIP_PUSH_GATE=1 git push');
